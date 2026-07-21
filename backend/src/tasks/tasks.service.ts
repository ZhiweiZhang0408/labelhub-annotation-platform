// ============================================================================
// TasksService —— 任务的最小存取（D5 打通闭环用；完整任务分发是 W3）
// ============================================================================

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  // 建任务：归属当前登录的负责人。plan 不传则用 schema 默认(AI_PLUS_HUMAN)。
  create(ownerId: string, dto: CreateTaskDto) {
    return this.prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description ?? null,
        ownerId,
        ...(dto.plan ? { plan: dto.plan } : {}),
      },
    });
  }

  // 列出所有任务。带出是否已配表单(hasForm)、方案、发布状态、数据条数。
  async listAll() {
    const tasks = await this.prisma.task.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        formSchema: { select: { id: true } },
        _count: { select: { annotations: true } },
      },
    });
    return tasks.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      plan: t.plan,
      status: t.status,
      createdAt: t.createdAt,
      hasForm: t.formSchema !== null,
      itemCount: t._count.annotations,
    }));
  }

  // W3-2：把上传的一批数据炸开成一条条待标注项(Annotation, 状态默认 PENDING)。
  async createItems(taskId: string, items: Record<string, unknown>[]) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException(`任务 ${taskId} 不存在`);

    await this.prisma.annotation.createMany({
      data: items.map((it) => ({
        taskId,
        payload: it as Prisma.InputJsonValue,
      })),
    });
    return { created: items.length };
  }

  // W3-2：发布任务。要求已配表单 + 至少一条数据，否则拦住。
  async release(taskId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        formSchema: { select: { id: true } },
        _count: { select: { annotations: true } },
      },
    });
    if (!task) throw new NotFoundException(`任务 ${taskId} 不存在`);
    if (!task.formSchema) {
      throw new BadRequestException('发布前请先配置表单');
    }
    if (task._count.annotations === 0) {
      throw new BadRequestException('发布前请先上传至少一条数据');
    }
    return this.prisma.task.update({
      where: { id: taskId },
      data: { status: 'PUBLISHED' },
    });
  }
}
