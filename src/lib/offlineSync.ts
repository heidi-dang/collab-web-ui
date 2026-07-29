import { StrokeData } from '../types/canvas';

export type CanvasStroke = StrokeData;

const STORAGE_KEY = 'collab_offline_strokes';

export const offlineSync = {
  async getQueuedStrokes(): Promise<CanvasStroke[]> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  async queueStroke(stroke: CanvasStroke): Promise<void> {
    try {
      const current = await this.getQueuedStrokes();
      current.push(stroke);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    } catch (e) {
      console.warn('Failed to queue offline stroke', e);
    }
  },

  async syncQueuedStrokes(syncFn: (strokes: CanvasStroke[]) => Promise<void>): Promise<void> {
    try {
      const queued = await this.getQueuedStrokes();
      if (queued.length === 0) return;
      await syncFn(queued);
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn('Offline sync failed, keeping queued strokes', e);
    }
  },

  clearQueue(): void {
    localStorage.removeItem(STORAGE_KEY);
  }
};
