import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// 自定义参数装饰器：把 request.user（JwtStrategy.validate 的返回值）
// 直接注入到 Controller 方法的参数上。用法： me(@CurrentUser() user) {...}
// 比每次手写 @Req() req 再 req.user 干净得多。
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
