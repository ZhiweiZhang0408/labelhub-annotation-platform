import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 放大请求体上限：上传的图片以 base64 塞在 JSON 里，默认 100kb 不够。
  // (演示做法；生产用对象存储/S3 存文件、库里只存 URL)
  app.use(json({ limit: '25mb' }));
  app.use(urlencoded({ extended: true, limit: '25mb' }));

  // 开启 CORS：前端(:5173)和后端(:3000)不同源，浏览器默认拦跨源请求。
  // 允许前端 dev 地址访问，并放行带 Authorization 头的请求。
  app.enableCors({
    origin: ['http://localhost:5173'],
    credentials: true,
  });

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
