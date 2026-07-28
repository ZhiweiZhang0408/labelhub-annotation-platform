// ============================================================================
// AnnotationsService —— 标注 / AI预审(mock) / 人工审核 / 进度
// ----------------------------------------------------------------------------
// 所有状态变更都过 WorkflowService(状态机守门)。AI 是 mock，W4 换真模型。
// ============================================================================

import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowService } from '../workflow/workflow.service';

// 表单字段(松类型，从 FormSchema.schema JSON 里读)
interface SchemaField {
  id: string;
  type: string;
  options?: { value: string }[];
}

@Injectable()
export class AnnotationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflow: WorkflowService,
  ) {}

  // ── 标注员：领取下一条 ──────────────────────────────────────────────
  // 先给我"标注中"的(被打回要重做的 / 没做完的)，没有再领新的 PENDING。
  async claimNext(taskId: string, userId: string) {
    const mine = await this.prisma.annotation.findFirst({
      where: { taskId, status: 'IN_PROGRESS', annotatorId: userId },
      orderBy: { createdAt: 'asc' },
    });
    if (mine) return mine; // 已是我的、已 IN_PROGRESS，直接给，不用再 claim

    const next = await this.prisma.annotation.findFirst({
      where: { taskId, status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
    });
    if (!next) throw new NotFoundException('No pending items left');
    return this.workflow.apply(next.id, 'claim', Role.ANNOTATOR, {
      annotator: { connect: { id: userId } },
    });
  }

  // 标注员提交
  async submit(
    annotationId: string,
    userId: string,
    result: Prisma.InputJsonValue,
  ) {
    const ann = await this.prisma.annotation.findUnique({
      where: { id: annotationId },
    });
    if (!ann) throw new NotFoundException('Annotation not found');
    if (ann.annotatorId !== userId) {
      throw new ForbiddenException('这条不是你领取的');
    }
    return this.workflow.apply(annotationId, 'submit', Role.ANNOTATOR, {
      result,
    });
  }

  // ── AI 预审(mock)：发布 AI 方案任务时，把所有 PENDING 项自动跑一遍 ──────
  async runAiForTask(taskId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { formSchema: true },
    });
    if (!task || task.plan === 'HUMAN_ONLY') return; // 纯人工不跑 AI
    const schema = (task.formSchema?.schema as { fields?: SchemaField[] }) ?? {
      fields: [],
    };

    const pending = await this.prisma.annotation.findMany({
      where: { taskId, status: 'PENDING' },
    });
    for (const ann of pending) {
      const result = this.mockAnswers(schema);
      // AI 标注：PENDING → AI_REVIEWING，存 AI 产出的 result
      await this.workflow.apply(ann.id, 'aiLabel', null, {
        result: result as Prisma.InputJsonValue,
      });
      await this.prisma.review.create({
        data: {
          annotationId: ann.id,
          type: 'AI',
          decision: 'APPROVED',
          score: +(0.7 + Math.random() * 0.3).toFixed(2),
          comment: 'Auto-labeled by AI (mock)',
          raw: result as Prisma.InputJsonValue,
        },
      });
      if (task.plan === 'AI_PLUS_HUMAN') {
        await this.workflow.apply(ann.id, 'aiToHuman', null); // → 待人审
      } else {
        await this.workflow.apply(ann.id, 'aiApprove', null); // 纯AI → 直接入库
      }
    }
    if (task.plan === 'AI_ONLY') await this.maybeCompleteTask(taskId);
  }

  // AI 给每个字段编一个 mock 答案(选择类取第一个选项，文本给占位…)
  private mockAnswers(schema: { fields?: SchemaField[] }) {
    const out: Record<string, unknown> = {};
    for (const f of schema.fields ?? []) {
      if (f.type === 'radio' || f.type === 'select') {
        out[f.id] = f.options?.[0]?.value ?? '';
      } else if (
        f.type === 'bbox' ||
        f.type === 'textspan' ||
        f.type === 'timespan' ||
        f.type === 'polygon' ||
        f.type === 'keypoints'
      ) {
        out[f.id] = []; // AI 编不出这些几何标注，先给空
      } else if (f.type === 'checkbox') {
        out[f.id] = f.options?.[0] ? [f.options[0].value] : [];
      } else if (f.type === 'rating') {
        out[f.id] = '3';
      } else if (f.type === 'number') {
        out[f.id] = '0';
      } else {
        out[f.id] = '(AI) auto';
      }
    }
    return out;
  }

  // ── 审核员：待审队列 / 通过 / 打回 ──────────────────────────────────
  async reviewQueue(taskId: string) {
    const anns = await this.prisma.annotation.findMany({
      where: { taskId, status: 'HUMAN_REVIEW' },
      orderBy: { createdAt: 'asc' },
      include: { reviews: { where: { type: 'AI' }, take: 1 } },
    });
    return anns.map((a) => ({
      id: a.id,
      payload: a.payload,
      result: a.result,
      aiReview: a.reviews[0]
        ? {
            score: a.reviews[0].score,
            decision: a.reviews[0].decision,
            comment: a.reviews[0].comment,
          }
        : null,
    }));
  }

  async approve(annotationId: string, reviewerId: string) {
    await this.assertNotSelfReview(annotationId, reviewerId);
    const ann = await this.workflow.apply(annotationId, 'approve', Role.REVIEWER);
    await this.prisma.review.create({
      data: {
        annotationId,
        type: 'HUMAN',
        decision: 'APPROVED',
        reviewerId,
      },
    });
    await this.maybeCompleteTask(ann.taskId);
    return ann;
  }

  async reject(annotationId: string, reviewerId: string, comment?: string) {
    await this.assertNotSelfReview(annotationId, reviewerId);
    const ann = await this.workflow.apply(annotationId, 'reject', Role.REVIEWER);
    await this.prisma.review.create({
      data: {
        annotationId,
        type: 'HUMAN',
        decision: 'REJECTED',
        comment: comment ?? null,
        reviewerId,
      },
    });
    return ann;
  }

  // 岗位合并后：一个人既能标又能审，但不能审"自己标的那条"。
  private async assertNotSelfReview(annotationId: string, reviewerId: string) {
    const ann = await this.prisma.annotation.findUnique({
      where: { id: annotationId },
      select: { annotatorId: true },
    });
    if (ann?.annotatorId && ann.annotatorId === reviewerId) {
      throw new ForbiddenException('不能审核自己标注的数据');
    }
  }

  // 全部入库 → 任务标记完成
  private async maybeCompleteTask(taskId: string) {
    const grouped = await this.prisma.annotation.groupBy({
      by: ['status'],
      where: { taskId },
      _count: { _all: true },
    });
    const total = grouped.reduce((s, g) => s + g._count._all, 0);
    const approved =
      grouped.find((g) => g.status === 'APPROVED')?._count._all ?? 0;
    if (total > 0 && approved === total) {
      await this.prisma.task.update({
        where: { id: taskId },
        data: { status: 'COMPLETED' },
      });
    }
  }

  // ── 进度 ────────────────────────────────────────────────────────────
  async progress(taskId: string) {
    const grouped = await this.prisma.annotation.groupBy({
      by: ['status'],
      where: { taskId },
      _count: { _all: true },
    });
    const counts: Record<string, number> = {};
    for (const g of grouped) counts[g.status] = g._count._all;
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    return { total, counts };
  }
}
