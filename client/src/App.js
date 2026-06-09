import { useState, useEffect, useCallback } from "react";

const API = '/api';

const categories = [
  { id: "all",      label: "Все",      color: "#e8d5b7" },
  { id: "work",     label: "Работа",   color: "#f4a261" },
  { id: "personal", label: "Личное",   color: "#76c893" },
  { id: "urgent",   label: "Срочно",   color: "#e63946" },
];
const getCatColor = (id) => categories.find(c => c.id === id)?.color || "#e8d5b7";

// ─── AUTH SCREEN ─────────────────────────────────────────
function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email || !password) return setError('Заполните все поля');
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || 'Ошибка');
      localStorage.setItem('token', data.token);
      localStorage.setItem('email', data.email);
      onLogin(data.token, data.email);
    } catch {
      setError('Ошибка подключения');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#1a1a2e",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "Georgia, serif", padding: 16,
    }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <p style={{ color: "#f4a261", fontSize: 11, letterSpacing: 4, textTransform: "uppercase", margin: "0 0 6px" }}>Мой список</p>
        <h1 style={{ color: "#e8d5b7", fontSize: 36, fontWeight: "normal", margin: "0 0 32px" }}>Задачи</h1>

        <div style={{ display: "flex", gap: 4, marginBottom: 24 }}>
          {[['login','Войти'],['register','Регистрация']].map(([val, label]) => (
            <button key={val} onClick={() => { setMode(val); setError(''); }} style={{
              flex: 1, padding: "10px 0", border: "none", borderRadius: 8,
              background: mode === val ? "#2a2a4a" : "transparent",
              color: mode === val ? "#e8d5b7" : "#7c7c9a",
              fontSize: 13, cursor: "pointer", fontFamily: "Georgia, serif",
            }}>{label}</button>
          ))}
        </div>

        {error && (
          <div style={{ background: "#3a1a1a", border: "1px solid #e63946", borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: "#e63946", fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ background: "#16213e", border: "1px solid #2a2a4a", borderRadius: 14, padding: "20px", marginBottom: 12 }}>
          <input
            value={email} onChange={e => setEmail(e.target.value)}
            placeholder="Email"
            type="email"
            style={{ width: "100%", background: "none", border: "none", borderBottom: "1px solid #2a2a4a", outline: "none", color: "#e8d5b7", fontSize: 15, fontFamily: "Georgia, serif", padding: "8px 0", marginBottom: 16, boxSizing: "border-box" }}
          />
          <input
            value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder="Пароль"
            type="password"
            style={{ width: "100%", background: "none", border: "none", borderBottom: "1px solid #2a2a4a", outline: "none", color: "#e8d5b7", fontSize: 15, fontFamily: "Georgia, serif", padding: "8px 0", boxSizing: "border-box" }}
          />
        </div>

        <button onClick={submit} disabled={loading} style={{
          width: "100%", padding: "14px", background: "#f4a261", border: "none",
          borderRadius: 12, color: "#1a1a2e", fontSize: 15, cursor: "pointer",
          fontFamily: "Georgia, serif", fontWeight: "bold",
          opacity: loading ? 0.7 : 1,
        }}>
          {loading ? "..." : mode === 'login' ? "Войти" : "Зарегистрироваться"}
        </button>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────
export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [userEmail, setUserEmail] = useState(() => localStorage.getItem('email'));
  const [tasks, setTasks] = useState([]);
  const [input, setInput] = useState("");
  const [category, setCategory] = useState("work");
  const [deadline, setDeadline] = useState("");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [editDeadline, setEditDeadline] = useState("");

  const authHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

  const loadTasks = useCallback(async (q = '') => {
    try {
      const url = q ? `${API}/tasks?search=${encodeURIComponent(q)}` : `${API}/tasks`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 401) { handleLogout(); return; }
      const data = await res.json();
      if (Array.isArray(data)) setTasks(data);
      else setError(data.error);
    } catch {
      setError("Ошибка подключения");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { if (token) loadTasks(); }, [token, loadTasks]);

  // Поиск с задержкой
  useEffect(() => {
    const t = setTimeout(() => loadTasks(search), 300);
    return () => clearTimeout(t);
  }, [search, loadTasks]);

  const handleLogin = (t, email) => { setToken(t); setUserEmail(email); };

  const handleLogout = async () => {
    try { await fetch(`${API}/logout`, { method: 'POST', headers: authHeaders }); } catch {}
    localStorage.removeItem('token'); localStorage.removeItem('email');
    setToken(null); setUserEmail(null); setTasks([]);
  };

  const addTask = async () => {
    if (!input.trim()) return;
    try {
      const res = await fetch(`${API}/tasks`, {
        method: "POST", headers: authHeaders,
        body: JSON.stringify({ text: input.trim(), category, deadline: deadline || null }),
      });
      const task = await res.json();
      if (res.ok) { setTasks(prev => [task, ...prev]); setInput(""); setDeadline(""); }
      else setError(task.error);
    } catch { setError("Ошибка при добавлении"); }
  };

  const toggleTask = async (id, done) => {
    try {
      const res = await fetch(`${API}/tasks/${id}`, {
        method: "PATCH", headers: authHeaders,
        body: JSON.stringify({ done: !done }),
      });
      const updated = await res.json();
      if (res.ok) setTasks(prev => prev.map(t => t.id === id ? updated : t));
    } catch { setError("Ошибка при обновлении"); }
  };

  const saveEdit = async (id) => {
    if (!editText.trim()) return;
    try {
      const res = await fetch(`${API}/tasks/${id}`, {
        method: "PATCH", headers: authHeaders,
        body: JSON.stringify({ text: editText.trim(), deadline: editDeadline || null }),
      });
      const updated = await res.json();
      if (res.ok) { setTasks(prev => prev.map(t => t.id === id ? updated : t)); setEditingId(null); }
    } catch { setError("Ошибка при редактировании"); }
  };

  const deleteTask = async (id) => {
    try {
      await fetch(`${API}/tasks/${id}`, { method: "DELETE", headers: authHeaders });
      setTasks(prev => prev.filter(t => t.id !== id));
    } catch { setError("Ошибка при удалении"); }
  };

  const clearDone = async () => {
    try {
      await fetch(`${API}/tasks/done/all`, { method: "DELETE", headers: authHeaders });
      setTasks(prev => prev.filter(t => !t.done));
    } catch { setError("Ошибка при очистке"); }
  };

  const startEdit = (task) => {
    setEditingId(task.id);
    setEditText(task.text);
    setEditDeadline(task.deadline ? task.deadline.split('T')[0] : '');
  };

  const isOverdue = (deadline) => deadline && new Date(deadline) < new Date() && deadline;

  const filtered = tasks.filter(t => {
    if (filter === "done") return t.done;
    if (filter === "active") return !t.done;
    return true;
  });

  const done = tasks.filter(t => t.done).length;
  const total = tasks.length;
  const progress = total === 0 ? 0 : Math.round((done / total) * 100);

  if (!token) return <AuthScreen onLogin={handleLogin} />;

  return (
    <div style={{ minHeight: "100vh", background: "#1a1a2e", fontFamily: "Georgia, serif", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px" }}>
      <div style={{ width: "100%", maxWidth: 580 }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
          <div>
            <p style={{ color: "#f4a261", fontSize: 11, letterSpacing: 4, textTransform: "uppercase", margin: "0 0 6px" }}>Мой список</p>
            <h1 style={{ color: "#e8d5b7", fontSize: 36, fontWeight: "normal", margin: 0 }}>Задачи</h1>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ color: "#7c7c9a", fontSize: 12, margin: "0 0 6px" }}>{userEmail}</p>
            <button onClick={handleLogout} style={{ background: "none", border: "1px solid #2a2a4a", borderRadius: 8, color: "#7c7c9a", fontSize: 12, cursor: "pointer", padding: "4px 10px", fontFamily: "Georgia, serif" }}>
              Выйти
            </button>
          </div>
        </div>

        {error && (
          <div style={{ background: "#3a1a1a", border: "1px solid #e63946", borderRadius: 10, padding: "12px 16px", marginBottom: 16, color: "#e63946", fontSize: 13, display: "flex", justifyContent: "space-between" }}>
            {error}
            <button onClick={() => setError(null)} style={{ background: "none", border: "none", color: "#e63946", cursor: "pointer", fontSize: 18 }}>×</button>
          </div>
        )}

        {/* Progress */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ color: "#7c7c9a", fontSize: 12, letterSpacing: 1 }}>ПРОГРЕСС</span>
            <span style={{ color: "#f4a261", fontSize: 12 }}>{done}/{total} выполнено</span>
          </div>
          <div style={{ height: 4, background: "#2a2a4a", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg, #f4a261, #e63946)", borderRadius: 2, transition: "width 0.5s ease" }} />
          </div>
        </div>

        {/* Search */}
        <div style={{ background: "#16213e", border: "1px solid #2a2a4a", borderRadius: 12, padding: "10px 16px", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "#7c7c9a", fontSize: 16 }}>🔍</span>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Поиск задач..."
            style={{ flex: 1, background: "none", border: "none", outline: "none", color: "#e8d5b7", fontSize: 14, fontFamily: "Georgia, serif" }}
          />
          {search && <button onClick={() => setSearch('')} style={{ background: "none", border: "none", color: "#7c7c9a", cursor: "pointer", fontSize: 16 }}>×</button>}
        </div>

        {/* Add task */}
        <div style={{ background: "#16213e", border: "1px solid #2a2a4a", borderRadius: 14, padding: "16px 20px", marginBottom: 16 }}>
          <input
            value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addTask()}
            placeholder="Добавить новую задачу..."
            style={{ width: "100%", background: "none", border: "none", outline: "none", color: "#e8d5b7", fontSize: 15, fontFamily: "Georgia, serif", boxSizing: "border-box", marginBottom: 12 }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              {categories.filter(c => c.id !== "all").map(c => (
                <button key={c.id} onClick={() => setCategory(c.id)} style={{
                  padding: "4px 10px", borderRadius: 20, border: "none",
                  background: category === c.id ? c.color : "#2a2a4a",
                  color: category === c.id ? "#1a1a2e" : "#7c7c9a",
                  fontSize: 11, cursor: "pointer", fontWeight: category === c.id ? "bold" : "normal",
                }}>{c.label}</button>
              ))}
              <input
                type="date" value={deadline} onChange={e => setDeadline(e.target.value)}
                style={{ background: "#2a2a4a", border: "none", borderRadius: 8, color: deadline ? "#e8d5b7" : "#7c7c9a", fontSize: 11, padding: "4px 8px", cursor: "pointer", fontFamily: "Georgia, serif" }}
              />
            </div>
            <button onClick={addTask} style={{
              background: "#f4a261", border: "none", color: "#1a1a2e",
              width: 36, height: 36, borderRadius: "50%", fontSize: 22,
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", flexShrink: 0,
            }}>+</button>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
          {[["all","Все"],["active","Активные"],["done","Выполненные"]].map(([val, label]) => (
            <button key={val} onClick={() => setFilter(val)} style={{
              flex: 1, padding: "8px 0", border: "none", borderRadius: 8,
              background: filter === val ? "#2a2a4a" : "transparent",
              color: filter === val ? "#e8d5b7" : "#7c7c9a",
              fontSize: 12, cursor: "pointer",
            }}>{label}</button>
          ))}
        </div>

        {/* Tasks */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#7c7c9a", fontStyle: "italic" }}>Загружаем задачи...</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#7c7c9a", fontSize: 14, fontStyle: "italic" }}>
                {search ? `Ничего не найдено по "${search}"` : "Здесь пока пусто..."}
              </div>
            )}
            {filtered.map(task => (
              <div key={task.id} style={{
                background: "#16213e", border: "1px solid #2a2a4a",
                borderLeft: `3px solid ${getCatColor(task.category)}`,
                borderRadius: 12, padding: "14px 16px",
              }}>
                {editingId === task.id ? (
                  // Режим редактирования
                  <div>
                    <input
                      value={editText} onChange={e => setEditText(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && saveEdit(task.id)}
                      autoFocus
                      style={{ width: "100%", background: "#1a1a2e", border: "1px solid #f4a261", borderRadius: 8, outline: "none", color: "#e8d5b7", fontSize: 14, fontFamily: "Georgia, serif", padding: "6px 10px", boxSizing: "border-box", marginBottom: 8 }}
                    />
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input
                        type="date" value={editDeadline} onChange={e => setEditDeadline(e.target.value)}
                        style={{ background: "#2a2a4a", border: "none", borderRadius: 8, color: "#e8d5b7", fontSize: 11, padding: "4px 8px", fontFamily: "Georgia, serif" }}
                      />
                      <button onClick={() => saveEdit(task.id)} style={{ background: "#f4a261", border: "none", borderRadius: 8, color: "#1a1a2e", fontSize: 12, cursor: "pointer", padding: "4px 12px", fontFamily: "Georgia, serif", fontWeight: "bold" }}>Сохранить</button>
                      <button onClick={() => setEditingId(null)} style={{ background: "none", border: "1px solid #2a2a4a", borderRadius: 8, color: "#7c7c9a", fontSize: 12, cursor: "pointer", padding: "4px 12px", fontFamily: "Georgia, serif" }}>Отмена</button>
                    </div>
                  </div>
                ) : (
                  // Обычный вид
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <button onClick={() => toggleTask(task.id, task.done)} style={{
                      width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                      border: `2px solid ${task.done ? getCatColor(task.category) : "#3a3a5a"}`,
                      background: task.done ? getCatColor(task.category) : "transparent",
                      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {task.done && <span style={{ color: "#1a1a2e", fontSize: 12, fontWeight: "bold" }}>✓</span>}
                    </button>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: task.done ? "#4a4a6a" : "#e8d5b7", fontSize: 15, textDecoration: task.done ? "line-through" : "none" }}>
                        {task.text}
                      </div>
                      {task.deadline && (
                        <div style={{ fontSize: 11, color: isOverdue(task.deadline) && !task.done ? "#e63946" : "#7c7c9a", marginTop: 2 }}>
                          📅 {new Date(task.deadline).toLocaleDateString('ru-RU')}
                          {isOverdue(task.deadline) && !task.done && " — просрочено"}
                        </div>
                      )}
                    </div>

                    <span style={{ fontSize: 10, color: getCatColor(task.category), opacity: 0.7, flexShrink: 0 }}>
                      {categories.find(c => c.id === task.category)?.label}
                    </span>

                    <button onClick={() => startEdit(task)} style={{ background: "none", border: "none", color: "#3a3a5a", cursor: "pointer", fontSize: 14, padding: "0 2px", flexShrink: 0 }}
                      onMouseEnter={e => e.target.style.color = "#f4a261"}
                      onMouseLeave={e => e.target.style.color = "#3a3a5a"}
                    >✏️</button>

                    <button onClick={() => deleteTask(task.id)} style={{ background: "none", border: "none", color: "#3a3a5a", cursor: "pointer", fontSize: 16, padding: "0 2px", flexShrink: 0 }}
                      onMouseEnter={e => e.target.style.color = "#e63946"}
                      onMouseLeave={e => e.target.style.color = "#3a3a5a"}
                    >×</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {tasks.filter(t => t.done).length > 0 && (
          <div style={{ marginTop: 20, textAlign: "right" }}>
            <button onClick={clearDone} style={{ background: "none", border: "none", color: "#4a4a6a", fontSize: 12, cursor: "pointer" }}>
              Удалить выполненные
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
