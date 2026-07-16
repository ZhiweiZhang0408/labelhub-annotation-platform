import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { FormSchemaModule } from './form-schema/form-schema.module';
import { TasksModule } from './tasks/tasks.module';
import { WorkflowModule } from './workflow/workflow.module';

@Module({
  imports: [
    // 全局读 .env（isGlobal 后任何模块都能注入 ConfigService）
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule, // @Global 的数据库服务，全局可用
    HealthModule,
    AuthModule, // ← Day4 新增
    FormSchemaModule, // ← W2-1 新增：表单 Schema 存取
    TasksModule, // ← D5 新增：任务最小存取
    WorkflowModule, // ← W3-1 新增：状态机
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
