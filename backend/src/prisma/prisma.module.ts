import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// @Global()：把 PrismaService 提升为"全局服务"。
// 一旦在根模块 import 一次，任何其它模块都能直接注入它，不用每个模块都重复 import。
// （数据库这种到处要用的东西，适合做成 Global；业务模块一般不这么做。）
@Global()
@Module({
  providers: [PrismaService], // 本模块负责创建 PrismaService
  exports: [PrismaService], // 并把它导出，供别的模块使用
})
export class PrismaModule {}
