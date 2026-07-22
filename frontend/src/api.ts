// ============================================================================
// api.ts —— 前端和后端说话的唯一通道
// ----------------------------------------------------------------------------
// - 登录后把 token 存 localStorage；之后每个请求自动带上 Authorization 头。
// - 统一处理错误(把后端的 message 抛成 Error)，页面 catch 后显示。
// ============================================================================

import type { FormSchemaDefinition } from './types/form-schema';

const BASE = 'http://localhost:3000';

export interface SessionUser {
  id: string;
  email: string;
  role: string;
}

// 带状态码的错误，页面可据此区分(如 404 = 还没配表单)
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const TOKEN_KEY = 'lh_token';
const USER_KEY = 'lh_user';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function getUser(): SessionUser | null {
  const s = localStorage.getItem(USER_KEY);
  return s ? (JSON.parse(s) as SessionUser) : null;
}
export function setSession(token: string, user: SessionUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}
export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(BASE + path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers ?? {}),
    },
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.message)
        msg = Array.isArray(body.message) ? body.message.join(', ') : body.message;
    } catch {
      /* 响应不是 JSON 就用默认 msg */
    }
    throw new ApiError(res.status, msg);
  }
  if (res.status === 204) return null as T;
  return (await res.json()) as T;
}

export type WorkflowPlan = 'AI_PLUS_HUMAN' | 'HUMAN_ONLY' | 'AI_ONLY';

export interface TaskSummary {
  id: string;
  title: string;
  description: string | null;
  plan: WorkflowPlan;
  status: 'DRAFT' | 'PUBLISHED' | 'COMPLETED';
  createdAt: string;
  hasForm: boolean;
  itemCount: number;
}

// 一条待标注数据(发给后端存进 Annotation.payload)
export interface ItemPayload {
  kind: string;
  name: string;
  url?: string; // 媒体：base64 data URL
  text?: string; // 文本
}

export interface FormSchemaRow {
  id: string;
  version: number;
  schema: FormSchemaDefinition;
  taskId: string;
  updatedAt: string;
}

// 一条待标注数据（后端返回）
export interface AnnotationItem {
  id: string;
  status: string;
  payload: { kind: string; name: string; url?: string; text?: string };
  result: unknown;
}

export interface TaskProgress {
  total: number;
  counts: Record<string, number>;
}

// 待审核的一条(给审核台)
export interface ReviewItem {
  id: string;
  payload: { kind: string; name: string; url?: string; text?: string };
  result: Record<string, unknown> | null;
  aiReview: {
    score: number | null;
    decision: string;
    comment: string | null;
  } | null;
}

export const api = {
  login: (email: string, password: string) =>
    req<{ accessToken: string; user: SessionUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  listTasks: () => req<TaskSummary[]>('/tasks'),
  createTask: (title: string, plan?: WorkflowPlan) =>
    req<{ id: string }>('/tasks', {
      method: 'POST',
      body: JSON.stringify({ title, ...(plan ? { plan } : {}) }),
    }),
  getItems: (taskId: string) =>
    req<
      {
        id: string;
        status: string;
        payload: ItemPayload;
        result: Record<string, unknown> | null;
      }[]
    >(`/tasks/${taskId}/items`),
  createItems: (taskId: string, items: ItemPayload[]) =>
    req<{ created: number }>(`/tasks/${taskId}/items`, {
      method: 'POST',
      body: JSON.stringify({ items }),
    }),
  releaseTask: (taskId: string) =>
    req<TaskSummary>(`/tasks/${taskId}/release`, { method: 'POST' }),
  // W3-3 标注员：领取下一条 / 提交 / 看进度
  claimItem: (taskId: string) =>
    req<AnnotationItem>(`/tasks/${taskId}/annotations/claim`, {
      method: 'POST',
    }),
  submitAnnotation: (annotationId: string, result: Record<string, unknown>) =>
    req<AnnotationItem>(`/annotations/${annotationId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ result }),
    }),
  taskProgress: (taskId: string) =>
    req<TaskProgress>(`/tasks/${taskId}/progress`),
  // W3-4 审核员：待审队列 / 通过 / 打回
  reviewQueue: (taskId: string) =>
    req<ReviewItem[]>(`/tasks/${taskId}/review-queue`),
  approveAnnotation: (id: string) =>
    req<AnnotationItem>(`/annotations/${id}/approve`, { method: 'POST' }),
  rejectAnnotation: (id: string, comment: string) =>
    req<AnnotationItem>(`/annotations/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    }),
  getFormSchema: (taskId: string) =>
    req<FormSchemaRow>(`/tasks/${taskId}/form-schema`),
  putFormSchema: (taskId: string, schema: FormSchemaDefinition) =>
    req<FormSchemaRow>(`/tasks/${taskId}/form-schema`, {
      method: 'PUT',
      body: JSON.stringify(schema),
    }),
};
