const router = require('express').Router({ mergeParams: true });
const express = require('express');
const multer = require('multer');
const { createWorker } = require('tesseract.js');
const db = require('../db/connection');
const authenticate = require('../middleware/auth');

// Singleton OCR worker — initialised once, reused across requests
let _ocrWorker = null;
async function getOcrWorker() {
  if (!_ocrWorker) {
    _ocrWorker = await createWorker('eng', 1, {
      cachePath: '/tmp/tesseract',
      logger: () => {},
    });
  }
  return _ocrWorker;
}

function parseReceiptText(raw) {
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
  const text = raw;
  const upper = raw.toUpperCase();

  // --- Supplier: first line containing at least two letters ---
  const supplier = lines.find((l) => /[a-zA-Z]{2,}/.test(l) && l.length > 2) || null;

  // --- Amount: prefer TOTAL / AMOUNT DUE line, fall back to largest £ figure ---
  let amount = null;
  const totalLineMatch = text.match(
    /(?:total|amount\s*due|balance\s*due|grand\s*total|amount\s*payable)[^£$€\d]*([\d,]+\.\d{2})/i
  );
  if (totalLineMatch) {
    amount = parseFloat(totalLineMatch[1].replace(',', ''));
  } else {
    const allAmounts = [...text.matchAll(/[£$€]\s*([\d,]+\.\d{2})/g)].map((m) =>
      parseFloat(m[1].replace(',', ''))
    );
    if (allAmounts.length) amount = Math.max(...allAmounts);
  }

  // --- VAT ---
  let vat = 0;
  const vatMatch = text.match(/(?:vat|tax|gst)[^£$€\d]*([\d,]+\.\d{2})/i);
  if (vatMatch) vat = parseFloat(vatMatch[1].replace(',', ''));

  // --- Date: try common UK formats first ---
  let transaction_date = null;
  const datePatterns = [
    // YYYY-MM-DD
    { re: /(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/, fn: (m) => `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}` },
    // DD/MM/YYYY  (UK default)
    { re: /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/, fn: (m) => `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}` },
    // DD Mon YYYY  e.g. 01 Jan 2026
    { re: /(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{4})/i,
      fn: (m) => {
        const months = { jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12' };
        return `${m[3]}-${months[m[2].toLowerCase().slice(0,3)]}-${m[1].padStart(2,'0')}`;
      }
    },
  ];
  for (const { re, fn } of datePatterns) {
    const m = text.match(re);
    if (m) { transaction_date = fn(m); break; }
  }

  // --- Expense type: keyword match ---
  let expense_type = null;
  if (/HOTEL|INN|LODGE|B&B|ACCOMMODATION|MARRIOTT|HILTON|PREMIER INN|TRAVELODGE|HOLIDAY INN/.test(upper))
    expense_type = 'Accommodation';
  else if (/TAXI|UBER|LYFT|BOLT|TRAIN|RAIL|BUS|COACH|FLIGHT|AIRLINE|AIRWAYS|AIRPORT|EUROSTAR|AVANTI|GWR|LNER|TPE|NATIONAL EXPRESS/.test(upper))
    expense_type = 'Travel';
  else if (/RESTAURANT|CAFE|COFFEE|STARBUCKS|COSTA|CAFFE NERO|PRET|SUBWAY|MCDONALD|KFC|PIZZA|NANDO|GREGGS|LUNCH|DINNER|BREAKFAST|BISTRO|BRASSERIE|EATERY/.test(upper))
    expense_type = 'Subsistence';
  else if (/PUB|BAR|WINE|BEER|SPIRITS|COCKTAIL|THEATRE|CINEMA|CONCERT|ENTERTAINMENT/.test(upper))
    expense_type = 'Entertainment';
  else if (/EQUIPMENT|LAPTOP|COMPUTER|MONITOR|KEYBOARD|MOUSE|CABLE|HARDWARE|SUPPLIES|STATIONERY|OFFICE|AMAZON|CURRYS|PC WORLD/.test(upper))
    expense_type = 'Equipment';

  return { supplier, amount, vat, transaction_date, expense_type };
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    cb(null, allowed.includes(file.mimetype));
  },
});

// These routes are mounted at /api/claims/:claimId/items/:itemId/receipts
const itemRouter = router;
itemRouter.use(authenticate);

// POST — upload a receipt
itemRouter.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded or unsupported type' });

  const item = await db('claim_items')
    .join('claims', 'claim_items.claim_id', 'claims.id')
    .where('claim_items.id', req.params.itemId)
    .where('claim_items.claim_id', req.params.claimId)
    .select('claim_items.*', 'claims.user_id', 'claims.status')
    .first();

  if (!item) return res.status(404).json({ error: 'Item not found' });
  if (item.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  if (item.status !== 'draft') return res.status(422).json({ error: 'Can only upload receipts on draft claims' });

  const [receipt] = await db('receipts').insert({
    claim_item_id: item.id,
    filename: req.file.originalname,
    mime_type: req.file.mimetype,
    data: req.file.buffer,
  }).returning(['id', 'claim_item_id', 'filename', 'mime_type', 'uploaded_at']);

  res.status(201).json(receipt);
});

// Standalone receipt router — mounted at /api/receipts
const standalone = express.Router();
standalone.use(authenticate);

// POST /api/receipts/analyze — OCR a receipt using Tesseract
standalone.post('/analyze', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file provided' });

  const supported = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!supported.includes(req.file.mimetype)) {
    return res.status(400).json({ error: 'Please upload a JPEG, PNG, or WebP image' });
  }

  try {
    const worker = await getOcrWorker();
    const { data: { text } } = await worker.recognize(req.file.buffer);
    const extracted = parseReceiptText(text);
    res.json(extracted);
  } catch (err) {
    console.error('OCR error:', err.message);
    res.status(500).json({ error: `Receipt scan failed: ${err.message}` });
  }
});

// GET /api/receipts/:id — stream file
standalone.get('/:id', async (req, res) => {
  const receipt = await db('receipts').where({ id: req.params.id }).first();
  if (!receipt) return res.status(404).json({ error: 'Receipt not found' });

  // Check access via claim ownership
  const item = await db('claim_items')
    .join('claims', 'claim_items.claim_id', 'claims.id')
    .where('claim_items.id', receipt.claim_item_id)
    .select('claims.user_id', 'claims.manager_id')
    .first();

  const { role, id: userId } = req.user;
  if (role === 'employee' && item.user_id !== userId) return res.status(403).json({ error: 'Forbidden' });
  if (role === 'manager' && item.user_id !== userId && item.manager_id !== userId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  res.setHeader('Content-Type', receipt.mime_type);
  res.setHeader('Content-Disposition', `inline; filename="${receipt.filename}"`);
  // receipt.data comes back as a Buffer from pg
  res.send(Buffer.isBuffer(receipt.data) ? receipt.data : Buffer.from(receipt.data));
});

// DELETE /api/receipts/:id
standalone.delete('/:id', async (req, res) => {
  const receipt = await db('receipts').where({ id: req.params.id }).first();
  if (!receipt) return res.status(404).json({ error: 'Receipt not found' });

  const item = await db('claim_items')
    .join('claims', 'claim_items.claim_id', 'claims.id')
    .where('claim_items.id', receipt.claim_item_id)
    .select('claims.user_id', 'claims.status')
    .first();

  if (item.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  if (item.status !== 'draft') return res.status(422).json({ error: 'Can only delete receipts from draft claims' });

  await db('receipts').where({ id: receipt.id }).delete();
  res.status(204).end();
});

module.exports = { itemRouter, standalone };
