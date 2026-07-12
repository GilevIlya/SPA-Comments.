import React, { useState, useEffect } from 'react';
import { Discussion } from '../types';
import { api } from '../api';

interface DiscussionListProps {
  sortBy: 'date' | 'comments';
  onSelect: (discussion: Discussion) => void;
  refreshKey?: number;
}

const DiscussionList: React.FC<DiscussionListProps> = ({ sortBy, onSelect, refreshKey }) => {
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [sortBy, refreshKey]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const sortMap: Record<string, string> = {
      date: '-created_at',
      comments: '-comment_count',
    };

    api.getDiscussions({ sort: sortMap[sortBy] || '-created_at', page })
      .then((data) => {
        if (!cancelled) {
          // Исправление: Бэкенд шлет массив напрямую. Защищаем от пустых ответов.
          const dataArray = Array.isArray(data) ? data : [];
          setDiscussions(dataArray);
          
          // Вычисляем общее количество на основе длины пришедшего массива
          setTotalCount(dataArray.length);
        }
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setDiscussions([]);
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [sortBy, page, refreshKey]);

  // Вычисляем количество страниц. Раз пагинации на бэке нет, будет 1 страница.
  const totalPages = Math.ceil(totalCount / 25) || 1;

  function getAvatarColor(name: string): string {
    let hash = 0;
    const safeName = name || 'User';
    for (let i = 0; i < safeName.length; i++) {
      hash = safeName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 65%, 55%)`;
  }

  function formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('ru-RU', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  }

  if (loading) {
    return <div className="loading">Загрузка...</div>;
  }

  return (
    <>
      {/* Исправление: Безопасный обход массива через знак вопроса */}
      {discussions?.map((disc) => (
        <div
          key={disc.id}
          className="discussion-card"
          onClick={() => onSelect(disc)}
          style={{ cursor: 'pointer' }}
        >
          <div className="card-header">
            <span className="card-title">{disc.title}</span>
          </div>
          {disc.description && (
            <div className="card-description">{disc.description}</div>
          )}
          <div className="card-meta">
            <span className="author">
              <span
                className="author-avatar"
                style={{ background: getAvatarColor(disc.author_name) }}
              >
                {(disc.author_name || 'U').charAt(0).toUpperCase()}
              </span>
              {disc.author_name || 'Неизвестный'}
            </span>
            <span className="date">{formatDate(disc.created_at)}</span>
            <span className="card-stats">
              {disc.comment_count || 0} комментариев
            </span>
          </div>
        </div>
      ))}
      
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
    </>
  );
};

export default DiscussionList;
