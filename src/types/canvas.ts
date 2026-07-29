export interface Point {
  x: number;
  y: number;
  pressure: number;
}

export interface StrokeData {
  id: string;
  points: Point[];
  color: string;
  width: number;
}

export type WorkerMessage = 
  | { type: 'INIT'; canvas: OffscreenCanvas; pixelRatio: number; width: number; height: number }
  | { type: 'DRAW_STROKE'; stroke: StrokeData }
  | { type: 'CLEAR' }
  | { type: 'RESIZE'; width: number; height: number; pixelRatio: number };
