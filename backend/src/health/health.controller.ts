import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';

// @Controller('health') 给这个 class 贴标签：我处理以 /health 开头的请求。
@Controller('health')
export class HealthController {
  // 依赖注入：我们不在这里 new HealthService()，
  // 只声明"我需要一个 HealthService"，由 Nest（或测试代码）从外面传进来。
  constructor(private readonly healthService: HealthService) {}

  // @Get() 没传路径，所以匹配的就是 controller 的前缀本身：GET /health
  @Get()
  check() {
    // controller 不写业务逻辑，转手交给 service。
    return this.healthService.check();
  }
}
