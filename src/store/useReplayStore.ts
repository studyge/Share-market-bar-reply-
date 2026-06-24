import { create } from 'zustand';

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type DrawingTool = 'cursor' | 'trendline' | 'horizontal' | 'vertical' | 'rectangle' | 'arrow' | 'text' | 'long' | 'short';

export interface Point {
  time: number;
  price: number;
}

export interface Drawing {
  id: string;
  type: DrawingTool | string;
  points: Point[];
  meta?: any;
}

interface ReplayState {
  symbol: string | null;
  allCandles: Candle[];
  currentIndex: number;
  isPlaying: boolean;
  speed: number; // ms per candle
  
  // Drawing Tools
  activeTool: DrawingTool;
  drawings: Drawing[];
  
  // Actions
  setSymbol: (symbol: string) => void;
  loadCandles: (candles: Candle[]) => void;
  play: () => void;
  pause: () => void;
  nextCandle: () => void;
  prevCandle: () => void;
  setSpeed: (speed: number) => void;
  resetReplay: () => void;
  jumpToTime: (time: number) => void;
  
  // Drawing Actions
  setActiveTool: (tool: DrawingTool) => void;
  setDrawings: (drawings: Drawing[]) => void;
  addDrawing: (drawing: Drawing) => void;
  updateDrawing: (id: string, drawing: Partial<Drawing>) => void;
  removeDrawing: (id: string) => void;
  clearDrawings: () => void;
}

export const useReplayStore = create<ReplayState>((set) => ({
  symbol: null,
  allCandles: [],
  currentIndex: 0,
  isPlaying: false,
  speed: 1000,
  activeTool: 'cursor',
  drawings: [],

  setSymbol: (symbol) => set({ symbol }),
  
  loadCandles: (candles) => set({ 
    allCandles: candles, 
    currentIndex: Math.max(0, candles.length - 100) // Start showing last 100 candles by default or something
  }),

  play: () => set({ isPlaying: true }),
  
  pause: () => set({ isPlaying: false }),
  
  nextCandle: () => set((state) => ({
    currentIndex: Math.min(state.currentIndex + 1, state.allCandles.length)
  })),
  
  prevCandle: () => set((state) => ({
    currentIndex: Math.max(state.currentIndex - 1, 0)
  })),

  setSpeed: (speed) => set({ speed }),

  resetReplay: () => set({ isPlaying: false, currentIndex: 0 }),
  
  jumpToTime: (time) => set((state) => {
    const index = state.allCandles.findIndex(c => c.time >= time);
    return { currentIndex: index !== -1 ? index : state.currentIndex };
  }),
  
  setActiveTool: (tool) => set({ activeTool: tool }),
  
  setDrawings: (drawings) => set({ drawings }),

  addDrawing: (drawing) => set((state) => ({ 
    drawings: [...state.drawings, drawing],
    activeTool: 'cursor' // reset tool after drawing
  })),
  
  updateDrawing: (id, drawingUpdates) => set((state) => ({
    drawings: state.drawings.map(d => d.id === id ? { ...d, ...drawingUpdates } : d)
  })),
  
  removeDrawing: (id) => set((state) => ({
    drawings: state.drawings.filter(d => d.id !== id)
  })),
  
  clearDrawings: () => set({ drawings: [] }),
}));
