const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'client', 'build')));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        text TEXT NOT NULL,
        done BOOLEAN DEFAULT false,
        category VARCHAR(50) DEFAULT 'personal',
        deadline DATE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    // Добавим колонки если их нет (для существующей БД)
    await pool.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE`).catch(() => {});
    await pool.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deadline DATE`).catch(() => {});
    console.log('✅ БД готова');
  } catch (err) {
    console.error('❌ Ошибка БД:', err.message);
  }
}

// ─── УТИЛИТЫ ─────────────────────────────────────────────

function hashPassword(password) {
  return crypto.createHash('sha256').update(password + 'todo-salt-2026').digest('hex');
}

function generateToken(userId) {
  return crypto.createHash('sha256').update(userId + '-' + Date.now() + '-secret').digest('hex');
}

// Простое хранилище токенов в памяти
const tokens = new Map();

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token || !tokens.has(token)) {
    return res.status(401).json({ error: 'Не авторизован' });
  }
  req.userId = tokens.get(token);
  next();
}

// ─── АВТОРИЗАЦИЯ ─────────────────────────────────────────

app.post('/api/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email и пароль обязательны' });
  if (password.length < 6) return res.status(400).json({ error: 'Пароль минимум 6 символов' });
  try {
    const result = await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
      [email.toLowerCase().trim(), hashPassword(password)]
    );
    const user = result.rows[0];
    const token = generateToken(user.id);
    tokens.set(token, user.id);
    res.status(201).json({ token, email: user.email });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Email уже зарегистрирован' });
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email и пароль обязательны' });
  try {
    const result = await pool.query(
      'SELECT id, email FROM users WHERE email=$1 AND password_hash=$2',
      [email.toLowerCase().trim(), hashPassword(password)]
    );
    if (!result.rows.length) return res.status(401).json({ error: 'Неверный email или пароль' });
    const user = result.rows[0];
    const token = generateToken(user.id);
    tokens.set(token, user.id);
    res.json({ token, email: user.email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/logout', authMiddleware, (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  tokens.delete(token);
  res.json({ ok: true });
});

// ─── ЗАДАЧИ ──────────────────────────────────────────────

app.get('/api/tasks', authMiddleware, async (req, res) => {
  const { search } = req.query;
  try {
    let query = 'SELECT * FROM tasks WHERE user_id=$1';
    const params = [req.userId];
    if (search) {
      query += ' AND text ILIKE $2';
      params.push(`%${search}%`);
    }
    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tasks', authMiddleware, async (req, res) => {
  const { text, category, deadline } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'Текст обязателен' });
  try {
    const result = await pool.query(
      'INSERT INTO tasks (user_id, text, category, deadline) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.userId, text.trim(), category || 'personal', deadline || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/tasks/:id', authMiddleware, async (req, res) => {
  const { done, text, deadline } = req.body;
  try {
    const fields = [];
    const values = [];
    let i = 1;
    if (done !== undefined) { fields.push(`done=$${i++}`); values.push(done); }
    if (text !== undefined) { fields.push(`text=$${i++}`); values.push(text); }
    if (deadline !== undefined) { fields.push(`deadline=$${i++}`); values.push(deadline || null); }
    if (!fields.length) return res.status(400).json({ error: 'Нет данных для обновления' });
    values.push(req.params.id, req.userId);
    const result = await pool.query(
      `UPDATE tasks SET ${fields.join(', ')} WHERE id=$${i++} AND user_id=$${i} RETURNING *`,
      values
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Не найдено' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/tasks/done/all', authMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM tasks WHERE done=true AND user_id=$1', [req.userId]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/tasks/:id', authMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM tasks WHERE id=$1 AND user_id=$2', [req.params.id, req.userId]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'build', 'index.html'));
});

initDB().then(() => {
  app.listen(PORT, () => console.log(`🚀 Сервер на порту ${PORT}`));
});
