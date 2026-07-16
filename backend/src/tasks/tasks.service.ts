// ============================================================================
// TasksService —— 任务的最小存取（D5 打通闭环用；完整任务分发是 W3）
// ============================================================================

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  // 建任务：归属当前登录的负责人。
  create(ownerId: string, dto: CreateTaskDto) {
    return this.prisma.task.create({
      data: { title: dto.title, description: dto.description ?? null, ownerId },
    });
  }

  // 列出所有任务（D5 演示用：负责人来选任务配表单、标注员来选任务标注）。
  // 顺带带出"是否已配表单"(hasForm)，前端好显示状态。W3 再做按角色/分发过滤。
  async listAll() {
    const tasks = await this.prisma.task.findMany({
      orderBy: { createdAt: 'desc' },
      include: { formSchema: { select: { id: true } } },
    });
    return tasks.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      createdAt: t.createdAt,
      hasForm: t.formSchema !== null,
    }));
  }
}
