// 右栏：JSON 实时预览。把当前 Schema 对象格式化打印出来。
// 它是"设计器状态"的一面镜子——你每加/删一个字段，这里立刻变，
// 让你直观看到"拖出来的表单"最终就是这坨会存进数据库的 JSON。
import type { FormSchemaDefinition } from '../types/form-schema';

interface Props {
  schema: FormSchemaDefinition;
}

export function SchemaPreview({ schema }: Props) {
  return (
    <aside className="panel preview">
      <h2 className="panel__title">JSON preview</h2>
      <p className="panel__hint">This is what gets saved to the database</p>
      {/* JSON.stringify 第三个参数 2 = 缩进 2 空格，打印得好看 */}
      <pre className="preview__code">{JSON.stringify(schema, null, 2)}</pre>
    </aside>
  );
}
