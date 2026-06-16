const express = require('express');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory store (replace with a database for production)
const qrStore = {};

// ─── Create QR code ───────────────────────────────────────────────────────────
app.post('/api/qr/create', async (req, res) => {
  const {
    type, // 'single' | 'multilink' | 'onetime'
    url, // single URL
    links, // [{ url, label }] for multilink
    expiresIn, // minutes until expiry (0 = never)
    label,
    fgColor,
    bgColor,
    errorLevel,
  } = req.body;

  if (!type) return res.status(400).json({ error: 'type is required' });

  const id = uuidv4();
  const redirectUrl = `${req.protocol}://${req.get('host')}/r/${id}`;

  const expiresAt =
    expiresIn && expiresIn > 0
      ? new Date(Date.now() + expiresIn * 60 * 1000).toISOString()
      : null;

  qrStore[id] = {
    id,
    type,
    url: url || null,
    links: links || [],
    expiresAt,
    label: label || '',
    fgColor: fgColor || '#000000',
    bgColor: bgColor || '#ffffff',
    scanned: 0,
    used: false,
    createdAt: new Date().toISOString(),
  };

  try {
    const qrDataUrl = await QRCode.toDataURL(redirectUrl, {
      color: { dark: fgColor || '#000000', light: bgColor || '#ffffff' },
      errorCorrectionLevel: errorLevel || 'H',
      width: 300,
      margin: 2,
    });

    res.json({ id, redirectUrl, qrDataUrl, record: qrStore[id] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

// ─── List all QR codes ────────────────────────────────────────────────────────
app.get('/api/qr/list', (req, res) => {
  res.json(
    Object.values(qrStore).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    ),
  );
});

// ─── Get single QR code ───────────────────────────────────────────────────────
app.get('/api/qr/:id', (req, res) => {
  const record = qrStore[req.params.id];
  if (!record) return res.status(404).json({ error: 'Not found' });
  res.json(record);
});

// ─── Delete QR code ───────────────────────────────────────────────────────────
app.delete('/api/qr/:id', (req, res) => {
  if (!qrStore[req.params.id])
    return res.status(404).json({ error: 'Not found' });
  delete qrStore[req.params.id];
  res.json({ success: true });
});

// ─── Redirect handler ─────────────────────────────────────────────────────────
app.get('/r/:id', (req, res) => {
  const record = qrStore[req.params.id];

  if (!record) return res.send(errorPage('QR code not found.'));

  // Check expiry
  if (record.expiresAt && new Date() > new Date(record.expiresAt)) {
    return res.send(errorPage('This QR code has expired.'));
  }

  // Check one-time use
  if (record.type === 'onetime' && record.used) {
    return res.send(errorPage('This QR code has already been used.'));
  }

  // Increment scan count
  record.scanned += 1;

  if (record.type === 'onetime') {
    record.used = true;
    return res.redirect(record.url);
  }

  if (record.type === 'single') {
    return res.redirect(record.url);
  }

  if (record.type === 'multilink') {
    return res.send(multilinkPage(record));
  }

  res.send(errorPage('Unknown QR type.'));
});

// ─── HTML Pages ───────────────────────────────────────────────────────────────
function errorPage(msg) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>QR Error</title>
  <style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f5f5f3;margin:0;}
  .box{background:#fff;border-radius:16px;padding:2rem 2.5rem;text-align:center;border:1px solid #e0dfd8;max-width:400px;}
  h2{color:#a32d2d;font-weight:500;margin-bottom:0.5rem;}p{color:#6b6b67;font-size:14px;}</style></head>
  <body><div class="box"><h2>⚠️ ${msg}</h2><p>This link is no longer valid.</p></div></body></html>`;
}

function multilinkPage(record) {
  const items = record.links
    .map(
      (l) => `
    <a href="${l.url}" class="link-item">
      <span class="link-label">${l.label || l.url}</span>
      <span class="arrow">→</span>
    </a>`,
    )
    .join('');

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${record.label || 'Choose a link'}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:system-ui,sans-serif;background:#f5f5f3;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:1rem;}
    .card{background:#fff;border-radius:16px;padding:2rem;width:100%;max-width:420px;border:1px solid #e0dfd8;}
    h2{font-size:18px;font-weight:500;margin-bottom:0.25rem;color:#1a1a18;}
    p{font-size:13px;color:#6b6b67;margin-bottom:1.5rem;}
    .link-item{display:flex;align-items:center;justify-content:space-between;padding:0.75rem 1rem;border-radius:10px;border:1px solid #e0dfd8;text-decoration:none;color:#1a1a18;margin-bottom:8px;font-size:14px;transition:background 0.15s;}
    .link-item:hover{background:#f1efe8;}
    .arrow{color:#888780;}
  </style></head>
  <body><div class="card">
    <h2>${record.label || 'Select a destination'}</h2>
    <p>Choose where you want to go:</p>
    ${items}
  </div></body></html>`;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`QR app running at http://localhost:${PORT}`),
);
