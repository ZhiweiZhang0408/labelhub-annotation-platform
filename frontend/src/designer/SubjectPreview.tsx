// ============================================================================
// SubjectPreview —— 中栏"标注对象"预览
// ----------------------------------------------------------------------------
// 摆出"将要被标注的东西"的样例(图/文/音/视)，让负责人对着真实内容判断该加哪些字段。
// 状态由上层(FormDesigner)持有，好让"预览弹窗"也能共享同一份。
// ============================================================================

import type { SubjectKind } from './subject';
import { SUBJECT_KINDS } from './subject';
import { SubjectMedia } from './SubjectMedia';

interface Props {
  kind: SubjectKind;
  text: string;
  onKindChange: (kind: SubjectKind) => void;
  onTextChange: (text: string) => void;
}

export function SubjectPreview({ kind, text, onKindChange, onTextChange }: Props) {
  return (
    <section className="subject">
      <div className="subject__head">
        <h2 className="subject__title">Item to label</h2>
        <p className="subject__hint">
          What annotators see — use it to decide which fields you need
        </p>
      </div>

      <div className="subject__switch">
        {SUBJECT_KINDS.map((s) => (
          <button
            key={s.kind}
            className={kind === s.kind ? 'is-on' : ''}
            onClick={() => onKindChange(s.kind)}
          >
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      <div className="subject__stage">
        {kind === 'text' ? (
          <textarea
            className="subject__text"
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            placeholder="Paste a sample text to label…"
          />
        ) : (
          <SubjectMedia kind={kind} />
        )}
      </div>
    </section>
  );
}
