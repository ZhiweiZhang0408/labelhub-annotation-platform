import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ApiError, api } from '../api';
import type { FormSchemaDefinition } from '../types/form-schema';
import { FormDesigner } from '../designer/FormDesigner';

// 设计器页：按 taskId 加载已有表单(若有) → 交给 FormDesigner；保存时 PUT 回后端。
export function DesignerPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [initial, setInitial] = useState<FormSchemaDefinition | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => {
    if (!taskId) return;
    let cancelled = false;
    (async () => {
      try {
        // 取任务标题(从列表里找)
        const tasks = await api.listTasks();
        const t = tasks.find((x) => x.id === taskId);
        if (t && !cancelled) setTaskTitle(t.title);

        // 取已有表单；404 = 还没配过，从空白开始
        try {
          const row = await api.getFormSchema(taskId);
          if (!cancelled) setInitial(row.schema);
        } catch (e) {
          if (!(e instanceof ApiError && e.status === 404)) throw e;
        }
        if (!cancelled) setStatus('ready');
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

  async function handleSave(schema: FormSchemaDefinition) {
    await api.putFormSchema(taskId!, schema);
  }

  if (status === 'loading') return <div className="page-center">Loading…</div>;
  if (status === 'error')
    return <div className="page-center">Error: {errMsg}</div>;

  return (
    <FormDesigner
      taskTitle={taskTitle}
      initialSchema={initial}
      onSave={handleSave}
    />
  );
}
