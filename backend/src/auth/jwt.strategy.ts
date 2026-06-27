import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

// JWT 载荷的形状（就是 AuthService.signToken 里 payload 的样子）
export interface JwtPayload {
  sub: string; // userId
  email: string;
  role: string;
}

// 继承 passport-jwt 的 Strategy。PassportStrategy(...) 把它接进 NestJS。
// 名字 'jwt' 很关键：守卫 AuthGuard('jwt') 就是靠这个名字找到本策略。
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    super({
      // 从 Authorization: Bearer <token> 头里取 token
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false, // 过期的 token 一律拒绝
      // 用同一把密钥验"防伪章"。必须和签发时用的一致。
      secretOrKey: config.get<string>('JWT_SECRET')!,
    });
  }

  // 章验过（签名正确 + 未过期）后，passport 把解出的 payload 交给这里。
  // 返回值会被 NestJS 挂到 request.user 上，后续 Controller 就能拿到。
  validate(payload: JwtPayload) {
    if (!payload?.sub) {
      throw new UnauthorizedException();
    }
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}
