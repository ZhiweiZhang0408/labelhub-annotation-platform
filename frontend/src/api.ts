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
  status: 'DRAFT' | 'PUBLISHED';
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
  createItems: (taskId: string, items: ItemPayload[]) =>
    req<{ created: number }>(`/tasks/${taskId}/items`, {
      method: 'POST',
      body: JSON.stringify({ items }),
    }),
  releaseTask: (taskId: string) =>
    req<TaskSummary>(`/tasks/${taskId}/release`, { method: 'POST' }),
  getFormSchema: (taskId: string) =>
    req<FormSchemaRow>(`/tasks/${taskId}/form-schema`),
  putFormSchema: (taskId: string, schema: FormSchemaDefinition) =>
    req<FormSchemaRow>(`/tasks/${taskId}/form-schema`, {
      method: 'PUT',
      body: JSON.stringify(schema),
    }),
};
