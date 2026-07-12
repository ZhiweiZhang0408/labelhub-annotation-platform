// 左栏：字段类型面板。点一个按钮 → 调 onAdd(type)，由外层去改状态。
// 这个组件自己不存任何状态，只负责"显示按钮 + 把点击事件往上抛"(状态提升)。
import type { FieldType } from '../types/form-schema';
import { FIELD_TYPE_META } from './fieldFactory';

interface Props {
  onAdd: (type: FieldType) => void;
}

export function FieldPalette({ onAdd }: Props) {
  return (
    <aside className="palette">
      <div className="palette__head">
        <h2 className="palette__title">Field types</h2>
        <p className="palette__hint">Click to add</p>
      </div>
      <div className="palette__list">
        {FIELD_TYPE_META.map((meta) => (
          <button
            key={meta.type}
            className="palette__item"
            onClick={() => onAdd(meta.type)}
          >
            <span className="palette__icon">{meta.icon}</span>
            <span className="palette__label">{meta.label}</span>
            <span className="palette__plus">＋</span>
          </button>
        ))}
      </div>
    </aside>
  );
}
