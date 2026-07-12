// 标注对象的种类。数据标注常见四类：图片 / 文本 / 音频 / 视频。
// (真实任务的对象类型属于 Task，是 W3 的事；这里只是设计器的参考素材)
export type SubjectKind = 'image' | 'text' | 'audio' | 'video';

export const SUBJECT_KINDS: { kind: SubjectKind; label: string; icon: string }[] =
  [
    { kind: 'image', label: 'Image', icon: '🖼' },
    { kind: 'text', label: 'Text', icon: '📝' },
    { kind: 'audio', label: 'Audio', icon: '🎵' },
    { kind: 'video', label: 'Video', icon: '🎬' },
  ];
