import React, { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, Time, MouseEventParams } from 'lightweight-charts';
import { useReplayStore } from '../store/useReplayStore';
import { DrawingOverlay } from './DrawingOverlay';

export function Chart() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  
  const { allCandles, currentIndex } = useReplayStore();
  const [crosshairInfo, setCrosshairInfo] = useState<{ time: string, price: number } | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: '#111827' },
        textColor: '#9CA3AF',
      },
      grid: {
        vertLines: { color: '#1F2937' },
        horzLines: { color: '#1F2937' },
      },
      crosshair: {
        mode: 1,
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
      autoSize: true,
    });

    chartRef.current = chart;

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#10B981',
      downColor: '#EF4444',
      borderVisible: false,
      wickUpColor: '#10B981',
      wickDownColor: '#EF4444',
    });
    
    seriesRef.current = candlestickSeries;

    // Crosshair listener for touch/hover
    chart.subscribeCrosshairMove((param) => {
      if (param.point === undefined || !param.time || param.point.x < 0 || param.point.x > chartContainerRef.current!.clientWidth || param.point.y < 0 || param.point.y > chartContainerRef.current!.clientHeight) {
        setCrosshairInfo(null);
      } else {
        const data = param.seriesData.get(candlestickSeries);
        if (data) {
          const price = (data as any).close;
          const date = new Date((param.time as number) * 1000);
          setCrosshairInfo({
            time: date.toLocaleString(),
            price,
          });
        }
      }
    });

    return () => {
      chart.remove();
    };
  }, []);

  // Update data when index or candles change
  useEffect(() => {
    if (!seriesRef.current || allCandles.length === 0) return;
    
    // Slice data up to current index for replay effect
    const visibleData = allCandles.slice(0, currentIndex + 1).map(c => ({
      time: c.time as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
    
    seriesRef.current.setData(visibleData);
    
    // Auto scroll to latest if it was updated by replay playing
    if (chartRef.current && visibleData.length > 0) {
      // Small optimization: only scroll if it's playing forward 1 by 1
      chartRef.current.timeScale().scrollToPosition(0, false);
    }
  }, [allCandles, currentIndex]);

  return (
    <div className="relative h-full w-full">
      {/* Crosshair Info Overlay */}
      {crosshairInfo && (
        <div className="absolute left-4 top-4 z-20 rounded bg-gray-800/80 px-3 py-2 text-sm backdrop-blur pointer-events-none">
          <div className="text-gray-300">{crosshairInfo.time}</div>
          <div className="font-mono font-bold text-white">{crosshairInfo.price.toFixed(2)}</div>
        </div>
      )}
      
      <div ref={chartContainerRef} className="h-full w-full" />
      
      <DrawingOverlay chartRef={chartRef} seriesRef={seriesRef} />
    </div>
  );
}
