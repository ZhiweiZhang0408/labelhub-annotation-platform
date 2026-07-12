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
  | 'select';

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

export type FormField = TextField | NumberField | ChoiceField;

export interface FormSchemaDefinition {
  version: number;
  title?: string;
  fields: FormField[];
}
