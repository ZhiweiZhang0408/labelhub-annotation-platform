import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

// bcrypt 的 cost factor（概念②的"故意慢"）。10 ≈ 每次哈希几十毫秒，
// 数字每 +1 计算量翻倍。10 是业界常用平衡点。
const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  // DI：构造函数里"要"两个依赖，NestJS 自动注入同一份实例。
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  // ── 注册 ──────────────────────────────────────────────
  async register(dto: RegisterDto) {
    // 1) 邮箱唯一：先查重，已存在就 409（不靠数据库报错，给前端清晰信息）
    const exists = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (exists) {
      throw new ConflictException('Email is already registered');
    }

    // 2) 概念①②：把明文密码哈希。bcrypt.hash 内部自动生成 salt 并拼进结果，
    //    所以我们只存这一串 passwordHash，永不存明文。
    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    // 3) 落库
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
        ...(dto.role ? { role: dto.role } : {}), // 没传 role 就用 schema 默认值
      },
    });

    // 4) 注册即登录：直接发一张 JWT，省得用户再登一次。
    return this.signToken(user.id, user.email, user.role);
  }

  // ── 登录 ──────────────────────────────────────────────
  async login(dto: LoginDto) {
    // 1) 按邮箱找人
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    // 2) 概念②：把用户输入的密码再哈希一次，和库里的比对。
    //    注意：用户不存在 和 密码错 我们都回同一句话，
    //    避免泄露"这个邮箱是否注册过"（防账号枚举）。
    const ok = user && (await bcrypt.compare(dto.password, user.passwordHash));
    if (!ok) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // 3) 验证通过，签发 JWT
    return this.signToken(user.id, user.email, user.role);
  }

  // ── 签发 JWT（概念③）────────────────────────────────────
  // payload 里只放"非敏感的身份信息"：谁(sub)、邮箱、角色。绝不放密码。
  // sub（subject）是 JWT 标准里"令牌主体"的惯用字段，这里放 userId。
  private async signToken(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };
    const accessToken = await this.jwt.signAsync(payload);
    return {
      accessToken,
      user: { id: userId, email, role }, // 顺手回点用户信息给前端展示
    };
  }
}
