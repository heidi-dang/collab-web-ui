import { highlightTerminalOutput } from './ansiHighlighter';

export interface TerminalWritable {
  write(data: string | Uint8Array, callback?: () => void): void;
}

export class TerminalStreamManager {
  private term: TerminalWritable;
  private buffer: string = '';
  private frameId: number | null = null;
  
  // Adaptive Flush Thresholding: default 64KB threshold to prevent "long frame" regex stalls
  private maxBufferSize: number = 64 * 1024;
  private lastFlushTime: number = 0;

  constructor(terminalInstance: TerminalWritable) {
    this.term = terminalInstance;
  }

  /**
   * Public API: Push incoming socket PTY stream data into the buffer.
   * Leverages Adaptive Flush Thresholding to prevent frame drops during massive bursts.
   */
  public push(data: string): void {
    if (!data) return;
    this.buffer += data;

    // 1. Adaptive Flush: If buffer exceeds memory threshold, force immediate synchronous flush
    if (this.buffer.length >= this.maxBufferSize) {
      this.flush();
    } else if (this.frameId === null) {
      // 2. Otherwise defer rendering to the next browser animation frame (~16ms)
      this.frameId = requestAnimationFrame(() => this.flush());
    }
  }

  /**
   * Flushes accumulated stream buffer to xterm in a single frame.
   * Measures execution time to dynamically adjust flush threshold if system is under heavy load.
   */
  public flush(): void {
    // Prevent duplicate frame callbacks if triggered early by maxBufferSize
    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }

    if (this.buffer.length > 0) {
      const startTime = performance.now();
      const chunkToProcess = this.buffer;
      this.buffer = '';

      // Perform pre-compiled regex highlighting once on aggregated chunk
      const highlighted = highlightTerminalOutput(chunkToProcess);
      this.term.write(highlighted);

      const duration = performance.now() - startTime;
      this.lastFlushTime = duration;

      // Dynamic Threshold Adjustment:
      // If processing took longer than 12ms (approaching frame budget), reduce buffer threshold to keep UI responsive
      if (duration > 12 && this.maxBufferSize > 16 * 1024) {
        this.maxBufferSize = Math.max(16 * 1024, Math.floor(this.maxBufferSize * 0.75));
      } else if (duration < 4 && this.maxBufferSize < 128 * 1024) {
        // If system handles current load effortlessly, gradually restore threshold for higher throughput
        this.maxBufferSize = Math.min(128 * 1024, Math.floor(this.maxBufferSize * 1.25));
      }
    }
  }

  public dispose(): void {
    this.flush();
    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
  }
}

