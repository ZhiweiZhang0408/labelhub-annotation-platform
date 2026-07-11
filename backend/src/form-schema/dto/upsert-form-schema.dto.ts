// ============================================================================
// UpsertFormSchemaDto —— PUT 表单时的请求体校验
// ----------------------------------------------------------------------------
// 这份 DTO 是 form-schema.types.ts 那份"契约"在【运行时】的守门员：
//   - types.ts 的 interface 只在【编译期】约束我们自己写的 TS 代码；
//   - 但前端/curl 发来的 JSON 是运行时才到的，TS 管不到，必须靠 class-validator
//     在进 Service 前把关，形状不对直接 400。
//
// 分工：这里只校验"形状"(类型/必填/嵌套结构)；跨字段的业务规则
// (下拉必须有选项、id 不能重复) 放在 Service 里手写。
// ============================================================================

import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
// 用 `import type`：FieldType 是纯类型，而项目开了 isolatedModules + emitDecoratorMetadata，
// 被装饰器修饰的属性上引用类型必须显式声明为 type-only，否则报 TS1272。
import type { FieldType } from '../form-schema.types';

// 允许的 6 种字段类型，集中一处，@IsIn 用它做白名单。
const FIELD_TYPES: FieldType[] = [
  'text',
  'textarea',
  'number',
  'radio',
  'checkbox',
  'select',
];

// 一个选项：label(给人看) + value(存进结果)，都不能空。
class FieldOptionDto {
  @IsString()
  @IsNotEmpty()
  label: string;

  @IsString()
  @IsNotEmpty()
  value: string;
}

// 校验规则。v1 用一个"宽松合并版"：文本用 minLength/maxLength/pattern，
// 数字用 min/max，这里全放开为可选。
// 取舍：没有严格做到"文本字段不许出现 min"，因为那又是一个按 type 分叉的联合，
// class-validator 表达起来很绕；v1 先接受这点宽松，够用。
class FieldValidationDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  minLength?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxLength?: number;

  @IsOptional()
  @IsString()
  pattern?: string;

  @IsOptional()
  @IsNumber()
  min?: number;

  @IsOptional()
  @IsNumber()
  max?: number;
}

// 单个字段的形状校验（公共属性 + 可选的 options / validation）。
class FormFieldDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  // type 必须是白名单里的 6 个之一，否则 400。
  @IsIn(FIELD_TYPES, {
    message: `type 必须是 ${FIELD_TYPES.join(' / ')} 之一`,
  })
  type: FieldType;

  @IsString()
  @IsNotEmpty()
  label: string;

  @IsBoolean()
  required: boolean;

  @IsOptional()
  @IsString()
  placeholder?: string;

  @IsOptional()
  @IsString()
  helpText?: string;

  // 嵌套校验：@ValidateNested + @Type 告诉 class-validator
  // "这是一个 FieldOptionDto 数组，请挨个进去校验"，否则它只会看到 object 不深入。
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldOptionDto)
  options?: FieldOptionDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => FieldValidationDto)
  validation?: FieldValidationDto;
}

// 整张表单的请求体。这就是会被存进 FormSchema.schema (JSONB) 的东西。
export class UpsertFormSchemaDto {
  @IsInt()
  @Min(1)
  version: number;

  @IsOptional()
  @IsString()
  title?: string;

  // 至少要有 1 个字段；数组里每个元素都按 FormFieldDto 深入校验。
  @IsArray()
  @ArrayMinSize(1, { message: '表单至少要有一个字段' })
  @ValidateNested({ each: true })
  @Type(() => FormFieldDto)
  fields: FormFieldDto[];
}
