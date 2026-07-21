// ============================================================================
// FormDesigner —— 设计器容器
// ----------------------------------------------------------------------------
// 持有整张表单的"唯一真相"：title + fields。加/删/改/排序字段都在这里。
// D5 起：从后端加载已有表单(initialSchema)，点 Save 通过 onSave 存回后端；
// 有配置问题(空标题/矛盾规则…)时禁止保存。
// ============================================================================

import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { arrayMove } from '@dnd-kit/sortable';
import type {
  FieldType,
  FormField,
  FormSchemaDefinition,
} from '../types/form-schema';
import type { DataItem, SubjectKind } from './subject';
import { createField } from './fieldFactory';
import { schemaIssueCount } from './fieldIssues';
import { FieldPalette } from './FieldPalette';
import { SubjectPreview } from './SubjectPreview';
import { DesignerCanvas } from './DesignerCanvas';
import { SchemaPreview } from './SchemaPreview';
import { FormPreview } from './FormPreview';
import { ReleaseModal } from './ReleaseModal';
import './FormDesigner.css';

interface Props {
  taskTitle: string;
  initialSchema: FormSchemaDefinition | null;
  onSave: (schema: FormSchemaDefinition) => Promise<void>;
  // 发布：保存表单 + 上传数据 + 置 PUBLISHED（由页面接后端）
  onRelease: (schema: FormSchemaDefinition, items: DataItem[]) => Promise<void>;
}

// 生成初始序号：从已有字段 id(field_N) 里取最大 N，续着往下发，避免 id 撞车。
function initialSeq(fields: FormField[]): number {
  let max = 0;
  for (const f of fields) {
    const m = /(\d+)$/.exec(f.id);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max;
}

export function FormDesigner({
  taskTitle,
  initialSchema,
  onSave,
  onRelease,
}: Props) {
  const [title, setTitle] = useState(initialSchema?.title ?? 'Untitled form');
  const [fields, setFields] = useState<FormField[]>(
    initialSchema?.fields ?? [],
  );
  const [showDevView, setShowDevView] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [subjectKind, setSubjectKind] = useState<SubjectKind>('image');
  const [items, setItems] = useState<DataItem[]>([]); // 上传的待标注数据(前端本地)
  const seq = useRef(initialSeq(initialSchema?.fields ?? []));

  // 保存相关状态
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [saveError, setSaveError] = useState('');

  // 发布相关
  const [showRelease, setShowRelease] = useState(false);
  const [released, setReleased] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [releaseError, setReleaseError] = useState('');

  async function handleReleaseConfirm() {
    setReleasing(true);
    setReleaseError('');
    try {
      await onRelease(schema, items); // 保存表单 + 上传数据 + 发布
      setReleased(true);
      setShowRelease(false);
    } catch (e) {
      setReleaseError(e instanceof Error ? e.message : 'Release failed');
    } finally {
      setReleasing(false);
    }
  }

  function addItems(added: DataItem[]) {
    setItems((prev) => [...prev, ...added]);
  }
  function removeItem(id: string) {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  function handleAdd(type: FieldType) {
    seq.current += 1;
    setFields((prev) => [...prev, createField(type, seq.current)]);
  }
  function handleRemove(id: string) {
    setFields((prev) => prev.filter((f) => f.id !== id));
  }
  function updateField(id: string, updater: (f: FormField) => FormField) {
    setFields((prev) => prev.map((f) => (f.id === id ? updater(f) : f)));
  }
  function reorderFields(activeId: string, overId: string) {
    setFields((prev) => {
      const from = prev.findIndex((f) => f.id === activeId);
      const to = prev.findIndex((f) => f.id === overId);
      if (from === -1 || to === -1) return prev;
      return arrayMove(prev, from, to);
    });
  }

  const schema: FormSchemaDefinition = { version: 1, title, fields };

  // 保存前的闸门：没字段 或 有配置问题 → 不能保存。
  const issues = schemaIssueCount(fields);
  const canSave = fields.length > 0 && issues === 0 && !saving;

  // 当前类型的数据 + 一条样例(给预览用)
  const shownItems = items.filter((it) => it.kind === subjectKind);
  const itemCount = shownItems.length;
  const sampleItem = shownItems[0];
  const canRelease = fields.length > 0 && issues === 0;

  async function handleSave() {
    if (fields.length === 0 || issues > 0 || saving) return;
    setSaving(true);
    setSaveError('');
    setSavedMsg('');
    try {
      await onSave(schema);
      setSavedMsg('Saved ✓');
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="designer">
      <header className="designer__topbar">
        <div className="brand">
          <Link className="brand__home" to="/" title="Back to tasks">
            🏷️
          </Link>
          <span className="brand__name">LabelHub</span>
          <span className="brand__sep">/</span>
          <span className="brand__page">{taskTitle || 'Form Designer'}</span>
        </div>

        <input
          className="designer__title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Name this form"
        />

        <div className="topbar__right">
          {issues > 0 && (
            <span className="designer__issues">
              {issues} issue{issues > 1 ? 's' : ''} to fix
            </span>
          )}
          {savedMsg && <span className="designer__saved">{savedMsg}</span>}
          {saveError && <span className="designer__saveerr">{saveError}</span>}
          {released && <span className="designer__released">● Released</span>}
          <span className="designer__count">{fields.length} fields</span>
          <button className="ghostbtn" onClick={() => setShowPreview(true)}>
            👁 Preview
          </button>
          <button
            className={`devtoggle${showDevView ? ' is-on' : ''}`}
            onClick={() => setShowDevView((v) => !v)}
            title="JSON preview for developers"
          >
            &lt;/&gt; Dev view
          </button>
          <button
            className="previewbtn"
            onClick={handleSave}
            disabled={!canSave}
            title={
              issues > 0
                ? 'Fix the highlighted issues first'
                : fields.length === 0
                  ? 'Add at least one field'
                  : 'Save this form'
            }
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            className="releasebtn"
            onClick={() => setShowRelease(true)}
            disabled={!canRelease}
            title={
              canRelease
                ? 'Release this task to annotators'
                : 'Add fields and fix issues first'
            }
          >
            {released ? 'Re-release' : 'Release'}
          </button>
        </div>
      </header>

      <div className="designer__body">
        <FieldPalette onAdd={handleAdd} />
        <SubjectPreview
          kind={subjectKind}
          items={items}
          onKindChange={setSubjectKind}
          onAddItems={addItems}
          onRemoveItem={removeItem}
        />
        <DesignerCanvas
          fields={fields}
          onUpdate={updateField}
          onRemove={handleRemove}
          onReorder={reorderFields}
        />
      </div>

      {showDevView && <SchemaPreview schema={schema} />}

      {showPreview && (
        <FormPreview
          schema={schema}
          subjectKind={subjectKind}
          sampleItem={sampleItem}
          onClose={() => setShowPreview(false)}
        />
      )}

      {showRelease && (
        <ReleaseModal
          formTitle={title}
          fieldCount={fields.length}
          itemCount={itemCount}
          busy={releasing}
          error={releaseError}
          onConfirm={handleReleaseConfirm}
          onClose={() => setShowRelease(false)}
        />
      )}
    </div>
  );
}
