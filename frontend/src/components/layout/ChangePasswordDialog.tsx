import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { Alert } from '../common/Alert';
import { useAuth } from '../../context/AuthContext';
import { ApiError } from '../../api/client';

export interface ChangePasswordDialogProps {
  isOpen: boolean;
  onClose: () => void;
  isForced?: boolean;
}

export const ChangePasswordDialog: React.FC<ChangePasswordDialogProps> = ({
  isOpen,
  onClose,
  isForced = false,
}) => {
  const { changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentPassword) {
      setError('Введите текущий пароль');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setError('Новый пароль должен содержать не менее 6 символов');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Новый пароль и подтверждение не совпадают');
      return;
    }

    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      // Logout happens automatically inside changePassword
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail || err.title || 'Ошибка смены пароля');
      } else {
        setError('Не удалось сменить пароль. Попробуйте позже.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={isForced ? () => {} : onClose}
      title={isForced ? 'Требуется сменить пароль' : 'Смена пароля'}
    >
      <form onSubmit={handleSubmit}>
        {isForced && (
          <Alert type="warning" className="mb-4">
            При первом входе или после сброса администратором необходимо установить новый пароль.
          </Alert>
        )}

        {error && <Alert type="error" className="mb-4">{error}</Alert>}

        <Input
          label="Текущий пароль"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
          autoComplete="current-password"
        />

        <Input
          label="Новый пароль"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          autoComplete="new-password"
          hint="Минимум 6 символов"
        />

        <Input
          label="Подтверждение нового пароля"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          autoComplete="new-password"
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
          {!isForced && (
            <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
              Отмена
            </Button>
          )}
          <Button type="submit" variant="primary" loading={loading}>
            Сохранить пароль
          </Button>
        </div>
      </form>
    </Modal>
  );
};
