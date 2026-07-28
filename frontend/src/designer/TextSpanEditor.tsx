// ============================================================================
// TextSpanEditor —— 文本高亮交互组件（进阶标注工具 #2，NER 那种）
// ----------------------------------------------------------------------------
// 在文本上鼠标选中一段 → 变成带标签的高亮。用【字符偏移 start/end】存，
// 结果 = Span[]，进 Annotation.result。受控：value/onChange。
// 偏移计算靠每段渲染时挂的 data-start，避免删除按钮的文字干扰。
// ============================================================================

import { useRef, useState } from 'react';
import type { FieldOption, Span } from '../types/form-schema';

interface Props {
  text?: string;
  classes: FieldOption[]; // 可选标签
  value: Span[];
  onChange: (spans: Span[]) => void;
}

// 高亮配色(按标签在 classes 里的次序循环取)
const COLORS = ['#c084fc', '#38bdf8', '#f59e0b', '#34d399', '#fb7185', '#a3e635'];

// 从"选区端点(节点+偏移)"求它在原文中的字符偏移：
// 往上找带 data-start 的段元素，段起点 + 段内偏移。
function charOffset(node: Node, offset: number): number | null {
  let el: Element | null =
    node.nodeType === 3 ? node.parentElement : (node as Element);
  while (el && !el.hasAttribute('data-start')) el = el.parentElement;
  if (!el) return null;
  return Number(el.getAttribute('data-start')) + offset;
}

export function TextSpanEditor({ text, classes, value, onChange }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(classes[0]?.value ?? '');

  if (text == null) {
    return (
      <p className="home__muted">
        This field highlights text — but this item isn’t text.
      </p>
    );
  }

  function handleMouseUp() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !ref.current) return;
    const range = sel.getRangeAt(0);
    if (!ref.current.contains(range.commonAncestorContainer)) return;

    const a = charOffset(range.startContainer, range.startOffset);
    const b = charOffset(range.endContainer, range.endOffset);
    sel.removeAllRanges();
    if (a == null || b == null) return;
    const start = Math.min(a, b);
    const end = Math.max(a, b);
    if (end <= start) return;
    // 不允许和已有高亮重叠(渲染按不重叠假设)
    if (value.some((h) => start < h.end && end > h.start)) return;
    onChange([
      ...value,
      { start, end, text: text!.slice(start, end), label: active },
    ]);
  }

  function removeSpan(i: number) {
    onChange(value.filter((_, idx) => idx !== i));
  }

  const colorOf = (label: string) => {
    const idx = classes.findIndex((c) => c.value === label);
    return COLORS[(idx < 0 ? 0 : idx) % COLORS.length];
  };
  const labelText = (v: string) =>
    classes.find((c) => c.value === v)?.label ?? v;

  // 把原文切成"普通段 / 高亮段"，每段记它在原文的起点(data-start)
  const sorted = value
    .map((h, i) => ({ ...h, i }))
    .sort((x, y) => x.start - y.start);
  const segs: { start: number; text: string; hl?: { label: string; i: number } }[] =
    [];
  let cursor = 0;
  for (const h of sorted) {
    if (h.start > cursor)
      segs.push({ start: cursor, text: text.slice(cursor, h.start) });
    segs.push({
      start: h.start,
      text: text.slice(h.start, h.end),
      hl: { label: h.label, i: h.i },
    });
    cursor = h.end;
  }
  if (cursor < text.length)
    segs.push({ start: cursor, text: text.slice(cursor) });

  return (
    <div className="tspan">
      <div className="bbox__classes">
        {classes.map((c) => (
          <button
            key={c.value}
            type="button"
            className={`bbox__class${active === c.value ? ' is-on' : ''}`}
            onClick={() => setActive(c.value)}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div ref={ref} className="tspan__text" onMouseUp={handleMouseUp}>
        {segs.map((seg, i) =>
          seg.hl ? (
            <span
              key={i}
              data-start={seg.start}
              className="tspan__hl"
              style={{ background: colorOf(seg.hl.label) }}
            >
              {seg.text}
              <button
                type="button"
                className="tspan__del"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => removeSpan(seg.hl!.i)}
                title={labelText(seg.hl.label)}
              >
                ✕
              </button>
            </span>
          ) : (
            <span key={i} data-start={seg.start}>
              {seg.text}
            </span>
          ),
        )}
      </div>
      <p className="bbox__hint">
        Select text to highlight · {value.length} span
        {value.length === 1 ? '' : 's'}
      </p>
    </div>
  );
}
