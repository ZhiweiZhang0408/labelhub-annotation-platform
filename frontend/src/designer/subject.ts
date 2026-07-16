// 标注对象的种类。数据标注常见四类：图片 / 文本 / 音频 / 视频。
// (真实任务的对象类型属于 Task，是 W3 的事；这里只是设计器的参考素材)
export type SubjectKind = 'image' | 'text' | 'audio' | 'video';

// 一条上传的待标注数据（前端本地：媒体用 URL.createObjectURL 本地预览，
// 文本读成字符串；都不进后端，W3 才真正上传存储）。
export interface DataItem {
  id: string;
  name: string;
  kind: SubjectKind;
  url?: string; // 图/音/视 的本地预览地址
  text?: string; // 文本内容
}

// 各类型上传时的文件过滤
export const ACCEPT: Record<SubjectKind, string> = {
  image: 'image/*',
  audio: 'audio/*',
  video: 'video/*',
  text: '.txt,text/plain',
};

export const SUBJECT_KINDS: { kind: SubjectKind; label: string; icon: string }[] =
  [
    { kind: 'image', label: 'Image', icon: '🖼' },
    { kind: 'text', label: 'Text', icon: '📝' },
    { kind: 'audio', label: 'Audio', icon: '🎵' },
    { kind: 'video', label: 'Video', icon: '🎬' },
  ];
