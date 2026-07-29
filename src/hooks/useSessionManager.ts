import { useState, useEffect, useCallback } from 'react';

export interface WorkspaceSession {
  id: string;
  name: string;
  hash: string;
  createdAt: number;
}

const STORAGE_KEY = 'collab_workspace_sessions';

const DEFAULT_SESSIONS: WorkspaceSession[] = [
  { id: '1', name: 'Main Canvas', hash: '#main-workspace', createdAt: Date.now() },
  { id: '2', name: 'Design Sprint', hash: '#design-sprint', createdAt: Date.now() - 3600000 },
];

export const useSessionManager = () => {
  const [sessions, setSessions] = useState<WorkspaceSession[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_SESSIONS;
    } catch {
      return DEFAULT_SESSIONS;
    }
  });

  const [activeHash, setActiveHash] = useState<string>(() => {
    return window.location.hash || sessions[0]?.hash || '#main-workspace';
  });

  // Listen for hash changes in URL without full page reloads
  useEffect(() => {
    const handleHashChange = () => {
      const newHash = window.location.hash || '#main-workspace';
      setActiveHash(newHash);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Save sessions to local storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch (e) {
      console.warn('Failed to persist workspace sessions', e);
    }
  }, [sessions]);

  const switchSession = useCallback((hash: string) => {
    if (!hash.startsWith('#')) hash = `#${hash}`;
    window.location.hash = hash;
    setActiveHash(hash);
  }, []);

  const addSession = useCallback((name: string, hashInput?: string) => {
    const hash = hashInput
      ? (hashInput.startsWith('#') ? hashInput : `#${hashInput}`)
      : `#ws-${Math.random().toString(36).substring(2, 9)}`;

    setSessions((prev) => {
      if (prev.some((s) => s.hash === hash)) return prev;
      const newSession: WorkspaceSession = {
        id: crypto.randomUUID(),
        name,
        hash,
        createdAt: Date.now(),
      };
      return [...prev, newSession];
    });

    switchSession(hash);
  }, [switchSession]);

  const removeSession = useCallback((id: string) => {
    setSessions((prev) => {
      const filtered = prev.filter((s) => s.id !== id);
      if (filtered.length > 0 && prev.find((s) => s.id === id)?.hash === activeHash) {
        switchSession(filtered[0].hash);
      }
      return filtered;
    });
  }, [activeHash, switchSession]);

  return {
    activeHash,
    sessions,
    switchSession,
    addSession,
    removeSession,
  };
};
