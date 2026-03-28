const router = require('express').Router({ mergeParams: true });
const express = require('express');
const multer = require('multer');
const db = require('../db/connection');
const authenticate = require('../middleware/auth');

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
