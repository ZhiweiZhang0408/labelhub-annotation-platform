import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { CurrentUser } from './current-user.decorator';

@Controller('auth') // 路由前缀：本控制器下所有路由都以 /auth 开头
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // POST /auth/register —— @Body() 会被 DTO 校验后才进来
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  // POST /auth/login
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  // GET /auth/me —— 受保护路由。
  // AuthGuard('jwt') 先跑 JwtStrategy 验票：没票/票坏 → 401，根本进不来。
  // 进来了，@CurrentUser() 直接取到验票时挂上的用户。
  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  me(@CurrentUser() user: { id: string; email: string; role: string }) {
    return user;
  }
}
