import React, { useState } from 'react';
import { Comment } from '../types';

interface CommentListProps {
  comments: Comment[];
}

const CommentItem: React.FC<{
  comment: Comment;
  onLike: (id: string | number) => void;
  onReply: (parentId: string | number, text: string) => void;
  likedMap: Record<string, boolean>;
  replyMap: Record<string, Comment[]>;
}> = ({ comment, onLike, onReply, likedMap, replyMap }) => {
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState('');

  const likeCount = (comment.likes ?? 0) + (likedMap[String(comment.id)] ? 1 : 0);
  const replies = [...(comment.replies ?? []), ...(replyMap[String(comment.id)] ?? [])];

  const submitReply = () => {
    const text = replyText.trim();
    if (!text) return;
    onReply(comment.id, text);
    setReplyText('');
    setReplyOpen(false);
  };

  return (
    <div className="comment">
      <div className="comment-author">
        <span className="avatar">{comment.authorInitial}</span>
        {comment.author}
      </div>
      <div
        className="comment-text"
        dangerouslySetInnerHTML={{ __html: comment.text }}
      />

      <div className="comment-actions">
        <button
          className={`action-btn${likedMap[String(comment.id)] ? ' liked' : ''}`}
          onClick={() => onLike(comment.id)}
        >
          👍 <span>{likeCount}</span>
        </button>
        <button className="action-btn" onClick={() => setReplyOpen(o => !o)}>
          💬 Ответить
        </button>
      </div>

      {replyOpen && (
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
            <button className="btn btn-outline reply-cancel" onClick={() => setReplyOpen(false)}>
              Отмена
            </button>
          </div>
        </div>
      )}

      {replies.length > 0 && (
        <div className="replies">
          {replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              onLike={onLike}
              onReply={onReply}
              likedMap={likedMap}
              replyMap={replyMap}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const CommentList: React.FC<CommentListProps> = ({ comments }) => {
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [replyMap, setReplyMap] = useState<Record<string, Comment[]>>({});

  const handleLike = (id: string | number) => {
    const key = String(id);
    setLikedMap((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleReply = (parentId: string | number, text: string) => {
    const key = String(parentId);
    const newReply: Comment = {
      id: `${key}-r${Date.now()}`,
      author: 'Вы',
      authorInitial: 'В',
      text: text.replace(/</g, '&lt;'),
    };
    setReplyMap((prev) => ({ ...prev, [key]: [...(prev[key] ?? []), newReply] }));
  };

  return (
    <>
      {comments.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          onLike={handleLike}
          onReply={handleReply}
          likedMap={likedMap}
          replyMap={replyMap}
        />
      ))}
    </>
  );
};

export default CommentList;