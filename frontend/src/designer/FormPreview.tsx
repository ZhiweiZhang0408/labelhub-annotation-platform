// ============================================================================
// FormPreview —— 预览弹窗：把 Schema 渲染成标注员真会看到的表单
// ----------------------------------------------------------------------------
// Day4"渲染器"的雏形：按每个字段的 type 渲染成真实控件(文本/数字/单选/多选/下拉)。
// 提交时：用浏览器原生做必填校验 → 收集答案 → 按字段 id 拼成结果 JSON 显示出来
// (演示"表单→填写→产出结果"闭环；真正入库留到 Day5)。
// ============================================================================

import { useState } from 'react';
import type { FormEvent } from 'react';
import type { FormField, FormSchemaDefinition } from '../types/form-schema';
import type { SubjectKind } from './subject';
import { SubjectMedia } from './SubjectMedia';

interface Props {
  schema: FormSchemaDefinition;
  subjectKind: SubjectKind;
  subjectText: string;
  onClose: () => void;
}

export function FormPreview({ schema, subjectKind, subjectText, onClose }: Props) {
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); // 别真的刷新页面
    const fd = new FormData(e.currentTarget);
    // 按字段 id 收集答案：多选拿数组(getAll)，其余拿单值(get)。
    // 字段的 id 就成了结果 JSON 的 key —— 呼应契约里 id 的设计。
    const out: Record<string, unknown> = {};
    for (const field of schema.fields) {
      out[field.id] =
        field.type === 'checkbox' ? fd.getAll(field.id) : fd.get(field.id) ?? '';
    }
    setResult(out);
  }

  return (
    <div className="pvmask" onClick={onClose}>
      <div className="pvmodal" onClick={(e) => e.stopPropagation()}>
        <div className="pvmodal__head">
          <div>
            <h2 className="pvmodal__title">Preview</h2>
            <p className="pvmodal__sub">What annotators will see</p>
          </div>
          <button className="pvmodal__close" onClick={onClose} title="Close">
            ✕
          </button>
        </div>

        <form className="pvmodal__body" onSubmit={handleSubmit}>
          {/* Item to label */}
          <div className="pv__subject">
            {subjectKind === 'text' ? (
              <p className="pv__stext">{subjectText}</p>
            ) : (
              <SubjectMedia kind={subjectKind} />
            )}
          </div>

          {/* Form */}
          <h3 className="pv__formtitle">{schema.title || 'Untitled form'}</h3>
          {schema.fields.length === 0 ? (
            <p className="pv__empty">No fields yet — add some on the right first.</p>
          ) : (
            <ol className="pv__list">
              {schema.fields.map((field) => (
                <li key={field.id} className="pv__field">
                  <label className="pv__label">
                    {field.label}
                    {field.required && <span className="pv__req">*</span>}
                  </label>
                  <PreviewControl field={field} />
                </li>
              ))}
            </ol>
          )}

          <button
            type="submit"
            className="pv__submit"
            disabled={schema.fields.length === 0}
          >
            Submit
          </button>

          {result && (
            <div className="pv__result">
              <p className="pv__result-title">
                Submitted — this is the result that gets saved:
              </p>
              <pre className="pv__result-code">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

// 按字段 type 渲染真实输入控件；required 交给浏览器原生校验。
function PreviewControl({ field }: { field: FormField }) {
  const req = field.required;

  if (field.type === 'text') {
    return (
      <input className="pv__input" type="text" name={field.id} placeholder="Type here…" required={req} />
    );
  }
  if (field.type === 'textarea') {
    return (
      <textarea className="pv__input pv__textarea" name={field.id} placeholder="Type here…" required={req} />
    );
  }
  if (field.type === 'number') {
    return (
      <input className="pv__input" type="number" name={field.id} placeholder="Enter a number…" required={req} />
    );
  }

  // 选择类：'options' in field 把联合收窄到 ChoiceField
  if ('options' in field) {
    if (field.type === 'select') {
      return (
        <select className="pv__input" name={field.id} defaultValue="" required={req}>
          <option value="" disabled>
            Select…
          </option>
          {field.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    }
    // radio(单选) / checkbox(多选)
    const inputType = field.type === 'radio' ? 'radio' : 'checkbox';
    // checkbox 的 required 会要求"每个都勾"，语义不对，故只给 radio 设 required
    const optRequired = field.type === 'radio' ? req : false;
    return (
      <div className="pv__opts">
        {field.options.map((o) => (
          <label key={o.value} className="pv__opt">
            {/* radio 用同一个 name 才能互斥成一组 */}
            <input type={inputType} name={field.id} value={o.value} required={optRequired} />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    );
  }
  return null;
}
