import { Module } from '@nestjs/common';
import { AnnotationsModule } from '../annotations/annotations.module';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [AnnotationsModule], // 发布 AI 方案任务时触发 AI 预审
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}
