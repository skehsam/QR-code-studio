const BASE = '';
let currentType = 'single';
let currentId = null;
let currentRedirectUrl = null;

// ── Mobile nav dropdown ──────────────────────────────────────────────────────
function toggleNavDropdown() {
  const dropdown = document.getElementById('nav-dropdown');
  const chevron = document.getElementById('nav-chevron');
  const trigger = document.getElementById('nav-trigger');
  const isOpen = dropdown.classList.contains('open');
  dropdown.classList.toggle('open', !isOpen);
  chevron.classList.toggle('open', !isOpen);
  trigger.setAttribute('aria-expanded', String(!isOpen));
}

function selectNavItem(page, labelText, el) {
  // Update dropdown label
  document.getElementById('nav-label').textContent = labelText;
  // Update active state in dropdown
  document
    .querySelectorAll('.nav-dropdown-item')
    .forEach((b) => b.classList.remove('active'));
  el.classList.add('active');
  // Close dropdown
  document.getElementById('nav-dropdown').classList.remove('open');
  document.getElementById('nav-chevron').classList.remove('open');
  document.getElementById('nav-trigger').setAttribute('aria-expanded', 'false');
  // Navigate
  showPage(page, el);
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
  const nav = document.querySelector('.nav-mobile');
  if (nav && !nav.contains(e.target)) {
    document.getElementById('nav-dropdown')?.classList.remove('open');
    document.getElementById('nav-chevron')?.classList.remove('open');
    document
      .getElementById('nav-trigger')
      ?.setAttribute('aria-expanded', 'false');
  }
});

// ── Navigation ──────────────────────────────────────────────────────────────
function showPage(name, btn) {
  document
    .querySelectorAll('.page')
    .forEach((p) => p.classList.remove('active'));
  document
    .querySelectorAll('nav button')
    .forEach((b) => b.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  btn.classList.add('active');
  if (name === 'manage') loadList();
}

// ── Type selector ───────────────────────────────────────────────────────────
function selectType(type, el) {
  currentType = type;
  document
    .querySelectorAll('.type-btn')
    .forEach((b) => b.classList.remove('selected'));
  el.classList.add('selected');
  document.getElementById('field-single').style.display =
    type === 'single' || type === 'onetime' ? 'block' : 'none';
  document.getElementById('field-multilink').style.display =
    type === 'multilink' ? 'block' : 'none';
  if (
    type === 'multilink' &&
    document.getElementById('link-rows').children.length === 0
  ) {
    addLinkRow();
    addLinkRow();
  }
}

// ── Multilink rows ───────────────────────────────────────────────────────────
function addLinkRow() {
  const row = document.createElement('div');
  row.className = 'link-row';
  row.innerHTML = `
      <input type="url" placeholder="https://..." />
      <input type="text" placeholder="Label" />
      <button class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">✕</button>`;
  document.getElementById('link-rows').appendChild(row);
}

// ── Label preview ────────────────────────────────────────────────────────────
function updatePreviewLabel() {
  const label = document.getElementById('label').value.trim();
  const prev = document.getElementById('label-preview-text');
  const font = document.getElementById('text-font').value;
  const size = document.getElementById('text-size').value;
  const color = document.getElementById('text-color').value;
  const weight = document.getElementById('text-weight').value;
  const align = document.getElementById('text-align').value;

  if (label) {
    prev.textContent = label;
    prev.style.cssText = `font-family:${font}; font-size:${size}px; color:${color}; font-weight:${weight}; width:100%; text-align:${align};`;
  } else {
    prev.textContent = 'Label preview will appear here';
    prev.style.cssText = 'color:#888780; font-size:13px;';
  }
}

// ── Create QR ────────────────────────────────────────────────────────────────
async function createQR() {
  const label = document.getElementById('label').value.trim();
  const expiresIn = parseInt(document.getElementById('expires').value) || 0;
  const fgColor = document.getElementById('fg-color').value;
  const bgColor = document.getElementById('bg-color').value;
  const errorLevel = document.getElementById('error-level').value;

  let body = {
    type: currentType,
    label,
    expiresIn,
    fgColor,
    bgColor,
    errorLevel,
  };

  if (currentType === 'single' || currentType === 'onetime') {
    const url = document.getElementById('single-url').value.trim();
    if (!url) return toast('Please enter a destination URL');
    body.url = url;
  } else {
    const rows = document.querySelectorAll('#link-rows .link-row');
    const links = [];
    rows.forEach((r) => {
      const inputs = r.querySelectorAll('input');
      const url = inputs[0].value.trim();
      const lbl = inputs[1].value.trim();
      if (url) links.push({ url, label: lbl || url });
    });
    if (links.length < 1) return toast('Add at least one link');
    body.links = links;
  }

  try {
    const res = await fetch(`${BASE}/api/qr/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) return toast(data.error || 'Error');
    currentId = data.id;
    currentRedirectUrl = data.redirectUrl;
    showQR(data);
  } catch (e) {
    toast('Could not connect to server. Is it running?');
  }
}

function showQR(data) {
  const wrap = document.getElementById('qr-img-wrap');
  wrap.innerHTML = '';
  const img = new Image();
  img.src = data.qrDataUrl;
  img.style.width = '240px';
  img.style.height = '240px';
  wrap.appendChild(img);

  const labelOut = document.getElementById('label-output');
  const labelVal = document.getElementById('label').value.trim();
  if (labelVal) {
    labelOut.textContent = labelVal;
    const font = document.getElementById('text-font').value;
    const size = document.getElementById('text-size').value;
    const color = document.getElementById('text-color').value;
    const weight = document.getElementById('text-weight').value;
    const align = document.getElementById('text-align').value;
    labelOut.style.cssText = `font-family:${font}; font-size:${size}px; color:${color}; font-weight:${weight}; text-align:${align}; display:block;`;
  } else {
    labelOut.style.display = 'none';
  }

  document.getElementById('qr-url-text').textContent = data.redirectUrl;
  document.getElementById('scan-count').textContent = data.record.scanned;
  document.getElementById('qr-placeholder').style.display = 'none';
  document.getElementById('qr-output').style.display = 'flex';
  toast('QR code created!');
}

// ── Downloads ────────────────────────────────────────────────────────────────
function downloadQR(type) {
  const img = document.querySelector('#qr-img-wrap img');
  if (!img) return;
  const link = document.createElement('a');
  if (type === 'png') {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, 300, 300);
    link.download = 'qrcode.png';
    link.href = canvas.toDataURL('image/png');
  } else {
    const svgData = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><image href="${img.src}" width="300" height="300"/></svg>`;
    link.download = 'qrcode.svg';
    link.href = 'data:image/svg+xml;base64,' + btoa(svgData);
  }
  link.click();
}

function copyLink() {
  if (!currentRedirectUrl) return;
  navigator.clipboard
    .writeText(currentRedirectUrl)
    .then(() => toast('Link copied!'));
}

// ── Manage list ──────────────────────────────────────────────────────────────
async function loadList() {
  try {
    const res = await fetch(`${BASE}/api/qr/list`);
    const data = await res.json();
    const tbody = document.getElementById('qr-table-body');

    if (!data.length) {
      tbody.innerHTML =
        '<tr><td colspan="7" style="color:#888780; text-align:center; padding:2rem;">No QR codes yet</td></tr>';
      return;
    }

    tbody.innerHTML = data
      .map((r) => {
        const expired = r.expiresAt && new Date() > new Date(r.expiresAt);
        const status =
          r.type === 'onetime' && r.used
            ? 'used'
            : expired
              ? 'expired'
              : 'active';
        const statusBadge = `<span class="badge badge-${status}">${status}</span>`;
        const typeBadge = `<span class="badge badge-${r.type}">${r.type}</span>`;
        const expires = r.expiresAt
          ? new Date(r.expiresAt).toLocaleString()
          : '—';
        const created = new Date(r.createdAt).toLocaleDateString();
        return `<tr>
          <td style="font-weight:500;">${r.label || '—'}</td>
          <td>${typeBadge}</td>
          <td>${statusBadge}</td>
          <td>${r.scanned}</td>
          <td style="font-size:12px; color:#6b6b67;">${expires}</td>
          <td style="font-size:12px; color:#6b6b67;">${created}</td>
          <td>
            <button class="btn btn-sm btn-danger" onclick="deleteQR('${r.id}')">Delete</button>
          </td>
        </tr>`;
      })
      .join('');
  } catch (e) {
    toast('Could not load list. Is the server running?');
  }
}

async function deleteQR(id) {
  if (!confirm('Delete this QR code?')) return;
  await fetch(`${BASE}/api/qr/${id}`, { method: 'DELETE' });
  loadList();
  toast('Deleted');
}

// ── Toast ────────────────────────────────────────────────────────────────────
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

// ── Scanner ──────────────────────────────────────────────────────────────────
let scanStream = null;
let scanRAF = null;
let scanFacingMode = 'environment';
let scanTorchOn = false;
let scanUploadImg = null;
let scanHistory = JSON.parse(localStorage.getItem('qr-scan-history') || '[]');

const scanVideo = () => document.getElementById('scan-video-el');
const scanCanvas = () => document.getElementById('scan-canvas');

function scanSwitchTab(name, btn) {
  document
    .querySelectorAll('.scan-tab-panel')
    .forEach((p) => p.classList.remove('active'));
  document
    .querySelectorAll('.scan-tab-btn')
    .forEach((b) => b.classList.remove('active'));
  document.getElementById('scan-tab-' + name).classList.add('active');
  btn.classList.add('active');
  if (name === 'upload') scanStopCamera();
}

async function scanStartCamera() {
  try {
    scanStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: scanFacingMode,
        width: { ideal: 640 },
        height: { ideal: 640 },
      },
    });
    const v = scanVideo();
    v.srcObject = scanStream;
    await v.play();
    document.getElementById('scan-cam-placeholder').style.display = 'none';
    document.getElementById('scan-video-wrap').style.display = 'block';
    document.getElementById('scan-btn-start').style.display = 'none';
    document.getElementById('scan-btn-stop').style.display = 'inline-flex';
    document.getElementById('scan-btn-flip').style.display = 'inline-flex';
    const track = scanStream.getVideoTracks()[0];
    if (track.getCapabilities?.()?.torch) {
      document.getElementById('scan-btn-torch').style.display = 'inline-flex';
    }
    scanSetStatus('scanning');
    scanLoop();
  } catch (e) {
    toast('Camera access denied or unavailable');
  }
}

function scanStopCamera() {
  if (scanStream) {
    scanStream.getTracks().forEach((t) => t.stop());
    scanStream = null;
  }
  if (scanRAF) {
    cancelAnimationFrame(scanRAF);
    scanRAF = null;
  }
  const v = scanVideo();
  if (v) v.srcObject = null;
  document.getElementById('scan-cam-placeholder').style.display = 'flex';
  document.getElementById('scan-video-wrap').style.display = 'none';
  document.getElementById('scan-btn-start').style.display = 'inline-flex';
  document.getElementById('scan-btn-stop').style.display = 'none';
  document.getElementById('scan-btn-flip').style.display = 'none';
  document.getElementById('scan-btn-torch').style.display = 'none';
  scanTorchOn = false;
  scanSetStatus('idle');
}

async function scanFlipCamera() {
  scanFacingMode = scanFacingMode === 'environment' ? 'user' : 'environment';
  scanStopCamera();
  await scanStartCamera();
}

async function scanToggleTorch() {
  if (!scanStream) return;
  scanTorchOn = !scanTorchOn;
  try {
    await scanStream
      .getVideoTracks()[0]
      .applyConstraints({ advanced: [{ torch: scanTorchOn }] });
    document.getElementById('scan-btn-torch').textContent = scanTorchOn
      ? '🔦 Torch on'
      : '🔦 Torch';
  } catch {
    toast('Torch not supported on this device');
  }
}

function scanLoop() {
  if (!scanStream) return;
  const v = scanVideo();
  const c = scanCanvas();
  if (v.readyState === v.HAVE_ENOUGH_DATA) {
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(v, 0, 0);
    const imgData = ctx.getImageData(0, 0, c.width, c.height);
    if (typeof jsQR !== 'undefined') {
      const code = jsQR(imgData.data, imgData.width, imgData.height, {
        inversionAttempts: 'dontInvert',
      });
      if (code) {
        scanHandleResult(code.data);
        return;
      }
    }
  }
  scanRAF = requestAnimationFrame(scanLoop);
}

function scanHandleFile(file) {
  if (!file) return;
  const url = URL.createObjectURL(file);
  const img = document.getElementById('scan-upload-preview');
  img.src = url;
  img.onload = () => {
    scanUploadImg = img;
  };
  document.getElementById('scan-upload-preview-wrap').style.display = 'block';
  document.getElementById('scan-btn-decode').style.display = 'inline-flex';
}

function scanDecodeUpload() {
  if (!scanUploadImg) return;
  const c = scanCanvas();
  c.width = scanUploadImg.naturalWidth;
  c.height = scanUploadImg.naturalHeight;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(scanUploadImg, 0, 0);
  const imgData = ctx.getImageData(0, 0, c.width, c.height);
  if (typeof jsQR !== 'undefined') {
    const code = jsQR(imgData.data, imgData.width, imgData.height, {
      inversionAttempts: 'attemptBoth',
    });
    if (code) {
      scanHandleResult(code.data);
      return;
    }
  }
  toast('No QR code found in this image');
}

function scanHandleResult(text) {
  scanStopCamera();
  scanSetStatus('found');
  const isUrl = /^https?:\/\//i.test(text);
  const el = document.getElementById('scan-result-value');
  el.innerHTML = isUrl
    ? `<a href="${text}" target="_blank" rel="noopener" style="color:#185fa5; text-decoration:none;">${text}</a>`
    : text;
  document.getElementById('scan-btn-open').style.display = isUrl
    ? 'inline-flex'
    : 'none';
  document.getElementById('scan-result-area').style.display = 'block';
  scanAddToHistory(text);
  toast('QR code scanned!');
}

function scanClearResult() {
  document.getElementById('scan-result-area').style.display = 'none';
  document.getElementById('scan-result-value').textContent = '';
  scanSetStatus('idle');
}

function scanCopyResult() {
  const text = document.getElementById('scan-result-value').textContent;
  navigator.clipboard.writeText(text).then(() => toast('Copied!'));
}

function scanOpenResult() {
  const a = document.querySelector('#scan-result-value a');
  if (a) window.open(a.href, '_blank', 'noopener');
}

function scanSetStatus(state) {
  const pill = document.getElementById('scan-status-pill');
  if (!pill) return;
  pill.className = 'scan-status-pill scan-' + state;
  const labels = { idle: 'Idle', scanning: 'Scanning…', found: 'Found' };
  pill.innerHTML = `<span class="scan-dot"></span>${labels[state] || state}`;
}

function scanAddToHistory(text) {
  scanHistory.unshift({ text, time: new Date().toISOString() });
  if (scanHistory.length > 20) scanHistory.pop();
  localStorage.setItem('qr-scan-history', JSON.stringify(scanHistory));
  scanRenderHistory();
}

function scanClearHistory() {
  scanHistory = [];
  localStorage.removeItem('qr-scan-history');
  scanRenderHistory();
}

function scanRenderHistory() {
  const area = document.getElementById('scan-history-area');
  const list = document.getElementById('scan-history-list');
  if (!area || !list) return;
  if (!scanHistory.length) {
    area.style.display = 'none';
    return;
  }
  area.style.display = 'block';
  list.innerHTML = scanHistory
    .map((h) => {
      const t = new Date(h.time);
      const timeStr = t.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      const safeText = h.text.replace(/"/g, '&quot;').replace(/</g, '&lt;');
      const jsText = JSON.stringify(h.text);
      return `<div class="scan-history-item">
      <span class="hi-text" title="${safeText}">${safeText}</span>
      <span class="hi-time">${timeStr}</span>
      <button class="hi-copy" title="Copy" onclick="navigator.clipboard.writeText(${jsText}).then(()=>toast('Copied!'))">📋</button>
    </div>`;
    })
    .join('');
}

// Drag-and-drop for scan upload zone
document.addEventListener('DOMContentLoaded', () => {
  const dz = document.getElementById('scan-drop-zone');
  if (dz) {
    dz.addEventListener('dragover', (e) => {
      e.preventDefault();
      dz.classList.add('drag-over');
    });
    dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
    dz.addEventListener('drop', (e) => {
      e.preventDefault();
      dz.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) scanHandleFile(file);
    });
  }
  scanRenderHistory();
});
