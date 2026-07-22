import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, clearSession, getUser } from '../api';
import type { TaskSummary, WorkflowPlan } from '../api';
import { AssignModal } from '../components/AssignModal';

// 三种方案的显示名
const PLAN_LABEL: Record<WorkflowPlan, string> = {
  AI_PLUS_HUMAN: 'AI + human review',
  HUMAN_ONLY: 'Human only',
  AI_ONLY: 'AI only',
};
// 方案一句话说明（建任务弹窗里显示）
const PLAN_DESC: Record<WorkflowPlan, string> = {
  AI_PLUS_HUMAN: 'AI labels each item, humans review it.',
  HUMAN_ONLY: 'Humans label and humans review.',
  AI_ONLY: 'AI labels and auto-approves — no humans.',
};

// 首页：列出任务；负责人可建任务、去设计器；任何人可去工作台标注。
export function HomePage() {
  const nav = useNavigate();
  const user = getUser();
  const isOwner = user?.role === 'TASK_OWNER';
  const isWorker = !!user && user.role !== 'TASK_OWNER'; // 标注/审核同一岗位

  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [newPlan, setNewPlan] = useState<WorkflowPlan>('AI_PLUS_HUMAN');
  const [showCreate, setShowCreate] = useState(false);
  const [createError, setCreateError] = useState('');
  const [assignFor, setAssignFor] = useState<TaskSummary | null>(null);
  const [error, setError] = useState('');

  // 筛选（纯前端过滤已加载的列表）
  const [fText, setFText] = useState('');
  const [fPlan, setFPlan] = useState<'ALL' | WorkflowPlan>('ALL');
  const [fStatus, setFStatus] = useState<
    'ALL' | 'DRAFT' | 'PUBLISHED' | 'COMPLETED'
  >('ALL');

  const filtered = tasks.filter((t) => {
    if (fText && !t.title.toLowerCase().includes(fText.toLowerCase())) return false;
    if (fPlan !== 'ALL' && t.plan !== fPlan) return false;
    if (fStatus !== 'ALL' && t.status !== fStatus) return false;
    return true;
  });

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
      setCreateError('Enter a task title first');
      return;
    }
    try {
      const { id } = await api.createTask(newTitle.trim(), newPlan);
      nav(`/tasks/${id}/design`); // 建完直接进设计器
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Create failed');
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
        <div className="home__header">
          <h1 className="home__h1">Tasks</h1>
          {isOwner && (
            <button
              className="btn-primary"
              onClick={() => {
                setNewTitle('');
                setNewPlan('AI_PLUS_HUMAN');
                setCreateError('');
                setShowCreate(true);
              }}
            >
              + New task
            </button>
          )}
        </div>

        {error && <p className="home__error">{error}</p>}
        {loading ? (
          <p className="home__muted">Loading…</p>
        ) : tasks.length === 0 ? (
          <p className="home__muted">No tasks yet.</p>
        ) : (
          <>
            <div className="filterbar">
              <input
                className="filterbar__search"
                placeholder="Search tasks…"
                value={fText}
                onChange={(e) => setFText(e.target.value)}
              />
              <select
                className="filterbar__sel"
                value={fPlan}
                onChange={(e) => setFPlan(e.target.value as 'ALL' | WorkflowPlan)}
              >
                <option value="ALL">All plans</option>
                <option value="AI_PLUS_HUMAN">{PLAN_LABEL.AI_PLUS_HUMAN}</option>
                <option value="HUMAN_ONLY">{PLAN_LABEL.HUMAN_ONLY}</option>
                <option value="AI_ONLY">{PLAN_LABEL.AI_ONLY}</option>
              </select>
              <select
                className="filterbar__sel"
                value={fStatus}
                onChange={(e) =>
                  setFStatus(
                    e.target.value as 'ALL' | 'DRAFT' | 'PUBLISHED' | 'COMPLETED',
                  )
                }
              >
                <option value="ALL">All status</option>
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>

            {filtered.length === 0 ? (
              <p className="home__muted">No tasks match your filters.</p>
            ) : (
              <ul className="tasklist">
                {filtered.map((t) => (
              <li key={t.id} className="taskrow">
                <div className="taskrow__main">
                  <Link className="taskrow__title" to={`/tasks/${t.id}`}>
                    {t.title}
                  </Link>
                  <span className="taskrow__plan">{PLAN_LABEL[t.plan]}</span>
                  <span
                    className={`taskrow__badge${
                      t.status === 'PUBLISHED'
                        ? ' is-on'
                        : t.status === 'COMPLETED'
                          ? ' is-done'
                          : ''
                    }`}
                  >
                    {t.status === 'COMPLETED'
                      ? `completed · ${t.itemCount} items`
                      : t.status === 'PUBLISHED'
                        ? `published · ${t.itemCount} items`
                        : 'draft'}
                  </span>
                </div>
                <div className="taskrow__actions">
                  {/* 负责人：草稿→Design；已发布→Assign+Details；完成→Details */}
                  {isOwner && t.status === 'DRAFT' && (
                    <Link className="linkbtn" to={`/tasks/${t.id}/design`}>
                      Design
                    </Link>
                  )}
                  {isOwner && t.status === 'PUBLISHED' && (
                    <button
                      className="linkbtn"
                      onClick={() => setAssignFor(t)}
                    >
                      Assign
                    </button>
                  )}
                  {isOwner && t.status !== 'DRAFT' && (
                    <Link className="linkbtn" to={`/tasks/${t.id}`}>
                      Details
                    </Link>
                  )}
                  {/* 工人(标注/审核同一岗位)：已发布任务可标注(纯人工)+审核 */}
                  {isWorker && t.status === 'PUBLISHED' && (
                    <>
                      {t.plan === 'HUMAN_ONLY' && (
                        <Link
                          className="linkbtn"
                          to={`/tasks/${t.id}/annotate`}
                        >
                          Annotate
                        </Link>
                      )}
                      <Link className="linkbtn" to={`/tasks/${t.id}/review`}>
                        Review
                      </Link>
                    </>
                  )}
                </div>
              </li>
                ))}
              </ul>
            )}
          </>
        )}
      </main>

      {assignFor && (
        <AssignModal
          taskId={assignFor.id}
          taskTitle={assignFor.title}
          onClose={() => {
            setAssignFor(null);
            void load();
          }}
        />
      )}

      {showCreate && (
        <div className="modal-mask" onClick={() => setShowCreate(false)}>
          <form
            className="modal"
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleCreate}
          >
            <h2 className="modal__title">New task</h2>

            <label className="modal__label">Task title</label>
            <input
              className="modal__input"
              placeholder="e.g. Product review sentiment"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              autoFocus
            />

            <label className="modal__label">Annotation plan</label>
            <select
              className="modal__input"
              value={newPlan}
              onChange={(e) => setNewPlan(e.target.value as WorkflowPlan)}
            >
              <option value="AI_PLUS_HUMAN">{PLAN_LABEL.AI_PLUS_HUMAN}</option>
              <option value="HUMAN_ONLY">{PLAN_LABEL.HUMAN_ONLY}</option>
              <option value="AI_ONLY">{PLAN_LABEL.AI_ONLY}</option>
            </select>
            <p className="modal__hint">{PLAN_DESC[newPlan]}</p>

            {createError && <p className="home__error">{createError}</p>}

            <div className="modal__actions">
              <button
                type="button"
                className="linkbtn"
                onClick={() => setShowCreate(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={!newTitle.trim()}
              >
                Create task
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
