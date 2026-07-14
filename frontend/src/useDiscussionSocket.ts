import { useEffect, useRef, useCallback } from 'react';
import { Comment } from './types';

interface UseDiscussionSocketOptions {
  discussionId: number;
  onNewComment: (comment: Comment) => void;
  enabled?: boolean;
}

function getWsBase(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}`;
}

export function useDiscussionSocket({
  discussionId,
  onNewComment,
  enabled = true,
}: UseDiscussionSocketOptions) {
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<number | null>(null);
  const onNewCommentRef = useRef(onNewComment);
  const closedByUnmount = useRef(false);

  // Keep latest callback without re-opening the socket
  useEffect(() => {
    onNewCommentRef.current = onNewComment;
  }, [onNewComment]);

  const connect = useCallback(() => {
    if (!enabled) return;
    const url = `${getWsBase()}/ws/discussions/${discussionId}/`;
    const ws = new WebSocket(url);
    socketRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'new_comment' && payload.comment) {
          onNewCommentRef.current(payload.comment as Comment);
        }
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      socketRef.current = null;
      if (!closedByUnmount.current && enabled) {
        // simple reconnect with backoff
        reconnectTimer.current = window.setTimeout(connect, 2000);
      }
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [discussionId, enabled]);

  useEffect(() => {
    closedByUnmount.current = false;
    connect();

    return () => {
      closedByUnmount.current = true;
      if (reconnectTimer.current) {
        window.clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [connect]);
}