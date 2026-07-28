// ============================================================================
// 表单 Schema 契约（前端镜像）
// ----------------------------------------------------------------------------
// 这份是后端 backend/src/form-schema/form-schema.types.ts 的【镜像副本】。
// 设计器(前端)产出的 Schema、渲染器(前端)消费的 Schema，都要按这份形状，
// 才能和后端存/取的 JSONB 严丝合缝对上。
//
// 为什么手动复制而不共享一份？monorepo 里要共享类型得配"共享包"，
// 对现阶段是过度工程。v1 先接受这点重复：改契约时两边一起改。
// （将来若嫌烦，可抽成 packages/shared 共享包。）
// ============================================================================

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'radio'
  | 'checkbox'
  | 'select'
  | 'bbox' // 进阶：图片框选
  | 'textspan' // 进阶：文本高亮
  | 'timespan' // 进阶：音视频时间区间
  | 'polygon' // 进阶：图片多边形分割
  | 'keypoints' // 进阶：图片关键点
  | 'rating' // 进阶：星级评分
  | 'transcription'; // 进阶：音视频转写

export interface TextValidation {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}

export interface NumberValidation {
  min?: number;
  max?: number;
}

export interface FieldOption {
  label: string;
  value: string;
}

interface BaseField {
  id: string;
  label: string;
  required: boolean;
  placeholder?: string;
  helpText?: string;
}

export interface TextField extends BaseField {
  type: 'text' | 'textarea';
  validation?: TextValidation;
}

export interface NumberField extends BaseField {
  type: 'number';
  validation?: NumberValidation;
}

export interface ChoiceField extends BaseField {
  type: 'radio' | 'checkbox' | 'select';
  options: FieldOption[];
}

// 进阶：图片框选。options 复用为"物体类别"；结果 = [{x,y,w,h,label}]。
export interface BboxField extends BaseField {
  type: 'bbox';
  options: FieldOption[];
}

// 进阶：文本高亮。options 复用为"标签类别"。
export interface TextSpanField extends BaseField {
  type: 'textspan';
  options: FieldOption[];
}

// 进阶：音视频时间区间。options 复用为"标签"。
export interface TimeSpanField extends BaseField {
  type: 'timespan';
  options: FieldOption[];
}

// 进阶：多边形分割 / 关键点(options 复用为类别)
export interface PolygonField extends BaseField {
  type: 'polygon';
  options: FieldOption[];
}
export interface KeypointsField extends BaseField {
  type: 'keypoints';
  options: FieldOption[];
}
// 进阶：星级评分 / 转写(无 options)
export interface RatingField extends BaseField {
  type: 'rating';
}
export interface TranscriptionField extends BaseField {
  type: 'transcription';
}

export type FormField =
  | TextField
  | NumberField
  | ChoiceField
  | BboxField
  | TextSpanField
  | TimeSpanField
  | PolygonField
  | KeypointsField
  | RatingField
  | TranscriptionField;

// 一个框(归一化坐标 0~1，分辨率无关)
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
}

// 一段高亮(字符偏移)
export interface Span {
  start: number;
  end: number;
  text: string;
  label: string;
}

// 一段时间区间(秒)
export interface TimeSpan {
  start: number;
  end: number;
  label: string;
}

// 一个多边形(顶点归一化坐标)
export interface Polygon {
  points: [number, number][];
  label: string;
}

// 一个关键点(归一化坐标)
export interface Keypoint {
  x: number;
  y: number;
  label: string;
}

export interface FormSchemaDefinition {
  version: number;
  title?: string;
  fields: FormField[];
}
