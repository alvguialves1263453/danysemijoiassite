const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'danyadmin';
const DATA_FILE = path.join(__dirname, 'data.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

const CATEGORIES = ['corrente', 'colar', 'pulseira', 'anel', 'brinco'];
const CATEGORY_LABELS = { corrente: 'Corrente', colar: 'Colar', pulseira: 'Pulseira', anel: 'Anel', brinco: 'Brinco' };

CATEGORIES.forEach(cat => {
  const dir = path.join(UPLOADS_DIR, cat);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});
// Remove old dirs
['aneis', 'brincos', 'colares', 'pulseiras', 'conjuntos'].forEach(cat => {
  const dir = path.join(UPLOADS_DIR, cat);
  try { if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0) fs.rmdirSync(dir); } catch {}
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const category = req.body.category || 'conjuntos';
    const dir = path.join(UPLOADS_DIR, category);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;
    cb(null, name);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Apenas imagens são permitidas'));
      return;
    }
    cb(null, true);
  }
});

function readData() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch { return []; }
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

app.use(express.json());

app.use('/uploads', express.static(UPLOADS_DIR));

app.get('/logo.jpg', (req, res) => {
  res.sendFile(path.join(__dirname, 'logo.jpg'));
});
app.get('/logo.png', (req, res) => {
  res.sendFile(path.join(__dirname, 'logo.png'));
});

app.get('/api/images', (req, res) => {
  const data = readData();
  const category = req.query.category;
  if (category && category !== 'todos') {
    res.json(data.filter(img => img.category === category));
  } else {
    res.json(data);
  }
});

app.post('/api/upload', upload.array('images', 50), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'Nenhuma imagem enviada' });
  }
  const data = readData();
  const category = req.body.category || 'conjuntos';
  const newImages = req.files.map(file => ({
    id: crypto.randomUUID(),
    filename: file.filename,
    originalName: file.originalname,
    category,
    size: file.size,
    uploadedAt: new Date().toISOString()
  }));
  writeData([...data, ...newImages]);
  res.json({ success: true, images: newImages });
});

app.delete('/api/image/:id', (req, res) => {
  let data = readData();
  const img = data.find(i => i.id === req.params.id);
  if (!img) return res.status(404).json({ error: 'Imagem não encontrada' });

  const filePath = path.join(UPLOADS_DIR, img.category, img.filename);
  try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch {}

  data = data.filter(i => i.id !== req.params.id);
  writeData(data);
  res.json({ success: true });
});

app.post('/api/login', (req, res) => {
  if (req.body.password === ADMIN_PASSWORD) {
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Senha incorreta' });
  }
});

app.get('/api/download/:id', (req, res) => {
  const data = readData();
  const img = data.find(i => i.id === req.params.id);
  if (!img) return res.status(404).json({ error: 'Imagem não encontrada' });

  const filePath = path.join(UPLOADS_DIR, img.category, img.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Arquivo não encontrado' });

  res.download(filePath, img.originalName);
});

app.use(express.static(__dirname));

app.listen(PORT, () => {
  console.log(`Dany Semijoias rodando em http://localhost:${PORT}`);
  console.log(`Admin: http://localhost:${PORT}/admin.html`);
});
