import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // 全局校验管道：让 DTO 上的 class-validator 规则真正生效。
  // whitelist: 自动剥掉 DTO 里没声明的多余字段（防注入）。
  // forbidNonWhitelisted: 收到多余字段直接报错，而不是默默丢弃。
  // transform: 把请求里的普通对象转成 DTO 类实例（也做类型转换）。
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
