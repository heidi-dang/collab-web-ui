import { highlightTerminalOutput } from './ansiHighlighter';

export interface TerminalWritable {
  write(data: string | Uint8Array, callback?: () => void): void;
}

const MAX_BUFFER_FLUSH_THRESHOLD = 100 * 1024; // 100KB threshold for instant flush during massive bursts

export class TerminalStreamManager {
  private term: TerminalWritable;
  private buffer: string = '';
  private frameId: number | null = null;

  constructor(terminalInstance: TerminalWritable) {
    this.term = terminalInstance;
  }

  /**
   * Receive raw socket PTY data into the buffer and schedule animation frame update.
   */
  public push(data: string): void {
    if (!data) return;
    this.buffer += data;

    // High backpressure guard: If buffer exceeds 100KB, flush immediately to prevent latency spikes
    if (this.buffer.length >= MAX_BUFFER_FLUSH_THRESHOLD) {
      this.flush();
      return;
    }

    // Schedule batch render on next browser animation frame
    if (this.frameId === null) {
      this.frameId = requestAnimationFrame(() => this.flush());
    }
  }

  /**
   * Flushes the accumulated buffered output to xterm in a single frame update.
   */
  public flush(): void {
    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }

    if (this.buffer.length > 0) {
      const chunkToProcess = this.buffer;
      this.buffer = '';

      // Process highlighting once for the entire aggregated chunk
      const highlighted = highlightTerminalOutput(chunkToProcess);

      // Single batched write to terminal
      this.term.write(highlighted);
    }
  }

  /**
   * Cleanup timer and flush any remaining buffer before unmount.
   */
  public dispose(): void {
    this.flush();
    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
  }
}
