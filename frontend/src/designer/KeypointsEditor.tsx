// 图片关键点：点击在图上放一个带类别的点，可删。
import { useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import type { FieldOption, Keypoint } from '../types/form-schema';

const COLORS = ['#c084fc', '#38bdf8', '#f59e0b', '#34d399', '#fb7185', '#a3e635'];
const clamp = (n: number) => Math.min(1, Math.max(0, n));

interface Props {
  imageUrl?: string;
  classes: FieldOption[];
  value: Keypoint[];
  onChange: (v: Keypoint[]) => void;
}

export function KeypointsEditor({ imageUrl, classes, value, onChange }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(classes[0]?.value ?? '');

  if (!imageUrl) {
    return <p className="home__muted">This field needs an image item.</p>;
  }

  function addPoint(e: MouseEvent) {
    const r = ref.current!.getBoundingClientRect();
    onChange([
      ...value,
      {
        x: clamp((e.clientX - r.left) / r.width),
        y: clamp((e.clientY - r.top) / r.height),
        label: active,
      },
    ]);
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

      <div ref={ref} className="bbox__stage kp__stage" onClick={addPoint}>
        <img src={imageUrl} draggable={false} alt="to annotate" />
        {value.map((p, i) => (
          <span
            key={i}
            className="kp__pt"
            style={{
              left: `${p.x * 100}%`,
              top: `${p.y * 100}%`,
              background: colorOf(p.label),
            }}
            title={labelText(p.label)}
          />
        ))}
      </div>

      <ul className="tspn__list">
        {value.map((p, i) => (
          <li key={i} className="tspn__item">
            <span className="tspn__dot" style={{ background: colorOf(p.label) }} />
            <span className="tspn__lbl">{labelText(p.label)}</span>
            <span className="tspn__time">
              {Math.round(p.x * 100)}, {Math.round(p.y * 100)}
            </span>
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
        Click to drop points · {value.length} point
        {value.length === 1 ? '' : 's'}
      </p>
    </div>
  );
}
