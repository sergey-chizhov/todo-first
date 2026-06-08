import { useState, useEffect } from "react";

// В продакшне API на том же домене, локально — прокси
const API = '/api';

const categories = [
  { id: "all",      label: "Все",      color: "#e8d5b7" },
  { id: "work",     label: "Работа",   color: "#f4a261" },
  { id: "personal", label: "Личное",   color: "#76c893" },
  { id: "urgent",   label: "Срочно",   color: "#e63946" },
];

const getCatColor = (id) => categories.find(c => c.id === id)?.color || "#e8d5b7";

export default function App() {
  const [tasks, setTasks]       = useState([]);
  const [input, setInput]       = useState("");
  const [category, setCategory] = useState("work");
  const [filter, setFilter]     = useState("all");
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  useEffect(() => {
    fetch(`${API}/tasks`)
      .then(r => r.json())
      .then(data => { setTasks(data); setLoading(false); })
      .catch(() => { setError("Не удалось подключиться к серверу"); setLoading(false); });
  }, []);

  const addTask = async () => {
    if (!input.trim()) return;
    try {
      const res = await fetch(`${API}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: input.trim(), category }),
      });
      const task = await res.json();
      setTasks(prev => [task, ...prev]);
      setInput("");
    } catch {
      setError("Ошибка при добавлении задачи");
    }
  };

  const toggleTask = async (id, done) => {
    try {
      const res = await fetch(`${API}/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: !done }),
      });
      const updated = await res.json();
      setTasks(prev => prev.map(t => t.id === id ? updated : t));
    } catch {
      setError("Ошибка при обновлении");
    }
  };

  const deleteTask = async (id) => {
    try {
      await fetch(`${API}/tasks/${id}`, { method: "DELETE" });
      setTasks(prev => prev.filter(t => t.id !== id));
    } catch {
      setError("Ошибка при удалении");
    }
  };

  const clearDone = async () => {
    try {
      await fetch(`${API}/tasks/done/all`, { method: "DELETE" });
      setTasks(prev => prev.filter(t => !t.done));
    } catch {
      setError("Ошибка при очистке");
    }
  };

  const filtered = tasks.filter(t => {
    if (filter === "done")   return t.done;
    if (filter === "active") return !t.done;
    return true;
  });

  const done     = tasks.filter(t => t.done).length;
  const total    = tasks.length;
  const progress = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <div style={{
      minHeight: "100vh", background: "#1a1a2e",
      fontFamily: "Georgia, serif",
      display: "flex", alignItems: "flex-start",
      justifyContent: "center", padding: "40px 16px",
    }}>
      <div style={{ width: "100%", maxWidth: 560 }}>

        <div style={{ marginBottom: 32 }}>
          <p style={{ color: "#f4a261", fontSize: 11, letterSpacing: 4, textTransform: "uppercase", margin: "0 0 6px" }}>
            Мой список
          </p>
          <h1 style={{ color: "#e8d5b7", fontSize: 36, fontWeight: "normal", margin: 0 }}>
            Задачи
          </h1>
        </div>

        {error && (
          <div style={{
            background: "#3a1a1a", border: "1px solid #e63946",
            borderRadius: 10, padding: "12px 16px", marginBottom: 16,
            color: "#e63946", fontSize: 13,
            display: "flex", justifyContent: "space-between", alignItems: "center"
          }}>
            {error}
            <button onClick={() => setError(null)} style={{ background: "none", border: "none", color: "#e63946", cursor: "pointer", fontSize: 18 }}>×</button>
          </div>
        )}

        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ color: "#7c7c9a", fontSize: 12, letterSpacing: 1 }}>ПРОГРЕСС</span>
            <span style={{ color: "#f4a261", fontSize: 12 }}>{done}/{total} выполнено</span>
          </div>
          <div style={{ height: 4, background: "#2a2a4a", borderRadius: 2, overflow: "hidden" }}>
            <div style={{
              height: "100%", width: `${progress}%`,
              background: "linear-gradient(90deg, #f4a261, #e63946)",
              borderRadius: 2, transition: "width 0.5s ease"
            }} />
          </div>
        </div>

        <div style={{
          background: "#16213e", border: "1px solid #2a2a4a",
          borderRadius: 14, padding: "16px 20px", marginBottom: 20,
        }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addTask()}
            placeholder="Добавить новую задачу..."
            style={{
              width: "100%", background: "none", border: "none",
              outline: "none", color: "#e8d5b7", fontSize: 15,
              fontFamily: "Georgia, serif", boxSizing: "border-box",
            }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {categories.filter(c => c.id !== "all").map(c => (
                <button key={c.id} onClick={() => setCategory(c.id)} style={{
                  padding: "4px 12px", borderRadius: 20, border: "none",
                  background: category === c.id ? c.color : "#2a2a4a",
                  color: category === c.id ? "#1a1a2e" : "#7c7c9a",
                  fontSize: 11, cursor: "pointer",
                  fontWeight: category === c.id ? "bold" : "normal",
                  transition: "all 0.2s",
                }}>
                  {c.label}
                </button>
              ))}
            </div>
            <button onClick={addTask} style={{
              background: "#f4a261", border: "none", color: "#1a1a2e",
              width: 36, height: 36, borderRadius: "50%", fontSize: 22,
              cursor: "pointer", display: "flex", alignItems: "center",
              justifyContent: "center", flexShrink: 0, fontWeight: "bold",
            }}>+</button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
          {[["all", "Все"], ["active", "Активные"], ["done", "Выполненные"]].map(([val, label]) => (
            <button key={val} onClick={() => setFilter(val)} style={{
              flex: 1, padding: "8px 0", border: "none", borderRadius: 8,
              background: filter === val ? "#2a2a4a" : "transparent",
              color: filter === val ? "#e8d5b7" : "#7c7c9a",
              fontSize: 12, cursor: "pointer", transition: "all 0.2s",
            }}>{label}</button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#7c7c9a", fontStyle: "italic" }}>
            Загружаем задачи...
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#7c7c9a", fontSize: 14, fontStyle: "italic" }}>
                Здесь пока пусто...
              </div>
            )}
            {filtered.map(task => (
              <div key={task.id} style={{
                display: "flex", alignItems: "center", gap: 14,
                background: "#16213e", border: "1px solid #2a2a4a",
                borderLeft: `3px solid ${getCatColor(task.category)}`,
                borderRadius: 12, padding: "14px 16px",
              }}>
                <button onClick={() => toggleTask(task.id, task.done)} style={{
                  width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                  border: `2px solid ${task.done ? getCatColor(task.category) : "#3a3a5a"}`,
                  background: task.done ? getCatColor(task.category) : "transparent",
                  cursor: "pointer", display: "flex", alignItems: "center",
                  justifyContent: "center", transition: "all 0.2s",
                }}>
                  {task.done && <span style={{ color: "#1a1a2e", fontSize: 12, fontWeight: "bold" }}>✓</span>}
                </button>
                <span style={{
                  flex: 1, color: task.done ? "#4a4a6a" : "#e8d5b7",
                  fontSize: 15, textDecoration: task.done ? "line-through" : "none",
                }}>
                  {task.text}
                </span>
                <span style={{ fontSize: 10, color: getCatColor(task.category), opacity: 0.7, flexShrink: 0 }}>
                  {categories.find(c => c.id === task.category)?.label}
                </span>
                <button onClick={() => deleteTask(task.id)} style={{
                  background: "none", border: "none", color: "#3a3a5a",
                  cursor: "pointer", fontSize: 16, padding: "0 2px", flexShrink: 0,
                }}
                  onMouseEnter={e => e.target.style.color = "#e63946"}
                  onMouseLeave={e => e.target.style.color = "#3a3a5a"}
                >×</button>
              </div>
            ))}
          </div>
        )}

        {tasks.filter(t => t.done).length > 0 && (
          <div style={{ marginTop: 20, textAlign: "right" }}>
            <button onClick={clearDone} style={{
              background: "none", border: "none",
              color: "#4a4a6a", fontSize: 12, cursor: "pointer",
            }}>Удалить выполненные</button>
          </div>
        )}
      </div>
    </div>
  );
}
