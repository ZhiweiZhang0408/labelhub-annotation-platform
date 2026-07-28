// 图片多边形分割：点击在图上加顶点，Finish 闭合成一个带类别的多边形。
import { useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import type { FieldOption, Polygon } from '../types/form-schema';

const COLORS = ['#c084fc', '#38bdf8', '#f59e0b', '#34d399', '#fb7185', '#a3e635'];
const clamp = (n: number) => Math.min(1, Math.max(0, n));

interface Props {
  imageUrl?: string;
  classes: FieldOption[];
  value: Polygon[];
  onChange: (v: Polygon[]) => void;
}

export function PolygonEditor({ imageUrl, classes, value, onChange }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(classes[0]?.value ?? '');
  const [draft, setDraft] = useState<[number, number][]>([]);

  if (!imageUrl) {
    return <p className="home__muted">This field needs an image item.</p>;
  }

  function addPoint(e: MouseEvent) {
    const r = ref.current!.getBoundingClientRect();
    setDraft((d) => [
      ...d,
      [clamp((e.clientX - r.left) / r.width), clamp((e.clientY - r.top) / r.height)],
    ]);
  }
  function finish() {
    if (draft.length >= 3) onChange([...value, { points: draft, label: active }]);
    setDraft([]);
  }
  function remove(i: number) {
    onChange(value.filter((_, idx) => idx !== i));
  }

  const colorOf = (l: string) => {
    const i = classes.findIndex((c) => c.value === l);
    return COLORS[(i < 0 ? 0 : i) % COLORS.length];
  };
  const labelText = (v: string) =>
    classes.find((c) => c.value === v)?.label ?? v;
  const toPts = (pts: [number, number][]) =>
    pts.map(([x, y]) => `${x * 100},${y * 100}`).join(' ');

  return (
    <div className="bbox">
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

      <div ref={ref} className="bbox__stage" onClick={addPoint}>
        <img src={imageUrl} draggable={false} alt="to annotate" />
        <svg className="poly__svg" viewBox="0 0 100 100" preserveAspectRatio="none">
          {value.map((p, i) => (
            <polygon
              key={i}
              points={toPts(p.points)}
              fill={`${colorOf(p.label)}33`}
              stroke={colorOf(p.label)}
              strokeWidth={0.5}
            />
          ))}
          {draft.length > 0 && (
            <polyline
              points={toPts(draft)}
              fill="none"
              stroke="#aa3bff"
              strokeWidth={0.5}
            />
          )}
          {draft.map(([x, y], i) => (
            <circle key={i} cx={x * 100} cy={y * 100} r={0.9} fill="#aa3bff" />
          ))}
        </svg>
      </div>

      <div className="tspn__controls">
        <button
          type="button"
          className="btn-primary"
          onClick={finish}
          disabled={draft.length < 3}
        >
          Finish polygon ({draft.length})
        </button>
        {draft.length > 0 && (
          <button type="button" className="ghostbtn" onClick={() => setDraft([])}>
            Cancel
          </button>
        )}
      </div>

      <ul className="tspn__list">
        {value.map((p, i) => (
          <li key={i} className="tspn__item">
            <span className="tspn__dot" style={{ background: colorOf(p.label) }} />
            <span className="tspn__lbl">{labelText(p.label)}</span>
            <span className="tspn__time">{p.points.length} pts</span>
            <button
              type="button"
              className="tspn__del"
              onClick={() => remove(i)}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
      <p className="bbox__hint">
        Click to add vertices · Finish to close · {value.length} polygon
        {value.length === 1 ? '' : 's'}
      </p>
    </div>
  );
}
