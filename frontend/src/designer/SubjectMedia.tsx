// 图片/音频/视频的占位预览(纯示意)。文本类另外处理(可编辑/只读)。
// 设计器中栏和预览弹窗共用这一个占位，避免重复。
const MEDIA: Record<string, { emoji: string; cap: string }> = {
  image: { emoji: '🖼️', cap: 'Sample image to label' },
  audio: { emoji: '🎵', cap: 'Sample audio to label' },
  video: { emoji: '🎬', cap: 'Sample video to label' },
};

export function SubjectMedia({ kind }: { kind: 'image' | 'audio' | 'video' }) {
  const m = MEDIA[kind];
  return (
    <div className="media">
      <span className="media__emoji">{m.emoji}</span>
      <span className="media__cap">{m.cap}</span>
    </div>
  );
}
