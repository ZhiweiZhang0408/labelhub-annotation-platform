import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { RolesGuard } from './roles.guard';

// 单元测试:不起服务器、不连数据库,只测 RolesGuard 这一段纯逻辑。
// 手法:把它依赖的 Reflector 和 ExecutionContext 都"伪造(mock)"出来,
// 我们想喂什么角色就喂什么,验证守卫的判断对不对。
describe('RolesGuard', () => {
  // 造一个假的 ExecutionContext:它只需要能回答两个问题——
  //   getHandler/getClass(给 Reflector 用,这里无所谓返什么)
  //   switchToHttp().getRequest() → 返回带 user 的请求
  const makeContext = (user: unknown): ExecutionContext =>
    ({
      getHandler: () => null,
      getClass: () => null,
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    }) as unknown as ExecutionContext;

  // 造一个假的 Reflector:让 getAllAndOverride 直接返回我们指定的"要求角色"。
  const makeGuard = (requiredRoles: Role[] | undefined) => {
    const reflector = {
      getAllAndOverride: () => requiredRoles,
    } as unknown as Reflector;
    return new RolesGuard(reflector);
  };

  it('路由没贴 @Roles → 放行', () => {
    const guard = makeGuard(undefined);
    expect(guard.canActivate(makeContext({ role: Role.ANNOTATOR }))).toBe(true);
  });

  it('用户角色在要求列表里 → 放行', () => {
    const guard = makeGuard([Role.TASK_OWNER, Role.REVIEWER]);
    expect(guard.canActivate(makeContext({ role: Role.REVIEWER }))).toBe(true);
  });

  it('用户角色不在要求列表里 → 抛 403 ForbiddenException', () => {
    const guard = makeGuard([Role.TASK_OWNER]);
    expect(() => guard.canActivate(makeContext({ role: Role.ANNOTATOR }))).toThrow(
      ForbiddenException,
    );
  });
});
