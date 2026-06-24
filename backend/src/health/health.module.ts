import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

// @Module() 是这个功能的"盒子"：把 controller 和 service 打包成一个单元。
// controllers: 这个模块对外接收请求的入口
// providers:   这个模块里可被注入的"干活的人"
@Module({
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
