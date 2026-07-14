import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import { Comment } from '../types';

interface CaptchaModalProps {
  open: boolean;
  title?: string;
  onClose: () => void;
  onConfirm: (token: string, captchaText: string) => Promise<Comment | null>;
}

const CaptchaModal: React.FC<CaptchaModalProps> = ({
  open,
  title = 'Подтверждение CAPTCHA',
  onClose,
  onConfirm,
}) => {
  const [token, setToken] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadCaptcha = useCallback(() => {
    setLoading(true);
    api
      .getCaptcha()
      .then((data) => {
        setToken(data.token);
        setImageUrl(data.image_url);
      })
      .catch(() => setError('Не удалось загрузить CAPTCHA.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (open) {
      setText('');
      setError(null);
      loadCaptcha();
    }
  }, [open, loadCaptcha]);

  const handleConfirm = async () => {
    if (!text.trim()) {
      setError('Введите код с картинки.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const result = await onConfirm(token, text);
      // null = validation error already handled in CommentList, just close silently
      if (result === null) {
        onClose();
        return;
      }
      onClose();
    } catch (err) {
      setError(formatError(err));
      setText('');
      loadCaptcha();
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          ×
        </button>
        <h2 className="modal-title">{title}</h2>
        <p className="captcha-modal-hint">
          Введите код с картинки, чтобы подтвердить отправку.
        </p>
        <div className="captcha-section">
          {imageUrl && (
            <div className="captcha-image-wrapper">
              <img src={imageUrl} alt="CAPTCHA" className="captcha-image" />
              <button
                type="button"
                className="captcha-refresh"
                onClick={loadCaptcha}
                title="Обновить CAPTCHA"
              >
                🔄
              </button>
            </div>
          )}
          <input
            className="captcha-input"
            placeholder="Введите код с картинки"
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoFocus
          />
        </div>
        {error && <div className="form-error">{error}</div>}
        <div className="form-actions">
          <button
            className="btn btn-primary"
            onClick={handleConfirm}
            disabled={submitting || loading}
          >
            {submitting ? 'Проверка...' : 'Отправить'}
          </button>
          <button
            className="btn btn-outline"
            onClick={onClose}
            disabled={submitting}
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
};

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

export default CaptchaModal;