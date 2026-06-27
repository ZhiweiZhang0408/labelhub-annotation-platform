import { IsEmail, IsString } from 'class-validator';

// 登录只需邮箱 + 密码。
export class LoginDto {
  @IsEmail({}, { message: 'Invalid email address' })
  email: string;

  @IsString()
  password: string;
}
