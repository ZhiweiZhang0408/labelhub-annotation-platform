// 分配弹窗：勾选把这个任务分给哪些工人 → Save。首页任务行上点 Assign 打开。
import { useEffect, useState } from 'react';
import { api } from '../api';
import type { Worker } from '../api';

interface Props {
  taskId: string;
  taskTitle: string;
  onClose: () => void; // 关闭(保存成功后也调，让父层刷新)
}

export function AssignModal({ taskId, taskTitle, onClose }: Props) {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setWorkers(await api.listWorkers());
        const assigned = await api.getAssignees(taskId);
        setSelected(new Set(assigned.map((w) => w.id)));
      } catch (e) {
        setErrMsg(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, [taskId]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function save() {
    setBusy(true);
    setErrMsg('');
    try {
      await api.setAssignees(taskId, [...selected]);
      onClose();
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : 'Save failed');
      setBusy(false);
    }
  }

  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal__title">Assign workers</h2>
        <p className="modal__hint" style={{ marginBottom: 14 }}>
          {taskTitle} — pick who can work on this task.
        </p>

        {loading ? (
          <p className="home__muted">Loading…</p>
        ) : workers.length === 0 ? (
          <p className="home__muted">No workers yet.</p>
        ) : (
          <ul className="assignlist">
            {workers.map((w) => (
              <li key={w.id}>
                <label className="assignrow__label">
                  <input
                    type="checkbox"
                    checked={selected.has(w.id)}
                    onChange={() => toggle(w.id)}
                  />
                  <span className="assignrow__name">{w.name}</span>
                  <span className="assignrow__email">{w.email}</span>
                  <span className="taskrow__plan">{w.role.toLowerCase()}</span>
                </label>
              </li>
            ))}
          </ul>
        )}

        {errMsg && <p className="home__error">{errMsg}</p>}

        <div className="modal__actions">
          <button className="linkbtn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="btn-primary" onClick={save} disabled={busy || loading}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
