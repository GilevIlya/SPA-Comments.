import React, { useState, useEffect, useCallback } from 'react';
import { Comment } from '../types';
import { api, isAuthenticated } from '../api';
import CaptchaModal from './CaptchaModal';
import { useDiscussionSocket } from '../useDiscussionSocket';

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
  
  // Extract just the filename from the path
  const displayName = (fileName || fileUrl).split('/').pop() || 'text.txt';

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
        <span className="file-name">{displayName}</span>
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
  onRequestReplyCaptcha: (parentId: number, text: string, file: File | null) => void;
  replyFormOpen: number | null;
  setReplyFormOpen: (id: number | null) => void;
}> = ({ comment, onRequestReplyCaptcha, replyFormOpen, setReplyFormOpen }) => {
  const [replyText, setReplyText] = useState('');
  const [replyFile, setReplyFile] = useState<File | null>(null);

  const submitReply = () => {
    const text = replyText.trim();
    if (!text) return;
    onRequestReplyCaptcha(comment.id, text, replyFile);
    setReplyText('');
    setReplyFile(null);
    setReplyFormOpen(null);
  };

  const insertReplyTag = (openTag: string, closeTag: string) => {
    const textarea = document.querySelector('.reply-textarea') as HTMLTextAreaElement;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = replyText.substring(start, end);
    const newText = replyText.substring(0, start) + openTag + selected + closeTag + replyText.substring(end);
    setReplyText(newText);
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + openTag.length + selected.length + closeTag.length;
    }, 0);
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
        {comment.parent_author_name && (
          <span className="reply-to">→ @{comment.parent_author_name}</span>
        )}
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
        <div className="new-comment-form">
          <h3 className="form-title">Ответить</h3>

          {/* HTML Toolbar */}
          <div className="html-toolbar">
            {HTML_TAGS.map(({ tag, label, open, close }) => (
              <button
                key={tag}
                className="html-tag-btn"
                onClick={() => insertReplyTag(open, close)}
                title={`Вставить ${label}`}
                type="button"
              >
                {label === 'a' ? 'link' : `<${label}>`}
              </button>
            ))}
          </div>

          {/* Textarea */}
          <textarea
            className="reply-textarea"
            placeholder="Текст комментария (разрешены теги: <i>, <strong>, <code>, <a>)"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            rows={5}
          />

          {/* Preview */}
          {replyText.trim() && (
            <div className="comment-preview">
              <div className="preview-label">Предпросмотр:</div>
              <div
                className="preview-content"
                dangerouslySetInnerHTML={{ __html: replyText }}
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
                onChange={(e) => setReplyFile(e.target.files?.[0] || null)}
                className="file-input"
              />
            </label>
            {replyFile && <span className="file-name-selected">{replyFile.name}</span>}
          </div>

          <div className="form-actions">
            <button className="btn btn-primary" onClick={submitReply}>
              Отправить
            </button>
            <button className="btn btn-outline" onClick={() => {
              setReplyFormOpen(null);
              setReplyText('');
              setReplyFile(null);
            }}>
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
              onRequestReplyCaptcha={onRequestReplyCaptcha}
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
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [mainFormOpen, setMainFormOpen] = useState(false);

  // Reply state
  const [replyFormOpen, setReplyFormOpen] = useState<number | null>(null);

  // Captcha modal state
  const [commentCaptchaOpen, setCommentCaptchaOpen] = useState(false);
  const [replyCaptchaOpen, setReplyCaptchaOpen] = useState(false);
  const [pendingReply, setPendingReply] = useState<{ parentId: number; text: string; file: File | null } | null>(null);

  // Load comments
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.getComments(discussionId, page)
      .then((data) => {
        if (!cancelled) {
          console.log('Comments API response:', data);
          setComments(data.results);
          setTotalPages(Math.ceil(data.count / 25));
        }
      })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [discussionId, page]);

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

  // Open captcha modal for new comment
  const openCommentCaptcha = () => {
    if (!text.trim()) {
      setError('Текст комментария обязателен.');
      return;
    }
    setError(null);
    setCommentCaptchaOpen(true);
  };

  // Submit new comment (called after captcha confirmed)
  const submitComment = async (token: string, captchaText: string): Promise<Comment | null> => {
    const formData = new FormData();
    formData.append('discussion', String(discussionId));
    formData.append('text', text);
    formData.append('captcha_token', token);
    formData.append('captcha_text', captchaText);
    if (file) formData.append('file', file);

    try {
      const newComment = await api.createComment(formData);
      setText('');
      setFile(null);
      setMainFormOpen(false);
      return newComment;
    } catch (err) {
      const errorMsg = formatError(err);
      // Check if it's a validation error (text/file) — show in form
      if (errorMsg.toLowerCase().includes('текст') || 
          errorMsg.toLowerCase().includes('тег') || 
          errorMsg.toLowerCase().includes('xhtml') ||
          errorMsg.toLowerCase().includes('вложенность') ||
          errorMsg.toLowerCase().includes('закрыт') ||
          errorMsg.toLowerCase().includes('файл') ||
          errorMsg.toLowerCase().includes('размер')) {
        setError(errorMsg);
        setMainFormOpen(true);
        return null; // signal CaptchaModal to close silently
      }
      // Otherwise it's a captcha error — re-throw
      throw err;
    }
  };

  // Open captcha modal for reply
  const requestReplyCaptcha = (parentId: number, replyText: string, replyFile: File | null = null) => {
    setPendingReply({ parentId, text: replyText, file: replyFile });
    setReplyCaptchaOpen(true);
  };

  // Submit reply (called after captcha confirmed)
  const submitReply = async (token: string, captchaText: string): Promise<Comment | null> => {
    if (!pendingReply) throw new Error('Нет данных для ответа.');
    const formData = new FormData();
    formData.append('discussion', String(discussionId));
    formData.append('text', pendingReply.text);
    formData.append('parent', String(pendingReply.parentId));
    formData.append('captcha_token', token);
    formData.append('captcha_text', captchaText);
    if (pendingReply.file) formData.append('file', pendingReply.file);

    try {
      const newReply = await api.createComment(formData);
      setPendingReply(null);
      return newReply;
    } catch (err) {
      const errorMsg = formatError(err);
      if (errorMsg.toLowerCase().includes('текст') || 
          errorMsg.toLowerCase().includes('тег') || 
          errorMsg.toLowerCase().includes('xhtml') ||
          errorMsg.toLowerCase().includes('вложенность') ||
          errorMsg.toLowerCase().includes('закрыт') ||
          errorMsg.toLowerCase().includes('файл') ||
          errorMsg.toLowerCase().includes('размер')) {
        // Show error in reply form — keep it open with its own state
        setReplyFormOpen(pendingReply.parentId);
        setPendingReply(null);
        return null; // signal CaptchaModal to close silently
      }
      throw err;
    }
  };

  // Handle real-time comment pushed via WebSocket
  const handleIncoming = useCallback((incoming: Comment) => {
    setComments(prev => {
      const exists = prev.some(c => c.id === incoming.id);
      if (exists) {
        // Replace existing (e.g. parent comment with updated replies)
        return prev.map(c => (c.id === incoming.id ? incoming : c));
      }
      // New top-level comment -> prepend (LIFO)
      return [incoming, ...prev];
    });
  }, []);

  // Connect to discussion websocket for live updates
  useDiscussionSocket({ discussionId, onNewComment: handleIncoming });

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

          {error && <div className="form-error">{error}</div>}

          <div className="form-actions">
            <button
              className="btn btn-primary"
              onClick={openCommentCaptcha}
              disabled={submitting}
            >
              Отправить
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
              onRequestReplyCaptcha={requestReplyCaptcha}
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

      {/* Captcha modal for new comment */}
      <CaptchaModal
        open={commentCaptchaOpen}
        title="Подтверждение комментария"
        onClose={() => setCommentCaptchaOpen(false)}
        onConfirm={submitComment}
      />

      {/* Captcha modal for reply */}
      <CaptchaModal
        open={replyCaptchaOpen}
        title="Подтверждение ответа"
        onClose={() => {
          setReplyCaptchaOpen(false);
          setPendingReply(null);
        }}
        onConfirm={submitReply}
      />
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