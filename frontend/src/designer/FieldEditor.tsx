// ============================================================================
// FieldEditor —— 单个字段的"所见即所得"内联编辑器（问卷星式）
// ----------------------------------------------------------------------------
// 按字段 type 渲染成对应的可编辑题目：
//   - 选择类(radio/checkbox/select)：列出可编辑选项 + 添加/删除选项
//   - 文本/数字：显示标注员将看到的输入框预览(禁用，仅示意)
// 所有编辑都通过 onUpdate 把"如何改这个字段"的函数抛给上层，由上层改状态。
// ============================================================================

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { FormField } from '../types/form-schema';
import { labelOf } from './fieldFactory';

interface Props {
  index: number;
  field: FormField;
  // onUpdate 收一个"拿旧字段返回新字段"的函数，上层据此更新数组里这一项。
  onUpdate: (updater: (f: FormField) => FormField) => void;
  onRemove: () => void;
}

// 每种选择类的选项前缀标记（纯视觉，示意标注员会看到的样子）
const OPTION_MARKER: Record<string, string> = {
  radio: '○',
  checkbox: '▢',
  select: '▾',
};

// 生成一个不重复的选项 value（内部值，UI 不显示，只进结果 JSON）
function newOptionValue() {
  return `opt_${Math.random().toString(36).slice(2, 8)}`;
}

export function FieldEditor({ index, field, onUpdate, onRemove }: Props) {
  // useSortable：让这张卡片"可排序"。传入它的 id(唯一)，dnd-kit 就能追踪它。
  // 返回：setNodeRef(挂到 li 上标记"这是可拖的节点")、transform/transition(拖动时的
  // 位移动画)、attributes/listeners(要绑到"抓手"上的键鼠事件)、isDragging(是否正被拖)。
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform), // 把位移对象转成 CSS 字符串
    transition,
    opacity: isDragging ? 0.5 : 1, // 正被拖的卡片半透明，看得更清楚
  };

  const isChoice =
    field.type === 'radio' ||
    field.type === 'checkbox' ||
    field.type === 'select';

  // ── 各种编辑操作：都是"造一个新字段"交给 onUpdate ──
  const setLabel = (label: string) => onUpdate((f) => ({ ...f, label }));
  const toggleRequired = () =>
    onUpdate((f) => ({ ...f, required: !f.required }));

  // 选项操作：用 'options' in f 把联合类型收窄到 ChoiceField 才安全改 options
  const setOption = (i: number, label: string) =>
    onUpdate((f) =>
      'options' in f
        ? { ...f, options: f.options.map((o, idx) => (idx === i ? { ...o, label } : o)) }
        : f,
    );
  const addOption = () =>
    onUpdate((f) =>
      'options' in f
        ? {
            ...f,
            options: [
              ...f.options,
              { label: `选项${f.options.length + 1}`, value: newOptionValue() },
            ],
          }
        : f,
    );
  const removeOption = (i: number) =>
    onUpdate((f) =>
      'options' in f
        ? { ...f, options: f.options.filter((_, idx) => idx !== i) }
        : f,
    );
  // 软提示的动作：把这道选择题的类型改成下拉(select)，选项原样保留。
  const switchToSelect = () =>
    onUpdate((f) => ('options' in f ? { ...f, type: 'select' as const } : f));

  // 软提示条件：不是下拉、且选项超过 7 个 → 建议改用下拉(不强制)。
  const suggestSelect =
    isChoice && field.type !== 'select' && 'options' in field
      ? field.options.length > 7
      : false;

  return (
    // setNodeRef 标记这个 li 是可拖节点；style 应用拖动位移
    <li ref={setNodeRef} style={style} className="feditor">
      <div className="feditor__head">
        {/* 抓手：只有它绑了拖拽事件(listeners)，所以只有拖它才移动卡片，
            输入框照常能点、能编辑 */}
        <button
          type="button"
          className="feditor__drag"
          title="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          ⠿
        </button>
        <span className="feditor__index">{index + 1}</span>
        <span className="feditor__type">{labelOf(field.type)}</span>
        <div className="feditor__head-right">
          <label className="feditor__req">
            <input
              type="checkbox"
              checked={field.required}
              onChange={toggleRequired}
            />
            Required
          </label>
          <button className="feditor__del" onClick={onRemove} title="Delete field">
            🗑
          </button>
        </div>
      </div>

      {/* 可编辑的问题标题 */}
      <input
        className="feditor__label"
        value={field.label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Question title"
      />

      {/* 按类型渲染主体 */}
      {isChoice && 'options' in field ? (
        <div className="feditor__options">
          {field.options.map((opt, i) => (
            <div className="opt" key={opt.value}>
              <span className="opt__marker">{OPTION_MARKER[field.type]}</span>
              <input
                className="opt__input"
                value={opt.label}
                onChange={(e) => setOption(i, e.target.value)}
                placeholder={`Option ${i + 1}`}
              />
              <button
                className="opt__del"
                onClick={() => removeOption(i)}
                disabled={field.options.length <= 1}
                title="Remove option"
              >
                ✕
              </button>
            </div>
          ))}
          <button className="opt__add" onClick={addOption}>
            ＋ Add option
          </button>
          {suggestSelect && (
            <p className="feditor__advice">
              💡 Many options —{' '}
              <button className="feditor__advice-btn" onClick={switchToSelect}>
                switch to Dropdown
              </button>{' '}
              to save space
            </p>
          )}
        </div>
      ) : (
        <FieldPreview type={field.type} />
      )}
    </li>
  );
}

// 文本/数字类：显示标注员将看到的输入框（禁用，纯示意）
function FieldPreview({ type }: { type: FormField['type'] }) {
  if (type === 'textarea') {
    return (
      <textarea
        className="feditor__preview"
        disabled
        placeholder="Respondent will type here…"
      />
    );
  }
  const hint =
    type === 'number'
      ? 'Respondent will enter a number…'
      : 'Respondent will type here…';
  return <input className="feditor__preview" disabled placeholder={hint} />;
}
