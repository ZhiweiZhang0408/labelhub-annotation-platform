import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { WorkflowPlan } from '@prisma/client';

// 建任务请求体。title 必填，description、plan 可选(plan 不传用 schema 默认)。
export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  // 三选一的标注方案；决定这个任务走哪条工作流。
  @IsOptional()
  @IsEnum(WorkflowPlan, {
    message: 'plan must be AI_PLUS_HUMAN / HUMAN_ONLY / AI_ONLY',
  })
  plan?: WorkflowPlan;
}
