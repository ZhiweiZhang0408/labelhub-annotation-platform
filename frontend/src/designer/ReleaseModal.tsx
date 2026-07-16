// ============================================================================
// ReleaseModal —— "发布任务"确认弹窗（前端 mock，不接后端）
// ----------------------------------------------------------------------------
// 汇总一下：表单几个字段、上传了几条数据，确认后标记为已发布(本地)。
// 真正的发布(改 Task 状态、分发给标注员、生成待标注项)是 W3。
// ============================================================================

interface Props {
  formTitle: string;
  fieldCount: number;
  itemCount: number;
  onConfirm: () => void;
  onClose: () => void;
}

export function ReleaseModal({
  formTitle,
  fieldCount,
  itemCount,
  onConfirm,
  onClose,
}: Props) {
  return (
    <div className="pvmask" onClick={onClose}>
      <div className="release" onClick={(e) => e.stopPropagation()}>
        <h2 className="release__title">Release task</h2>
        <p className="release__sub">
          Make this task available to annotators.
        </p>

        <ul className="release__summary">
          <li>
            <span>Form</span>
            <b>{formTitle || 'Untitled form'}</b>
          </li>
          <li>
            <span>Fields</span>
            <b>{fieldCount}</b>
          </li>
          <li>
            <span>Data items</span>
            <b>{itemCount}</b>
          </li>
        </ul>

        <p className="release__note">
          Demo: this only marks the task released locally. Real distribution
          (task status, per-annotator assignment, per-item queue) comes in Week 3.
        </p>

        <div className="release__actions">
          <button className="ghostbtn" onClick={onClose}>
            Cancel
          </button>
          <button className="releasebtn" onClick={onConfirm}>
            Confirm release
          </button>
        </div>
      </div>
    </div>
  );
}
