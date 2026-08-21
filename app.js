(() => {
  'use strict';

  const APP_NAME = 'BilaDrive';
  const APP_VERSION = '0.1.0';
  const INDEX_VERSION = 1;
  const DIRECT_UPLOAD_LIMIT = 25 * 1024 * 1024;
  const PBKDF2_ITERATIONS = 310000;
  const DB_NAME = 'biladrive-local';
  const DB_VERSION = 1;
  const STORE = 'files';

  const GATEWAYS = [
    'https://arweave.net',
    'https://g8way.io',
    'https://ar-io.dev'
  ];

  const state = {
    db: null,
    arweave: null,
    gateway: GATEWAYS[0],
    gatewayHealth: [],
    walletMode: null,
    address: null,
    jwk: null,
    records: []
  };

  const $ = (id) => document.getElementById(id);
  const ui = {
    networkStatus: $('networkStatus'), gatewayStatus: $('gatewayStatus'), walletStatus: $('walletStatus'), recordCount: $('recordCount'),
    consoleOutput: $('consoleOutput'), fileTableBody: $('fileTableBody'), searchInput: $('searchInput'), fileInput: $('fileInput'),
    modeSelect: $('modeSelect'), passwordField: $('passwordField'), passwordInput: $('passwordInput'), jwkInput: $('jwkInput'), indexInput: $('indexInput'),
    connectArConnectBtn: $('connectArConnectBtn'), importJwkBtn: $('importJwkBtn'), disconnectBtn: $('disconnectBtn'), syncBtn: $('syncBtn'),
    checkGatewaysBtn: $('checkGatewaysBtn'), exportIndexBtn: $('exportIndexBtn'), importIndexBtn: $('importIndexBtn'), estimateBtn: $('estimateBtn'), uploadBtn: $('uploadBtn')
  };

  function log(message, level = 'INFO') {
    const now = new Date().toLocaleTimeString('vi-VN', { hour12: false });
    ui.consoleOutput.textContent += `[${now}] ${level.padEnd(5)} ${message}\n`;
    ui.consoleOutput.scrollTop = ui.consoleOutput.scrollHeight;
  }

  function initArweave(gatewayUrl) {
    const url = new URL(gatewayUrl);
    return Arweave.init({ host: url.hostname, port: url.port ? Number(url.port) : (url.protocol === 'https:' ? 443 : 80), protocol: url.protocol.replace(':', ''), timeout: 20000, logging: false });
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes)) return '-';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let value = bytes, unit = 0;
    while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit++; }
    return `${value.toFixed(value < 10 && unit > 0 ? 2 : 1)} ${units[unit]}`;
  }

  function shortId(id) { return id && id.length > 20 ? `${id.slice(0, 10)}…${id.slice(-8)}` : (id || '-'); }

  function bytesToBase64(bytes) {
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    return btoa(binary);
  }

  function base64ToBytes(value) {
    const binary = atob(value), bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  async function sha256Hex(text) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  async function deriveAesKey(password, salt, iterations = PBKDF2_ITERATIONS) {
    const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), { name: 'PBKDF2' }, false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }

  async function encryptFile(file, password) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveAesKey(password, salt);
    const plaintext = await file.arrayBuffer();
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
    return { data: new Uint8Array(ciphertext), salt: bytesToBase64(salt), iv: bytesToBase64(iv), iterations: PBKDF2_ITERATIONS };
  }

  async function decryptRecord(record, password, encryptedBytes) {
    const salt = base64ToBytes(record.crypto.salt), iv = base64ToBytes(record.crypto.iv);
    const key = await deriveAesKey(password, salt, record.crypto.iterations || PBKDF2_ITERATIONS);
    return crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encryptedBytes);
  }

  function openDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) { const store = db.createObjectStore(STORE, { keyPath: 'txId' }); store.createIndex('createdAt', 'createdAt'); }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function idbAll() {
    return new Promise((resolve, reject) => {
      const req = state.db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
      req.onsuccess = () => resolve(req.result || []); req.onerror = () => reject(req.error);
    });
  }

  function idbPut(record) {
    return new Promise((resolve, reject) => {
      const req = state.db.transaction(STORE, 'readwrite').objectStore(STORE).put(record);
      req.onsuccess = () => resolve(); req.onerror = () => reject(req.error);
    });
  }

  async function reloadRecords() {
    state.records = (await idbAll()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    ui.recordCount.textContent = String(state.records.length); renderRecords();
  }

  function escapeHtml(value) {
    return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
  }

  function renderRecords() {
    const q = ui.searchInput.value.trim().toLowerCase();
    const data = state.records.filter((r) => !q || [r.name, r.mime, r.txId, r.mode, r.status, r.owner].filter(Boolean).join(' ').toLowerCase().includes(q));
    if (!data.length) { ui.fileTableBody.innerHTML = '<tr><td colspan="7" class="empty">KHÔNG CÓ BẢN GHI PHÙ HỢP.</td></tr>'; return; }
    ui.fileTableBody.innerHTML = data.map((r) => {
      const privateClass = r.mode === 'private' ? 'mode-private' : '';
      const gatewayUrl = `${state.gateway}/${r.txId}`;
      return `<tr><td>${escapeHtml(r.name || (r.mode === 'private' ? '[PRIVATE FILE]' : '[UNKNOWN]'))}</td><td>${escapeHtml(r.mime || '-')}</td><td>${formatBytes(Number(r.originalSize || r.size || 0))}</td><td class="${privateClass}">${escapeHtml((r.mode || 'public').toUpperCase())}</td><td class="tx" title="${escapeHtml(r.txId)}">${escapeHtml(shortId(r.txId))}</td><td>${escapeHtml(r.status || 'LOCAL')}</td><td class="actions"><button data-action="open" data-id="${escapeHtml(r.txId)}">OPEN</button><button data-action="download" data-id="${escapeHtml(r.txId)}">DOWNLOAD</button><button data-action="recovery" data-id="${escapeHtml(r.txId)}">RECOVERY</button><a href="${gatewayUrl}" target="_blank" rel="noreferrer">GW</a></td></tr>`;
    }).join('');
  }

  async function fetchWithFailover(path, options = {}, timeoutMs = 8000) {
    const ordered = [state.gateway, ...GATEWAYS.filter((g) => g !== state.gateway)];
    let lastError;
    for (const gateway of ordered) {
      const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(`${gateway}${path}`, { ...options, signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        clearTimeout(timer);
        if (gateway !== state.gateway) { state.gateway = gateway; state.arweave = initArweave(gateway); updateGatewayUi(); log(`Failover sang gateway ${gateway}.`, 'WARN'); }
        return response;
      } catch (error) { clearTimeout(timer); lastError = error; }
    }
    throw lastError || new Error('Không gateway nào phản hồi.');
  }

  async function checkGateways() {
    ui.networkStatus.textContent = 'CHECKING'; log('Kiểm tra pool gateway...');
    const results = await Promise.all(GATEWAYS.map(async (gateway) => {
      const started = performance.now(); const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 5000);
      try { const response = await fetch(`${gateway}/info`, { signal: controller.signal, cache: 'no-store' }); if (!response.ok) throw new Error(`HTTP ${response.status}`); const info = await response.json(); return { gateway, ok: true, latency: Math.round(performance.now() - started), height: info.height || 0 }; }
      catch (error) { return { gateway, ok: false, latency: Number.MAX_SAFE_INTEGER, error: error.message }; }
      finally { clearTimeout(timer); }
    }));
    state.gatewayHealth = results;
    const healthy = results.filter((r) => r.ok).sort((a, b) => a.latency - b.latency);
    if (!healthy.length) { ui.networkStatus.textContent = 'OFFLINE'; log('Không tìm thấy gateway khỏe.', 'ERROR'); return; }
    state.gateway = healthy[0].gateway; state.arweave = initArweave(state.gateway); ui.networkStatus.textContent = `ONLINE @ ${healthy[0].height}`; updateGatewayUi();
    results.forEach((r) => log(`${r.ok ? 'OK  ' : 'FAIL'} ${r.gateway}${r.ok ? ` // ${r.latency}ms // height ${r.height}` : ` // ${r.error}`}`));
  }

  function updateGatewayUi() { ui.gatewayStatus.textContent = new URL(state.gateway).hostname; }

  async function connectArConnect() {
    if (!window.arweaveWallet) throw new Error('Không phát hiện ArConnect. Hãy cài extension ArConnect hoặc dùng JWK cục bộ.');
    await window.arweaveWallet.connect(['ACCESS_ADDRESS', 'SIGN_TRANSACTION']);
    state.walletMode = 'arconnect'; state.address = await window.arweaveWallet.getActiveAddress(); state.jwk = null; updateWalletUi(); log(`Đã kết nối ArConnect: ${state.address}`);
  }

  async function importJwk(file) {
    const jwk = JSON.parse(await file.text());
    if (!jwk || jwk.kty !== 'RSA' || !jwk.n || !jwk.d) throw new Error('JWK không hợp lệ hoặc không chứa private key.');
    state.jwk = jwk; state.address = await state.arweave.wallets.jwkToAddress(jwk); state.walletMode = 'jwk'; updateWalletUi();
    log(`Đã nạp JWK vào RAM: ${state.address}. Khóa không được lưu IndexedDB/localStorage.`, 'WARN');
  }

  async function disconnectWallet() {
    if (state.walletMode === 'arconnect' && window.arweaveWallet?.disconnect) { try { await window.arweaveWallet.disconnect(); } catch (_) {} }
    state.jwk = null; state.address = null; state.walletMode = null; updateWalletUi(); log('Đã xóa trạng thái ví khỏi phiên làm việc.');
  }

  function updateWalletUi() { ui.walletStatus.textContent = state.address ? `${state.walletMode.toUpperCase()} ${shortId(state.address)}` : 'DISCONNECTED'; }

  async function getPrice(bytes) {
    const response = await fetchWithFailover(`/price/${Math.ceil(bytes)}`, { method: 'GET' }, 8000);
    const winston = (await response.text()).trim();
    return { winston, ar: state.arweave.ar.winstonToAr(winston) };
  }

  async function estimateUpload() {
    const file = ui.fileInput.files[0]; if (!file) throw new Error('Chưa chọn tệp.');
    let bytes = file.size; if (ui.modeSelect.value === 'private') bytes += 16;
    const price = await getPrice(bytes); log(`Ước tính ${formatBytes(bytes)}: ${price.ar} AR (${price.winston} winston).`);
  }

  function requireWallet() { if (!state.address || (!state.jwk && state.walletMode !== 'arconnect')) throw new Error('Hãy kết nối ArConnect hoặc nạp JWK trước khi upload.'); }

  async function createSignedTransaction(data, tags) {
    const transaction = await state.arweave.createTransaction({ data }, state.jwk || undefined);
    for (const [name, value] of Object.entries(tags)) transaction.addTag(name, String(value));
    await state.arweave.transactions.sign(transaction, state.jwk || undefined);
    return transaction;
  }

  async function postSignedTransaction(transaction) {
    const ordered = [state.gateway, ...GATEWAYS.filter((g) => g !== state.gateway)]; let lastError;
    for (const gateway of ordered) {
      try {
        const ar = initArweave(gateway); const response = await ar.transactions.post(transaction);
        if (response.status >= 200 && response.status < 300) { if (gateway !== state.gateway) { state.gateway = gateway; state.arweave = ar; updateGatewayUi(); } return response; }
        throw new Error(`Gateway ${gateway} trả HTTP ${response.status}`);
      } catch (error) { lastError = error; log(`Post thất bại tại ${gateway}: ${error.message}`, 'WARN'); }
    }
    throw lastError || new Error('Không thể gửi transaction qua gateway pool.');
  }

  async function uploadFile() {
    requireWallet();
    const file = ui.fileInput.files[0]; if (!file) throw new Error('Chưa chọn tệp.');
    if (file.size > DIRECT_UPLOAD_LIMIT) throw new Error(`MVP direct-upload giới hạn ${formatBytes(DIRECT_UPLOAD_LIMIT)}. File lớn nên dùng Turbo/ANS-104 trong bản tiếp theo.`);
    const mode = ui.modeSelect.value, fileId = crypto.randomUUID();
    let data, cryptoMeta = null; const contentType = file.type || 'application/octet-stream';
    const baseTags = { 'App-Name': APP_NAME, 'App-Version': APP_VERSION, 'BilaDrive-Format': 'BilaFS/0.1', 'BilaDrive-File-Id': fileId, 'BilaDrive-Mode': mode, 'BilaDrive-Original-Size': file.size };
    if (mode === 'private') {
      const password = ui.passwordInput.value; if (!password || password.length < 10) throw new Error('Private mode yêu cầu mật khẩu tối thiểu 10 ký tự.');
      log(`Đang mã hóa ${file.name} bằng AES-256-GCM...`);
      const encrypted = await encryptFile(file, password); data = encrypted.data;
      cryptoMeta = { alg: 'AES-256-GCM', kdf: 'PBKDF2-SHA-256', iterations: encrypted.iterations, salt: encrypted.salt, iv: encrypted.iv };
      Object.assign(baseTags, { 'Content-Type': 'application/octet-stream', 'BilaDrive-Cipher': cryptoMeta.alg, 'BilaDrive-KDF': cryptoMeta.kdf, 'BilaDrive-KDF-Iterations': cryptoMeta.iterations, 'BilaDrive-Salt': cryptoMeta.salt, 'BilaDrive-IV': cryptoMeta.iv, 'BilaDrive-Name-Hash': await sha256Hex(file.name) });
    } else {
      data = new Uint8Array(await file.arrayBuffer()); Object.assign(baseTags, { 'Content-Type': contentType, 'File-Name': file.name });
    }
    const price = await getPrice(data.byteLength);
    const confirmation = window.confirm(`BilaDrive sẽ ghi ${mode.toUpperCase()} ${formatBytes(data.byteLength)} lên Arweave.\nPhí ước tính: ${price.ar} AR.\n\n${mode === 'public' ? 'PUBLIC gần như không thể thu hồi sau khi xác nhận.' : 'PRIVATE: hãy giữ mật khẩu + recovery index.'}\n\nTiếp tục?`);
    if (!confirmation) return;
    ui.uploadBtn.disabled = true;
    try {
      log(`Đang tạo transaction cho ${file.name}...`);
      const transaction = await createSignedTransaction(data, baseTags); log(`Đã ký transaction ${transaction.id}. Đang gửi qua gateway pool...`); await postSignedTransaction(transaction);
      const record = { indexVersion: INDEX_VERSION, txId: transaction.id, fileId, name: file.name, mime: contentType, size: data.byteLength, originalSize: file.size, mode, crypto: cryptoMeta, owner: state.address, gatewayAtUpload: state.gateway, createdAt: new Date().toISOString(), status: 'SUBMITTED' };
      await idbPut(record); await reloadRecords(); ui.fileInput.value = ''; ui.passwordInput.value = ''; log(`UPLOAD OK // TX ${transaction.id}`);
      if (mode === 'private') { downloadJson(`${safeFileName(file.name)}.biladrive-recovery.json`, makeRecoveryBundle(record)); log('Đã xuất recovery bundle. Bundle KHÔNG chứa mật khẩu.', 'WARN'); }
    } finally { ui.uploadBtn.disabled = false; }
  }

  function safeFileName(name) { return String(name || 'file').replace(/[\\/:*?"<>|]+/g, '_'); }

  function makeRecoveryBundle(record) {
    return { format: 'BilaDrive-Recovery/1', warning: 'Không chứa mật khẩu. Cần mật khẩu riêng để giải mã.', txId: record.txId, fileId: record.fileId, name: record.name, mime: record.mime, originalSize: record.originalSize, mode: record.mode, crypto: record.crypto, owner: record.owner, createdAt: record.createdAt };
  }

  async function downloadRecord(record, openOnly = false) {
    if (!record) return;
    if (record.mode !== 'private' && openOnly) { window.open(`${state.gateway}/${record.txId}`, '_blank', 'noopener'); return; }
    log(`Đang tải ${record.txId} qua gateway failover...`);
    const response = await fetchWithFailover(`/${record.txId}`, { method: 'GET' }, 15000); const bytes = await response.arrayBuffer(); let blob;
    if (record.mode === 'private') {
      if (!record.crypto?.salt || !record.crypto?.iv) throw new Error('Thiếu crypto metadata. Hãy nhập recovery index/bundle trước.');
      const password = window.prompt('Nhập mật khẩu để giải mã tệp PRIVATE:'); if (!password) return;
      try { const plaintext = await decryptRecord(record, password, bytes); blob = new Blob([plaintext], { type: record.mime || 'application/octet-stream' }); }
      catch (_) { throw new Error('Giải mã thất bại: mật khẩu sai hoặc ciphertext/metadata không khớp.'); }
    } else blob = new Blob([bytes], { type: record.mime || response.headers.get('content-type') || 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    if (openOnly) { window.open(url, '_blank', 'noopener'); setTimeout(() => URL.revokeObjectURL(url), 60000); }
    else { const a = document.createElement('a'); a.href = url; a.download = record.name || record.txId; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
  }

  function downloadJson(filename, object) {
    const blob = new Blob([JSON.stringify(object, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  async function exportIndex() {
    downloadJson(`biladrive-index-${new Date().toISOString().slice(0, 10)}.json`, { format: 'BilaDrive-Portable-Index/1', exportedAt: new Date().toISOString(), appVersion: APP_VERSION, records: state.records.map((r) => ({ ...r })) });
    log(`Đã xuất portable index gồm ${state.records.length} bản ghi.`);
  }

  async function importIndex(file) {
    const payload = JSON.parse(await file.text()); const records = payload.records || (payload.txId ? [payload] : []);
    if (!Array.isArray(records) || !records.length) throw new Error('Không có bản ghi BilaDrive hợp lệ.');
    let count = 0;
    for (const item of records) { if (!item.txId) continue; await idbPut({ indexVersion: INDEX_VERSION, status: 'IMPORTED', createdAt: new Date().toISOString(), ...item }); count++; }
    await reloadRecords(); log(`Đã nhập ${count} bản ghi vào local index.`);
  }

  function tagsToObject(tags) { return Object.fromEntries((tags || []).map((t) => [t.name, t.value])); }

  async function syncFromNetwork() {
    if (!state.address) throw new Error('Cần kết nối ví để biết owner cần đồng bộ.');
    const query = `query($owner: String!) { transactions(owners: [$owner], tags: [{name: "App-Name", values: ["${APP_NAME}"]}], first: 100, sort: HEIGHT_DESC) { edges { node { id owner { address } block { height timestamp } tags { name value } } } } }`;
    const response = await fetchWithFailover('/graphql', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables: { owner: state.address } }) }, 12000);
    const payload = await response.json(); if (payload.errors?.length) throw new Error(payload.errors[0].message || 'GraphQL error');
    const edges = payload.data?.transactions?.edges || []; let imported = 0;
    for (const { node } of edges) {
      const tags = tagsToObject(node.tags), mode = tags['BilaDrive-Mode'] || 'public', local = state.records.find((r) => r.txId === node.id);
      const cryptoMeta = mode === 'private' ? { alg: tags['BilaDrive-Cipher'] || 'AES-256-GCM', kdf: tags['BilaDrive-KDF'] || 'PBKDF2-SHA-256', iterations: Number(tags['BilaDrive-KDF-Iterations'] || PBKDF2_ITERATIONS), salt: tags['BilaDrive-Salt'], iv: tags['BilaDrive-IV'] } : null;
      const record = { indexVersion: INDEX_VERSION, txId: node.id, fileId: tags['BilaDrive-File-Id'], name: local?.name || tags['File-Name'] || (mode === 'private' ? `[PRIVATE-${node.id.slice(0, 8)}]` : `[FILE-${node.id.slice(0, 8)}]`), mime: local?.mime || tags['Content-Type'] || 'application/octet-stream', size: local?.size || Number(tags['BilaDrive-Original-Size'] || 0), originalSize: local?.originalSize || Number(tags['BilaDrive-Original-Size'] || 0), mode, crypto: local?.crypto || cryptoMeta, owner: node.owner?.address || state.address, createdAt: local?.createdAt || (node.block?.timestamp ? new Date(node.block.timestamp * 1000).toISOString() : new Date().toISOString()), status: node.block ? `MINED @ ${node.block.height}` : 'PENDING' };
      await idbPut(record); if (!local) imported++;
    }
    await reloadRecords(); log(`Sync hoàn tất: ${edges.length} transaction, ${imported} bản ghi mới.`);
  }

  function bindEvents() {
    ui.modeSelect.addEventListener('change', () => { ui.passwordField.hidden = ui.modeSelect.value !== 'private'; });
    ui.searchInput.addEventListener('input', renderRecords);
    ui.connectArConnectBtn.addEventListener('click', () => runUi(connectArConnect));
    ui.importJwkBtn.addEventListener('click', () => ui.jwkInput.click());
    ui.jwkInput.addEventListener('change', () => { const file = ui.jwkInput.files[0]; if (file) runUi(() => importJwk(file)); ui.jwkInput.value = ''; });
    ui.disconnectBtn.addEventListener('click', () => runUi(disconnectWallet)); ui.syncBtn.addEventListener('click', () => runUi(syncFromNetwork)); ui.checkGatewaysBtn.addEventListener('click', () => runUi(checkGateways));
    ui.exportIndexBtn.addEventListener('click', () => runUi(exportIndex)); ui.importIndexBtn.addEventListener('click', () => ui.indexInput.click());
    ui.indexInput.addEventListener('change', () => { const file = ui.indexInput.files[0]; if (file) runUi(() => importIndex(file)); ui.indexInput.value = ''; });
    ui.estimateBtn.addEventListener('click', () => runUi(estimateUpload)); ui.uploadBtn.addEventListener('click', () => runUi(uploadFile));
    ui.fileTableBody.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-action]'); if (!button) return; const record = state.records.find((r) => r.txId === button.dataset.id); if (!record) return;
      if (button.dataset.action === 'download') runUi(() => downloadRecord(record, false));
      if (button.dataset.action === 'open') runUi(() => downloadRecord(record, true));
      if (button.dataset.action === 'recovery') downloadJson(`${safeFileName(record.name || record.txId)}.biladrive-recovery.json`, makeRecoveryBundle(record));
    });
  }

  async function runUi(fn) { try { await fn(); } catch (error) { console.error(error); log(error.message || String(error), 'ERROR'); window.alert(error.message || String(error)); } }

  async function boot() {
    if (!window.Arweave) { ui.networkStatus.textContent = 'SDK ERROR'; log('Không tải được arweave-js. Kiểm tra mạng/CDN hoặc vendor SDK.', 'ERROR'); return; }
    state.arweave = initArweave(state.gateway); updateGatewayUi(); bindEvents(); state.db = await openDb(); await reloadRecords(); log('Local-first index sẵn sàng.'); await checkGateways(); log('BilaDrive READY.');
  }

  boot().catch((error) => { console.error(error); log(error.message || String(error), 'ERROR'); });
})();
