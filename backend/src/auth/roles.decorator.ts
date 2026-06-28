import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

// 这个常量是"便签贴在哪个名字下"——装饰器把数据存到这个 key,
// 守卫稍后用同一个 key 把数据取出来。两边必须用同一个字符串,
// 所以抽成常量,避免一边写 'roles' 另一边写错。
export const ROLES_KEY = 'roles';

// @Roles(Role.TASK_OWNER, Role.REVIEWER) —— 给路由贴一张便签:
// "本路由只允许这些角色"。它本身不拦截任何东西,只是存元数据(metadata)。
// SetMetadata(key, value) 是 NestJS 提供的:把 value 挂到被装饰的方法/类上。
// 用 ...roles 收成数组,所以可以一次写多个角色。
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
