// ============================================================================
// 字段工厂 —— 把"用户点了某个类型"变成"一个符合契约的新字段对象"
// ----------------------------------------------------------------------------
// 左边面板要显示哪些类型(FIELD_TYPE_META)、点击后生成什么样的默认字段
// (createField)，都集中在这里，组件里只管调用。
// ============================================================================

import type { FieldType, FormField } from '../types/form-schema';

// 每种字段类型的展示信息：面板按钮的图标 + 中文名。
export const FIELD_TYPE_META: { type: FieldType; label: string; icon: string }[] =
  [
    { type: 'text', label: 'Short text', icon: '📝' },
    { type: 'textarea', label: 'Long text', icon: '📄' },
    { type: 'number', label: 'Number', icon: '🔢' },
    { type: 'radio', label: 'Single choice', icon: '🔘' },
    { type: 'checkbox', label: 'Multiple choice', icon: '☑️' },
    { type: 'select', label: 'Dropdown', icon: '🔽' },
  ];

// 由 type 反查中文名（画布卡片上显示用）。
export function labelOf(type: FieldType): string {
  return FIELD_TYPE_META.find((m) => m.type === type)?.label ?? type;
}

// 由 type 反查图标（画布卡片上显示用）。
export function iconOf(type: FieldType): string {
  return FIELD_TYPE_META.find((m) => m.type === type)?.icon ?? '▫️';
}

// 需要选项的三种"选择类"。
const CHOICE_TYPES: FieldType[] = ['radio', 'checkbox', 'select'];

// 造一个新字段。seq 是递增序号，用来生成不重复的 id 和默认标题。
// 返回值必须满足判别联合 FormField —— 选择类要带 options，其它不带。
export function createField(type: FieldType, seq: number): FormField {
  const base = {
    id: `field_${seq}`,
    label: `${labelOf(type)} ${seq}`,
    required: false,
  };

  if (CHOICE_TYPES.includes(type)) {
    // 选择类：先给两个默认选项，用户可在题目里直接改。
    return {
      ...base,
      type: type as 'radio' | 'checkbox' | 'select',
      options: [
        { label: 'Option 1', value: 'option_1' },
        { label: 'Option 2', value: 'option_2' },
      ],
    };
  }

  if (type === 'number') {
    return { ...base, type };
  }

  // 剩下的就是 text / textarea
  return { ...base, type: type as 'text' | 'textarea' };
}
