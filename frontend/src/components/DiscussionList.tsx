import React from 'react';
import { Discussion } from '../types';

interface DiscussionListProps {
  sortBy: 'date' | 'comments';
  onSelect: (discussion: Discussion) => void;
}

const discussions: Discussion[] = [
  { id: 'd1', title: 'Обновление API — баги и фиксы', author: 'Алексей Иванов', authorInitial: 'А', date: '21.05.22', commentCount: 8 },
  { id: 'd2', title: 'Фронтенд: рефакторинг компонентов', author: 'Мария Петрова', authorInitial: 'М', date: '20.05.22', commentCount: 3 },
  { id: 'd3', title: 'Вопрос по делу по продажам', author: 'Дмитрий Смирнов', authorInitial: 'Д', date: '19.05.22', commentCount: 5 },
  { id: 'd4', title: 'Обсуждение #4f2a91 (внутреннее)', author: 'Админ', authorInitial: 'А', date: '22.05.22', commentCount: 12 },
  { id: 'd5', title: 'Настройка CI/CD — решено', author: 'Олег Кузнецов', authorInitial: 'О', date: '18.05.22', commentCount: 2 },
];

const DiscussionList: React.FC<DiscussionListProps> = ({ sortBy, onSelect }) => {
  const sorted = [...discussions].sort((a, b) => {
    if (sortBy === 'comments') return b.commentCount - a.commentCount;
    const parseDate = (s: string) => {
      const [d, m, y] = s.split('.');
      return new Date(Number('20' + y), Number(m) - 1, Number(d)).getTime();
    };
    return parseDate(b.date) - parseDate(a.date);
  });

  return (
    <>
      {sorted.map((disc) => (
        <div
          key={disc.id}
          className="discussion-card"
          onClick={() => onSelect(disc)}
          style={{ cursor: 'pointer' }}
        >
          <div className="card-header">
            <span className="card-title">{disc.title}</span>
          </div>
          <div className="card-meta">
            <span className="author">
              <span className="author-avatar">{disc.authorInitial}</span>
              {disc.author}
            </span>
            <span className="date">{disc.date}</span>
            <span className="card-stats">
              {disc.commentCount} комментариев
            </span>
          </div>
        </div>
      ))}
    </>
  );
};

export default DiscussionList;