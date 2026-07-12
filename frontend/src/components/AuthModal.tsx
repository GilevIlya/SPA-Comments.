import React, { useState } from 'react';
import { api, setTokens, AuthUser } from '../api';

interface Props {
  mode: 'login' | 'register';
  onClose: () => void;
  onSuccess: (user: AuthUser) => void;
  onSwitch: (mode: 'login' | 'register') => void;
}

function AuthModal({ mode, onClose, onSuccess, onSwitch }: Props) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'register') {
        const user = await api.register({ username, email, password, password2 });
        const tokens = await api.login({ username, password });
        setTokens(tokens);
        onSuccess(user);
      } else {
        const tokens = await api.login({ username, password });
        setTokens(tokens);
        const user = await api.me();
        onSuccess(user);
      }
    } catch (err) {
      setError(formatError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <h2 className="modal-title">
          {mode === 'login' ? 'Вход' : 'Регистрация'}
        </h2>
        <form className="auth-form" onSubmit={handleSubmit}>
          <input
            className="auth-input"
            placeholder="Имя пользователя"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          {mode === 'register' && (
            <input
              className="auth-input"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          )}
          <input
            className="auth-input"
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
          {mode === 'register' && (
            <input
              className="auth-input"
              type="password"
              placeholder="Повторите пароль"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              minLength={8}
              required
            />
          )}
          {error && <div className="auth-error">{error}</div>}
          <button className="btn btn-primary auth-submit" type="submit" disabled={loading}>
            {loading ? '...' : mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
          </button>
        </form>
        <div className="auth-switch">
          {mode === 'login' ? (
            <span>Нет аккаунта? <a onClick={() => onSwitch('register')}>Зарегистрироваться</a></span>
          ) : (
            <span>Уже есть аккаунт? <a onClick={() => onSwitch('login')}>Войти</a></span>
          )}
        </div>
      </div>
    </div>
  );
}

function formatError(err: unknown): string {
  if (err instanceof Error) {
    try {
      const parsed = JSON.parse(err.message);
      const messages = Object.entries(parsed)
        .map(([key, val]) => `${key}: ${(val as string[]).join(' ')}`)
        .join('\n');
      return messages || err.message;
    } catch {
      return err.message;
    }
  }
  return 'Произошла ошибка';
}

export default AuthModal;