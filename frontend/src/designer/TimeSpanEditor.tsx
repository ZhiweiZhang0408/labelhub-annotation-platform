// ============================================================================
// TimeSpanEditor —— 音视频时间区间标注（进阶标注工具 #3）
// ----------------------------------------------------------------------------
// 播放到某处 → Set start → 播到结束 → End & add，标出一段 [start,end](秒) + 标签。
// 下面有条时间轴可视化各区间。结果 = TimeSpan[]，进 Annotation.result。
// ============================================================================

import { useRef, useState } from 'react';
import type { FieldOption, TimeSpan } from '../types/form-schema';

interface Props {
  mediaUrl?: string;
  mediaKind?: string; // 'audio' | 'video'
  classes: FieldOption[];
  value: TimeSpan[];
  onChange: (spans: TimeSpan[]) => void;
}

const COLORS = ['#c084fc', '#38bdf8', '#f59e0b', '#34d399', '#fb7185', '#a3e635'];

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export function TimeSpanEditor({
  mediaUrl,
  mediaKind,
  classes,
  value,
  onChange,
}: Props) {
  const mediaRef = useRef<HTMLMediaElement | null>(null);
  const [active, setActive] = useState(classes[0]?.value ?? '');
  const [pendingStart, setPendingStart] = useState<number | null>(null);
  const [duration, setDuration] = useState(0);

  if (!mediaUrl || (mediaKind !== 'audio' && mediaKind !== 'video')) {
    return (
      <p className="home__muted">
        This field marks time ranges — but this item isn’t audio/video.
      </p>
    );
  }

  const now = () => mediaRef.current?.currentTime ?? 0;
  const setMedia = (el: HTMLMediaElement | null) => {
    mediaRef.current = el;
  };
  const onMeta = () => setDuration(mediaRef.current?.duration ?? 0);

  function addRegion() {
    if (pendingStart == null) return;
    const end = now();
    const s = Math.min(pendingStart, end);
    const e = Math.max(pendingStart, end);
    setPendingStart(null);
    if (e - s < 0.1) return; // 太短忽略
    onChange([
      ...value,
      { start: +s.toFixed(2), end: +e.toFixed(2), label: active },
    ]);
  }
  function removeRegion(i: number) {
    onChange(value.filter((_, idx) => idx !== i));
  }

  const colorOf = (label: string) => {
    const idx = classes.findIndex((c) => c.value === label);
    return COLORS[(idx < 0 ? 0 : idx) % COLORS.length];
  };
  const labelText = (v: string) =>
    classes.find((c) => c.value === v)?.label ?? v;

  return (
    <div className="tspn">
      {mediaKind === 'video' ? (
        <video
          ref={setMedia}
          src={mediaUrl}
          controls
          className="tspn__media"
          onLoadedMetadata={onMeta}
        />
      ) : (
        <audio
          ref={setMedia}
          src={mediaUrl}
          controls
          className="tspn__media"
          onLoadedMetadata={onMeta}
        />
      )}

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

      <div className="tspn__controls">
        <button
          type="button"
          className="ghostbtn"
          onClick={() => setPendingStart(now())}
        >
          ⏱ Set start
          {pendingStart != null ? ` (${fmt(pendingStart)})` : ''}
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={addRegion}
          disabled={pendingStart == null}
        >
          ＋ End &amp; add
        </button>
      </div>

      {/* 时间轴可视化 */}
      {duration > 0 && (
        <div className="tspn__timeline">
          {value.map((r, i) => (
            <div
              key={i}
              className="tspn__seg"
              style={{
                left: `${(r.start / duration) * 100}%`,
                width: `${((r.end - r.start) / duration) * 100}%`,
                background: colorOf(r.label),
              }}
              title={`${labelText(r.label)} ${fmt(r.start)}–${fmt(r.end)}`}
            />
          ))}
        </div>
      )}

      {/* 区间列表 */}
      <ul className="tspn__list">
        {value.map((r, i) => (
          <li key={i} className="tspn__item">
            <span
              className="tspn__dot"
              style={{ background: colorOf(r.label) }}
            />
            <span className="tspn__lbl">{labelText(r.label)}</span>
            <span className="tspn__time">
              {fmt(r.start)} – {fmt(r.end)}
            </span>
            <button
              type="button"
              className="tspn__del"
              onClick={() => removeRegion(i)}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
      <p className="bbox__hint">
        Play → Set start → play to end → End &amp; add · {value.length} region
        {value.length === 1 ? '' : 's'}
      </p>
    </div>
  );
}
