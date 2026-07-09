// ==========================================
// 1. FIREBASE INTEGRATION & AUTOPILOT RTP
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getDatabase, ref, onValue, set } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

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
const db = getDatabase(app);

let globalRTP = 30; 
let isAutoRTP = true; 
let lastRTPUpdate = 0; 
let totalSpinCount = 0; 
let forceScatterNextSpin = false; 
let currentSpinMode = 'ZONK'; 
const RTP_HOLD_TIME = 30 * 60 * 1000; 

// Listener Admin
onValue(ref(db, 'admin_settings'), (snapshot) => {
    if (snapshot.exists()) {
        let data = snapshot.val();
        if (data.override_rtp && data.override_rtp !== 'AUTO') {
            isAutoRTP = false;
            globalRTP = Number(data.override_rtp) > 91 ? 91 : Number(data.override_rtp);
        } else {
            isAutoRTP = true;
            if (data.current_rtp) globalRTP = Number(data.current_rtp);
            if (data.rtp_last_updated) lastRTPUpdate = Number(data.rtp_last_updated);
        }
    }
});

onValue(ref(db, 'admin_settings/force_scatter'), (snapshot) => {
    if (snapshot.exists() && snapshot.val() === true) forceScatterNextSpin = true;
});

function processAutoRTP() {
    if (!isAutoRTP) return; 
    let now = Date.now();
    if (now - lastRTPUpdate >= RTP_HOLD_TIME || lastRTPUpdate === 0) {
        let rand = Math.random() * 100;
        let newRtp = 30;
        if (rand < 15) newRtp = Math.floor(Math.random() * (91 - 80 + 1)) + 80; 
        else if (rand < 40) newRtp = Math.floor(Math.random() * (79 - 50 + 1)) + 50; 
        else newRtp = Math.floor(Math.random() * (49 - 10 + 1)) + 10; 
        set(ref(db, 'admin_settings/current_rtp'), newRtp);
        set(ref(db, 'admin_settings/rtp_last_updated'), now);
    }
}

// ====================================================================
// 2. KERANGKA KOMUNIKASI SALDO IFRAME DENGAN PARENT (calon.html)
// ====================================================================
let currentBalance = 0;
const balanceEl = document.getElementById('balance');
const formatRp = (num) => new Intl.NumberFormat('en-US').format(num || 0);

window.addEventListener('message', (event) => {
    if (!event.data || !event.data.action) return;

    if (event.data.action === 'UPDATE_BALANCE_UI') {
        currentBalance = event.data.balance;
        balanceEl.innerText = formatRp(currentBalance);
    }

    if (event.data.action === 'BET_APPROVED') {
        currentBalance = event.data.newBalance;
        balanceEl.innerText = formatRp(currentBalance);
        
        // Memulai spin setelah saldo dipotong
        totalWinRound = 0; winEl.innerText = "0.00";
        currentMultiIndex = 0; updateMultiplierUI();  
        executeRollPhase(); 
    }

    if (event.data.action === 'INSUFFICIENT_FUNDS') {
        alert("Maaf, Saldo Anda tidak mencukupi!");
        gameState = 'IDLE';
        btnSpin.disabled = false;
        btnSpin.classList.remove('btn-spin-anim');
        autoSpinCount = 0; isAutoInfinity = false; updateAutoBtnText();
    }
});

function requestBalance() { window.parent.postMessage({ action: 'GET_BALANCE' }, '*'); }
function potongSaldo(amount) { window.parent.postMessage({ action: 'REQUEST_BET', amount: amount }, '*'); }
function tambahSaldo(amount) { window.parent.postMessage({ action: 'ADD_WINNINGS', amount: amount }, '*'); }

// ==========================================
// 3. PRELOADER & TWEEN.JS
// ==========================================
function animate(time) { requestAnimationFrame(animate); TWEEN.update(time); }
requestAnimationFrame(animate);

const imageUrls = [
    'https://i.ibb.co.com/hxB386yV/wild.png', 'https://i.ibb.co.com/7tV3FCQj/sketer.png',
    'https://i.ibb.co.com/1fMjkfr6/pakcoy.png', 'https://i.ibb.co.com/yc0VhQ4Y/pakcoy-wild.png',
    'https://i.ibb.co.com/7NxZTPT1/tungtung.png', 'https://i.ibb.co.com/rKTcbBKk/tungtung-wild.png',
    'https://i.ibb.co.com/xxxSQHz/kotak.png', 'https://i.ibb.co.com/qX6XqFr/kotak-wild.png',
    'https://i.ibb.co.com/BVZzR9td/mama.png', 'https://i.ibb.co.com/zWkkKkqX/mama-wild.png',
    'https://i.ibb.co.com/spnrrnJV/bulet5.png', 'https://i.ibb.co.com/rGCbh2Rc/bulet5-wild.png',
    'https://i.ibb.co.com/5XzM38bj/bambu5.png', 'https://i.ibb.co.com/5Wx10m93/bambu5-wild.png',
    'https://i.ibb.co.com/PdqGxBK/bulet2.png', 'https://i.ibb.co.com/Rk9mDZYW/bulet2-wild.png',
    'https://i.ibb.co.com/gZbRRYns/bambu2.png', 'https://i.ibb.co.com/dq9pj1W/bambu2-wild.png'
];

let loadedImages = 0; const totalImages = imageUrls.length; let hasInitialized = false;
function tryInitGame() {
    if (hasInitialized) return; hasInitialized = true;
    document.getElementById('loading-screen').classList.add('hidden'); 
    requestBalance(); // Sinkronisasi awal dengan parent
    initGameUI();
}

imageUrls.forEach(url => {
    const img = new Image(); img.src = url;
    img.onload = () => {
        loadedImages++; let percent = Math.floor((loadedImages / totalImages) * 100);
        document.getElementById('loading-percent').innerText = percent + '%';
        document.getElementById('progress-fill').style.width = percent + '%';
        if (loadedImages === totalImages) setTimeout(tryInitGame, 300); 
    };
    img.onerror = () => { loadedImages++; if (loadedImages === totalImages) setTimeout(tryInitGame, 300); };
});

// ==========================================
// 4. GLOBAL STATE & CONFIGURATIONS
// ==========================================
const betSteps = [200, 400, 1000, 2000, 5000, 10000, 20000, 50000];
let currentBetIndex = 2;

let gameState = 'IDLE'; let isTurbo = false; let isFreeSpin = false;
let freeSpinsLeft = 0; let initialFSCount = 0; let autoSpinCount = 0; let isAutoInfinity = false;
let fsTotalWinAmount = 0;

let currentMultiIndex = 0;
const multiNormal = [1, 2, 3, 5];
const multiFS = [2, 4, 6, 10];

let totalWinRound = 0;
const colsConfig = [4, 4, 4, 4, 4]; 
let gridDOM = [[], [], [], [], []];

function getTopPercent(colIdx, rowIdx) { return rowIdx * 25; }

const symbols = [
    { id: 'scatter', img: 'https://i.ibb.co.com/7tV3FCQj/sketer.png', class: 't-scatter', isScatter: true },
    { id: 'wild', img: 'https://i.ibb.co.com/hxB386yV/wild.png', class: 't-wild' },
    { id: 'fa', img: 'https://i.ibb.co.com/1fMjkfr6/pakcoy.png', imgGold: 'https://i.ibb.co.com/yc0VhQ4Y/pakcoy-wild.png', class: 't-fa' },
    { id: 'zhong', img: 'https://i.ibb.co.com/7NxZTPT1/tungtung.png', imgGold: 'https://i.ibb.co.com/rKTcbBKk/tungtung-wild.png', class: 't-zhong' },
    { id: 'purple', img: 'https://i.ibb.co.com/xxxSQHz/kotak.png', imgGold: 'https://i.ibb.co.com/qX6XqFr/kotak-wild.png', class: 't-low' },
    { id: 'wan', img: 'https://i.ibb.co.com/BVZzR9td/mama.png', imgGold: 'https://i.ibb.co.com/zWkkKkqX/mama-wild.png', class: 't-low' },
    { id: 'dots5', img: 'https://i.ibb.co.com/spnrrnJV/bulet5.png', imgGold: 'https://i.ibb.co.com/rGCbh2Rc/bulet5-wild.png', class: 't-low' },
    { id: 'bamboo5', img: 'https://i.ibb.co.com/5XzM38bj/bambu5.png', imgGold: 'https://i.ibb.co.com/5Wx10m93/bambu5-wild.png', class: 't-low' },
    { id: 'dots2', img: 'https://i.ibb.co.com/PdqGxBK/bulet2.png', imgGold: 'https://i.ibb.co.com/Rk9mDZYW/bulet2-wild.png', class: 't-low' },
    { id: 'bamboo2', img: 'https://i.ibb.co.com/gZbRRYns/bambu2.png', imgGold: 'https://i.ibb.co.com/dq9pj1W/bambu2-wild.png', class: 't-low' }
];

const paytable = {
    'fa': {3: 15, 4: 60, 5: 100}, 'zhong': {3: 10, 4: 40, 5: 80}, 'purple': {3: 8, 4: 20, 5: 60},
    'wan': {3: 6, 4: 15, 5: 40}, 'dots5': {3: 4, 4: 10, 5: 20}, 'bamboo5': {3: 4, 4: 10, 5: 20},
    'dots2': {3: 2, 4: 5, 5: 10}, 'bamboo2': {3: 2, 4: 5, 5: 10}
};

const betEl = document.getElementById('current-bet');
const winEl = document.getElementById('win-amount');
const btnSpin = document.getElementById('btn-spin');

// ==========================================
// 5. UI CONTROLS & INIT
// ==========================================
window.changeBet = function(dir) {
    if (gameState !== 'IDLE' || autoSpinCount > 0 || isFreeSpin) return;
    currentBetIndex = Math.max(0, Math.min(betSteps.length - 1, currentBetIndex + dir));
    betEl.innerText = formatRp(betSteps[currentBetIndex]);
}
window.toggleTurbo = function() {
    isTurbo = !isTurbo; let btn = document.getElementById('btn-turbo');
    if(isTurbo) btn.classList.add('active'); else btn.classList.remove('active');
}
window.openModal = function(id) { document.getElementById(id).classList.remove('hidden'); }
window.closeModal = function(id) { document.getElementById(id).classList.add('hidden'); }
window.handleAutoBtnClick = function() {
    if (autoSpinCount > 0 || isAutoInfinity) { autoSpinCount = 0; isAutoInfinity = false; updateAutoBtnText(); } 
    else openModal('auto-spin-modal');
}
window.setAutoSpin = function(amount) {
    if (amount === 'infinity') { isAutoInfinity = true; autoSpinCount = 999; }
    else { isAutoInfinity = false; autoSpinCount = amount; }
    closeModal('auto-spin-modal'); updateAutoBtnText();
    if (gameState === 'IDLE') startSpin();
}
window.startSpin = startSpin;

function updateAutoBtnText() {
    let btn = document.getElementById('btn-auto');
    if (isAutoInfinity) { btn.innerHTML = '↻<br>STOP (∞)'; btn.classList.add('active'); }
    else if (autoSpinCount > 0) { btn.innerHTML = `<span class="icon">↻</span><br>STOP (${autoSpinCount})`; btn.classList.add('active'); }
    else { btn.innerHTML = '↻<br>AUTO'; btn.classList.remove('active'); }
}

function updateMultiplierUI() {
    let activeArray = isFreeSpin ? multiFS : multiNormal;
    let boxes = document.querySelectorAll('.multi-box');
    boxes.forEach((box, idx) => {
        if (idx < 4) {
            box.style.display = 'block'; box.innerText = `x${activeArray[idx]}`;
            if (idx === currentMultiIndex) box.classList.add('active'); else box.classList.remove('active');
        } else box.style.display = 'none'; 
    });
}

function generateTileDOM(col, row, sym) {
    const tile = document.createElement('div');
    tile.className = `tile ${sym.class} ${sym.isGoldFrame ? 't-gold-frame' : ''}`;
    tile.dataset.id = sym.id; tile.dataset.gold = sym.isGoldFrame;
    let imgSrc = sym.img; if (sym.isGoldFrame && sym.imgGold) imgSrc = sym.imgGold;  
    tile.innerHTML = `<img src="${imgSrc}">`; 
    tile.style.top = `${getTopPercent(col, row)}%`;  
    tile.sym = sym; 
    return tile;  
}

function initGameUI() {
    betEl.innerText = formatRp(betSteps[currentBetIndex]);
    const initialBoard = [  
        [ {id:'dots5'}, {id:'bamboo5'}, {id:'dots2'}, {id:'bamboo2'} ],   
        [ {id:'fa'}, {id:'zhong', isGoldFrame: true}, {id:'wan'}, {id:'dots5'} ],   
        [ {id:'bamboo5'}, {id:'purple'}, {id:'bamboo2'}, {id:'dots2'} ],
        [ {id:'fa'}, {id:'bamboo2'}, {id:'purple', isGoldFrame: true}, {id:'wan'} ],   
        [ {id:'dots5'}, {id:'bamboo5'}, {id:'dots2'}, {id:'bamboo2'} ]   
    ];  
    for (let col = 0; col < 5; col++) {  
        const reel = document.getElementById(`reel-${col}`);  
        for (let row = 0; row < colsConfig[col]; row++) {  
            let symClone = { ...symbols.find(s => s.id === initialBoard[col][row].id), isGoldFrame: initialBoard[col][row].isGoldFrame || false };  
            let tile = generateTileDOM(col, row, symClone);  
            reel.appendChild(tile); gridDOM[col].push({ el: tile, sym: symClone, row: row });  
        }  
        let dTile1 = generateTileDOM(col, 0, getSymbolFromPool('ZONK', col)); dTile1.style.top = '-15%'; dTile1.classList.add('dummy-top'); reel.appendChild(dTile1);  
        let dTile2 = generateTileDOM(col, 0, getSymbolFromPool('ZONK', col)); dTile2.style.top = '100%'; dTile2.classList.add('dummy-bottom'); reel.appendChild(dTile2);  
    }  
}

// ==========================================
// 6. CUSTOM FUNCTION POOL (PG SOFT STYLE)
// ==========================================
function getSymbolFromPool(mode, col, excludeIds = []) {
    let baseElements = symbols.map(s => s.id).filter(id => id !== 'wild' && id !== 'scatter');
    let pool = [];
    
    if (mode === 'GACOR') {
        pool = ['fa', 'fa', 'zhong', 'zhong', 'purple', 'wan', 'dots5', 'bamboo5', 'wild'];
    } else if (mode === 'RECEH') {
        pool = ['dots2', 'dots2', 'dots2', 'bamboo2', 'bamboo2', 'wan', 'purple'];
    } else { 
        pool = baseElements;
    }

    if (excludeIds.length > 0) {
        pool = pool.filter(id => !excludeIds.includes(id));
        if (pool.length === 0) pool = ['dots2'];
    }

    let selectedId = pool[Math.floor(Math.random() * pool.length)];
    let symObj = symbols.find(s => s.id === selectedId);
    let sym = { ...symObj, isGoldFrame: false };
    
    let goldChance = (globalRTP / 100) * (isFreeSpin ? 0.20 : 0.05);
    if (mode === 'GACOR') goldChance += 0.15;
    
    if (col > 0 && col < 4 && selectedId !== 'scatter' && selectedId !== 'wild' && Math.random() < goldChance) {
        sym.isGoldFrame = true;
    }
    return sym;
}

function startSpin() {
    if (gameState !== 'IDLE') return;
    let bet = betSteps[currentBetIndex];
    
    gameState = 'SPINNING';  
    btnSpin.disabled = true; btnSpin.classList.add('btn-spin-anim');  
    document.getElementById('win-banner').classList.add('hidden');  

    if (!isFreeSpin) {  
        // 🌟 POTONG SALDO API: Berhenti di sini sampai disetujui parent
        potongSaldo(bet);
    } else {  
        freeSpinsLeft--; document.getElementById('fs-left-val').innerText = freeSpinsLeft;  
        totalWinRound = 0; winEl.innerText = formatRp(fsTotalWinAmount);  
        currentMultiIndex = 0; updateMultiplierUI();  
        executeRollPhase();  
    }  
}

function executeRollPhase() {
    totalSpinCount++; processAutoRTP(); 
    let targetGridData = [[], [], [], [], []];
    let randRTP = Math.random() * 100;
    
    currentSpinMode = 'ZONK'; 
    let scatterChance = 0;

    if (forceScatterNextSpin) {
        currentSpinMode = 'SCATTER'; forceScatterNextSpin = false; set(ref(db, 'admin_settings/force_scatter'), false); totalSpinCount = 0;
    } 
    else {
        if (!isFreeSpin) {
            if (globalRTP <= 30) scatterChance = (totalSpinCount > 400) ? 0.05 : 0;
            else scatterChance = 0.05 + ((globalRTP / 100) * 0.35); 
            if (Math.random() * 100 < scatterChance) { currentSpinMode = 'SCATTER'; totalSpinCount = 0; }
        } else {
            if (Math.random() * 100 < 0.8) currentSpinMode = 'SCATTER';
        }
        
        if (currentSpinMode !== 'SCATTER') {
            let gacorChance = (globalRTP / 100) * 15; let recehChance = (globalRTP / 100) * 40; 
            if (randRTP < gacorChance) currentSpinMode = 'GACOR';   
            else if (randRTP < gacorChance + recehChance) currentSpinMode = 'RECEH';   
            if (isFreeSpin && currentSpinMode === 'ZONK' && Math.random() < 0.3) currentSpinMode = 'RECEH';
        }
    }

    for (let col = 0; col < 5; col++) {
        let excludeArr = [];
        if (currentSpinMode === 'ZONK' && col === 1) excludeArr = targetGridData[0].map(s => s.id);
        for (let row = 0; row < colsConfig[col]; row++) { 
            targetGridData[col].push(getSymbolFromPool(currentSpinMode, col, excludeArr)); 
        }
    }

    if (currentSpinMode === 'SCATTER') {
        let numScatters = Math.random() < 0.1 ? 4 : 3;
        let scatterCols = [0, 1, 2, 3, 4].sort(() => 0.5 - Math.random()).slice(0, numScatters);
        scatterCols.forEach(col => {
            let row = Math.floor(Math.random() * colsConfig[col]);
            targetGridData[col][row] = { ...symbols.find(s => s.id === 'scatter'), isGoldFrame: false };
        });
    }

    if (!isFreeSpin && currentSpinMode !== 'SCATTER' && Math.random() < 0.60) { 
        let numFake = Math.random() < 0.4 ? 2 : 1; 
        let colsToFake = [0, 1, 2, 3, 4].sort(() => 0.5 - Math.random()).slice(0, numFake);
        colsToFake.forEach(col => {
            let row = Math.floor(Math.random() * colsConfig[col]);
            targetGridData[col][row] = { ...symbols.find(s => s.id === 'scatter'), isGoldFrame: false };
        });
    }

    let stopTimings = [];  
    let scatterCountSoFar = 0;  
    let baseTime = isTurbo ? 200 : 500;  
    let stepTime = isTurbo ? 100 : 300;  
    
    for (let col = 0; col < 5; col++) {  
        let colScatters = targetGridData[col].filter(s => s.id === 'scatter').length;  
        let duration = baseTime + (stepTime * col);  
        
        if (scatterCountSoFar >= 2) {
            stepTime = 2000; duration = stopTimings[col-1] + stepTime;
            document.getElementById(`reel-${col}`).classList.add('teaser-glow'); 
        }
        scatterCountSoFar += colScatters;  
        stopTimings.push(duration);  
    }  

    let maxDuration = stopTimings[4];  
    for (let col = 0; col < 5; col++) {  
        const reel = document.getElementById(`reel-${col}`); reel.innerHTML = ''; gridDOM[col] = [];  
        let strip = document.createElement('div'); strip.className = 'spin-strip-tween';  
        
        let rollDistance = isTurbo ? 20 : 40; 
        let isThisReelTeasing = stopTimings[col] > 2000; 
        if (isThisReelTeasing) rollDistance += 40; 
        
        for (let row = 0; row < colsConfig[col]; row++) { strip.appendChild(generateTileDOM(col, row, targetGridData[col][row])); }  
        
        let baseTop = getTopPercent(col, colsConfig[col]-1);   
        for (let i = 1; i <= rollDistance; i++) {  
            let dSym = getSymbolFromPool(currentSpinMode, col);
            if (isThisReelTeasing && Math.random() < 0.05) dSym = { ...symbols.find(s => s.id === 'scatter'), isGoldFrame: false };

            let dTile = generateTileDOM(col, 0, dSym); 
            dTile.style.top = `${baseTop + (i * 25)}%`; 
            strip.appendChild(dTile);  
        }  
        reel.appendChild(strip);  

        new TWEEN.Tween({ y: -(rollDistance * 25) }).to({ y: 0 }, stopTimings[col]).easing(TWEEN.Easing.Quadratic.Out)
            .onUpdate(function(obj) { strip.style.transform = `translateY(${obj.y}%)`; })
            .onComplete(function() {  
                reel.classList.remove('teaser-glow'); reel.innerHTML = '';   
                for (let row = 0; row < colsConfig[col]; row++) {  
                    let sym = targetGridData[col][row]; 
                    let tile = generateTileDOM(col, row, sym);  
                    if (sym.id === 'scatter') {
                        tile.classList.add('scatter-drop-anim');
                        setTimeout(() => tile.classList.remove('scatter-drop-anim'), 600);
                    }
                    reel.appendChild(tile); gridDOM[col].push({ el: tile, sym: sym, row: row });  
                }  
                let dTile1 = generateTileDOM(col, 0, getSymbolFromPool(currentSpinMode, col)); dTile1.style.top = '-15%'; dTile1.classList.add('dummy-top'); reel.appendChild(dTile1);  
                let dTile2 = generateTileDOM(col, 0, getSymbolFromPool(currentSpinMode, col)); dTile2.style.top = '100%'; dTile2.classList.add('dummy-bottom'); reel.appendChild(dTile2);  
            }).start();  
    }  
    setTimeout(() => { gameState = 'CASCADING'; evaluateWinningWays(); }, maxDuration + 100);  
}

// ==========================================
// 7. LOGIKA CASCADE GRAVITASI ASLI PG SOFT
// ==========================================
function evaluateWinningWays() {
    let baseWinCash = 0; let winningTilesSet = new Set(); let firstReelSyms = new Set();
    gridDOM[0].forEach(item => { if(item && item.sym && item.sym.id && item.sym.id !== 'scatter' && item.sym.id !== 'wild') firstReelSyms.add(item.sym.id); });  

    firstReelSyms.forEach(symId => {  
        if (!symId || !paytable[symId]) return;
        let matchCount = 0; let ways = 1; let involvedTiles = [];  
        for(let col = 0; col < 5; col++) {  
            let matches = gridDOM[col].filter(item => item.sym && (item.sym.id === symId || item.sym.id === 'wild'));  
            if(matches.length > 0) { matchCount++; ways *= matches.length; involvedTiles.push(...matches); } else break;   
        }  
        if(matchCount >= 3) {  
            let payout = paytable[symId][matchCount] || 0;  
            if (payout > 0) {
                let winCashRaw = payout * ways * (betSteps[currentBetIndex] / 20);   
                baseWinCash += winCashRaw; involvedTiles.forEach(i => winningTilesSet.add(i));  
            }
        }  
    });  
    if(winningTilesSet.size > 0) { triggerDestruction(winningTilesSet, baseWinCash); }   
    else { gameState = 'STOPPED'; handleScatterLogic(); }  
}

function triggerDestruction(winningTilesSet, baseWinCash) {
    let activeMultiArr = isFreeSpin ? multiFS : multiNormal;
    let activeMulti = activeMultiArr[currentMultiIndex];
    let calcWin = baseWinCash * activeMulti;

    // 🌟 TAMBAH SALDO API JIKA MENANG
    if (calcWin > 0) tambahSaldo(calcWin);

    totalWinRound += calcWin; 
    
    if (isFreeSpin) {
        fsTotalWinAmount += calcWin; 
        winEl.innerText = formatRp(fsTotalWinAmount); 
        document.getElementById('win-banner-amount').innerText = formatRp(fsTotalWinAmount);
    } else {
        winEl.innerText = formatRp(totalWinRound);  
        document.getElementById('win-banner-amount').innerText = formatRp(totalWinRound);
    }

    let banner = document.getElementById('win-banner');  
    banner.classList.remove('hidden');  

    for (let col = 0; col < 5; col++) {  
        let remainingTiles = [];  
        let destroyedCount = 0;
        
        gridDOM[col].forEach((item) => {  
            if (winningTilesSet.has(item)) {  
                if (item.sym.isGoldFrame && item.sym.id !== 'wild') {  
                    let wildObj = symbols.find(s => s.id === 'wild');  
                    item.el.className = `tile ${wildObj.class} cracking`;   
                    
                    setTimeout(() => {
                        item.el.innerHTML = `<img src="${wildObj.img}">`;  
                        item.el.dataset.id = 'wild'; item.el.dataset.gold = 'false'; item.sym = wildObj;
                        item.el.classList.remove('cracking');
                        item.el.classList.add('wild-appear'); 
                    }, 400);  
                    
                    remainingTiles.push(item);  
                } else {  
                    item.el.classList.add('cracking'); 
                    setTimeout(() => item.el.remove(), 400);  
                    destroyedCount++;
                }  
            } else { remainingTiles.push(item); }  
        });  
          
        if (destroyedCount > 0) {  
            const reel = document.getElementById(`reel-${col}`);  
            let oldDummy = reel.querySelector('.dummy-top');  
            let dummySym = oldDummy ? oldDummy.sym : getSymbolFromPool(currentSpinMode, col);  

            setTimeout(() => {  
                if (oldDummy) oldDummy.remove();  

                for (let i = remainingTiles.length - 1; i >= 0; i--) {  
                    let targetRow = colsConfig[col] - 1 - (remainingTiles.length - 1 - i);  
                    if (remainingTiles[i].row !== targetRow) {
                        remainingTiles[i].row = targetRow; 
                        remainingTiles[i].el.classList.add('smooth-fall');
                        remainingTiles[i].el.style.top = `${getTopPercent(col, targetRow)}%`;  
                    }
                }  
                
                let spawned = [];  
                let newSyms = [dummySym]; 
                for (let r = 1; r < destroyedCount; r++) {  
                    newSyms.push(getSymbolFromPool(currentSpinMode, col));   
                }  
                
                for(let i = 0; i < destroyedCount; i++) {
                    let targetRowIndex = destroyedCount - 1 - i; 
                    let sym = newSyms[i];
                    let tile = generateTileDOM(col, targetRowIndex, sym);  
                    
                    let startRow = -1 - i; 
                    tile.style.top = `${getTopPercent(col, startRow)}%`; 
                    reel.appendChild(tile); 
                    
                    void tile.offsetWidth; 
                    tile.classList.add('smooth-fall');
                    tile.style.top = `${getTopPercent(col, targetRowIndex)}%`;  
                    
                    spawned.push({ el: tile, sym: sym, row: targetRowIndex });  
                }
                
                let nextDummySym = getSymbolFromPool(currentSpinMode, col);
                let newDummy = generateTileDOM(col, 0, nextDummySym);
                
                let dummyStartRow = -1 - destroyedCount;
                newDummy.style.top = `${getTopPercent(col, dummyStartRow)}%`;
                newDummy.classList.add('dummy-top');
                reel.appendChild(newDummy);
                
                void newDummy.offsetWidth; 
                newDummy.classList.add('smooth-fall');
                newDummy.style.top = '-15%'; 

                gridDOM[col] = [...spawned, ...remainingTiles];  
            }, 400); 
        } else { gridDOM[col] = remainingTiles; }  
    }  
    
    setTimeout(() => {  
        if (currentMultiIndex < 3) { currentMultiIndex++; updateMultiplierUI(); }  
        
        for (let col = 0; col < 5; col++) {
            gridDOM[col].forEach(item => { item.el.classList.remove('smooth-fall'); });
            let dummy = document.getElementById(`reel-${col}`).querySelector('.dummy-top');
            if(dummy) dummy.classList.remove('smooth-fall');
        }

        evaluateWinningWays();  
    }, isTurbo ? 900 : 1000); 
}

// ==========================================
// 8. FREE SPIN SCENARIOS & END ROUND
// ==========================================
function countScatters() {
    let count = 0;
    for (let col = 0; col < 5; col++) { gridDOM[col].forEach(item => { if (item.sym.id === 'scatter') count++; }); }
    return count;
}

function handleScatterLogic() {
    let scatters = [];
    for (let col = 0; col < 5; col++) { 
        gridDOM[col].forEach(item => { if (item.sym.id === 'scatter') scatters.push(item.el); }); 
    }
    
    if (scatters.length >= 3) {
        scatters.forEach(el => el.classList.add('scatter-sync-anim'));
        
        setTimeout(() => {
            if (!isFreeSpin) {
                gameState = 'FS_TRANSITION';
                let spinsToAdd = 12 + ((scatters.length - 3) * 2);
                initialFSCount = spinsToAdd; triggerFreeSpin(spinsToAdd, false);
            } else {
                let extraSpins = 5; 
                triggerFreeSpin(extraSpins, true);
            }
        }, 1500); 
    } else { 
        handleEndRound(); 
    }
}

function triggerFreeSpin(amount, isRetrigger) {
    freeSpinsLeft += amount; 
    let introPopup = document.getElementById('fs-intro-popup');

    if (!isRetrigger) { 
        isFreeSpin = true; fsTotalWinAmount = 0; 
        document.body.classList.add('fs-mode'); 
        document.getElementById('fs-counter-badge').classList.remove('hidden'); 
        document.getElementById('fs-intro-title').innerText = "FREE SPINS WON";
        document.getElementById('fs-intro-desc').innerText = "ALL MULTIPLIERS DOUBLED!";
    } else {
        document.getElementById('fs-intro-title').innerText = "RETRIGGER!";
        document.getElementById('fs-intro-desc').innerText = "+5 EXTRA FREE SPINS!";
    }
    
    document.getElementById('fs-left-val').innerText = freeSpinsLeft;
    document.getElementById('fs-intro-count').innerText = amount;
    
    introPopup.classList.remove('hidden');

    setTimeout(() => {  
        introPopup.classList.add('hidden');
        if(!isRetrigger) { currentMultiIndex = 0; updateMultiplierUI(); }  
        handleEndRound(true);   
    }, 3000);  
}

function handleEndRound(skipWinAnim = false) {
    let bet = betSteps[currentBetIndex];
    let winRatio = totalWinRound / bet;
    
    if (winRatio >= 15 && !skipWinAnim) {  
        let overlay = document.getElementById('screen-overlay');
        overlay.classList.remove('hidden');  
        let titleEl = document.getElementById('win-title'); let counterEl = document.getElementById('win-counter');  
        titleEl.classList.remove('hidden'); counterEl.classList.remove('hidden');  
        
        if (winRatio >= 200) { titleEl.innerText = "SENSATIONAL WIN!"; titleEl.style.color = "#ff003c"; }  
        else if (winRatio >= 100) { titleEl.innerText = "SUPER WIN!"; titleEl.style.color = "#ffd700"; }  
        else if (winRatio >= 50) { titleEl.innerText = "MEGA WIN!"; titleEl.style.color = "#fff"; }  
        else { titleEl.innerText = "BIG WIN!"; titleEl.style.color = "#d4af37"; }  

        let currentCount = 0; let incrementStep = totalWinRound / (isTurbo ? 30 : 60);  
        let timer = setInterval(() => {  
            currentCount += incrementStep;  
            if (currentCount >= totalWinRound) {  
                currentCount = totalWinRound; clearInterval(timer);  
                setTimeout(() => { overlay.classList.add('hidden'); titleEl.classList.add('hidden'); counterEl.classList.add('hidden'); concludeStateAndLoop(); }, 2000);  
            }  
            counterEl.innerText = formatRp(Math.floor(currentCount));  
        }, 20);  
    } else { concludeStateAndLoop(); }  
}

function concludeStateAndLoop() {
    btnSpin.classList.remove('btn-spin-anim');

    if (isFreeSpin && freeSpinsLeft > 0) {  
        gameState = 'IDLE'; setTimeout(startSpin, isTurbo ? 450 : 1000);  
    } else if (isFreeSpin && freeSpinsLeft <= 0) {
        showFsOutro();
    } else {  
        gameState = 'IDLE'; btnSpin.disabled = false;  
        if (autoSpinCount > 0 && !isAutoInfinity) {  
            autoSpinCount--; updateAutoBtnText();  
            if (autoSpinCount > 0) setTimeout(startSpin, isTurbo ? 250 : 700); else updateAutoBtnText();  
        } else if (isAutoInfinity) { setTimeout(startSpin, isTurbo ? 250 : 700); }  
    }  
}

function showFsOutro() {
    let outroPopup = document.getElementById('fs-outro-popup');
    let amountEl = document.getElementById('fs-outro-amount');
    outroPopup.classList.remove('hidden');

    let currentCount = 0;
    let incrementStep = fsTotalWinAmount / 100; 
    if (fsTotalWinAmount === 0) incrementStep = 0;

    let timer = setInterval(() => {
        currentCount += incrementStep;
        if (currentCount >= fsTotalWinAmount) {
            currentCount = fsTotalWinAmount;
            clearInterval(timer);
            setTimeout(() => {
                outroPopup.classList.add('hidden');
                endFreeSpinSession();
            }, 3000); 
        }
        amountEl.innerText = formatRp(Math.floor(currentCount));
    }, 20);
}

function endFreeSpinSession() {
    isFreeSpin = false;
    document.body.classList.remove('fs-mode');
    document.getElementById('fs-counter-badge').classList.add('hidden');
    currentMultiIndex = 0; updateMultiplierUI();

    gameState = 'IDLE'; btnSpin.disabled = false;
    if (autoSpinCount > 0 && !isAutoInfinity) {
        autoSpinCount--; updateAutoBtnText();
        if (autoSpinCount > 0) setTimeout(startSpin, isTurbo ? 250 : 700); else updateAutoBtnText();
    } else if (isAutoInfinity) { setTimeout(startSpin, isTurbo ? 250 : 700); }
}
