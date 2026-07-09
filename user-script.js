import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getDatabase, ref, set, get, child, onValue, push, update } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

// GANTI DENGAN CONFIG FIREBASE KAMU
const firebaseConfig = {
    apiKey: "AIzaSyAey45tdAmc4n0YZoi6oTp9gRP0f7fpZFc",
    authDomain: "user-counter-c3085.firebaseapp.com",
    databaseURL: "https://user-counter-c3085-default-rtdb.firebaseio.com",
    projectId: "user-counter-c3085",
    storageBucket: "user-counter-c3085.firebasestorage.app",
    messagingSenderId: "162826297559",
    appId: "1:162826297559:web:ec2d1b3ac9c9e39bd31092"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

window.db = db; window.auth = auth;
let globalUserData = null;
let availableMethods = [];
let globalLiveRTP = 30; // Default

const rp = (angka) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka || 0);

window.showToast = (msg, type='success') => {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div'); toast.className = 'toast';
    const color = type === 'error' ? 'var(--color-error)' : 'var(--color-success)';
    toast.innerHTML = `<span style="color:${color}">●</span> ${msg}`;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(()=>toast.remove(), 300); }, 3000);
};

window.nav = (viewId) => {
    document.querySelectorAll('.page-view').forEach(v => v.classList.remove('active'));
    document.getElementById(`view-${viewId}`).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    const activeNav = document.querySelector(`.nav-item[onclick="nav('${viewId}')"]`);
    if(activeNav) activeNav.classList.add('active');
    if(window.innerWidth >= 768) document.getElementById('desktop-sidebar').style.display = 'flex';
};

window.toggleAuth = (type) => {
    document.getElementById('form-login').style.display = type === 'login' ? 'block' : 'none';
    document.getElementById('form-register').style.display = type === 'register' ? 'block' : 'none';
};

// ================= AUTH =================
document.getElementById('form-login').onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-login'); btn.disabled = true; btn.textContent = "Loading...";
    try { await signInWithEmailAndPassword(auth, document.getElementById('login-email').value, document.getElementById('login-password').value); } 
    catch (err) { showToast("Login gagal", "error"); btn.disabled = false; btn.textContent = "Login Sekarang"; }
};

document.getElementById('form-register').onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-register'); btn.disabled = true; btn.textContent = "Memproses...";
    const email = document.getElementById('reg-email').value; const pass = document.getElementById('reg-pass').value;
    const uname = document.getElementById('reg-user').value.toLowerCase(); const phone = document.getElementById('reg-phone').value;
    
    try {
        if((await get(child(ref(db), `usernames/${uname}`))).exists()) throw new Error("Username terpakai");
        if((await get(child(ref(db), `phones/${phone}`))).exists()) throw new Error("Nomor HP terpakai");

        const cred = await createUserWithEmailAndPassword(auth, email, pass);
        const uid = cred.user.uid;
        await set(ref(db, `users/${uid}`), { uid: uid, fullName: document.getElementById('reg-name').value, username: uname, phone: phone, email: email, role: 'user', balance: 0, totalDeposit: 0, totalWithdraw: 0, playingGame: '', createdAt: Date.now() });
        await set(ref(db, `usernames/${uname}`), uid); await set(ref(db, `phones/${phone}`), uid);
        showToast("Pendaftaran berhasil!");
    } catch (err) { showToast(err.message, "error"); btn.disabled = false; btn.textContent = "Buat Akun"; }
};

window.logout = () => signOut(auth);

onAuthStateChanged(auth, async (user) => {
    const splash = document.getElementById('splash');
    const authView = document.getElementById('auth-view');
    const appView = document.getElementById('app-view');

    if (user) {
        let snap = await get(ref(db, `users/${user.uid}`));
        if (!snap.exists()) { await new Promise(r => setTimeout(r, 2000)); snap = await get(ref(db, `users/${user.uid}`)); }
        if (snap.exists() && snap.val().role !== 'admin') {
            authView.style.display = 'none'; appView.style.display = 'flex'; appView.classList.add('fade-in');
            if(window.innerWidth >= 768) document.getElementById('desktop-sidebar').style.display = 'flex';
            initAppListeners(user.uid);
            setTimeout(() => { splash.style.display = 'none'; }, 500);
        } else { signOut(auth); showToast("Akun tidak valid / Admin", "error"); }
    } else {
        appView.style.display = 'none'; authView.style.display = 'flex';
        document.getElementById('btn-login').disabled = false; document.getElementById('btn-login').textContent = "Login Sekarang";
        setTimeout(() => { splash.style.display = 'none'; }, 800);
    }
});

// ================= LISTENERS =================
function initAppListeners(uid) {
    // 1. Data User
    onValue(ref(db, `users/${uid}`), (snap) => {
        globalUserData = snap.val(); if(!globalUserData) return;
        document.getElementById('user-name').textContent = globalUserData.username;
        document.getElementById('user-initial').textContent = globalUserData.username.charAt(0).toUpperCase();
        
        const bal = rp(globalUserData.balance);
        document.getElementById('user-balance').textContent = bal;
        document.getElementById('play-balance').textContent = bal;
        document.getElementById('stat-total-dep').textContent = rp(globalUserData.totalDeposit);
        document.getElementById('stat-total-wd').textContent = rp(globalUserData.totalWithdraw);
    });

    // 2. RTP Global Live
    onValue(ref(db, 'admin_settings/current_rtp'), (snap) => {
        if(snap.exists()) {
            globalLiveRTP = snap.val();
            document.querySelectorAll('.rtp-val-display').forEach(el => el.textContent = globalLiveRTP + '%');
        }
    });

    // 3. Games Catalog
    onValue(ref(db, 'games'), (snap) => {
        const grid = document.getElementById('catalog-grid');
        let html = '';
        if(snap.exists()){
            snap.forEach(c => {
                const g = c.val();
                if(g.status === 'active') {
                    const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(g))));
                    html += `
                        <div class="game-card ripple-wrap" onclick="playGame('${b64}')">
                            <div class="rtp-badge">⚡ RTP <span class="rtp-val-display">${globalLiveRTP}%</span></div>
                            <img src="${g.thumbnail}" class="game-thumb">
                            <div class="game-info">
                                <div style="font-weight:bold;">${g.name}</div>
                                <div style="font-size:0.8rem;color:var(--text-secondary);">${g.provider || 'PG Soft'}</div>
                            </div>
                        </div>`;
                }
            });
        }
        grid.innerHTML = html || '<div style="color:var(--text-secondary); grid-column:1/-1;">Belum ada game.</div>';
    });

    // 4. Payment Methods & History (Disingkat untuk fokus ke Game)
    onValue(ref(db, 'payment_methods'), (snap) => {
        const sel = document.getElementById('dep-method'); sel.innerHTML = '<option value="">-- Pilih Metode --</option>';
        availableMethods = [];
        if(snap.exists()) {
            snap.forEach(c => {
                const m = c.val(); m.id = c.key;
                if(m.status === 'active') { availableMethods.push(m); sel.innerHTML += `<option value="${m.id}" style="background:var(--bg-surface);">${m.providerName} - ${m.accountName}</option>`; }
            });
        }
    });

    onValue(ref(db, `history/${uid}`), (snap) => {
        const list = document.getElementById('history-list'); let html = '';
        if(snap.exists()) {
            const items = []; snap.forEach(c => { items.push(c.val()); });
            items.reverse().forEach(h => {
                const color = h.type === 'deposit' || h.type === 'win' ? 'var(--color-success)' : 'var(--color-error)';
                const sign = h.type === 'deposit' || h.type === 'win' ? '+' : '-';
                html += `<div class="card" style="padding: 16px; margin:0; display:flex; justify-content:space-between; align-items:center;">
                            <div><div style="font-weight:bold; text-transform:uppercase;">${h.type}</div><div style="font-size:0.8rem; color:var(--text-secondary);">${h.desc}</div></div>
                            <div style="color:${color}; font-weight:bold;">${sign} ${rp(h.amount)}</div>
                        </div>`;
            });
        } else { html = '<div style="color:var(--text-secondary); text-align:center; padding:20px;">Belum ada transaksi.</div>'; }
        list.innerHTML = html;
    });
}

// ================= DEPO & WD =================
window.updateDepInfo = () => {
    const id = document.getElementById('dep-method').value;
    const box = document.getElementById('dep-info-box');
    if(!id) { box.style.display = 'none'; return; }
    const method = availableMethods.find(m => m.id === id);
    if(method) {
        document.getElementById('dep-info-number').textContent = method.accountNumber;
        document.getElementById('dep-info-name').textContent = `A.N: ${method.accountName} (${method.providerName})`;
        box.style.display = 'block';
    }
};

document.getElementById('form-deposit').onsubmit = async (e) => {
    e.preventDefault(); const btn = document.getElementById('btn-submit-dep'); btn.disabled = true; btn.textContent = "Mengirim...";
    const data = { uid: auth.currentUser.uid, username: globalUserData.username, methodId: document.getElementById('dep-method').value, amount: parseInt(document.getElementById('dep-amount').value), proofNote: document.getElementById('dep-proof').value, status: 'pending', createdAt: Date.now() };
    try { await push(ref(db, 'deposits'), data); showToast("Deposit diajukan! Menunggu persetujuan admin."); document.getElementById('form-deposit').reset(); document.getElementById('dep-info-box').style.display = 'none'; } 
    catch (err) { showToast("Gagal mengajukan", "error"); }
    btn.disabled = false; btn.textContent = "Ajukan Deposit";
};

document.getElementById('form-withdraw').onsubmit = async (e) => {
    e.preventDefault(); const btn = document.getElementById('btn-submit-wd'); const amount = parseInt(document.getElementById('wd-amount').value);
    if(amount > globalUserData.balance) { showToast("Saldo tidak mencukupi!", "error"); return; }
    btn.disabled = true; btn.textContent = "Mengirim...";
    const data = { uid: auth.currentUser.uid, username: globalUserData.username, providerName: document.getElementById('wd-bank').value, accountName: document.getElementById('wd-name').value, accountNumber: document.getElementById('wd-number').value, amount: amount, status: 'pending', createdAt: Date.now() };
    try {
        await update(ref(db, `users/${auth.currentUser.uid}`), { balance: globalUserData.balance - amount });
        await push(ref(db, `history/${auth.currentUser.uid}`), { type: 'withdraw', amount: amount, desc: 'Penarikan ke ' + data.providerName, createdAt: Date.now() });
        await push(ref(db, 'withdraws'), data);
        showToast("Withdraw diproses!"); document.getElementById('form-withdraw').reset();
    } catch (err) { showToast("Gagal withdraw", "error"); }
    btn.disabled = false; btn.textContent = "Tarik Saldo";
};

// ================= GAME IFRAME =================
window.playGame = async (b64Data) => {
    const g = JSON.parse(decodeURIComponent(escape(atob(b64Data))));
    document.getElementById('play-title').textContent = g.name;
    const frame = document.getElementById('game-iframe');
    
    // Beritahu admin bahwa user ini sedang main game ini
    await update(ref(db, `users/${auth.currentUser.uid}`), { playingGame: g.name });

    if(g.type === 'code') { frame.removeAttribute('src'); frame.srcdoc = g.code; } 
    else { frame.removeAttribute('srcdoc'); frame.src = g.url; }
    document.getElementById('game-frame-container').style.display = 'flex';

    // 🌟 PENTING: Kirim UID ke dalam game saat dimuat agar God Mode berfungsi!
    frame.onload = () => {
        frame.contentWindow.postMessage({ action: 'SET_UID', uid: auth.currentUser.uid }, '*');
    };
};

window.closeGame = async () => {
    document.getElementById('game-frame-container').style.display = 'none';
    document.getElementById('game-iframe').src = "";
    document.getElementById('game-iframe').srcdoc = "";
    // Reset status main game
    await update(ref(db, `users/${auth.currentUser.uid}`), { playingGame: '' });
};

window.addEventListener('message', async (e) => {
    if(!e.data || !e.data.action || !globalUserData) return;
    const uid = auth.currentUser.uid;
    const dbRef = ref(db, `users/${uid}`);
    const s = await get(dbRef); let curBal = s.val().balance || 0;

    if(e.data.action === 'GET_BALANCE') { e.source.postMessage({ action: 'UPDATE_BALANCE_UI', balance: curBal }, '*'); }
    if(e.data.action === 'REQUEST_BET') {
        if(curBal >= e.data.amount) {
            await update(dbRef, { balance: curBal - e.data.amount });
            await push(ref(db, `history/${uid}`), { type: 'play', amount: e.data.amount, desc: 'Taruhan Game', createdAt: Date.now() });
            e.source.postMessage({ action: 'BET_APPROVED', newBalance: curBal - e.data.amount }, '*');
        } else { e.source.postMessage({ action: 'INSUFFICIENT_FUNDS' }, '*'); }
    }
    if(e.data.action === 'ADD_WINNINGS') {
        await update(dbRef, { balance: curBal + e.data.amount });
        await push(ref(db, `history/${uid}`), { type: 'win', amount: e.data.amount, desc: 'Menang Game', createdAt: Date.now() });
        e.source.postMessage({ action: 'UPDATE_BALANCE_UI', balance: curBal + e.data.amount }, '*');
    }
});
