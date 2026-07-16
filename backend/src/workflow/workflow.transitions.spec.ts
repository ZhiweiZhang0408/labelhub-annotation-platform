import { Role } from '@prisma/client';
import { checkTransition } from './workflow.transitions';

describe('workflow state machine — 按方案分三套 (checkTransition)', () => {
  describe('② HUMAN_ONLY 纯人工', () => {
    it('领取 PENDING → IN_PROGRESS（标注员）', () => {
      expect(checkTransition('HUMAN_ONLY', 'PENDING', 'claim', Role.ANNOTATOR)).toEqual({
        ok: true,
        to: 'IN_PROGRESS',
      });
    });
    it('提交 IN_PROGRESS → HUMAN_REVIEW（跳过 AI）', () => {
      expect(
        checkTransition('HUMAN_ONLY', 'IN_PROGRESS', 'submit', Role.ANNOTATOR),
      ).toEqual({ ok: true, to: 'HUMAN_REVIEW' });
    });
    it('通过 HUMAN_REVIEW → APPROVED（审核员）', () => {
      expect(
        checkTransition('HUMAN_ONLY', 'HUMAN_REVIEW', 'approve', Role.REVIEWER),
      ).toEqual({ ok: true, to: 'APPROVED' });
    });
    it('打回 → IN_PROGRESS（退回原标注员）', () => {
      expect(
        checkTransition('HUMAN_ONLY', 'HUMAN_REVIEW', 'reject', Role.REVIEWER),
      ).toEqual({ ok: true, to: 'IN_PROGRESS' });
    });
    it('纯人工方案里没有 AI 步骤：aiLabel 非法', () => {
      const r = checkTransition('HUMAN_ONLY', 'PENDING', 'aiLabel', null);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.code).toBe('ILLEGAL');
    });
  });

  describe('① AI_PLUS_HUMAN', () => {
    it('AI 标注 PENDING → AI_REVIEWING（系统）', () => {
      expect(checkTransition('AI_PLUS_HUMAN', 'PENDING', 'aiLabel', null)).toEqual({
        ok: true,
        to: 'AI_REVIEWING',
      });
    });
    it('AI 转人审 AI_REVIEWING → HUMAN_REVIEW（系统）', () => {
      expect(
        checkTransition('AI_PLUS_HUMAN', 'AI_REVIEWING', 'aiToHuman', null),
      ).toEqual({ ok: true, to: 'HUMAN_REVIEW' });
    });
    it('打回 → PENDING（让 AI 重标）', () => {
      expect(
        checkTransition('AI_PLUS_HUMAN', 'HUMAN_REVIEW', 'reject', Role.REVIEWER),
      ).toEqual({ ok: true, to: 'PENDING' });
    });
    it('AI 方案里人不能 claim（没有人工标注步骤）', () => {
      const r = checkTransition('AI_PLUS_HUMAN', 'PENDING', 'claim', Role.ANNOTATOR);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.code).toBe('ILLEGAL');
    });
  });

  describe('③ AI_ONLY 纯AI', () => {
    it('AI 标注 → AI_REVIEWING → 自动入库 APPROVED（全系统，无人工）', () => {
      expect(checkTransition('AI_ONLY', 'PENDING', 'aiLabel', null)).toEqual({
        ok: true,
        to: 'AI_REVIEWING',
      });
      expect(
        checkTransition('AI_ONLY', 'AI_REVIEWING', 'aiApprove', null),
      ).toEqual({ ok: true, to: 'APPROVED' });
    });
    it('纯AI没有人工审核：approve 非法', () => {
      const r = checkTransition('AI_ONLY', 'AI_REVIEWING', 'approve', Role.REVIEWER);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.code).toBe('ILLEGAL');
    });
  });

  describe('通用守卫', () => {
    it('已入库不能再动：APPROVED submit 非法', () => {
      const r = checkTransition('HUMAN_ONLY', 'APPROVED', 'submit', Role.ANNOTATOR);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.code).toBe('ILLEGAL');
    });
    it('角色越权：标注员不能 approve', () => {
      const r = checkTransition('HUMAN_ONLY', 'HUMAN_REVIEW', 'approve', Role.ANNOTATOR);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.code).toBe('FORBIDDEN');
    });
    it('系统步骤不能被用户手动触发：aiLabel by user 越权', () => {
      const r = checkTransition('AI_ONLY', 'PENDING', 'aiLabel', Role.TASK_OWNER);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.code).toBe('FORBIDDEN');
    });
  });
});
