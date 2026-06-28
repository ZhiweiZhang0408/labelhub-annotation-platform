import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { CurrentUser } from './current-user.decorator';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';

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

  // ↓↓↓ Day 5 演示:RBAC。这些只是验证守卫的样例路由,真正的业务路由 W3 再写。
  // 注意 @UseGuards 里两个守卫的顺序:先 AuthGuard 验票拿到 user,
  // 再 RolesGuard 查角色。顺序反了的话 RolesGuard 拿不到 user。

  // GET /auth/owner-only —— 只有 TASK_OWNER 能进;其他角色 → 403
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.TASK_OWNER)
  @Get('owner-only')
  ownerOnly(@CurrentUser() user: { id: string; role: string }) {
    return { ok: true, msg: 'You are a task owner — access granted', you: user };
  }

  // GET /auth/review-zone —— REVIEWER 或 TASK_OWNER 都能进(一次贴多个角色)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.REVIEWER, Role.TASK_OWNER)
  @Get('review-zone')
  reviewZone(@CurrentUser() user: { id: string; role: string }) {
    return { ok: true, msg: 'You can enter the review zone', you: user };
  }
}
