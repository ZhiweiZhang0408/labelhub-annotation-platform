// ============================================================================
// WorkflowService —— 把状态机套在真实 Annotation 上
// ----------------------------------------------------------------------------
// 所有对 Annotation 状态的改动都过这里：加载 → checkTransition 守门 → 落库。
// 后面几天(领取/提交/审核/打回)都只是"调 apply 走一次合法转移 + 各自的副作用"。
// ============================================================================

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Annotation, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { checkTransition, WorkflowAction } from './workflow.transitions';

@Injectable()
export class WorkflowService {
  constructor(private readonly prisma: PrismaService) {}

  // 施加一次状态转移。actorRole 传 null 表示系统触发(AI 那两步)。
  // extraData 让调用方顺带写入副作用字段(如领取时写 annotatorId、提交时写 result)。
  async apply(
    annotationId: string,
    action: WorkflowAction,
    actorRole: Role | null,
    extraData: Prisma.AnnotationUpdateInput = {},
  ): Promise<Annotation> {
    // 带出所属任务，才知道这条数据走哪套方案的工作流。
    const ann = await this.prisma.annotation.findUnique({
      where: { id: annotationId },
      include: { task: { select: { plan: true } } },
    });
    if (!ann) {
      throw new NotFoundException(`Annotation ${annotationId} not found`);
    }

    const result = checkTransition(ann.task.plan, ann.status, action, actorRole);
    if (!result.ok) {
      // 非法转移 → 400；角色不符 → 403
      if (result.code === 'FORBIDDEN') {
        throw new ForbiddenException(result.message);
      }
      throw new BadRequestException(result.message);
    }

    return this.prisma.annotation.update({
      where: { id: annotationId },
      data: { ...extraData, status: result.to },
    });
  }
}
