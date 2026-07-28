// ============================================================================
// FormPreview —— 预览弹窗：外壳 + 标注对象 + 提交结果
// ----------------------------------------------------------------------------
// 真正"把 Schema 渲染成表单 + 校验"的活儿交给 <FormRenderer/>(可复用)。
// 弹窗自己只负责：遮罩/关闭、上方标注对象、提交后展示结果 JSON。
// ============================================================================

import { useState } from 'react';
import type { FormSchemaDefinition } from '../types/form-schema';
import type { DataItem, SubjectKind } from './subject';
import { SubjectMedia } from './SubjectMedia';
import { FormRenderer } from './FormRenderer';
import type { Answers } from './FormRenderer';

interface Props {
  schema: FormSchemaDefinition;
  subjectKind: SubjectKind;
  sampleItem?: DataItem;
  onClose: () => void;
}

export function FormPreview({ schema, subjectKind, sampleItem, onClose }: Props) {
  const [result, setResult] = useState<Answers | null>(null);

  return (
    <div className="pvmask" onClick={onClose}>
      <div className="pvmodal" onClick={(e) => e.stopPropagation()}>
        <div className="pvmodal__head">
          <div>
            <h2 className="pvmodal__title">Preview</h2>
            <p className="pvmodal__sub">What annotators will see</p>
          </div>
          <button className="pvmodal__close" onClick={onClose} title="Close">
            ✕
          </button>
        </div>

        <div className="pvmodal__body">
          {/* 标注对象：有上传的样例就按类型显示真数据，否则占位 */}
          <div className="pv__subject">
            {sampleItem ? (
              sampleItem.kind === 'text' ? (
                <p className="pv__stext">{sampleItem.text}</p>
              ) : sampleItem.kind === 'image' ? (
                <img className="pv__image-real" src={sampleItem.url} alt="item" />
              ) : sampleItem.kind === 'audio' ? (
                <audio className="pv__media" src={sampleItem.url} controls />
              ) : (
                <video className="pv__media" src={sampleItem.url} controls />
              )
            ) : subjectKind === 'text' ? (
              <p className="pv__stext pv__stext--empty">
                No sample uploaded yet
              </p>
            ) : (
              <SubjectMedia kind={subjectKind} />
            )}
          </div>

          {/* 表单：交给可复用的渲染器；校验通过后把结果给我们显示 */}
          <FormRenderer
            schema={schema}
            subject={
              sampleItem
                ? {
                    kind: sampleItem.kind,
                    url: sampleItem.url,
                    text: sampleItem.text,
                  }
                : undefined
            }
            onSubmit={setResult}
          />

          {result && (
            <div className="pv__result">
              <p className="pv__result-title">
                Submitted — this is the result that gets saved:
              </p>
              <pre className="pv__result-code">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
