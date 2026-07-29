// src/workers/GraphicsWorker.ts
// Unified Graphics Worker for offscreen canvas rendering & metrics processing

let ctx: OffscreenCanvasRenderingContext2D | ImageBitmapRenderingContext | null = null;
let animationFrameId: number | null = null;

self.onmessage = (e: MessageEvent) => {
  const { type, payload } = e.data;

  if (type === 'PING') {
    self.postMessage({ type: 'PONG' });
    return;
  }

  if (type === 'INIT_CANVAS') {
    const { canvas } = payload;
    if (canvas) {
      ctx = canvas.getContext('2d', { desynchronized: true });
    }
  }

  if (type === 'RENDER_FRAME') {
    if (ctx && ctx instanceof OffscreenCanvasRenderingContext2D) {
      const { width, height, elements } = payload;
      ctx.clearRect(0, 0, width, height);
      if (Array.isArray(elements)) {
        for (const el of elements) {
          if (el.type === 'rect') {
            ctx.fillStyle = el.color || '#6366f1';
            ctx.fillRect(el.x, el.y, el.w, el.h);
          }
        }
      }
    }
  }

  if (type === 'STOP' || type === 'TERMINATE') {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    ctx = null;
    if (type === 'TERMINATE') {
      self.close();
    }
  }
};

export {};
