import { Injectable } from '@nestjs/common';

// @Injectable() 给这个 class 贴标签：我是一个可被注入的 provider（service）。
// 真正"干活"的地方——这里就是产出健康状态数据。
@Injectable()
export class HealthService {
  check() {
    return {
      status: 'ok',
      service: 'labelhub-backend',
      timestamp: new Date().toISOString(),
    };
  }
}
