import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError, api } from '../api';
import type { FormSchemaDefinition } from '../types/form-schema';
import { FormRenderer } from '../designer/FormRenderer';
import type { Answers } from '../designer/FormRenderer';
import { SubjectMedia } from '../designer/SubjectMedia';

// 工作台页：按 taskId 从后端取表单 → 用 FormRenderer 渲染 → 填写提交(暂本地显示结果)。
export function WorkbenchPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const [status, setStatus] = useState<'loading' | 'ready' | 'noform' | 'error'>(
    'loading',
  );
  const [schema, setSchema] = useState<FormSchemaDefinition | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [result, setResult] = useState<Answers | null>(null);
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => {
    if (!taskId) return;
    let cancelled = false;
    (async () => {
      try {
        const tasks = await api.listTasks();
        const t = tasks.find((x) => x.id === taskId);
        if (t && !cancelled) setTaskTitle(t.title);

        try {
          const row = await api.getFormSchema(taskId);
          if (!cancelled) {
            setSchema(row.schema);
            setStatus('ready');
          }
        } catch (e) {
          if (e instanceof ApiError && e.status === 404) {
            if (!cancelled) setStatus('noform');
          } else throw e;
        }
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
  }, [taskId]);

  return (
    <div className="wb">
      <header className="wb__top">
        <Link className="linkbtn" to="/">
          ← Home
        </Link>
        <span className="wb__title">{taskTitle || 'Annotate'}</span>
      </header>

      <main className="wb__main">
        {status === 'loading' && <p className="home__muted">Loading…</p>}
        {status === 'error' && <p className="home__error">Error: {errMsg}</p>}
        {status === 'noform' && (
          <p className="home__muted">
            This task has no form yet. Ask the owner to design one.
          </p>
        )}
        {status === 'ready' && schema && (
          <div className="wb__card">
            {result ? (
              <div className="wb__done">
                <p className="wb__done-title">✅ Submitted!</p>
                <p className="home__muted">
                  (Preview only — saving annotations comes in Week 3.) Collected
                  result:
                </p>
                <pre className="pv__result-code">
                  {JSON.stringify(result, null, 2)}
                </pre>
                <button className="linkbtn" onClick={() => setResult(null)}>
                  Fill again
                </button>
              </div>
            ) : (
              <>
                {/* 标注主体：真实数据项(Annotation.payload)是 W3 接入，这里先占位示意布局 */}
                <div className="wb__subject">
                  <SubjectMedia kind="image" />
                  <p className="wb__subject-note">
                    Sample item to label · real data items come in Week 3
                  </p>
                </div>
                <FormRenderer
                  schema={schema}
                  submitLabel="Submit annotation"
                  onSubmit={setResult}
                />
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
