import React, { useState, useEffect, useCallback } from 'react';
import { Comment } from '../types';
import { api, isAuthenticated } from '../api';

interface CommentListProps {
  discussionId: number;
}

// Allowed HTML tags for toolbar
const HTML_TAGS = [
  { tag: 'i', label: 'i', open: '<i>', close: '</i>' },
  { tag: 'strong', label: 'strong', open: '<strong>', close: '</strong>' },
  { tag: 'code', label: 'code', open: '<code>', close: '</code>' },
  { tag: 'a', label: 'a', open: '<a href="">', close: '</a>' },
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 65%, 55%)`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ru-RU', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

// Lightbox component for viewing files
const Lightbox: React.FC<{
  src: string;
  type: 'image' | 'text';
  onClose: () => void;
}> = ({ src, type, onClose }) => {
  const [textContent, setTextContent] = useState<string>('');

  useEffect(() => {
    if (type === 'text') {
      fetch(src)
        .then(r => r.text())
        .then(setTextContent)
        .catch(() => setTextContent('Не удалось загрузить файл'));
    }
  }, [src, type]);

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <div className="lightbox-content" onClick={e => e.stopPropagation()}>
        <button className="lightbox-close" onClick={onClose}>×</button>
        {type === 'image' ? (
          <img src={src} alt="Просмотр" className="lightbox-image" />
        ) : (
          <pre className="lightbox-text">{textContent}</pre>
        )}
      </div>
    </div>
  );
};

// File attachment component
const FileAttachment: React.FC<{ fileUrl: string; fileName?: string | null }> = ({ fileUrl, fileName }) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const ext = (fileName || fileUrl).split('.').pop()?.toLowerCase();
  const isImage = ['jpg', 'jpeg', 'png', 'gif'].includes(ext || '');

  if (isImage) {
    return (
      <>
        <div className="file-attachment" onClick={() => setLightboxOpen(true)}>
          <img src={fileUrl} alt="attachment" className="file-thumbnail" />
        </div>
        {lightboxOpen && (
          <Lightbox src={fileUrl} type="image" onClose={() => setLightboxOpen(false)} />
        )}
      </>
    );
  }

  return (
    <>
      <div className="file-attachment file-text" onClick={() => setLightboxOpen(true)}>
        <span className="file-icon">📄</span>
        <span className="file-name">{fileName || 'text.txt'}</span>
      </div>
      {lightboxOpen && (
        <Lightbox src={fileUrl} type="text" onClose={() => setLightboxOpen(false)} />
      )}
    </>
  );
};

// Comment item with replies
const CommentItem: React.FC<{
  comment: Comment;
  onReply: (parentId: number, text: string) => void;
  replyFormOpen: number | null;
  setReplyFormOpen: (id: number | null) => void;
}> = ({ comment, onReply, replyFormOpen, setReplyFormOpen }) => {
  const [replyText, setReplyText] = useState('');

  const submitReply = () => {
    const text = replyText.trim();
    if (!text) return;
    onReply(comment.id, text);
    setReplyText('');
    setReplyFormOpen(null);
  };

  return (
    <div className="comment">
      <div className="comment-author">
        <span
          className="avatar"
          style={{ background: getAvatarColor(comment.author_name) }}
        >
          {comment.author_name.charAt(0).toUpperCase()}
        </span>
        {comment.author_name}
        <span className="comment-date">{formatDate(comment.created_at)}</span>
      </div>
      <div
        className="comment-text"
        dangerouslySetInnerHTML={{ __html: comment.text }}
      />

      {comment.file_url && (
        <FileAttachment fileUrl={comment.file_url} fileName={comment.file} />
      )}

      <div className="comment-actions">
        {isAuthenticated() && (
          <button
            className="action-btn"
            onClick={() => setReplyFormOpen(replyFormOpen === comment.id ? null : comment.id)}
          >
            💬 Ответить
          </button>
        )}
      </div>

      {replyFormOpen === comment.id && (
        <div className="reply-box">
          <textarea
            className="reply-input"
            placeholder="Ваш ответ…"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
          />
          <div className="reply-box-actions">
            <button className="btn btn-primary reply-send" onClick={submitReply}>
              Отправить
            </button>
            <button className="btn btn-outline reply-cancel" onClick={() => setReplyFormOpen(null)}>
              Отмена
            </button>
          </div>
        </div>
      )}

      {comment.replies && comment.replies.length > 0 && (
        <div className="replies">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              onReply={onReply}
              replyFormOpen={replyFormOpen}
              setReplyFormOpen={setReplyFormOpen}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Main CommentList component
const CommentList: React.FC<CommentListProps> = ({ discussionId }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // New comment form
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaImage, setCaptchaImage] = useState('');
  const [captchaText, setCaptchaText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [mainFormOpen, setMainFormOpen] = useState(false);

  // Reply state
  const [replyFormOpen, setReplyFormOpen] = useState<number | null>(null);

  // Load comments
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.getComments(discussionId, page)
      .then((data) => {
        if (!cancelled) {
          setComments(data.results);
          setTotalPages(Math.ceil(data.count / 25));
        }
      })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [discussionId, page]);

  // Load CAPTCHA
  const loadCaptcha = useCallback(() => {
    api.getCaptcha()
      .then((data) => {
        setCaptchaToken(data.token);
        // Convert hex to base64 data URL
        const bytes = new Uint8Array(data.image.match(/.{1,2}/g)!.map(b => parseInt(b, 16)));
        const blob = new Blob([bytes], { type: 'image/png' });
        const reader = new FileReader();
        reader.onload = () => setCaptchaImage(reader.result as string);
        reader.readAsDataURL(blob);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (isAuthenticated()) {
      loadCaptcha();
    }
  }, [loadCaptcha]);

  // Insert HTML tag into text
  const insertTag = (openTag: string, closeTag: string) => {
    const textarea = document.querySelector('.comment-textarea') as HTMLTextAreaElement;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = text.substring(start, end);
    const newText = text.substring(0, start) + openTag + selected + closeTag + text.substring(end);
    setText(newText);
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + openTag.length + selected.length + closeTag.length;
    }, 0);
  };

  // Submit new comment
  const handleSubmit = async () => {
    if (!text.trim()) {
      setError('Текст комментария обязателен.');
      return;
    }
    setError(null);
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('discussion', String(discussionId));
      formData.append('text', text);
      formData.append('captcha_token', captchaToken);
      formData.append('captcha_text', captchaText);
      if (file) formData.append('file', file);

      const newComment = await api.createComment(formData);
      setComments(prev => [newComment, ...prev]);
      setText('');
      setFile(null);
      setCaptchaText('');
      loadCaptcha();
    } catch (err) {
      setError(formatError(err));
      loadCaptcha();
    } finally {
      setSubmitting(false);
    }
  };

  // Submit reply
  const handleReply = async (parentId: number, replyText: string) => {
    try {
      const formData = new FormData();
      formData.append('discussion', String(discussionId));
      formData.append('text', replyText);
      formData.append('parent', String(parentId));
      formData.append('captcha_token', captchaToken);
      formData.append('captcha_text', captchaText);

      const newReply = await api.createComment(formData);
      // Update local state to show reply
      const updateReplies = (comments: Comment[]): Comment[] =>
        comments.map(c => {
          if (c.id === parentId) {
            return { ...c, replies: [...(c.replies || []), newReply] };
          }
          if (c.replies) {
            return { ...c, replies: updateReplies(c.replies) };
          }
          return c;
        });
      setComments(prev => updateReplies(prev));
      loadCaptcha();
    } catch (err) {
      setError(formatError(err));
      loadCaptcha();
    }
  };

  if (loading) {
    return <div className="loading">Загрузка комментариев...</div>;
  }

  return (
    <div className="comments-section">
      {/* New comment form toggle button */}
      {isAuthenticated() && !mainFormOpen && (
        <button 
          className="btn btn-primary show-comment-form-btn"
          onClick={() => setMainFormOpen(true)}
        >
          + Добавить комментарий
        </button>
      )}

      {/* New comment form */}
      {isAuthenticated() && mainFormOpen && (
        <div className="new-comment-form">
          <h3 className="form-title">Добавить комментарий</h3>

          {/* HTML Toolbar */}
          <div className="html-toolbar">
            {HTML_TAGS.map(({ tag, label, open, close }) => (
              <button
                key={tag}
                className="html-tag-btn"
                onClick={() => insertTag(open, close)}
                title={`Вставить ${label}`}
                type="button"
              >
                {label === 'a' ? 'link' : `<${label}>`}
              </button>
            ))}
          </div>

          {/* Textarea */}
          <textarea
            className="comment-textarea"
            placeholder="Текст комментария (разрешены теги: <i>, <strong>, <code>, <a>)"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
          />

          {/* Preview */}
          {text.trim() && (
            <div className="comment-preview">
              <div className="preview-label">Предпросмотр:</div>
              <div
                className="preview-content"
                dangerouslySetInnerHTML={{ __html: text }}
              />
            </div>
          )}

          {/* File upload */}
          <div className="file-upload">
            <label className="file-upload-label">
              📎 Прикрепить файл (JPG, PNG, GIF до 320x240 или TXT до 100KB)
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.gif,.txt"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="file-input"
              />
            </label>
            {file && <span className="file-name-selected">{file.name}</span>}
          </div>

          {/* CAPTCHA */}
          <div className="captcha-section">
            {captchaImage && (
              <div className="captcha-image-wrapper">
                <img src={captchaImage} alt="CAPTCHA" className="captcha-image" />
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
              value={captchaText}
              onChange={(e) => setCaptchaText(e.target.value)}
            />
          </div>

          {error && <div className="form-error">{error}</div>}

          <div className="form-actions">
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? 'Отправка...' : 'Отправить'}
            </button>
            <button
              className="btn btn-outline"
              onClick={() => {
                setMainFormOpen(false);
                setText('');
                setFile(null);
                setError(null);
              }}
            >
              Скрыть
            </button>
          </div>
        </div>
      )}

      {/* Comments list */}
      {!isAuthenticated() && (
        <div className="login-prompt">
          <p>Войдите или зарегистрируйтесь, чтобы оставлять комментарии.</p>
        </div>
      )}

      <div className="comments-list">
        {comments.length === 0 ? (
          <div className="no-comments">Пока нет комментариев. Будьте первым!</div>
        ) : (
          comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              onReply={handleReply}
              replyFormOpen={replyFormOpen}
              setReplyFormOpen={setReplyFormOpen}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="btn btn-outline"
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
          >
            ← Назад
          </button>
          <span className="page-info">{page} / {totalPages}</span>
          <button
            className="btn btn-outline"
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            Вперед →
          </button>
        </div>
      )}
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

export default CommentList;