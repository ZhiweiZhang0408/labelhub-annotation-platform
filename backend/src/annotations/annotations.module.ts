import { Module } from '@nestjs/common';
import { WorkflowModule } from '../workflow/workflow.module';
import { AnnotationsController } from './annotations.controller';
import { AnnotationsService } from './annotations.service';

// 依赖 WorkflowModule 拿到 WorkflowService(状态机)。
@Module({
  imports: [WorkflowModule],
  controllers: [AnnotationsController],
  providers: [AnnotationsService],
  exports: [AnnotationsService], // 供 TasksModule 在发布时触发 AI
})
export class AnnotationsModule {}
