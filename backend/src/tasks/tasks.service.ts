// ============================================================================
// TasksService —— 任务的最小存取（D5 打通闭环用；完整任务分发是 W3）
// ============================================================================

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AnnotationsService } from '../annotations/annotations.service';
import { CreateTaskDto } from './dto/create-task.dto';

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly annotations: AnnotationsService,
  ) {}

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

  // 列出任务。负责人看全部；工人只看【分配给自己的】已发布/已完成任务。
  async listAll(user: { id: string; role: Role }) {
    const where: Prisma.TaskWhereInput =
      user.role === Role.TASK_OWNER
        ? {}
        : {
            status: { in: ['PUBLISHED', 'COMPLETED'] },
            assignees: { some: { id: user.id } },
          };
    const tasks = await this.prisma.task.findMany({
      where,
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

  // 列出某任务已有的数据项(设计器回显已上传数据 / owner 看标注结果)。
  async listItems(taskId: string) {
    const anns = await this.prisma.annotation.findMany({
      where: { taskId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, status: true, payload: true, result: true },
    });
    return anns.map((a) => ({
      id: a.id,
      status: a.status,
      payload: a.payload,
      result: a.result,
    }));
  }

  // 分配：设置这个任务分给哪些工人(set 覆盖式)。
  async setAssignees(taskId: string, userIds: string[]) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException(`任务 ${taskId} 不存在`);
    return this.prisma.task.update({
      where: { id: taskId },
      data: { assignees: { set: userIds.map((id) => ({ id })) } },
      include: { assignees: { select: { id: true, name: true, email: true } } },
    });
  }

  // 读取当前分配的工人。
  async getAssignees(taskId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignees: { select: { id: true, name: true, email: true, role: true } },
      },
    });
    if (!task) throw new NotFoundException(`任务 ${taskId} 不存在`);
    return task.assignees;
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
    const published = await this.prisma.task.update({
      where: { id: taskId },
      data: { status: 'PUBLISHED' },
    });
    // AI 方案：发布即跑 AI 预审(mock)。纯AI会直接把数据推到已入库/任务完成。
    await this.annotations.runAiForTask(taskId);
    // 重新取一次(纯AI 可能已把任务置为 COMPLETED)
    const fresh = await this.prisma.task.findUnique({ where: { id: taskId } });
    return fresh ?? published;
  }
}
