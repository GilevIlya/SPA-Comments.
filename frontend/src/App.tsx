import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import DiscussionList from './components/DiscussionList';
import CommentList from './components/CommentList';
import { Discussion, Comment } from './types';

const t = {
  ru: {
    back: '← Назад к обсуждениям',
    filter: 'Сортировать:',
    filterDate: 'По дате',
    filterComments: 'По комментариям',
    loadMore: 'Показать ещё',
    loadMoreThread: 'Показать ещё комментарии',
    comments: 'Комментарии',
    commentStats: 'комментариев',
    discussion: 'Обсуждение',
    login: 'Вход',
    register: 'Регистрация',
    title: 'Обсуждения',
  },
  en: {
    back: '← Back to discussions',
    filter: 'Sort:',
    filterDate: 'By date',
    filterComments: 'By comments',
    loadMore: 'Show more',
    loadMoreThread: 'Show more comments',
    comments: 'Comments',
    commentStats: 'comments',
    discussion: 'Discussion',
    login: 'Login',
    register: 'Register',
    title: 'Discussions',
  },
};

const mockComments: Comment[] = [
  {
    id: 'c1',
    author: 'Алексей Иванов',
    authorInitial: 'А',
    text: 'Коллеги, после обновления API заметил проблему с авторизацией. Приходит 401 даже с валидным токеном. Кто-то сталкивался?',
    replies: [
      {
        id: 'r1', author: 'Мария Петрова', authorInitial: 'М',
        text: '<span class="mention">@Алексей Иванов</span>, да, у нас тоже такая проблема. Оказалось, что изменили формат токена. Надо обновить интерцептор на фронте.',
      },
      {
        id: 'r2', author: 'Дмитрий Смирнов', authorInitial: 'Д',
        text: '<span class="mention">@Алексей Иванов</span> <span class="mention">@Мария Петрова</span>, ребята, я уже пофиксил. Ошибка была в том, что бэкенд начал возвращать токен в другом поле. Обновил документацию.',
      },
    ],
  },
  {
    id: 'c2',
    author: 'Олег Кузнецов',
    authorInitial: 'О',
    text: 'Отличная работа, Дмитрий! Закрываем вопрос. Кто следующий баг ловит? 😄',
    replies: [
      {
        id: 'r3', author: 'Елена Ветрова', authorInitial: 'Е',
        text: '<span class="mention">@Олег Кузнецов</span>, у меня есть вопрос по новому эндпоинту /users. В доке написано одно, а по факту приходит другой объект.',
      },
      {
        id: 'r4', author: 'Алексей Иванов', authorInitial: 'А',
        text: '<span class="mention">@Елена Ветрова</span>, да, я видел. Там добавили поле "role". Обнови схему, всё должно работать.',
      },
      {
        id: 'r5', author: 'Дмитрий Смирнов', authorInitial: 'Д',
        text: '<span class="mention">@Елена Ветрова</span>, подтверждаю. Там ещё добавили фильтрацию по ролям. Всё описано в новой версии документации.',
      },
    ],
  },
  {
    id: 'c3',
    author: 'Сергей Козлов',
    authorInitial: 'С',
    text: 'А когда планируете выкатывать фикс в прод? У нас завтра релиз, очень нужно.',
    replies: [
      {
        id: 'r6', author: 'Дмитрий Смирнов', authorInitial: 'Д',
        text: '<span class="mention">@Сергей Козлов</span>, уже запустил тесты. Если всё ок, сегодня к вечеру выкатим.',
      },
    ],
  },
];

function App() {
  const [currentPage, setCurrentPage] = useState<'list' | 'thread'>('list');
  const [currentDiscussion, setCurrentDiscussion] = useState<Discussion | null>(null);
  const [lang, setLang] = useState<'ru' | 'en'>('ru');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [sortBy, setSortBy] = useState<'date' | 'comments'>('date');

  const i18n = t[lang];

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  }, []);

  const handleSelectDiscussion = (disc: Discussion) => {
    setCurrentDiscussion(disc);
    setCurrentPage('thread');
    window.history.pushState({ discussionId: disc.id }, disc.title, `?discussion=${disc.id}`);
  };

  const handleBack = () => {
    setCurrentDiscussion(null);
    setCurrentPage('list');
    window.history.pushState(null, t.ru.title, '/');
  };

  const header = (
    <>
      <div className="header-right-corner">
        <button className="theme-btn" onClick={toggleTheme} title={theme === 'light' ? 'Тёмная тема' : 'Светлая тема'}>
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
        <div className="lang-switch">
          <span
            className={`lang-btn ${lang === 'ru' ? 'active' : ''}`}
            onClick={() => setLang('ru')}
          >
            Рус
          </span>
          <span
            className={`lang-btn ${lang === 'en' ? 'active' : ''}`}
            onClick={() => setLang('en')}
          >
            Eng
          </span>
        </div>
        <div className="auth-buttons">
          <span className="btn btn-outline">{i18n.login}</span>
          <span className="btn btn-primary">{i18n.register}</span>
        </div>
      </div>
    </>
  );

  if (currentPage === 'thread' && currentDiscussion) {
    return (
      <>
        {header}

        <div className="container">
          <button className="back-link" onClick={handleBack}>
            {i18n.back}
          </button>

          <div className="main-wrapper">
            <div className="discussion-header">
              <div className="discussion-title">{currentDiscussion.title}</div>
              <div className="discussion-meta">
                <span className="author">
                  <span className="avatar">{currentDiscussion.authorInitial}</span>
                  {currentDiscussion.author}
                </span>
                <span className="stats">💬 {currentDiscussion.commentCount} {i18n.commentStats}</span>
              </div>
            </div>

            <div className="divider-wrapper">
              <div className="divider-line"></div>
              <span className="divider-label">{i18n.discussion}</span>
              <div className="divider-line"></div>
            </div>

            <div className="comments-title">{i18n.comments}</div>
            <CommentList comments={mockComments} />

            <div className="footer">
              <span className="btn-load-more">{i18n.loadMoreThread}</span>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {header}

      <div className="container">
        <h1 className="page-title">{i18n.title}</h1>

        <div className="filter-bar">
          <span className="filter-label">{i18n.filter}</span>
          <div className="filter-buttons">
            <button
              className={`filter-btn ${sortBy === 'date' ? 'active' : ''}`}
              onClick={() => setSortBy('date')}
            >
              {i18n.filterDate}
            </button>
            <button
              className={`filter-btn ${sortBy === 'comments' ? 'active' : ''}`}
              onClick={() => setSortBy('comments')}
            >
              {i18n.filterComments}
            </button>
          </div>
        </div>

        <div className="discussions-list">
          <DiscussionList sortBy={sortBy} onSelect={handleSelectDiscussion} />
        </div>

        <div className="footer" style={{ borderTop: 'none', marginTop: 0, paddingTop: 0 }}>
          <span className="btn-load-more">{i18n.loadMore}</span>
        </div>
      </div>
    </>
  );
}

export default App;