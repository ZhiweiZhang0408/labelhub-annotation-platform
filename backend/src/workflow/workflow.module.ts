import { Module } from '@nestjs/common';
import { WorkflowService } from './workflow.service';

// 导出 WorkflowService，供 W3 后续的 annotation/review 模块注入使用。
@Module({
  providers: [WorkflowService],
  exports: [WorkflowService],
})
export class WorkflowModule {}
