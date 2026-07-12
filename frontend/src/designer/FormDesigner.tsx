// ============================================================================
// FormDesigner —— 设计器容器（今天的主角）
// ----------------------------------------------------------------------------
// 持有整张表单的"唯一真相"：title + fields 数组。加/删/改字段的逻辑都在这里，
// 子组件靠 props 拿数据、发信号。
// 布局：左=字段面板 · 中=标注对象(参考) · 右=标注表单(在这搭)。
// JSON 预览给开发者调试用，默认收起，点开滑出右侧抽屉。
// ============================================================================

import { useRef, useState } from 'react';
import type {
  FieldType,
  FormField,
  FormSchemaDefinition,
} from '../types/form-schema';
import type { SubjectKind } from './subject';
import { createField } from './fieldFactory';
import { FieldPalette } from './FieldPalette';
import { SubjectPreview } from './SubjectPreview';
import { DesignerCanvas } from './DesignerCanvas';
import { SchemaPreview } from './SchemaPreview';
import { FormPreview } from './FormPreview';
import './FormDesigner.css';

const SAMPLE_SENTENCE =
  'The restaurant had a great atmosphere and friendly staff, but the food took nearly an hour to arrive.';

export function FormDesigner() {
  const [title, setTitle] = useState('Untitled form');
  const [fields, setFields] = useState<FormField[]>([]);
  const [showDevView, setShowDevView] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  // 标注对象状态提到这里：中栏和预览弹窗共享同一份
  const [subjectKind, setSubjectKind] = useState<SubjectKind>('image');
  const [subjectText, setSubjectText] = useState(SAMPLE_SENTENCE);
  const seq = useRef(0);

  // 加字段：造新字段追加([...prev, x] 造新数组，React 才重画)。
  function handleAdd(type: FieldType) {
    seq.current += 1;
    setFields((prev) => [...prev, createField(type, seq.current)]);
  }

  // 删字段：过滤掉 id 匹配的那一项。
  function handleRemove(id: string) {
    setFields((prev) => prev.filter((f) => f.id !== id));
  }

  // 改字段：找到 id 那一项，用传入的 updater 造新字段替换(其余不动)。内联编辑走这里。
  function updateField(id: string, updater: (f: FormField) => FormField) {
    setFields((prev) => prev.map((f) => (f.id === id ? updater(f) : f)));
  }

  const schema: FormSchemaDefinition = { version: 1, title, fields };

  return (
    <div className="designer">
      <header className="designer__topbar">
        <div className="brand">
          <span className="brand__logo">🏷️</span>
          <span className="brand__name">LabelHub</span>
          <span className="brand__sep">/</span>
          <span className="brand__page">Form Designer</span>
        </div>

        <input
          className="designer__title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Name this form"
        />

        <div className="topbar__right">
          <span className="designer__count">{fields.length} fields</span>
          <button className="previewbtn" onClick={() => setShowPreview(true)}>
            👁 Preview
          </button>
          <button
            className={`devtoggle${showDevView ? ' is-on' : ''}`}
            onClick={() => setShowDevView((v) => !v)}
            title="JSON preview for developers"
          >
            &lt;/&gt; Dev view
          </button>
        </div>
      </header>

      <div className="designer__body">
        {/* 左：加字段 */}
        <FieldPalette onAdd={handleAdd} />
        {/* 中：标注对象(参考素材，帮负责人判断要哪些字段) */}
        <SubjectPreview
          kind={subjectKind}
          text={subjectText}
          onKindChange={setSubjectKind}
          onTextChange={setSubjectText}
        />
        {/* 右：标注表单(在这搭) */}
        <DesignerCanvas
          fields={fields}
          onUpdate={updateField}
          onRemove={handleRemove}
        />
      </div>

      {/* 开发者视图：JSON 从右侧滑出的抽屉 */}
      {showDevView && <SchemaPreview schema={schema} />}

      {/* 预览弹窗：标注员将看到的真实表单 */}
      {showPreview && (
        <FormPreview
          schema={schema}
          subjectKind={subjectKind}
          subjectText={subjectText}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}
