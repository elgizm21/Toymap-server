// server/index.cjs

const express = require('express');
const cors    = require('cors');
const fs      = require('fs');
const path    = require('path');

const app = express();

// 1) CORS-u açıq şəkildə bütün origin-lərə icazə ver
app.use(cors({ origin: '*' }));



app.use(express.json());

const DB_FILE = path.join(__dirname, 'db.json');

// 2) Əgər db.json yoxdursa, yaradıb əsas strukturu qoy
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(
    DB_FILE,
    JSON.stringify({
      tables: [],
      assignments: {},
      ads: []
    }, null, 2)
  );
}

function readDB() {
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}
function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

/** --- Tables API --- **/
// Hamısını gətir
app.get('/api/tables', (req, res) => {
  res.json(readDB().tables);
});
// Yeni masa əlavə et
app.post('/api/tables', (req, res) => {
  const { id, x, y } = req.body;
  if (!id || x == null || y == null) {
    return res.status(400).json({ error: 'Missing id, x or y' });
  }
  const db = readDB();
  if (db.tables.find(t => t.id === id)) {
    return res.status(409).json({ error: 'Table ID already exists' });
  }
  const table = { id, x, y };
  db.tables.push(table);
  writeDB(db);
  res.status(201).json(table);
});
// Mövcud masanı güncəllə
app.put('/api/tables/:id', (req, res) => {
  const { id } = req.params;
  const { x, y } = req.body;
  const db = readDB();
  const idx = db.tables.findIndex(t => t.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Table not found' });
  }
  db.tables[idx] = {
    id,
    x: x != null ? x : db.tables[idx].x,
    y: y != null ? y : db.tables[idx].y,
  };
  writeDB(db);
  res.json(db.tables[idx]);
});
// Masanı sil + ona bağlı tə’yinatları da sil
app.delete('/api/tables/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const before = db.tables.length;
  db.tables = db.tables.filter(t => t.id !== id);
  if (db.tables.length === before) {
    return res.status(404).json({ error: 'Table not found' });
  }
  for (const guest in db.assignments) {
    if (db.assignments[guest] === id) {
      delete db.assignments[guest];
    }
  }
  writeDB(db);
  res.sendStatus(204);
});

/** --- Assignments API --- **/
// Hamısını gətir
app.get('/api/assignments', (req, res) => {
  res.json(readDB().assignments);
});
// Yeni tə’yinat
app.post('/api/assignments', (req, res) => {
  const { guest, tableId } = req.body;
  if (!guest || !tableId) {
    return res.status(400).json({ error: 'Missing guest or tableId' });
  }
  const db = readDB();
  if (!db.tables.find(t => t.id === tableId)) {
    return res.status(404).json({ error: 'Table not found' });
  }
  db.assignments[guest] = tableId;
  writeDB(db);
  res.status(201).json({ [guest]: tableId });
});
// Tə’yinatı sil
app.delete('/api/assignments/:guest', (req, res) => {
  const { guest } = req.params;
  const db = readDB();
  if (!(guest in db.assignments)) {
    return res.status(404).json({ error: 'Assignment not found' });
  }
  delete db.assignments[guest];
  writeDB(db);
  res.sendStatus(204);
});

/** --- Ads (Reklam) API --- **/
// Hamısını gətir
app.get('/api/ads', (req, res) => {
  res.json(readDB().ads);
});
// Yeni reklam əlavə et
app.post('/api/ads', (req, res) => {
  const { id, title, imageUrl, link } = req.body;
  if (!id || !title || !imageUrl) {
    return res.status(400).json({ error: 'Missing id, title or imageUrl' });
  }
  const db = readDB();
  if (db.ads.find(a => a.id === id)) {
    return res.status(409).json({ error: 'Ad ID already exists' });
  }
  const ad = { id, title, imageUrl, link: link || '' };
  db.ads.push(ad);
  writeDB(db);
  res.status(201).json(ad);
});
// Reklamı sil
app.delete('/api/ads/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const before = db.ads.length;
  db.ads = db.ads.filter(a => a.id !== id);
  if (db.ads.length === before) {
    return res.status(404).json({ error: 'Ad not found' });
  }
  writeDB(db);
  res.sendStatus(204);
});

// Server-i işə sal
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
