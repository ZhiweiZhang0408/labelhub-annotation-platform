// 把一个答案值格式化成可读文本(供审核台/结果页显示)。
// 数组里是对象(如 bbox 框) → 显示"N region(s)"；否则逗号连接 / 直接转字符串。
export function fmtAnswer(v: unknown): string {
  if (Array.isArray(v)) {
    if (v.length > 0 && typeof v[0] === 'object' && v[0] !== null) {
      return `${v.length} region${v.length === 1 ? '' : 's'}`;
    }
    return v.join(', ');
  }
  return v == null ? '' : String(v);
}
