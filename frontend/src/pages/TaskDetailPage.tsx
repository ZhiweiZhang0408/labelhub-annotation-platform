import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, getUser } from '../api';
import type { ItemPayload, TaskProgress, TaskSummary, Worker } from '../api';

interface ResultItem {
  id: string;
  status: string;
  payload: ItemPayload;
  result: Record<string, unknown> | null;
}

// 各状态的显示名 + 颜色(进度条)
const STATUS_META: { key: string; label: string; color: string }[] = [
  { key: 'PENDING', label: 'Pending', color: '#9ca3af' },
  { key: 'IN_PROGRESS', label: 'In progress', color: '#f59e0b' },
  { key: 'AI_REVIEWING', label: 'AI', color: '#8b5cf6' },
  { key: 'HUMAN_REVIEW', label: 'In review', color: '#3b82f6' },
  { key: 'APPROVED', label: 'Approved', color: '#2f9e44' },
];

const PLAN_LABEL: Record<string, string> = {
  AI_PLUS_HUMAN: 'AI + human review',
  HUMAN_ONLY: 'Human only',
  AI_ONLY: 'AI only',
};

// 任务详情 / 进度台：按状态统计一条条数据走到哪了。
export function TaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const isOwner = getUser()?.role === 'TASK_OWNER';
  const [task, setTask] = useState<TaskSummary | null>(null);
  const [progress, setProgress] = useState<TaskProgress | null>(null);
  const [items, setItems] = useState<ResultItem[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [assignMsg, setAssignMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => {
    if (!taskId) return;
    (async () => {
      try {
        const tasks = await api.listTasks();
        setTask(tasks.find((t) => t.id === taskId) ?? null);
        setProgress(await api.taskProgress(taskId));
        if (isOwner) {
          setItems(await api.getItems(taskId)); // 看结果
          setWorkers(await api.listWorkers()); // 可分配的工人
          const assigned = await api.getAssignees(taskId);
          setSelected(new Set(assigned.map((w) => w.id))); // 预勾当前分配
        }
      } catch (e) {
        setErrMsg(e instanceof Error ? e.message : 'Failed');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  function toggleWorker(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setAssignMsg('');
  }

  async function saveAssignees() {
    if (!taskId) return;
    try {
      await api.setAssignees(taskId, [...selected]);
      setAssignMsg('Saved ✓');
    } catch (e) {
      setAssignMsg(e instanceof Error ? e.message : 'Failed');
    }
  }

  if (loading) return <div className="page-center">Loading…</div>;
  if (errMsg) return <div className="page-center">Error: {errMsg}</div>;

  const total = progress?.total ?? 0;

  return (
    <div className="detail">
      <header className="wb__top">
        <Link className="linkbtn" to="/">
          ← Home
        </Link>
        <span className="wb__title">{task?.title ?? 'Task'}</span>
      </header>

      <main className="detail__main">
        <div className="detail__meta">
          {task && (
            <span className="taskrow__plan">{PLAN_LABEL[task.plan]}</span>
          )}
          {task && (
            <span className="detail__status">{task.status.toLowerCase()}</span>
          )}
          <span className="home__muted">{total} data items</span>
        </div>

        <h2 className="detail__h2">Progress</h2>
        {total === 0 ? (
          <p className="home__muted">No data items yet.</p>
        ) : (
          <>
            {/* 堆叠进度条 */}
            <div className="pbar">
              {STATUS_META.map((s) => {
                const n = progress?.counts[s.key] ?? 0;
                if (n === 0) return null;
                return (
                  <div
                    key={s.key}
                    className="pbar__seg"
                    style={{ width: `${(n / total) * 100}%`, background: s.color }}
                    title={`${s.label}: ${n}`}
                  />
                );
              })}
            </div>
            {/* 图例 + 数字 */}
            <ul className="legend">
              {STATUS_META.map((s) => (
                <li key={s.key} className="legend__item">
                  <span className="legend__dot" style={{ background: s.color }} />
                  <span className="legend__label">{s.label}</span>
                  <span className="legend__num">
                    {progress?.counts[s.key] ?? 0}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}

        {isOwner && task?.status === 'PUBLISHED' && (
          <>
            <h2 className="detail__h2 detail__h2--mt">Assign workers</h2>
            {workers.length === 0 ? (
              <p className="home__muted">No workers yet.</p>
            ) : (
              <>
                <ul className="assignlist">
                  {workers.map((w) => (
                    <li key={w.id} className="assignrow">
                      <label className="assignrow__label">
                        <input
                          type="checkbox"
                          checked={selected.has(w.id)}
                          onChange={() => toggleWorker(w.id)}
                        />
                        <span className="assignrow__name">{w.name}</span>
                        <span className="assignrow__email">{w.email}</span>
                        <span className="taskrow__plan">
                          {w.role.toLowerCase()}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
                <div className="assign__actions">
                  {assignMsg && <span className="assign__saved">{assignMsg}</span>}
                  <button className="btn-primary" onClick={saveAssignees}>
                    Save assignment
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {isOwner && items.length > 0 && (
          <>
            <h2 className="detail__h2 detail__h2--mt">Results</h2>
            <ul className="results">
              {items.map((it) => (
                <li key={it.id} className="resultrow">
                  <div className="resultrow__head">
                    <span className="resultrow__name">{it.payload.name}</span>
                    <span className="resultrow__status">
                      {it.status.toLowerCase()}
                    </span>
                  </div>
                  {it.result ? (
                    <ul className="rv__result">
                      {Object.entries(it.result).map(([k, v]) => (
                        <li key={k}>
                          <span className="rv__key">{k}</span>
                          <span className="rv__val">
                            {Array.isArray(v) ? v.join(', ') : String(v)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="home__muted">(not labeled yet)</p>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </main>
    </div>
  );
}
