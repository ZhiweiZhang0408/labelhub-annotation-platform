import { IsObject } from 'class-validator';

// 提交标注：result 是"字段 id → 答案"的对象(就是 FormRenderer 收集的那份)。
export class SubmitAnnotationDto {
  @IsObject()
  result: Record<string, unknown>;
}
