// ============================================================================
// BboxEditor —— 图片框选交互组件（进阶标注工具 #1）
// ----------------------------------------------------------------------------
// 在图片上拖拽画矩形框，每个框带一个"类别"，可删。坐标用归一化(0~1)存，
// 分辨率无关。结果 = Box[]，进 Annotation.result。受控：value/onChange。
// ============================================================================

import { useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import type { Box, FieldOption } from '../types/form-schema';

interface Props {
  imageUrl?: string; // 标注对象(图片)的地址
  classes: FieldOption[]; // 可选的物体类别
  value: Box[];
  onChange: (boxes: Box[]) => void;
}

export function BboxEditor({ imageUrl, classes, value, onChange }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const [activeClass, setActiveClass] = useState(classes[0]?.value ?? '');
  const [draft, setDraft] = useState<Box | null>(null);

  if (!imageUrl) {
    return (
      <p className="home__muted">
        This field draws boxes on an image — but this item isn’t an image.
      </p>
    );
  }

  // 鼠标位置 → 相对图片的归一化坐标(0~1)
  function toRel(e: MouseEvent) {
    const r = stageRef.current!.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
      y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)),
    };
  }

  function onDown(e: MouseEvent) {
    const p = toRel(e);
    startRef.current = p;
    setDraft({ x: p.x, y: p.y, w: 0, h: 0, label: activeClass });
  }
  function onMove(e: MouseEvent) {
    const s = startRef.current;
    if (!s) return;
    const p = toRel(e);
    setDraft({
      x: Math.min(s.x, p.x),
      y: Math.min(s.y, p.y),
      w: Math.abs(p.x - s.x),
      h: Math.abs(p.y - s.y),
      label: activeClass,
    });
  }
  function onUp() {
    if (draft && draft.w > 0.01 && draft.h > 0.01) {
      onChange([...value, draft]); // 够大才算一个框
    }
    setDraft(null);
    startRef.current = null;
  }
  function removeBox(i: number) {
    onChange(value.filter((_, idx) => idx !== i));
  }

  const labelOf = (v: string) =>
    classes.find((c) => c.value === v)?.label ?? v;
  const shown = draft ? [...value, draft] : value;

  return (
    <div className="bbox">
      {/* 类别工具条：选中的类别会套用到新画的框 */}
      <div className="bbox__classes">
        {classes.map((c) => (
          <button
            key={c.value}
            type="button"
            className={`bbox__class${activeClass === c.value ? ' is-on' : ''}`}
            onClick={() => setActiveClass(c.value)}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div
        ref={stageRef}
        className="bbox__stage"
        onMouseDown={onDown}
        onMouseMove={onMove}
        onMouseUp={onUp}
        onMouseLeave={onUp}
      >
        <img src={imageUrl} draggable={false} alt="to annotate" />
        {shown.map((b, i) => (
          <div
            key={i}
            className="bbox__box"
            style={{
              left: `${b.x * 100}%`,
              top: `${b.y * 100}%`,
              width: `${b.w * 100}%`,
              height: `${b.h * 100}%`,
            }}
          >
            <span className="bbox__tag">{labelOf(b.label)}</span>
            {i < value.length && (
              <button
                type="button"
                className="bbox__del"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  removeBox(i);
                }}
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>
      <p className="bbox__hint">
        Drag on the image to draw a box · {value.length} box
        {value.length === 1 ? '' : 'es'}
      </p>
    </div>
  );
}
