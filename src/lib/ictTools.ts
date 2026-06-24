import { Candle, Drawing } from '../store/useReplayStore';

// Fair Value Gap (FVG) Detection
export function detectFVGs(candles: Candle[]): Drawing[] {
  const fvgs: Drawing[] = [];
  if (candles.length < 3) return fvgs;

  // We only want to look at a recent window to avoid cluttering the chart with thousands of old FVGs
  // Let's analyze the last 100 candles of the provided slice
  const startIndex = Math.max(0, candles.length - 100);

  for (let i = startIndex + 2; i < candles.length; i++) {
    const c1 = candles[i - 2];
    const c2 = candles[i - 1]; // the large candle
    const c3 = candles[i];

    // Bullish FVG: c1.high < c3.low
    if (c1.high < c3.low && c2.close > c2.open) {
      fvgs.push({
        id: `fvg-bull-${c1.time}`,
        type: 'horizontal', // we'll use a special rect for rendering
        points: [
          { time: c1.time, price: c1.high },
          { time: c3.time, price: c3.low }
        ],
        meta: { type: 'fvg', direction: 'bullish' }
      });
    }

    // Bearish FVG: c1.low > c3.high
    if (c1.low > c3.high && c2.close < c2.open) {
      fvgs.push({
        id: `fvg-bear-${c1.time}`,
        type: 'horizontal',
        points: [
          { time: c1.time, price: c1.low },
          { time: c3.time, price: c3.high }
        ],
        meta: { type: 'fvg', direction: 'bearish' }
      });
    }
  }

  return fvgs;
}

// Order Block (OB) Detection
export function detectOrderBlocks(candles: Candle[]): Drawing[] {
  const obs: Drawing[] = [];
  if (candles.length < 5) return obs;

  const startIndex = Math.max(0, candles.length - 100);

  for (let i = startIndex + 4; i < candles.length; i++) {
    const c = candles[i];
    // Very simple OB algorithm: A strong impulsive move that follows an opposite close.
    // Bullish OB: last bearish candle before a sequence of strong bullish candles
    if (candles[i-3].close < candles[i-3].open && 
        candles[i-2].close > candles[i-2].open &&
        candles[i-1].close > candles[i-1].open &&
        candles[i].close > candles[i].open) {
      
      const obCandle = candles[i-3];
      obs.push({
        id: `ob-bull-${obCandle.time}`,
        type: 'horizontal',
        points: [
          { time: obCandle.time, price: obCandle.high },
          { time: obCandle.time, price: obCandle.low }
        ],
        meta: { type: 'ob', direction: 'bullish' }
      });
    }
    
    // Bearish OB: last bullish candle before strong bearish move
    if (candles[i-3].close > candles[i-3].open && 
        candles[i-2].close < candles[i-2].open &&
        candles[i-1].close < candles[i-1].open &&
        candles[i].close < candles[i].open) {
      
      const obCandle = candles[i-3];
      obs.push({
        id: `ob-bear-${obCandle.time}`,
        type: 'horizontal',
        points: [
          { time: obCandle.time, price: obCandle.high },
          { time: obCandle.time, price: obCandle.low }
        ],
        meta: { type: 'ob', direction: 'bearish' }
      });
    }
  }

  return obs;
}

// Previous Daily High/Low (PDH/PDL)
export function detectSessionLevels(candles: Candle[]): Drawing[] {
  // If we assume timeframe is < 1D, we can find yesterday's high and low.
  // For simplicity, we just find the highest and lowest in the last 100 candles.
  const levels: Drawing[] = [];
  if (candles.length < 10) return levels;
  
  const startIndex = Math.max(0, candles.length - 100);
  let highest = -Infinity;
  let lowest = Infinity;
  let highTime = 0;
  let lowTime = 0;
  
  for (let i = startIndex; i < candles.length - 10; i++) { // offset by 10 to simulate 'previous' day context
    if (candles[i].high > highest) {
      highest = candles[i].high;
      highTime = candles[i].time;
    }
    if (candles[i].low < lowest) {
      lowest = candles[i].low;
      lowTime = candles[i].time;
    }
  }
  
  if (highest !== -Infinity) {
    levels.push({
      id: `pdh-${highTime}`,
      type: 'horizontal',
      points: [{ time: highTime, price: highest }],
      meta: { type: 'pdh', direction: 'level' }
    });
  }
  
  if (lowest !== Infinity) {
    levels.push({
      id: `pdl-${lowTime}`,
      type: 'horizontal',
      points: [{ time: lowTime, price: lowest }],
      meta: { type: 'pdl', direction: 'level' }
    });
  }
  
  return levels;
}

// Break of Structure (BOS) / Change of Character (CHoCH)
export function detectBOS(candles: Candle[]): Drawing[] {
  const bos: Drawing[] = [];
  if (candles.length < 20) return bos;

  const startIndex = Math.max(0, candles.length - 100);
  
  // Find swing highs and lows
  for (let i = startIndex + 5; i < candles.length - 1; i++) {
    // Simple swing high logic
    if (candles[i-2].high < candles[i-1].high && candles[i].high < candles[i-1].high) {
      const swingHigh = candles[i-1];
      // Check if a future candle breaks it
      for (let j = i + 1; j < candles.length; j++) {
        if (candles[j].close > swingHigh.high) {
          bos.push({
            id: `bos-bull-${swingHigh.time}`,
            type: 'horizontal',
            points: [
              { time: swingHigh.time, price: swingHigh.high },
              { time: candles[j].time, price: swingHigh.high }
            ],
            meta: { type: 'bos', direction: 'bullish' }
          });
          break; // Found the break
        }
      }
    }
    
    // Simple swing low logic
    if (candles[i-2].low > candles[i-1].low && candles[i].low > candles[i-1].low) {
      const swingLow = candles[i-1];
      // Check if a future candle breaks it
      for (let j = i + 1; j < candles.length; j++) {
        if (candles[j].close < swingLow.low) {
          bos.push({
            id: `bos-bear-${swingLow.time}`,
            type: 'horizontal',
            points: [
              { time: swingLow.time, price: swingLow.low },
              { time: candles[j].time, price: swingLow.low }
            ],
            meta: { type: 'bos', direction: 'bearish' }
          });
          break; // Found the break
        }
      }
    }
  }

  return bos;
}

// Liquidity Sweep
export function detectLiquiditySweep(candles: Candle[]): Drawing[] {
  const sweeps: Drawing[] = [];
  if (candles.length < 10) return sweeps;

  const startIndex = Math.max(0, candles.length - 50);
  
  for (let i = startIndex + 3; i < candles.length; i++) {
    const c = candles[i];
    const prevC = candles[i-1];
    
    // Bullish Liquidity Sweep (Sweeps below previous low but closes above)
    if (c.low < prevC.low && c.close > prevC.low && c.close > c.open) {
      sweeps.push({
        id: `sweep-bull-${c.time}`,
        type: 'horizontal',
        points: [
          { time: prevC.time, price: prevC.low },
          { time: c.time, price: prevC.low }
        ],
        meta: { type: 'sweep', direction: 'bullish' }
      });
    }

    // Bearish Liquidity Sweep (Sweeps above previous high but closes below)
    if (c.high > prevC.high && c.close < prevC.high && c.close < c.open) {
      sweeps.push({
        id: `sweep-bear-${c.time}`,
        type: 'horizontal',
        points: [
          { time: prevC.time, price: prevC.high },
          { time: c.time, price: prevC.high }
        ],
        meta: { type: 'sweep', direction: 'bearish' }
      });
    }
  }

  return sweeps;
}
