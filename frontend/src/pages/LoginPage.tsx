import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setSession } from '../api';

// 极简登录页。预填 demo 账号，方便直接体验。
export function LoginPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState('owner@demo.com');
  const [password, setPassword] = useState('demo1234');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { accessToken, user } = await api.login(email, password);
      setSession(accessToken, user);
      nav('/'); // 登录成功 → 首页
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <form className="auth__card" onSubmit={handleSubmit}>
        <div className="auth__brand">🏷️ LabelHub</div>
        <h1 className="auth__title">Sign in</h1>

        <label className="auth__label">Email</label>
        <input
          className="auth__input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
        />

        <label className="auth__label">Password</label>
        <input
          className="auth__input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />

        {error && <p className="auth__error">{error}</p>}

        <button className="auth__submit" type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="auth__hint">
          Demo: owner@demo.com / annotator@demo.com · password demo1234
        </p>
      </form>
    </div>
  );
}
