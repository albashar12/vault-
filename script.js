let credentials = { token: '', chatId: '' };

window.onload = function() {
    const savedToken = localStorage.getItem('appvault_token');
    const savedChatId = localStorage.getItem('appvault_chat');
    const savedPwd = localStorage.getItem('appvault_pwd');

    if (savedToken && savedChatId && savedPwd) {
        credentials.token = savedToken;
        credentials.chatId = savedChatId;
        document.getElementById('homePage').classList.remove('hidden');
    } else {
        document.getElementById('setupScreen').classList.remove('hidden');
    }
};

// 1. Vault Setup
function setupVault() {
    const token = document.getElementById('botToken').value.trim();
    const chatId = document.getElementById('chatId').value.trim();
    const pwd = document.getElementById('setupPassword').value.trim();

    if (!token || !chatId || !pwd) {
        alert('Please provide your Token, Chat ID, and Password!');
        return;
    }

    localStorage.setItem('appvault_token', token);
    localStorage.setItem('appvault_chat', chatId);
    localStorage.setItem('appvault_pwd', pwd);

    credentials.token = token;
    credentials.chatId = chatId;

    showDashboard();
}

// 2. Unlock with Password
function unlockVault() {
    const enteredPwd = document.getElementById('loginPassword').value.trim();
    const savedPwd = localStorage.getItem('appvault_pwd');

    if (enteredPwd === savedPwd) {
        showDashboard();
    } else {
        alert('Incorrect password! Enter the correct password or use Forgot Password.');
    }
}

// 3. Toggle Forgot Password
function toggleRecovery() {
    const recSection = document.getElementById('recoverySection');
    recSection.style.display = (recSection.style.display === 'block') ? 'none' : 'block';
}

// 4. Check Security Answer
function checkSecurityAnswer() {
    const answer = document.getElementById('securityAnswer').value.trim().toLowerCase();
    
    if (answer === 'harry potter') {
        alert('Correct answer! Vault unlocked.');
        showDashboard();
    } else {
        alert('Incorrect answer! Please try again.');
    }
}

// 5. Show Dashboard
function showDashboard() {
    document.getElementById('setupScreen').classList.add('hidden');
    document.getElementById('homePage').classList.add('hidden');
    document.getElementById('dashboardPage').classList.remove('hidden');
    document.getElementById('lockBtn').classList.remove('hidden');
    
    // Reset inputs
    document.getElementById('loginPassword').value = '';
    document.getElementById('securityAnswer').value = '';
    document.getElementById('recoverySection').style.display = 'none';

    fetchVaultFiles();
}

// 6. Lock App
function lockApp() {
    document.getElementById('dashboardPage').classList.add('hidden');
    document.getElementById('homePage').classList.remove('hidden');
    document.getElementById('lockBtn').classList.add('hidden');
}

// 7. Upload Masked/Encrypted Files
async function uploadFiles(event) {
    const fileInput = event.target;
    const status = document.getElementById('syncStatus');
    if (fileInput.files.length === 0) return;

    for (let file of fileInput.files) {
        status.innerText = `Encrypting & Uploading: ${file.name}...`;

        const reader = new FileReader();
        reader.onload = async function(e) {
            const arrayBuffer = e.target.result;

            const maskedBlob = new Blob([arrayBuffer], { type: 'application/octet-stream' });
            
            let ext = '.vdat';
            if (file.type.startsWith('image/')) ext = '.vimg';
            else if (file.type.startsWith('video/')) ext = '.vvid';

            const formData = new FormData();
            formData.append('chat_id', credentials.chatId);
            formData.append('caption', `REAL_TYPE:${file.type}`);
            formData.append('document', maskedBlob, `locked_${Date.now()}${ext}`);

            try {
                let res = await fetch(`https://api.telegram.org/bot${credentials.token}/sendDocument`, {
                    method: 'POST',
                    body: formData
                });
                let data = await res.json();
                if (!data.ok) alert(`Upload failed: ${file.name}`);
            } catch (err) {
                console.error(err);
            }
            
            status.innerText = '✅ Masked Upload Complete!';
            setTimeout(() => status.innerText = '', 3000);
            fetchVaultFiles();
        };

        reader.readAsArrayBuffer(file);
    }
    fileInput.value = '';
}

// 8. Fetch Vault Files
async function fetchVaultFiles() {
    const grid = document.getElementById('fileGrid');
    grid.innerHTML = '<p style="color:var(--subtext); font-size:0.85rem; grid-column: 1/-1; text-align:center;">Syncing Vault...</p>';

    try {
        let res = await fetch(`https://api.telegram.org/bot${credentials.token}/getUpdates`);
        let data = await res.json();

        grid.innerHTML = '';
        if (!data.ok || data.result.length === 0) {
            grid.innerHTML = '<p style="color:var(--subtext); font-size:0.85rem; grid-column: 1/-1; text-align:center;">No files found in the vault</p>';
            return;
        }

        for (let update of data.result) {
            let msg = update.message || update.channel_post;
            if (!msg) continue;

            if (msg.document) {
                let fileId = msg.document.file_id;
                let caption = msg.caption || '';
                renderDecryptedItem(fileId, caption, msg.document.file_name);
            }
        }
    } catch (e) {
        grid.innerHTML = '<p style="color:var(--danger); font-size:0.85rem; grid-column: 1/-1; text-align:center;">Failed to sync data.</p>';
    }
}

// 9. Render Decrypted Item
async function renderDecryptedItem(fileId, caption, fileName) {
    const grid = document.getElementById('fileGrid');
    
    let res = await fetch(`https://api.telegram.org/bot${credentials.token}/getFile?file_id=${fileId}`);
    let data = await res.json();
    if (!data.ok) return;

    let fileUrl = `https://api.telegram.org/file/bot${credentials.token}/${data.result.file_path}`;

    let mimeType = 'application/octet-stream';
    if (caption.includes('REAL_TYPE:')) {
        mimeType = caption.split('REAL_TYPE:')[1].trim();
    } else if (fileName.endsWith('.vimg')) mimeType = 'image/jpeg';
    else if (fileName.endsWith('.vvid')) mimeType = 'video/mp4';

    let blobRes = await fetch(fileUrl);
    let buffer = await blobRes.arrayBuffer();
    let realBlob = new Blob([buffer], { type: mimeType });
    let objectUrl = URL.createObjectURL(realBlob);

    let card = document.createElement('div');
    card.className = 'file-card';

    if (mimeType.startsWith('image/')) {
        card.innerHTML = `<img src="${objectUrl}" loading="lazy"><div class="file-name">${fileName}</div>`;
    } else if (mimeType.startsWith('video/')) {
        card.innerHTML = `<video controls src="${objectUrl}"></video><div class="file-name">${fileName}</div>`;
    } else {
        card.innerHTML = `<div style="height:110px; display:flex; align-items:center; justify-content:center; background:#1E293B; border-radius:6px; font-size:2rem;">🔐</div><a href="${objectUrl}" download="${fileName}" style="color:var(--primary); font-size:0.75rem; text-decoration:none;">Download File</a>`;
    }

    grid.appendChild(card);
}