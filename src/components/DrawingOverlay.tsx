import React, { useEffect, useState, RefObject } from 'react';
import { IChartApi, ISeriesApi, Time } from 'lightweight-charts';
import { useReplayStore, Drawing } from '../store/useReplayStore';

interface DrawingOverlayProps {
  chartRef: RefObject<IChartApi | null>;
  seriesRef: RefObject<ISeriesApi<"Candlestick"> | null>;
}

export function DrawingOverlay({ chartRef, seriesRef }: DrawingOverlayProps) {
  const { drawings, activeTool, addDrawing, setActiveTool } = useReplayStore();
  const [renderTrigger, setRenderTrigger] = useState(0);
  
  // For active drawing session
  const [currentPoints, setCurrentPoints] = useState<{time: number, price: number}[]>([]);
  const [mousePos, setMousePos] = useState<{x: number, y: number} | null>(null);

  // Force re-render when chart scrolls or scales
  useEffect(() => {
    if (!chartRef.current) return;
    
    const chart = chartRef.current;
    
    const handleScroll = () => {
      setRenderTrigger(prev => prev + 1);
    };

    chart.timeScale().subscribeVisibleLogicalRangeChange(handleScroll);
    chart.timeScale().subscribeSizeChange(handleScroll);
    
    const handleCrosshairMove = (param: any) => {
      if (!param.point || !param.time || !seriesRef.current) {
        setMousePos(null);
        return;
      }
      
      const price = seriesRef.current.coordinateToPrice(param.point.y);
      if (price !== null) {
        setMousePos({
          x: param.point.x,
          y: param.point.y
        });
      }
    };
    
    chart.subscribeCrosshairMove(handleCrosshairMove);
    
    return () => {
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(handleScroll);
      chart.timeScale().unsubscribeSizeChange(handleScroll);
      chart.unsubscribeCrosshairMove(handleCrosshairMove);
    };
  }, [chartRef, seriesRef]);

  // Click handler for drawing
  useEffect(() => {
    const handleChartClick = (param: any) => {
      if (activeTool === 'cursor' || !param.point || !param.time || !seriesRef.current) return;
      
      const price = seriesRef.current.coordinateToPrice(param.point.y);
      if (price === null) return;
      
      const newPoint = { time: param.time as number, price };
      
      if (activeTool === 'horizontal') {
        addDrawing({
          id: Date.now().toString(),
          type: 'horizontal',
          points: [newPoint]
        });
        return;
      }

      if (activeTool === 'vertical') {
        addDrawing({
          id: Date.now().toString(),
          type: 'vertical',
          points: [newPoint]
        });
        return;
      }
      
      if (activeTool === 'text') {
        const text = prompt('Enter text for label:');
        if (text) {
          addDrawing({
            id: Date.now().toString(),
            type: 'text',
            points: [newPoint],
            meta: { text }
          });
        } else {
          setActiveTool('cursor');
        }
        return;
      }
      
      // Trendline, Rectangle, Arrow, or Positions need 2 points
      if (currentPoints.length === 0) {
        setCurrentPoints([newPoint]);
      } else {
        addDrawing({
          id: Date.now().toString(),
          type: activeTool,
          points: [currentPoints[0], newPoint]
        });
        setCurrentPoints([]);
      }
    };
    
    const chart = chartRef.current;
    if (chart) {
      chart.subscribeClick(handleChartClick);
      return () => chart.unsubscribeClick(handleChartClick);
    }
  }, [activeTool, currentPoints, addDrawing, chartRef, seriesRef]);

  // Helper to get screen coordinates
  const getCoords = (time: number, price: number) => {
    if (!chartRef.current || !seriesRef.current) return null;
    try {
      const x = chartRef.current.timeScale().timeToCoordinate(time as Time);
      const y = seriesRef.current.priceToCoordinate(price);
      if (x === null || y === null) return null;
      return { x, y };
    } catch (e) {
      return null;
    }
  };

  const renderDrawing = (drawing: Drawing) => {
    if (drawing.type === 'horizontal') {
      const p1 = getCoords(drawing.points[0].time, drawing.points[0].price);
      if (!p1) return null;
      return (
        <line 
          key={drawing.id}
          x1={0} y1={p1.y} 
          x2="100%" y2={p1.y} 
          stroke="#3B82F6" strokeWidth={2} strokeDasharray="5,5" 
        />
      );
    }
    
    if (drawing.type === 'trendline' && drawing.points.length === 2) {
      const p1 = getCoords(drawing.points[0].time, drawing.points[0].price);
      const p2 = getCoords(drawing.points[1].time, drawing.points[1].price);
      if (!p1 || !p2) return null;
      return (
        <line 
          key={drawing.id}
          x1={p1.x} y1={p1.y} 
          x2={p2.x} y2={p2.y} 
          stroke="#3B82F6" strokeWidth={2} 
        />
      );
    }
    
    if (drawing.type === 'vertical') {
      const p1 = getCoords(drawing.points[0].time, drawing.points[0].price);
      if (!p1) return null;
      return (
        <line 
          key={drawing.id}
          x1={p1.x} y1={0} 
          x2={p1.x} y2="100%" 
          stroke="#3B82F6" strokeWidth={2} strokeDasharray="5,5" 
        />
      );
    }

    if (drawing.type === 'rectangle' && drawing.points.length === 2) {
      const p1 = getCoords(drawing.points[0].time, drawing.points[0].price);
      const p2 = getCoords(drawing.points[1].time, drawing.points[1].price);
      if (!p1 || !p2) return null;
      const x = Math.min(p1.x, p2.x);
      const y = Math.min(p1.y, p2.y);
      const width = Math.abs(p2.x - p1.x);
      const height = Math.abs(p2.y - p1.y);
      return (
        <rect 
          key={drawing.id}
          x={x} y={y} width={width} height={height}
          fill="#3B82F6" fillOpacity={0.2} stroke="#3B82F6" strokeWidth={2}
        />
      );
    }

    if (drawing.type === 'arrow' && drawing.points.length === 2) {
      const p1 = getCoords(drawing.points[0].time, drawing.points[0].price);
      const p2 = getCoords(drawing.points[1].time, drawing.points[1].price);
      if (!p1 || !p2) return null;
      
      // Simple arrow marker at the end
      return (
        <g key={drawing.id}>
          <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#3B82F6" strokeWidth={2} />
          <circle cx={p2.x} cy={p2.y} r={4} fill="#3B82F6" />
        </g>
      );
    }

    if (drawing.type === 'text') {
      const p1 = getCoords(drawing.points[0].time, drawing.points[0].price);
      if (!p1) return null;
      return (
        <text 
          key={drawing.id}
          x={p1.x + 10} y={p1.y} fill="white" fontSize={14} fontWeight="bold"
        >
          {drawing.meta?.text || 'Text'}
        </text>
      );
    }
    
    if ((drawing.type === 'long' || drawing.type === 'short') && drawing.points.length === 2) {
      const entry = drawing.points[0];
      const target = drawing.points[1];
      
      const isLong = drawing.type === 'long';
      
      // Calculate SL implicitly (1:2 RR for demo, or based on user click)
      const tpDiff = target.price - entry.price;
      const slPrice = entry.price - (tpDiff / 2);
      
      const pEntry = getCoords(entry.time, entry.price);
      const pTP = getCoords(target.time, target.price);
      const pSL = getCoords(target.time, slPrice);
      
      if (!pEntry || !pTP || !pSL) return null;
      
      const width = pTP.x - pEntry.x;
      const winHeight = Math.abs(pTP.y - pEntry.y);
      const lossHeight = Math.abs(pSL.y - pEntry.y);
      
      const winY = Math.min(pEntry.y, pTP.y);
      const lossY = Math.min(pEntry.y, pSL.y);
      
      return (
        <g key={drawing.id}>
          <rect x={pEntry.x} y={winY} width={width} height={winHeight} fill="#10B981" fillOpacity={0.3} />
          <rect x={pEntry.x} y={lossY} width={width} height={lossHeight} fill="#EF4444" fillOpacity={0.3} />
          <line x1={pEntry.x} y1={pEntry.y} x2={pTP.x} y2={pEntry.y} stroke="#fff" strokeWidth={1} strokeDasharray="2,2" />
          <text x={pTP.x + 5} y={pEntry.y} fill="white" fontSize={12}>Entry: {entry.price.toFixed(2)}</text>
        </g>
      );
    }
    
    // ICT Renderings
    if (drawing.meta) {
      if (drawing.meta.type === 'fvg') {
        const p1 = getCoords(drawing.points[0].time, drawing.points[0].price);
        const p2 = getCoords(drawing.points[1].time, drawing.points[1].price);
        if (!p1 || !p2) return null;
        
        const isBullish = drawing.meta.direction === 'bullish';
        const color = isBullish ? '#10B981' : '#EF4444';
        const yTop = Math.min(p1.y, p2.y);
        const height = Math.abs(p2.y - p1.y);
        
        return (
          <g key={drawing.id}>
            <rect x={p1.x} y={yTop} width="100%" height={height} fill={color} fillOpacity={0.15} />
            <text x={p1.x + 5} y={yTop + 12} fill={color} fontSize={10} opacity={0.8}>FVG</text>
          </g>
        );
      }
      
      if (drawing.meta.type === 'ob') {
        const p1 = getCoords(drawing.points[0].time, drawing.points[0].price); // High
        const p2 = getCoords(drawing.points[1].time, drawing.points[1].price); // Low
        if (!p1 || !p2) return null;
        
        const isBullish = drawing.meta.direction === 'bullish';
        const color = isBullish ? '#3B82F6' : '#F59E0B';
        const yTop = Math.min(p1.y, p2.y);
        const height = Math.abs(p2.y - p1.y);
        
        return (
          <g key={drawing.id}>
            <rect x={p1.x} y={yTop} width="100%" height={height} fill={color} fillOpacity={0.1} stroke={color} strokeWidth={1} strokeDasharray="2,2" />
            <text x={p1.x + 5} y={yTop + 12} fill={color} fontSize={10} opacity={0.8}>OB</text>
          </g>
        );
      }
      
      if (drawing.meta.type === 'pdh' || drawing.meta.type === 'pdl') {
        const p1 = getCoords(drawing.points[0].time, drawing.points[0].price);
        if (!p1) return null;
        const color = drawing.meta.type === 'pdh' ? '#10B981' : '#EF4444';
        return (
          <g key={drawing.id}>
            <line x1={0} y1={p1.y} x2="100%" y2={p1.y} stroke={color} strokeWidth={2} strokeDasharray="5,5" opacity={0.5} />
            <text x={5} y={p1.y - 5} fill={color} fontSize={10} opacity={0.8}>{drawing.meta.type.toUpperCase()}</text>
          </g>
        );
      }

      if (drawing.meta.type === 'bos') {
        const p1 = getCoords(drawing.points[0].time, drawing.points[0].price);
        const p2 = getCoords(drawing.points[1].time, drawing.points[1].price);
        if (!p1 || !p2) return null;
        const color = drawing.meta.direction === 'bullish' ? '#3B82F6' : '#F59E0B';
        return (
          <g key={drawing.id}>
            <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p1.y} stroke={color} strokeWidth={1} strokeDasharray="3,3" />
            <text x={p1.x + (p2.x - p1.x)/2} y={p1.y - 4} fill={color} fontSize={10} textAnchor="middle">BOS</text>
          </g>
        );
      }

      if (drawing.meta.type === 'sweep') {
        const p1 = getCoords(drawing.points[0].time, drawing.points[0].price);
        const p2 = getCoords(drawing.points[1].time, drawing.points[1].price);
        if (!p1 || !p2) return null;
        const color = drawing.meta.direction === 'bullish' ? '#10B981' : '#EF4444';
        return (
          <g key={drawing.id}>
            <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p1.y} stroke={color} strokeWidth={2} />
            <text x={p2.x + 5} y={p1.y + 4} fill={color} fontSize={10}>X</text>
          </g>
        );
      }
    }
    
    return null;
  };

  return (
    <svg 
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10 }}
    >
      {/* Active Drawing Preview */}
      {currentPoints.length === 1 && mousePos && (
        <g>
          {(activeTool === 'trendline' || activeTool === 'rectangle' || activeTool === 'arrow') && (
            <line 
              x1={getCoords(currentPoints[0].time, currentPoints[0].price)?.x} 
              y1={getCoords(currentPoints[0].time, currentPoints[0].price)?.y} 
              x2={mousePos.x} 
              y2={mousePos.y} 
              stroke="#9CA3AF" strokeWidth={2} strokeDasharray="4,4" 
            />
          )}
          {(activeTool === 'long' || activeTool === 'short') && (
            <line 
              x1={getCoords(currentPoints[0].time, currentPoints[0].price)?.x} 
              y1={getCoords(currentPoints[0].time, currentPoints[0].price)?.y} 
              x2={mousePos.x} 
              y2={mousePos.y} 
              stroke="#9CA3AF" strokeWidth={2} strokeDasharray="4,4" 
            />
          )}
        </g>
      )}
      
      {drawings.map(renderDrawing)}
    </svg>
  );
}
