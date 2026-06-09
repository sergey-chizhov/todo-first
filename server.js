const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Отдаём собранный React из client/build
app.use(express.static(path.join(__dirname, 'client', 'build')));

// PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes("sslmode=disable") ? false : { rejectUnauthorized: false },
});

async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        text TEXT NOT NULL,
        done BOOLEAN DEFAULT false,
        category VARCHAR(50) DEFAULT 'personal',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ БД готова');
  } catch (err) {
    console.error('❌ Ошибка БД полная:', JSON.stringify(err), err.message, err.code);
  }
}

// ─── API ─────────────────────────────────────────────────

app.get('/api/tasks', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tasks ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tasks', async (req, res) => {
  const { text, category } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'Текст обязателен' });
  try {
    const result = await pool.query(
      'INSERT INTO tasks (text, category) VALUES ($1, $2) RETURNING *',
      [text.trim(), category || 'personal']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/tasks/:id', async (req, res) => {
  const { done } = req.body;
  try {
    const result = await pool.query(
      'UPDATE tasks SET done=$1 WHERE id=$2 RETURNING *',
      [done, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Не найдено' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/tasks/done/all', async (req, res) => {
  try {
    await pool.query('DELETE FROM tasks WHERE done=true');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/tasks/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM tasks WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Все остальные запросы → React
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'build', 'index.html'));
});

// ─── ЗАПУСК ──────────────────────────────────────────────
initDB().then(() => {
  app.listen(PORT, () => console.log(`🚀 Сервер на порту ${PORT}`));
});
