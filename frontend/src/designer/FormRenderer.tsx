// ============================================================================
// FormRenderer —— 独立的"渲染器"：把一份 Schema 渲染成可填写 + 会校验的真实表单
// ----------------------------------------------------------------------------
// 这是难度三件套 #1 的核心组件，D5 的标注员工作台会直接复用它。
//   - 按每个字段的 type 渲染真实控件(受控)
//   - 提交时把 Schema 里的校验规则(required/长度/范围/正则)翻译成运行时检查
//   - 校验不过 → 逐字段显示错误、拦住提交；通过 → onSubmit(结果)
// 结果对象以【字段 id 为 key】(呼应契约里 id 的设计)。
// ============================================================================

import { useState } from 'react';
import type { FormEvent } from 'react';
import type { FormField, FormSchemaDefinition } from '../types/form-schema';

// 一个答案：单值(文本/数字/单选/下拉)是字符串；多选是字符串数组。
type AnswerValue = string | string[];
export type Answers = Record<string, AnswerValue>;

interface Props {
  schema: FormSchemaDefinition;
  onSubmit: (result: Answers) => void;
  submitLabel?: string;
}

// 初始答案：每个字段给个空值(多选给空数组)。
function initAnswers(fields: FormField[]): Answers {
  const a: Answers = {};
  for (const f of fields) a[f.id] = f.type === 'checkbox' ? [] : '';
  return a;
}

// ── 核心：把一个字段的校验规则翻译成运行时检查，返回错误信息或 null ──
function validateField(field: FormField, value: AnswerValue): string | null {
  const empty = Array.isArray(value) ? value.length === 0 : value.trim() === '';

  // 必填
  if (field.required && empty) return 'This field is required';
  // 非必填且为空 → 不用再查后面的规则
  if (empty) return null;

  // 文本类：长度 + 正则
  if (field.type === 'text' || field.type === 'textarea') {
    const v = value as string;
    const r = field.validation;
    if (r?.minLength != null && v.length < r.minLength)
      return `At least ${r.minLength} characters`;
    if (r?.maxLength != null && v.length > r.maxLength)
      return `At most ${r.maxLength} characters`;
    if (r?.pattern) {
      try {
        if (!new RegExp(r.pattern).test(v)) return 'Invalid format';
      } catch {
        /* 正则本身写错就跳过，不拦用户 */
      }
    }
  }

  // 数字类：是数字 + 范围
  if (field.type === 'number') {
    const n = Number(value as string);
    if (Number.isNaN(n)) return 'Must be a number';
    const r = field.validation;
    if (r?.min != null && n < r.min) return `Must be ≥ ${r.min}`;
    if (r?.max != null && n > r.max) return `Must be ≤ ${r.max}`;
  }

  return null;
}

export function FormRenderer({ schema, onSubmit, submitLabel = 'Submit' }: Props) {
  const [answers, setAnswers] = useState<Answers>(() => initAnswers(schema.fields));
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 改某个字段的答案；若它当前有错，改完即时重校验(错误对了就消失)。
  function setAnswer(id: string, value: AnswerValue) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
    setErrors((prev) => {
      if (!prev[id]) return prev;
      const field = schema.fields.find((f) => f.id === id);
      if (!field) return prev;
      const err = validateField(field, value);
      const next = { ...prev };
      if (err) next[id] = err;
      else delete next[id];
      return next;
    });
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // 全部字段跑一遍校验，收集错误
    const next: Record<string, string> = {};
    for (const f of schema.fields) {
      const err = validateField(f, answers[f.id]);
      if (err) next[f.id] = err;
    }
    setErrors(next);
    if (Object.keys(next).length === 0) onSubmit(answers); // 全过才提交
  }

  return (
    // noValidate：关掉浏览器原生校验，全用我们自己的规则
    <form className="rd" onSubmit={handleSubmit} noValidate>
      <h3 className="rd__title">{schema.title || 'Untitled form'}</h3>

      {schema.fields.length === 0 ? (
        <p className="rd__empty">No fields yet.</p>
      ) : (
        <ol className="rd__list">
          {schema.fields.map((field) => (
            <li key={field.id} className="rd__field">
              <label className="rd__label">
                {field.label}
                {field.required && <span className="rd__req">*</span>}
              </label>
              <RendererControl
                field={field}
                value={answers[field.id]}
                invalid={!!errors[field.id]}
                onChange={(v) => setAnswer(field.id, v)}
              />
              {errors[field.id] && (
                <p className="rd__error">{errors[field.id]}</p>
              )}
            </li>
          ))}
        </ol>
      )}

      <button
        type="submit"
        className="rd__submit"
        disabled={schema.fields.length === 0}
      >
        {submitLabel}
      </button>
    </form>
  );
}

// 按字段 type 渲染受控控件。
function RendererControl({
  field,
  value,
  invalid,
  onChange,
}: {
  field: FormField;
  value: AnswerValue;
  invalid: boolean;
  onChange: (v: AnswerValue) => void;
}) {
  const cls = `rd__input${invalid ? ' rd__input--err' : ''}`;

  if (field.type === 'text') {
    return (
      <input
        className={cls}
        type="text"
        value={value as string}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type here…"
      />
    );
  }
  if (field.type === 'textarea') {
    return (
      <textarea
        className={`${cls} rd__textarea`}
        value={value as string}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type here…"
      />
    );
  }
  if (field.type === 'number') {
    return (
      <input
        className={cls}
        type="number"
        value={value as string}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter a number…"
      />
    );
  }

  // 选择类
  if ('options' in field) {
    if (field.type === 'select') {
      return (
        <select
          className={cls}
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
        >
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
    if (field.type === 'radio') {
      return (
        <div className="rd__opts">
          {field.options.map((o) => (
            <label key={o.value} className="rd__opt">
              <input
                type="radio"
                name={field.id}
                checked={value === o.value}
                onChange={() => onChange(o.value)}
              />
              <span>{o.label}</span>
            </label>
          ))}
        </div>
      );
    }
    // checkbox(多选)：答案是数组，勾选就增删
    const arr = value as string[];
    return (
      <div className="rd__opts">
        {field.options.map((o) => (
          <label key={o.value} className="rd__opt">
            <input
              type="checkbox"
              checked={arr.includes(o.value)}
              onChange={(e) =>
                onChange(
                  e.target.checked
                    ? [...arr, o.value]
                    : arr.filter((x) => x !== o.value),
                )
              }
            />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    );
  }
  return null;
}
