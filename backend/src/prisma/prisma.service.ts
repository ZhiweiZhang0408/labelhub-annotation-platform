import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// PrismaService = Day3 生成的 PrismaClient + NestJS 生命周期。
// 继承 PrismaClient：直接拥有 prisma.user.findUnique(...) 这些类型安全的查询方法。
// @Injectable()：声明"我是个可被注入的服务"，于是别的 Service 能在构造函数里要一份。
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  // OnModuleInit：NestJS 在模块初始化时回调这个钩子。
  // 我们在这里真正连上数据库——只连一次，全应用复用这条连接。
  async onModuleInit() {
    await this.$connect();
  }
}
