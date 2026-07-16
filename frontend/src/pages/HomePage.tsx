import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, clearSession, getUser } from '../api';
import type { TaskSummary } from '../api';

// 首页：列出任务；负责人可建任务、去设计器；任何人可去工作台标注。
export function HomePage() {
  const nav = useNavigate();
  const user = getUser();
  const isOwner = user?.role === 'TASK_OWNER';

  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    try {
      setTasks(await api.listTasks());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) {
      setError('Enter a task title first');
      return;
    }
    try {
      const { id } = await api.createTask(newTitle.trim());
      nav(`/tasks/${id}/design`); // 建完直接进设计器
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed');
    }
  }

  function logout() {
    clearSession();
    nav('/login');
  }

  return (
    <div className="home">
      <header className="home__top">
        <div className="brand">
          <span className="brand__logo">🏷️</span>
          <span className="brand__name">LabelHub</span>
        </div>
        <div className="home__user">
          <span>{user?.email}</span>
          <span className="home__role">{user?.role}</span>
          <button className="linkbtn" onClick={logout}>
            Sign out
          </button>
        </div>
      </header>

      <main className="home__main">
        <h1 className="home__h1">Tasks</h1>

        {isOwner && (
          <form className="home__create" onSubmit={handleCreate}>
            <input
              className="home__create-input"
              placeholder="New task title…"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
            <button
              className="btn-primary"
              type="submit"
              disabled={!newTitle.trim()}
            >
              + New task
            </button>
          </form>
        )}

        {error && <p className="home__error">{error}</p>}
        {loading ? (
          <p className="home__muted">Loading…</p>
        ) : tasks.length === 0 ? (
          <p className="home__muted">No tasks yet.</p>
        ) : (
          <ul className="tasklist">
            {tasks.map((t) => (
              <li key={t.id} className="taskrow">
                <div className="taskrow__main">
                  <span className="taskrow__title">{t.title}</span>
                  <span
                    className={`taskrow__badge${t.hasForm ? ' is-on' : ''}`}
                  >
                    {t.hasForm ? 'form ready' : 'no form'}
                  </span>
                </div>
                <div className="taskrow__actions">
                  {/* 负责人：只能设计（用设计器里的 Preview 自测标注体验） */}
                  {isOwner && (
                    <Link className="linkbtn" to={`/tasks/${t.id}/design`}>
                      Design
                    </Link>
                  )}
                  {/* 标注员：只能标注，且需已配表单 */}
                  {user?.role === 'ANNOTATOR' &&
                    (t.hasForm ? (
                      <Link
                        className="linkbtn"
                        to={`/tasks/${t.id}/annotate`}
                      >
                        Annotate
                      </Link>
                    ) : (
                      <span className="taskrow__disabled">Annotate</span>
                    ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
