// 右栏：标注表单。遍历 fields 画成一张张可编辑、且【可拖拽排序】的题目。
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import type { FormField } from '../types/form-schema';
import { FieldEditor } from './FieldEditor';

interface Props {
  fields: FormField[];
  onUpdate: (id: string, updater: (f: FormField) => FormField) => void;
  onRemove: (id: string) => void;
  onReorder: (activeId: string, overId: string) => void;
}

export function DesignerCanvas({
  fields,
  onUpdate,
  onRemove,
  onReorder,
}: Props) {
  // sensors = "用什么方式触发拖拽"。
  // PointerSensor：鼠标/触屏拖动，distance:4 = 移动 4px 才算拖(避免误触)。
  // KeyboardSensor：支持键盘拖动(无障碍)。
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // 拖放结束：dnd-kit 告诉我们"被拖的(active)落在了谁(over)身上"。
  // 两者不同就通知上层把这两项换位。
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      onReorder(String(active.id), String(over.id));
    }
  }

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
        // DndContext = 拖拽大脑；SortableContext = 告诉它这个列表的顺序(用 id 数组)
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={fields.map((f) => f.id)}
            strategy={verticalListSortingStrategy}
          >
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
          </SortableContext>
        </DndContext>
      )}
    </section>
  );
}
