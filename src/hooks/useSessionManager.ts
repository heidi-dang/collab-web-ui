import { useState, useEffect, useCallback } from 'react';
import { parseCollabLink, formatCollabLink, DEFAULT_RELAY_URL } from '../lib/link';

export interface WorkspaceSession {
  id: string;
  name: string;
  hash: string;
  createdAt: number;
}

const STORAGE_KEY = 'collab_workspace_sessions';

function createRoomLink(roomIdPrefix: string): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return formatCollabLink(DEFAULT_RELAY_URL, `${roomIdPrefix}-workspace`, bytes);
}

const DEFAULT_SESSIONS: WorkspaceSession[] = [
  { id: '1', name: 'Main Canvas', hash: `#${createRoomLink('main-canvas')}`, createdAt: Date.now() },
  { id: '2', name: 'Design Sprint', hash: `#${createRoomLink('design-sprint')}`, createdAt: Date.now() - 3600000 },
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
    return window.location.hash || sessions[0]?.hash || `#${DEFAULT_SESSIONS[0].hash}`;
  });

  // Listen for hash changes in URL without full page reloads
  useEffect(() => {
    const handleHashChange = () => {
      const newHash = window.location.hash;
      if (newHash) {
        setActiveHash(newHash);
      }
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
    const formattedHash = hash.startsWith('#') ? hash : `#${hash}`;
    window.location.hash = formattedHash;
    setActiveHash(formattedHash);
  }, []);

  const addSession = useCallback((name: string, hashInput?: string) => {
    let hash: string;
    if (hashInput && hashInput.trim()) {
      const trimmed = hashInput.trim().replace(/^#/, '');
      const testParse = parseCollabLink(trimmed);
      if (!('error' in testParse)) {
        hash = `#${trimmed}`;
      } else {
        const cleanId = trimmed.replaceAll(/[^A-Za-z0-9_-]/g, '-').slice(0, 32);
        const roomId = cleanId.length >= 10 ? cleanId : `${cleanId}-workspace`;
        const bytes = new Uint8Array(32);
        crypto.getRandomValues(bytes);
        hash = `#${formatCollabLink(DEFAULT_RELAY_URL, roomId, bytes)}`;
      }
    } else {
      const prefix = name.toLowerCase().replaceAll(/[^a-z0-9]/g, '-').slice(0, 16) || 'vps';
      hash = `#${createRoomLink(prefix)}`;
    }

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

