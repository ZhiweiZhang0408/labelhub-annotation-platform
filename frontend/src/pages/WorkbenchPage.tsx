import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError, api } from '../api';
import type { AnnotationItem, TaskProgress } from '../api';
import type { FormSchemaDefinition } from '../types/form-schema';
import { FormRenderer } from '../designer/FormRenderer';
import type { Answers } from '../designer/FormRenderer';
import { SubjectView } from '../components/SubjectView';

// 工作台：标注员领一条真实待标注数据 → 看它 + 填表单 → 提交 → 自动下一条。
export function WorkbenchPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const [status, setStatus] = useState<'loading' | 'working' | 'empty' | 'error'>(
    'loading',
  );
  const [schema, setSchema] = useState<FormSchemaDefinition | null>(null);
  const [item, setItem] = useState<AnnotationItem | null>(null);
  const [progress, setProgress] = useState<TaskProgress | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  async function refreshProgress() {
    if (!taskId) return;
    try {
      setProgress(await api.taskProgress(taskId));
    } catch {
      /* 进度失败不阻断标注 */
    }
  }

  // 领取下一条：拿到就进入标注；404 表示没有待标注了。
  async function claimNext() {
    if (!taskId) return;
    try {
      const it = await api.claimItem(taskId);
      setItem(it);
      setStatus('working');
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        setItem(null);
        setStatus('empty');
      } else {
        setErrMsg(e instanceof Error ? e.message : 'Failed');
        setStatus('error');
      }
    }
    void refreshProgress();
  }

  useEffect(() => {
    if (!taskId) return;
    let cancelled = false;
    (async () => {
      try {
        const tasks = await api.listTasks();
        const t = tasks.find((x) => x.id === taskId);
        if (t && !cancelled) setTaskTitle(t.title);
        const row = await api.getFormSchema(taskId);
        if (cancelled) return;
        setSchema(row.schema);
        await claimNext(); // 进来先领一条
      } catch (e) {
        if (!cancelled) {
          setErrMsg(e instanceof Error ? e.message : 'Failed to load');
          setStatus('error');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  async function handleSubmit(result: Answers) {
    if (!item) return;
    setSubmitting(true);
    setErrMsg('');
    try {
      await api.submitAnnotation(item.id, result);
      await claimNext(); // 提交完自动领下一条(或进入 empty)
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  }

  const total = progress?.total ?? 0;
  const pending = progress?.counts.PENDING ?? 0;
  const submitted = total - pending - (progress?.counts.IN_PROGRESS ?? 0);

  return (
    <div className="wb">
      <header className="wb__top">
        <Link className="linkbtn" to="/">
          ← Home
        </Link>
        <span className="wb__title">{taskTitle || 'Annotate'}</span>
        {progress && (
          <span className="wb__progress">
            Submitted {submitted} / {total}
          </span>
        )}
      </header>

      <main className="wb__main">
        {status === 'loading' && <p className="home__muted">Loading…</p>}
        {status === 'error' && <p className="home__error">Error: {errMsg}</p>}
        {status === 'empty' && (
          <div className="wb__card wb__done">
            <p className="wb__done-title">🎉 All caught up</p>
            <p className="home__muted">
              No more items to annotate in this task.
            </p>
            <Link className="linkbtn" to="/">
              Back to tasks
            </Link>
          </div>
        )}
        {status === 'working' && schema && item && (
          <div className="wb__card">
            {/* 真实标注对象(来自 payload) */}
            <div className="wb__subject">
              <SubjectView payload={item.payload} />
            </div>
            {errMsg && <p className="home__error">{errMsg}</p>}
            {/* key=item.id：换一条数据时渲染器重置，不残留上一条的答案 */}
            <FormRenderer
              key={item.id}
              schema={schema}
              subject={item.payload}
              submitLabel={submitting ? 'Submitting…' : 'Submit & next'}
              onSubmit={handleSubmit}
            />
          </div>
        )}
      </main>
    </div>
  );
}

