// 保存前的"配置校验"：找出一个字段里所有不合理的配置。
// 设计器用它来算"能不能保存"(有问题就禁止保存，统一堵住边角情况)。
import type { FormField } from '../types/form-schema';

export function fieldIssues(field: FormField): string[] {
  const issues: string[] = [];

  if (field.label.trim() === '') issues.push('empty title');

  if ('options' in field && field.options.some((o) => o.label.trim() === ''))
    issues.push('empty option');

  if (field.type === 'text' || field.type === 'textarea') {
    const min = field.validation?.minLength;
    const max = field.validation?.maxLength;
    if (min != null && max != null && min > max) issues.push('min > max length');
    if (min != null && min < 0) issues.push('negative min length');
    if (max != null && max < 1) issues.push('max length < 1');
  }

  if (field.type === 'number') {
    const min = field.validation?.min;
    const max = field.validation?.max;
    if (min != null && max != null && min > max) issues.push('min > max');
  }

  return issues;
}

// 整份表单还有多少个配置问题(0 = 可以保存)。
export function schemaIssueCount(fields: FormField[]): number {
  return fields.reduce((n, f) => n + fieldIssues(f).length, 0);
}
