try { require('dotenv').config(); } catch {}
const express = require('express');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const ImageKit = require('imagekit');

const app = express();
const router = express.Router();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const IMAGEKIT_PUBLIC_KEY = process.env.IMAGEKIT_PUBLIC_KEY;
const IMAGEKIT_PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY;
const IMAGEKIT_URL_ENDPOINT = process.env.IMAGEKIT_URL_ENDPOINT;

let supabase = null;
try {
  if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  }
} catch {}

let imagekit = null;
try {
  if (IMAGEKIT_PUBLIC_KEY && IMAGEKIT_PRIVATE_KEY && IMAGEKIT_URL_ENDPOINT) {
    imagekit = new ImageKit({
      publicKey: IMAGEKIT_PUBLIC_KEY,
      privateKey: IMAGEKIT_PRIVATE_KEY,
      urlEndpoint: IMAGEKIT_URL_ENDPOINT,
    });
  }
} catch {}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Apenas imagens são permitidas'));
      return;
    }
    cb(null, true);
  }
});

router.use(express.json());

router.get('/health', (req, res) => {
  res.json({ ok: true, supabase: !!supabase, imagekit: !!imagekit });
});

async function getAdminPassword() {
  if (!supabase) return null;
  try {
    const { data } = await supabase.from('admin_config').select('value').eq('key', 'password').single();
    return data?.value || null;
  } catch { return null; }
}

router.post('/login', async (req, res) => {
  let password = await getAdminPassword();
  if (!password) password = 'danyadmin';
  if (req.body.password === password) {
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Senha incorreta' });
  }
});

router.get('/images', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Banco não configurado' });
  try {
    let query = supabase.from('images').select('*').order('uploaded_at', { ascending: false });
    const category = req.query.category;
    if (category && category !== 'todos') {
      query = query.eq('category', category);
    }
    const { data, error } = await query;
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/upload', upload.array('images', 50), async (req, res) => {
  if (!supabase || !imagekit) return res.status(500).json({ error: 'Serviços não configurados' });
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Nenhuma imagem enviada' });
    }
    const category = req.body.category || 'corrente';

    const results = [];
    for (const file of req.files) {
      const ikRes = await imagekit.upload({
        file: file.buffer,
        fileName: file.originalname,
        folder: `/danysemijoias/${category}`,
        useUniqueFileName: true,
      });

      const record = {
        filename: ikRes.name,
        original_name: file.originalname,
        category,
        size: file.size,
        imagekit_url: ikRes.url,
        imagekit_file_id: ikRes.fileId,
      };

      const { data, error } = await supabase.from('images').insert(record).select().single();
      if (error) throw error;
      results.push(data);
    }

    res.json({ success: true, images: results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/image/:id', async (req, res) => {
  if (!supabase || !imagekit) return res.status(500).json({ error: 'Serviços não configurados' });
  try {
    const { data: img, error: findErr } = await supabase.from('images').select('*').eq('id', req.params.id).single();
    if (findErr || !img) return res.status(404).json({ error: 'Imagem não encontrada' });

    await imagekit.deleteFile(img.imagekit_file_id);

    const { error: delErr } = await supabase.from('images').delete().eq('id', req.params.id);
    if (delErr) throw delErr;

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/download/:id', async (req, res) => {
  if (!supabase || !imagekit) return res.status(500).json({ error: 'Serviços não configurados' });
  try {
    const { data: img, error } = await supabase.from('images').select('*').eq('id', req.params.id).single();
    if (error || !img) return res.status(404).json({ error: 'Imagem não encontrada' });

    const url = imagekit.url({
      src: img.imagekit_url,
      transformation: [{ quality: '100' }],
    });

    res.redirect(url);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.use('/api', router);

module.exports = app;
