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
