// 登录守卫：没 token 就重定向到登录页，有就渲染子页面。
import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { getToken } from '../api';

export function RequireAuth({ children }: { children: ReactNode }) {
  return getToken() ? <>{children}</> : <Navigate to="/login" replace />;
}
