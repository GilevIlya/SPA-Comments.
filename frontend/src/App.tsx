import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import DiscussionList from './components/DiscussionList';
import CommentList from './components/CommentList';
import AuthModal from './components/AuthModal';
import { api, clearTokens, isAuthenticated, AuthUser } from './api';
import { Discussion } from './types';

const t = {
  ru: {
    back: '← Назад к обсуждениям',
    filter: 'Сортировать:',
    filterDate: 'По дате',
    filterComments: 'По комментариям',
    comments: 'Комментарии',
    commentStats: 'комментариев',
    discussion: 'Обсуждение',
    login: 'Вход',
    register: 'Регистрация',
    logout: 'Выход',
    title: 'Обсуждения',
    newDiscussion: '+ Новое обсуждение',
    createTitle: 'Новое обсуждение',
    create: 'Создать',
    creating: 'Создание...',
    titleRequired: 'Название обязательно.',
    descPlaceholder: 'Описание (необязательно)',
  },
  en: {
    back: '← Back to discussions',
    filter: 'Sort:',
    filterDate: 'By date',
    filterComments: 'By comments',
    comments: 'Comments',
    commentStats: 'comments',
    discussion: 'Discussion',
    login: 'Login',
    register: 'Register',
    logout: 'Logout',
    title: 'Discussions',
    newDiscussion: '+ New discussion',
    createTitle: 'New discussion',
    create: 'Create',
    creating: 'Creating...',
    titleRequired: 'Title is required.',
    descPlaceholder: 'Description (optional)',
  },
};

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

function App() {
  const [currentPage, setCurrentPage] = useState<'list' | 'thread'>('list');
  const [currentDiscussion, setCurrentDiscussion] = useState<Discussion | null>(null);
  const [lang, setLang] = useState<'ru' | 'en'>(() => {
    return (localStorage.getItem('lang') as 'ru' | 'en') || 'ru';
  });
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
  });
  const [sortBy, setSortBy] = useState<'date' | 'comments'>('date');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  const i18n = t[lang];

  const [createOpen, setCreateOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('lang', lang);
  }, [lang]);

  useEffect(() => {
    if (isAuthenticated()) {
      api.me()
        .then(setUser)
        .catch(() => clearTokens());
    }
  }, []);

  const openAuth = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setAuthOpen(true);
  };

  const handleLogout = () => {
    clearTokens();
    setUser(null);
  };

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

  const handleCreateDiscussion = async () => {
    if (!createTitle.trim()) {
      setCreateError(i18n.titleRequired);
      return;
    }
    setCreateError(null);
    setCreateLoading(true);
    try {
      await api.createDiscussion({
        title: createTitle.trim(),
        description: createDescription.trim(),
      });
      setCreateOpen(false);
      setCreateTitle('');
      setCreateDescription('');
      setRefreshKey(k => k + 1);
    } catch (err) {
      setCreateError(formatError(err));
    } finally {
      setCreateLoading(false);
    }
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
          {user ? (
            <div className="user-info">
              <span
                className="avatar user-avatar"
                style={{ background: getAvatarColor(user.username) }}
              >
                {user.username.charAt(0).toUpperCase()}
              </span>
              <span className="user-badge">{user.username}</span>
              <span className="btn btn-outline" onClick={handleLogout}>{i18n.logout}</span>
            </div>
          ) : (
            <>
              <span className="btn btn-outline" onClick={() => openAuth('login')}>{i18n.login}</span>
              <span className="btn btn-primary" onClick={() => openAuth('register')}>{i18n.register}</span>
            </>
          )}
        </div>
      </div>
      {authOpen && (
        <AuthModal
          mode={authMode}
          onClose={() => setAuthOpen(false)}
          onSwitch={(m) => setAuthMode(m)}
          onSuccess={(u) => {
            setUser(u);
            setAuthOpen(false);
          }}
        />
      )}
    </>
  );

  const createModal = createOpen && (
    <div className="modal-overlay" onClick={() => setCreateOpen(false)}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={() => setCreateOpen(false)}>×</button>
        <h2 className="modal-title">{i18n.createTitle}</h2>
        <div className="auth-form">
          <input
            className="auth-input"
            placeholder="Название"
            value={createTitle}
            onChange={e => setCreateTitle(e.target.value)}
            maxLength={80}
            required
          />
          <textarea
            className="auth-input"
            placeholder={i18n.descPlaceholder}
            value={createDescription}
            onChange={e => setCreateDescription(e.target.value)}
            rows={3}
            style={{ resize: 'vertical' }}
          />
          {createError && <div className="auth-error">{createError}</div>}
          <button
            className="btn btn-primary auth-submit"
            onClick={handleCreateDiscussion}
            disabled={createLoading}
          >
            {createLoading ? i18n.creating : i18n.create}
          </button>
        </div>
      </div>
    </div>
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
              {currentDiscussion.description && (
                <div className="discussion-description">{currentDiscussion.description}</div>
              )}
              <div className="discussion-meta">
                <span className="author">
                  <span
                    className="avatar"
                    style={{ background: getAvatarColor(currentDiscussion.author_name) }}
                  >
                    {currentDiscussion.author_name.charAt(0).toUpperCase()}
                  </span>
                  {currentDiscussion.author_name}
                </span>
                <span className="date">{formatDate(currentDiscussion.created_at)}</span>
              </div>
            </div>
            <div className="divider-wrapper">
              <div className="divider-line"></div>
              <span className="divider-label">{i18n.discussion}</span>
              <div className="divider-line"></div>
            </div>
            <div className="comments-title">{i18n.comments}</div>
            <CommentList discussionId={currentDiscussion.id} />
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
          {isAuthenticated() && (
            <button className="btn btn-primary create-disc-btn" onClick={() => setCreateOpen(true)}>
              {i18n.newDiscussion}
            </button>
          )}
        </div>
        <div className="discussions-list">
          <DiscussionList sortBy={sortBy} onSelect={handleSelectDiscussion} refreshKey={refreshKey} />
        </div>
      </div>
      {createModal}
    </>
  );
}

export default App;