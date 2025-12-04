import { Router } from 'express';
import { getSqliteDb } from '../lib/sqliteDb';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

// Log a page visit
router.post('/visit', asyncHandler(async (req, res) => {
  const db = getSqliteDb();
  const { page, referrer } = req.body;
  const ip = req.ip;
  const userAgent = req.headers['user-agent'];

  // Simple table check/create if not exists (quick fix for urgent request)
  db.exec(`
    CREATE TABLE IF NOT EXISTS page_visits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      page TEXT,
      referrer TEXT,
      ip TEXT,
      user_agent TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.prepare(`
    INSERT INTO page_visits (page, referrer, ip, user_agent)
    VALUES (?, ?, ?, ?)
  `).run(page || 'unknown', referrer || '', ip || '', userAgent || '');

  res.json({ success: true });
}));

// Get basic stats (for internal use/dashboard later)
router.get('/stats', asyncHandler(async (req, res) => {
  const db = getSqliteDb();

  // Ensure table exists to avoid errors on fresh install
  db.exec(`
    CREATE TABLE IF NOT EXISTS page_visits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      page TEXT,
      referrer TEXT,
      ip TEXT,
      user_agent TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const visits = db.prepare('SELECT COUNT(*) as count FROM page_visits').get() as { count: number };

  // Use optimization_history for AI executions count
  // Check if table exists first (it should, from sqliteDb.ts)
  let executions = { count: 0 };
  try {
    executions = db.prepare('SELECT COUNT(*) as count FROM optimization_history').get() as { count: number };
  } catch (err) {
    // Table might not exist yet if no optimizations ran or migration pending
    // Fallback to 0
  }

  res.json({
    visits: visits.count,
    executions: executions.count
  });
}));

export default router;
