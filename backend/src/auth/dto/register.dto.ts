import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { Role } from '@prisma/client';

// 注册请求体。每个装饰器 = 一条校验规则，不满足就自动 400 并返回原因。
export class RegisterDto {
  @IsEmail({}, { message: 'Invalid email address' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password: string;

  @IsString()
  @MinLength(1)
  name: string;

  // 角色可选；不传则用 schema 里的默认值 ANNOTATOR。
  // 真实产品里注册一般不让前端自选角色（防止有人把自己注册成管理员），
  // 这里先开放，Day5 做 RBAC 时我们会收紧。
  @IsOptional()
  @IsEnum(Role, { message: 'Role must be one of TASK_OWNER / ANNOTATOR / REVIEWER' })
  role?: Role;
}
