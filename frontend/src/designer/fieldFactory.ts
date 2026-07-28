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
    { type: 'bbox', label: 'Image boxes', icon: '🖼️' },
    { type: 'textspan', label: 'Text highlight', icon: '🖍️' },
    { type: 'timespan', label: 'Time ranges', icon: '⏱️' },
    { type: 'polygon', label: 'Polygon', icon: '🔷' },
    { type: 'keypoints', label: 'Keypoints', icon: '📍' },
    { type: 'rating', label: 'Rating', icon: '⭐' },
    { type: 'transcription', label: 'Transcription', icon: '🎧' },
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

  if (type === 'bbox') {
    // 图片框选：options 当"物体类别"，先给一个默认类别。
    return {
      ...base,
      type: 'bbox' as const,
      options: [{ label: 'Object', value: 'object' }],
    };
  }

  if (type === 'textspan') {
    // 文本高亮：options 当"标签类别"，先给一个默认标签。
    return {
      ...base,
      type: 'textspan' as const,
      options: [{ label: 'Entity', value: 'entity' }],
    };
  }

  if (type === 'timespan') {
    // 时间区间：options 当"标签"，先给一个默认标签。
    return {
      ...base,
      type: 'timespan' as const,
      options: [{ label: 'Segment', value: 'segment' }],
    };
  }

  if (type === 'polygon' || type === 'keypoints') {
    // 多边形/关键点：options 当"类别"，先给一个默认类别。
    return {
      ...base,
      type,
      options: [{ label: 'Object', value: 'object' }],
    };
  }

  if (type === 'rating') return { ...base, type: 'rating' as const };
  if (type === 'transcription')
    return { ...base, type: 'transcription' as const };

  if (type === 'number') {
    return { ...base, type };
  }

  // 剩下的就是 text / textarea
  return { ...base, type: type as 'text' | 'textarea' };
}
