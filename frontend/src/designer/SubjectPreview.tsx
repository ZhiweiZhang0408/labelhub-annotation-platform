// ============================================================================
// SubjectPreview（数据面板）—— 中栏"上传待标注数据"
// ----------------------------------------------------------------------------
// 四种类型都能上传：图片/音频/视频 传文件(本地预览)，文本传 .txt 或直接粘贴。
// 纯前端：媒体用 URL.createObjectURL 本地预览，文本读成字符串；都不进后端(W3 才真存)。
// ============================================================================

import { useState } from 'react';
import type { ChangeEvent } from 'react';
import type { DataItem, SubjectKind } from './subject';
import { ACCEPT, SUBJECT_KINDS } from './subject';

// 把文件读成 base64 data URL
function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

interface Props {
  kind: SubjectKind;
  items: DataItem[];
  onKindChange: (kind: SubjectKind) => void;
  onAddItems: (added: DataItem[]) => void;
  onRemoveItem: (id: string) => void;
}

export function SubjectPreview({
  kind,
  items,
  onKindChange,
  onAddItems,
  onRemoveItem,
}: Props) {
  const [draft, setDraft] = useState(''); // 文本快捷粘贴
  const shown = items.filter((it) => it.kind === kind); // 当前类型的数据

  async function handleFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const added: DataItem[] = [];
    for (const f of files) {
      if (kind === 'text') {
        added.push({ id: crypto.randomUUID(), name: f.name, kind, text: await f.text() });
      } else {
        // 读成 base64 data URL：既能本地预览(<img src>)，又能直接发给后端存库
        added.push({
          id: crypto.randomUUID(),
          name: f.name,
          kind,
          url: await readAsDataURL(f),
        });
      }
    }
    onAddItems(added);
    e.target.value = '';
  }

  function addPastedText() {
    const t = draft.trim();
    if (!t) return;
    // 名字取内容前 20 个字，比 "pasted text" 有意义
    const name = t.length > 20 ? t.slice(0, 20) + '…' : t;
    onAddItems([{ id: crypto.randomUUID(), name, kind: 'text', text: t }]);
    setDraft('');
  }

  return (
    <section className="subject">
      <div className="subject__head">
        <h2 className="subject__title">Data to label</h2>
        <p className="subject__hint">
          Upload the items annotators will label · design the form against them
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

      {/* 文本类：额外给一个"粘贴即添加" */}
      {kind === 'text' && (
        <div className="textadd">
          <textarea
            className="textadd__input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Paste a text sample…"
          />
          <button
            className="ghostbtn"
            onClick={addPastedText}
            disabled={!draft.trim()}
          >
            Add text
          </button>
        </div>
      )}

      {/* 上传按钮(四种通用) */}
      <label className="uploadbtn">
        ⬆️ Upload {kind}
        <input
          type="file"
          accept={ACCEPT[kind]}
          multiple
          hidden
          onChange={handleFiles}
        />
      </label>

      {/* 数据列表 */}
      {shown.length === 0 ? (
        <p className="subject__empty">No {kind} items yet.</p>
      ) : (
        <div className={kind === 'image' ? 'gallery' : 'itemlist'}>
          {shown.map((it) => (
            <ItemCard key={it.id} item={it} onRemove={() => onRemoveItem(it.id)} />
          ))}
        </div>
      )}
      {shown.length > 0 && (
        <p className="subject__hint">
          {shown.length} {kind} item{shown.length > 1 ? 's' : ''}
        </p>
      )}
    </section>
  );
}

// 一条数据的预览卡片，按类型渲染。已上传的(existing)只读、不可删。
function ItemCard({ item, onRemove }: { item: DataItem; onRemove: () => void }) {
  if (item.kind === 'image') {
    return (
      <div className={`thumb${item.existing ? ' thumb--existing' : ''}`}>
        <img src={item.url} alt={item.name} />
        {item.existing ? (
          <span className="thumb__tag" title="Already uploaded">
            ✓
          </span>
        ) : (
          <button className="thumb__del" title="Remove" onClick={onRemove}>
            ✕
          </button>
        )}
      </div>
    );
  }
  return (
    <div className="item">
      <div className="item__media">
        {item.kind === 'audio' && <audio src={item.url} controls />}
        {item.kind === 'video' && <video src={item.url} controls />}
        {item.kind === 'text' && <p className="item__text">{item.text}</p>}
      </div>
      <div className="item__foot">
        <span className="item__name">{item.name}</span>
        {item.existing ? (
          <span className="item__tag">uploaded</span>
        ) : (
          <button className="item__del" title="Remove" onClick={onRemove}>
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
