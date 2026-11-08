import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { School } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Alert } from '../../components/common/Alert';
import { ApiError } from '../../api/client';

export const LoginPage: React.FC = () => {
  const { login, user } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already logged in, navigate
  React.useEffect(() => {
    if (user) {
      if (user.role === 'ADMIN') navigate('/admin', { replace: true });
      else if (user.role === 'TEACHER') navigate('/teacher', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Пожалуйста, введите логин и пароль');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await login(username.trim(), password);
      // Navigation happens in useEffect when user changes
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setError('Неверный логин или пароль');
        } else {
          setError(err.detail || err.title || 'Ошибка авторизации');
        }
      } else {
        setError('Не удалось подключиться к серверу. Проверьте соединение.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoLogin: string, demoPass: string) => {
    setUsername(demoLogin);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg-cream)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          backgroundColor: '#fff',
          borderRadius: 'var(--radius-xl)',
          padding: '2.5rem',
          boxShadow: 'var(--shadow-md)',
          border: '1px solid var(--border-color)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: 'var(--teal-50)',
              color: 'var(--teal-600)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
            }}
          >
            <School size={28} />
          </div>
          <h1 style={{ fontSize: '1.375rem', marginBottom: '0.25rem' }}>Детский сад</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Вход в систему управления и биллинга
          </p>
        </div>

        {error && <Alert type="error" className="mb-4">{error}</Alert>}

        <form onSubmit={handleSubmit}>
          <Input
            label="Логин (Email)"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
            placeholder="admin@demo.local"
          />

          <Input
            label="Пароль"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            placeholder="••••••••"
          />

          <Button
            type="submit"
            variant="primary"
            loading={loading}
            style={{ width: '100%', marginTop: '0.5rem' }}
            size="lg"
          >
            Войти в систему
          </Button>
        </form>

        <div
          style={{
            marginTop: '2rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid var(--border-color)',
            fontSize: '0.8125rem',
            color: 'var(--text-muted)',
          }}
        >
          <div style={{ fontWeight: 600, color: 'var(--navy-800)', marginBottom: '0.5rem' }}>
            Тестовые учётные записи:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ justifyContent: 'space-between', width: '100%', fontSize: '0.75rem' }}
              onClick={() => fillDemo('admin@demo.local', 'DemoAdmin2026!')}
            >
              <span>Администратор</span>
              <code style={{ color: 'var(--teal-700)' }}>admin@demo.local</code>
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ justifyContent: 'space-between', width: '100%', fontSize: '0.75rem' }}
              onClick={() => fillDemo('teacher@demo.local', 'DemoTeacher2026!')}
            >
              <span>Воспитатель</span>
              <code style={{ color: 'var(--teal-700)' }}>teacher@demo.local</code>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
