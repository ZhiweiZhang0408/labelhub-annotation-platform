import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  it('用【真】service：返回真实的健康数据', () => {
    // 自己 new 一个真 service 注入进去
    const realService = new HealthService();
    const controller = new HealthController(realService);

    const result = controller.check();
    expect(result.status).toBe('ok');
    expect(result.service).toBe('labelhub-backend');
  });

  it('用【假】service（mock）：controller 照样工作，完全不碰真 service', () => {
    // 1. 造一个假的 service：长得像 HealthService，但返回写死的假数据。
    //    注意：它没有任何真实逻辑、不依赖时间、不连数据库。
    const fakeService = {
      check: () => ({ status: 'FAKE', service: 'mock', timestamp: 'X' }),
    } as unknown as HealthService;

    // 2. 把假 service 当参数"注入"给 controller —— 这就是 DI 让我们能做的事。
    const controller = new HealthController(fakeService);

    // 3. controller 返回的是【假】service 给的数据，证明它确实用了我们塞进去的那个。
    const result = controller.check();
    expect(result.status).toBe('FAKE');
    expect(result.service).toBe('mock');
  });
});
