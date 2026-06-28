import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from './roles.decorator';

// 守卫(Guard)= 一个实现了 CanActivate 接口的类。
// NestJS 在进入控制器之前调用 canActivate():
//   返回 true  → 放行,继续往下走
//   返回 false / 抛异常 → 拦下(这里我们抛 403 ForbiddenException)
@Injectable()
export class RolesGuard implements CanActivate {
  // Reflector 是 NestJS 内置工具,专门用来"读"@Roles() 贴上去的元数据。
  // 通过构造函数注入(和别处注入 Service 一样的套路)。
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 1) 把 @Roles() 存的角色数组读出来。
    //    getAllAndOverride 会同时看"方法上"和"控制器类上"的便签,
    //    方法上的优先(override)——这样既能整类限制,也能单个方法覆盖。
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(), // 当前这个方法
      context.getClass(), // 方法所在的控制器类
    ]);

    // 2) 路由没贴 @Roles() 便签 → 不限角色 → 直接放行。
    //    (它仍可能被 AuthGuard 保护着,只是不限"哪种角色"。)
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // 3) 拿到当前用户。这是 AuthGuard('jwt') 验票后挂上去的 {id,email,role}。
    //    所以用 RolesGuard 的路由必须排在 AuthGuard 之后,否则 user 是 undefined。
    const { user } = context.switchToHttp().getRequest();

    // 4) 用户的角色在要求的角色列表里吗?在 → 放行;不在 → 抛 403。
    if (user && requiredRoles.includes(user.role)) {
      return true;
    }
    throw new ForbiddenException('You do not have permission to access this resource');
  }
}
