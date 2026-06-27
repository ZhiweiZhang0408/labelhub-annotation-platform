import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    PassportModule, // 引入 passport 基础设施
    // JwtModule 异步配置：密钥/有效期从 .env 读（绝不写死在代码里）。
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService): JwtModuleOptions => ({
        secret: config.get<string>('JWT_SECRET'),
        // expiresIn 的类型来自 ms 库（如 '7d' / '15m'），这里断言成它接受的类型
        signOptions: {
          expiresIn: (config.get<string>('JWT_EXPIRES_IN') ??
            '7d') as `${number}d`,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy], // JwtStrategy 也要注册成 provider 才会生效
})
export class AuthModule {}
