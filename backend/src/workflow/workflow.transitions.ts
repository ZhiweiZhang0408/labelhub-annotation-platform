// ============================================================================
// 工作流状态机 —— 按【标注方案】分三套的显式转移表（难度三件套 #2 的核心）
// ----------------------------------------------------------------------------
// LabelHub 对外卖三种标注方案，每种走不同的流水线：
//   ① AI_PLUS_HUMAN：待处理 → 🤖AI标注 → 👀人工审核 →(通过→入库 / 打回→AI重标)
//   ② HUMAN_ONLY   ：待标注 → 标注中 → 👀人工审核 →(通过→入库 / 打回→重标)
//   ③ AI_ONLY      ：待处理 → 🤖AI标注 → ✅自动入库（无人工）
//
// 一条数据的状态变更只能走它所属任务的方案表里写明的路。校验集中在 checkTransition。
// 纯逻辑、不依赖 NestJS/Prisma 运行时，方便单测。
// ============================================================================

import { AnnotationStatus, Role, WorkflowPlan } from '@prisma/client';

// 能对一条标注数据施加的动作
export type WorkflowAction =
  | 'claim' // 人工领取：待标注 → 标注中
  | 'submit' // 人工提交：标注中 → 待人工审核
  | 'aiLabel' // AI 标注(系统)：待处理 → AI处理中
  | 'aiToHuman' // AI 标注完转人审(系统)：AI处理中 → 待人工审核
  | 'aiApprove' // AI 自动入库(系统, 纯AI方案)：AI处理中 → 已入库
  | 'approve' // 审核通过：待人工审核 → 已入库
  | 'reject'; // 打回：待人工审核 → (重标)

export interface Transition {
  from: AnnotationStatus;
  action: WorkflowAction;
  to: AnnotationStatus;
  roles: Role[]; // 谁能触发；空数组 = 系统内部触发(AI 步骤)
}

// ① AI 标注 → 人工审核
const AI_PLUS_HUMAN: Transition[] = [
  { from: 'PENDING', action: 'aiLabel', to: 'AI_REVIEWING', roles: [] },
  { from: 'AI_REVIEWING', action: 'aiToHuman', to: 'HUMAN_REVIEW', roles: [] },
  { from: 'HUMAN_REVIEW', action: 'approve', to: 'APPROVED', roles: [Role.REVIEWER] },
  // 打回 → 回到待处理，让 AI 重标
  { from: 'HUMAN_REVIEW', action: 'reject', to: 'PENDING', roles: [Role.REVIEWER] },
];

// ② 纯人工：人标注 → 人审核
const HUMAN_ONLY: Transition[] = [
  { from: 'PENDING', action: 'claim', to: 'IN_PROGRESS', roles: [Role.ANNOTATOR] },
  { from: 'IN_PROGRESS', action: 'submit', to: 'HUMAN_REVIEW', roles: [Role.ANNOTATOR] },
  { from: 'HUMAN_REVIEW', action: 'approve', to: 'APPROVED', roles: [Role.REVIEWER] },
  // 打回 → 回到标注中，让原标注员重标
  { from: 'HUMAN_REVIEW', action: 'reject', to: 'IN_PROGRESS', roles: [Role.REVIEWER] },
];

// ③ 纯 AI：AI 标注 → 自动入库
const AI_ONLY: Transition[] = [
  { from: 'PENDING', action: 'aiLabel', to: 'AI_REVIEWING', roles: [] },
  { from: 'AI_REVIEWING', action: 'aiApprove', to: 'APPROVED', roles: [] },
];

// 方案 → 转移表
export const PLAN_TRANSITIONS: Record<WorkflowPlan, Transition[]> = {
  AI_PLUS_HUMAN,
  HUMAN_ONLY,
  AI_ONLY,
};

// 校验结果：放行(给目标状态) 或 拒绝(附原因分类)
export type TransitionResult =
  | { ok: true; to: AnnotationStatus }
  | { ok: false; code: 'ILLEGAL' | 'FORBIDDEN'; message: string };

// 守门：某方案下，当前状态 + 动作 + 触发者角色(系统触发传 null) → 能不能走、走到哪。
export function checkTransition(
  plan: WorkflowPlan,
  from: AnnotationStatus,
  action: WorkflowAction,
  actorRole: Role | null,
): TransitionResult {
  const table = PLAN_TRANSITIONS[plan];
  const t = table.find((x) => x.from === from && x.action === action);

  // 该方案的表里没有这条路 → 非法转移
  if (!t) {
    return {
      ok: false,
      code: 'ILLEGAL',
      message: `Illegal transition in plan ${plan}: cannot '${action}' from ${from}`,
    };
  }

  // 系统专属转移(roles 空)：只允许系统触发(actorRole 为 null)
  if (t.roles.length === 0) {
    if (actorRole !== null) {
      return {
        ok: false,
        code: 'FORBIDDEN',
        message: `'${action}' is a system-only transition`,
      };
    }
    return { ok: true, to: t.to };
  }

  // 需要角色：触发者角色必须在允许列表里
  if (actorRole === null || !t.roles.includes(actorRole)) {
    return {
      ok: false,
      code: 'FORBIDDEN',
      message: `Role '${actorRole ?? 'none'}' cannot '${action}' (need ${t.roles.join('/')})`,
    };
  }

  return { ok: true, to: t.to };
}
