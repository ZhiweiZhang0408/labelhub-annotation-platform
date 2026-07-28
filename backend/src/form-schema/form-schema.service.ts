// ============================================================================
// FormSchemaService —— 表单 Schema 的存取逻辑
// ----------------------------------------------------------------------------
// 职责：
//   1. 语义校验（class-validator 管不到的跨字段业务规则）
//   2. 确认 Task 存在（避免直接撞外键报出天书错误）
//   3. upsert：一个任务对应一份表单(1:1)，有则更新、无则创建
// ============================================================================

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertFormSchemaDto } from './dto/upsert-form-schema.dto';

// 必须有 options 的"选择类"字段
const CHOICE_TYPES = ['radio', 'checkbox', 'select'];
// 允许带 options 的所有类型(选择类 + 进阶标注类型，后者用 options 当"类别/标签")
const OPTION_TYPES = [
  ...CHOICE_TYPES,
  'bbox',
  'polygon',
  'keypoints',
  'textspan',
  'timespan',
];

@Injectable()
export class FormSchemaService {
  constructor(private readonly prisma: PrismaService) {}

  // ── 存：按 taskId upsert ───────────────────────────────────────────────
  async upsert(taskId: string, dto: UpsertFormSchemaDto) {
    // 1) 先确认任务存在。不查的话，FormSchema.taskId 外键约束会在写入时报
    //    一个很难读的 Prisma P2003 错误；这里主动查一下给出友好 404。
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      throw new NotFoundException(`任务 ${taskId} 不存在`);
    }

    // 2) 语义校验（业务规则，见下方私有方法）
    this.validateSemantics(dto);

    // 3) upsert：整份 FormSchemaDefinition 存进 schema (JSONB) 列。
    //    Prisma 的 Json 字段入参类型是 InputJsonValue，DTO 是普通对象，做一次断言。
    const schemaJson = dto as unknown as Prisma.InputJsonValue;

    return this.prisma.formSchema.upsert({
      where: { taskId }, // taskId 有 @unique，才能作为 upsert 的定位键
      create: { taskId, version: dto.version, schema: schemaJson },
      update: { version: dto.version, schema: schemaJson },
    });
  }

  // ── 取：按 taskId 读回这份表单 ─────────────────────────────────────────
  async get(taskId: string) {
    const row = await this.prisma.formSchema.findUnique({ where: { taskId } });
    if (!row) {
      throw new NotFoundException(`任务 ${taskId} 还没有配置表单`);
    }
    // 返回整行(含 version/updatedAt 等元信息)；渲染器只需读其中的 row.schema。
    return row;
  }

  // ── 私有：语义校验（class-validator 管不到的跨字段规则）───────────────────
  private validateSemantics(dto: UpsertFormSchemaDto) {
    const seenIds = new Set<string>();

    for (const field of dto.fields) {
      // 规则 1：字段 id 不能重复（id 会成为结果 JSON 的 key，重复会互相覆盖）
      if (seenIds.has(field.id)) {
        throw new BadRequestException(`字段 id 重复：${field.id}`);
      }
      seenIds.add(field.id);

      const isChoice = CHOICE_TYPES.includes(field.type);

      // 规则 2：选择类字段必须至少有一个选项，否则渲染出来是个空下拉框
      if (isChoice && (!field.options || field.options.length === 0)) {
        throw new BadRequestException(
          `字段「${field.id}」是 ${field.type}，必须至少配置一个选项`,
        );
      }

      // 规则 3：只有"用不到 options 的类型"(文本/数字/评分/转写)带了 options 才算配错
      if (!OPTION_TYPES.includes(field.type) && field.options && field.options.length > 0) {
        throw new BadRequestException(
          `字段「${field.id}」是 ${field.type}，不应该有选项`,
        );
      }
    }
  }
}
