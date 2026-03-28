require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const claimsRoutes = require('./routes/claims');
const itemsRouter = require('./routes/items');
const { itemRouter: receiptsItemRouter, standalone: receiptsStandalone } = require('./routes/receipts');
const commentsRouter = require('./routes/comments');
const { nested: alertsNested, standalone: alertsStandalone } = require('./routes/alerts');
const notificationsRoutes = require('./routes/notifications');
const batchesRoutes = require('./routes/batches');
const reportsRoutes = require('./routes/reports');

const app = express();

app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => res.json({ ok: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/claims', claimsRoutes);
app.use('/api/claims/:claimId/items', itemsRouter);
app.use('/api/claims/:claimId/items/:itemId/receipts', receiptsItemRouter);
app.use('/api/claims/:claimId/comments', commentsRouter);
app.use('/api/claims/:claimId/alerts', alertsNested);
app.use('/api/receipts', receiptsStandalone);
app.use('/api/alerts', alertsStandalone);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/batches', batchesRoutes);
app.use('/api/reports', reportsRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
