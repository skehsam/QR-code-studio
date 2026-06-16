# QR Code Studio

A full-featured QR code generator with a Node.js backend.

## Features

- **Single URL** — standard QR code linking to one URL
- **One-Time** — link expires after the first scan
- **Multi-Link** — shows a branded menu of links when scanned
- **Time Expiry** — set a countdown in minutes after which the QR stops working
- **Label text styling** — customize font, size, color, weight, and alignment
- **Color design** — custom foreground/background colors
- **Download** — export as PNG or SVG
- **Dashboard** — view all QR codes, scan counts, and statuses

---

## Setup

### Requirements
- Node.js 16 or higher

### Install & run

```bash
# 1. Install dependencies
npm install

# 2. Start the server
node server.js

# 3. Open in your browser
# http://localhost:3000
```

---

## Usage

1. Open `http://localhost:3000`
2. Choose a QR type (Single, One-Time, or Multi-Link)
3. Enter your URL(s) and label
4. Customize colors and text style
5. Click **Generate QR Code**
6. Download as PNG or SVG, or copy the scan link
7. View all codes under **My QR Codes**

---

## Notes

- QR codes are stored **in memory** — they reset when the server restarts.
- For persistent storage, replace the `qrStore` object in `server.js` with a database (e.g. SQLite, MongoDB, or PostgreSQL).
- To expose scan links publicly, deploy to a server or use a tunnel like [ngrok](https://ngrok.com).

---

## Project structure

```
qr-app/
├── server.js          # Express backend
├── public/
│   └── index.html     # Frontend UI
├── package.json
└── README.md
```
