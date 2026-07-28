// ============================================================================
// 表单 Schema 契约 (form-schema.types.ts)  —— Week 2 的地基
// ----------------------------------------------------------------------------
// 这份文件用 TypeScript 精确描述"一张标注表单的 JSON 长什么样"。
// 它是【设计器】(产出这份 JSON) 与【渲染器】(读这份 JSON 动态渲染) 之间的契约，
// 也是最终存进 Prisma `FormSchema.schema` (JSONB) 字段的数据的形状。
//
// 核心思想：表单"结构"是数据，不是写死的代码。
//   一套渲染器 + 不同的 Schema = 无限种表单。
// ============================================================================

// ─────────────────────────── 字段类型 ───────────────────────────
// v1 先支持这 6 种。以后加新类型(评分/日期/文件上传…)就在这里加一个字面量，
// 再补一个对应的字段接口即可，其它地方 TS 会提示你哪里没处理到。
export type FieldType =
  | 'text' // 单行文本
  | 'textarea' // 多行文本
  | 'number' // 数字
  | 'radio' // 单选(一组里选一个)
  | 'checkbox' // 多选(一组里选多个)
  | 'select' // 下拉单选
  | 'bbox' // 进阶：图片框选(在图上画矩形框，类别复用 options)
  | 'textspan' // 进阶：文本高亮(选中片段打标签，标签复用 options)
  | 'timespan' // 进阶：音视频时间区间(标 start~end，标签复用 options)
  | 'polygon' // 进阶：图片多边形分割
  | 'keypoints' // 进阶：图片关键点
  | 'rating' // 进阶：星级评分(1~5)
  | 'transcription'; // 进阶：音视频转写

// ─────────────────────────── 校验规则（都是数据） ───────────────────────────
// 关键决策 C：校验规则不写死在代码里，而是当作字段的属性存进 Schema。
// 负责人在设计器里配的规则 → 原样存库 → 渲染器(Day4)原样翻译成运行时校验。

// 文本类字段的校验：长度 + 正则。全部可选，按需配。
export interface TextValidation {
  minLength?: number;
  maxLength?: number;
  pattern?: string; // 正则表达式(字符串形式，如 "^\\d{6}$")
}

// 数字类字段的校验：取值范围。
export interface NumberValidation {
  min?: number;
  max?: number;
}

// ─────────────────────────── 选项（单选/多选/下拉共用） ───────────────────────────
// label = 给标注员看的文字；value = 真正存进标注结果里的值。
// 分开是因为显示文案可能改，但存的值要稳定(比如做统计/导出时)。
export interface FieldOption {
  label: string;
  value: string;
}

// ─────────────────────────── 字段：基础属性 ───────────────────────────
// 所有类型的字段都有的公共属性。具体类型再各自扩展。
interface BaseField {
  id: string; // 字段唯一标识；也是标注结果 JSON 里的 key，如 { emotion: "positive" }
  label: string; // 问题标题，如 "这张图的情绪？"
  required: boolean; // 是否必填
  placeholder?: string; // 输入框占位提示(可选)
  helpText?: string; // 字段下方的辅助说明(可选)
}

// ─────────────────────────── 字段：按类型分三类（判别联合） ───────────────────────────
// 关键决策 B：用 `type` 作为"判别标签"。TS 看到 `type` 的具体值，
// 就能自动收窄到对应接口——写 `if (field.type === 'select')` 后，
// TS 就知道这里一定有 `options`，没有 `validation`。渲染器分发渲染全靠它。

// 文本类：单行 + 多行共用一套(校验都是长度/正则)
export interface TextField extends BaseField {
  type: 'text' | 'textarea';
  validation?: TextValidation;
}

// 数字类
export interface NumberField extends BaseField {
  type: 'number';
  validation?: NumberValidation;
}

// 选择类：单选 / 多选 / 下拉共用(都需要一组 options)
export interface ChoiceField extends BaseField {
  type: 'radio' | 'checkbox' | 'select';
  options: FieldOption[];
}

// 进阶：图片框选。options 复用为"物体类别"。结果 = 一组框 [{x,y,w,h,label}]。
export interface BboxField extends BaseField {
  type: 'bbox';
  options: FieldOption[];
}

// 进阶：文本高亮。options 复用为"标签类别"。结果 = [{start,end,text,label}]。
export interface TextSpanField extends BaseField {
  type: 'textspan';
  options: FieldOption[];
}

// 进阶：音视频时间区间。options 复用为"标签"。结果 = [{start,end,label}](秒)。
export interface TimeSpanField extends BaseField {
  type: 'timespan';
  options: FieldOption[];
}

// 进阶：图片多边形分割。options 复用为类别。结果 = [{points:[[x,y]…],label}]。
export interface PolygonField extends BaseField {
  type: 'polygon';
  options: FieldOption[];
}

// 进阶：图片关键点。options 复用为类别。结果 = [{x,y,label}]。
export interface KeypointsField extends BaseField {
  type: 'keypoints';
  options: FieldOption[];
}

// 进阶：星级评分(1~5)。结果 = 数字字符串。
export interface RatingField extends BaseField {
  type: 'rating';
}

// 进阶：音视频转写。结果 = 文本。
export interface TranscriptionField extends BaseField {
  type: 'transcription';
}

// 一个字段 = 上面几类之一。这就是"判别联合"。
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

// ─────────────────────────── 整张表单 ───────────────────────────
// 关键决策 A：表单 = 元信息 + 有序的字段数组。这份对象就是存进 JSONB 的东西。
export interface FormSchemaDefinition {
  version: number; // 契约版本号，将来 Schema 结构演进时用来做兼容
  title?: string; // 表单标题(可选)
  fields: FormField[]; // 字段列表，数组顺序 = 表单里从上到下的显示顺序
}
