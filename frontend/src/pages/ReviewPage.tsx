import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import type { ReviewItem } from '../api';
import { SubjectView } from '../components/SubjectView';
import { fmtAnswer } from '../format';

// 审核台：审核员逐条看 标注对象 + 提交结果 + AI 建议 → 通过 / 打回。
export function ReviewPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const [status, setStatus] = useState<'loading' | 'reviewing' | 'empty' | 'error'>(
    'loading',
  );
  const [queue, setQueue] = useState<ReviewItem[]>([]);
  const [taskTitle, setTaskTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [comment, setComment] = useState('');
  const [errMsg, setErrMsg] = useState('');

  async function loadQueue() {
    if (!taskId) return;
    try {
      const q = await api.reviewQueue(taskId);
      setQueue(q);
      setStatus(q.length === 0 ? 'empty' : 'reviewing');
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : 'Failed');
      setStatus('error');
    }
  }

  useEffect(() => {
    if (!taskId) return;
    (async () => {
      const tasks = await api.listTasks();
      const t = tasks.find((x) => x.id === taskId);
      if (t) setTaskTitle(t.title);
      await loadQueue();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  const current = queue[0];

  async function decide(action: 'approve' | 'reject') {
    if (!current) return;
    setBusy(true);
    setErrMsg('');
    try {
      if (action === 'approve') await api.approveAnnotation(current.id);
      else await api.rejectAnnotation(current.id, comment.trim());
      setComment('');
      await loadQueue(); // 刷新队列 → 下一条(或空)
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="wb">
      <header className="wb__top">
        <Link className="linkbtn" to="/">
          ← Home
        </Link>
        <span className="wb__title">{taskTitle || 'Review'}</span>
        <span className="wb__progress">{queue.length} to review</span>
      </header>

      <main className="wb__main">
        {status === 'loading' && <p className="home__muted">Loading…</p>}
        {status === 'error' && <p className="home__error">Error: {errMsg}</p>}
        {status === 'empty' && (
          <div className="wb__card wb__done">
            <p className="wb__done-title">✅ Nothing to review</p>
            <p className="home__muted">No items are waiting for review.</p>
            <Link className="linkbtn" to="/">
              Back to tasks
            </Link>
          </div>
        )}
        {status === 'reviewing' && current && (
          <div className="wb__card">
            {/* 标注对象 */}
            <div className="wb__subject">
              <SubjectView payload={current.payload} />
            </div>

            {/* 提交的标注结果 */}
            <div className="rv__block">
              <h3 className="rv__h3">Submitted labels</h3>
              {current.result ? (
                <ul className="rv__result">
                  {Object.entries(current.result).map(([k, v]) => (
                    <li key={k}>
                      <span className="rv__key">{k}</span>
                      <span className="rv__val">{fmtAnswer(v)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="home__muted">(no result)</p>
              )}
            </div>

            {/* AI 建议 */}
            {current.aiReview && (
              <div className="rv__ai">
                🤖 AI suggests <b>{current.aiReview.decision}</b>
                {current.aiReview.score != null &&
                  ` · score ${current.aiReview.score}`}
              </div>
            )}

            {errMsg && <p className="home__error">{errMsg}</p>}

            {/* 打回批注 + 操作 */}
            <input
              className="rv__comment"
              placeholder="Reason for reject (optional)…"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <div className="rv__actions">
              <button
                className="ghostbtn"
                disabled={busy}
                onClick={() => decide('reject')}
              >
                Reject
              </button>
              <button
                className="btn-primary"
                disabled={busy}
                onClick={() => decide('approve')}
              >
                {busy ? '…' : 'Approve'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
