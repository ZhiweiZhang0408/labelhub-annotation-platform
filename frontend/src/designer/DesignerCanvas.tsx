// 右栏：标注表单。把当前字段数组用 .map 画成一张张【可编辑】的题目(FieldEditor)。
// 普通列表面板(不再是"画布"那套点阵工作区)。
import type { FormField } from '../types/form-schema';
import { FieldEditor } from './FieldEditor';

interface Props {
  fields: FormField[];
  onUpdate: (id: string, updater: (f: FormField) => FormField) => void;
  onRemove: (id: string) => void;
}

export function DesignerCanvas({ fields, onUpdate, onRemove }: Props) {
  return (
    <section className="builder">
      <div className="builder__head">
        <h2 className="builder__title">Form</h2>
        <p className="builder__hint">Add fields from the left, edit them here</p>
      </div>

      {fields.length === 0 ? (
        <div className="builder__empty">
          <div className="builder__empty-icon">🧩</div>
          <p className="builder__empty-title">No fields yet</p>
          <p className="builder__empty-hint">Pick a field type on the left to start</p>
        </div>
      ) : (
        // key 用字段 id(唯一)，React 才能高效追踪增删。
        <ol className="builder__list">
          {fields.map((field, i) => (
            <FieldEditor
              key={field.id}
              index={i}
              field={field}
              onUpdate={(updater) => onUpdate(field.id, updater)}
              onRemove={() => onRemove(field.id)}
            />
          ))}
        </ol>
      )}
    </section>
  );
}
