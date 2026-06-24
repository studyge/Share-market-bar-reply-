import React, { useEffect, useRef, useState, useMemo } from 'react';
import { ArrowLeft, Play, Pause, SkipForward, SkipBack, Settings, MousePointer2, Minus, TrendingUp, TrendingDown, Trash2, PenLine, BarChart2, X, Zap, GripVertical, Square, ArrowUpRight, Type } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Chart } from '../components/Chart';
import { TradeJournalModal } from '../components/TradeJournalModal';
import { useReplayStore, Drawing } from '../store/useReplayStore';
import { detectFVGs, detectOrderBlocks, detectSessionLevels, detectBOS, detectLiquiditySweep } from '../lib/ictTools';
import { DatabaseService } from '../lib/sqlite';

export function ReplayScreen() {
  const navigate = useNavigate();
  const { 
    symbol, 
    currentIndex, 
    allCandles, 
    isPlaying, 
    speed,
    activeTool,
    setActiveTool,
    clearDrawings,
    play, 
    pause, 
    nextCandle, 
    prevCandle,
    drawings,
    addDrawing
  } = useReplayStore();
  
  const [showStats, setShowStats] = useState(false);
  const [showJournal, setShowJournal] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Trade Statistics Logic
  const stats = useMemo(() => {
    const trades = drawings.filter(d => d.type === 'long' || d.type === 'short');
    let wins = 0;
    let losses = 0;
    let totalRR = 0;
    let bestTrade = 0;
    let worstTrade = 0;
    
    trades.forEach(trade => {
      if (trade.points.length !== 2) return;
      const entry = trade.points[0].price;
      const tp = trade.points[1].price;
      const isLong = trade.type === 'long';
      
      const currentPrice = allCandles[currentIndex]?.close || entry;
      const isWinning = isLong ? currentPrice > entry : currentPrice < entry;
      const isLosing = isLong ? currentPrice < entry : currentPrice > entry;
      
      const pnl = isLong ? currentPrice - entry : entry - currentPrice;
      const risk = Math.abs(tp - entry) / 2; // Assuming 1:2 default RR drawn
      
      if (pnl > bestTrade) bestTrade = pnl;
      if (pnl < worstTrade) worstTrade = pnl;
      
      if (Math.abs(currentPrice - entry) > risk) {
        if (isWinning) {
          wins++;
          totalRR += (Math.abs(currentPrice - entry) / risk);
        }
        else if (isLosing) {
          losses++;
          totalRR -= 1;
        }
      }
    });

    return {
      total: trades.length,
      wins,
      losses,
      winRate: trades.length ? Math.round((wins / (wins + losses || 1)) * 100) : 0,
      avgRR: (wins + losses) > 0 ? (totalRR / (wins + losses)).toFixed(2) : '0.00',
      bestTrade: bestTrade.toFixed(2),
      worstTrade: worstTrade.toFixed(2)
    };
  }, [drawings, currentIndex, allCandles]);

  // Auto Replay Logic
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        nextCandle();
      }, speed);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, speed, nextCandle]);

  // Auto-save drawings
  useEffect(() => {
    if (symbol) {
      DatabaseService.getInstance().saveDrawings(symbol, drawings);
    }
  }, [drawings, symbol]);

  const handleAutoICT = () => {
    const visibleData = allCandles.slice(0, currentIndex + 1);
    const fvgs = detectFVGs(visibleData);
    const obs = detectOrderBlocks(visibleData);
    const levels = detectSessionLevels(visibleData);
    const bos = detectBOS(visibleData);
    const sweeps = detectLiquiditySweep(visibleData);
    
    [...fvgs, ...obs, ...levels, ...bos, ...sweeps].forEach(d => addDrawing(d));
  };

  return (
    <div className="flex h-screen flex-col bg-gray-900 text-white">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-gray-800 bg-gray-900 px-4 py-3">
        <div className="flex items-center">
          <button 
            onClick={() => navigate('/')}
            className="mr-4 rounded-lg p-2 transition-colors hover:bg-gray-800"
          >
            <ArrowLeft className="h-5 w-5 text-gray-400" />
          </button>
          <div>
            <h1 className="font-bold">{symbol || 'Unknown'}</h1>
            <div className="text-xs text-gray-500">
              {currentIndex + 1} / {allCandles.length} candles
            </div>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <button 
            onClick={handleAutoICT}
            title="Auto Detect ICT (FVG, OB, PDH/PDL)"
            className="flex items-center rounded-lg bg-gray-800 px-3 py-2 text-sm font-medium text-yellow-500 transition-colors hover:bg-gray-700 hover:text-yellow-400"
          >
            <Zap className="mr-2 h-4 w-4" />
            Auto ICT
          </button>
          <button 
            onClick={() => setShowStats(!showStats)}
            className="flex items-center rounded-lg bg-gray-800 px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-700"
          >
            <BarChart2 className="mr-2 h-4 w-4 text-blue-400" />
            Stats
          </button>
          <button 
            onClick={() => setShowJournal(true)}
            className="rounded-lg bg-gray-800 px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-700 text-gray-300"
          >
            Journal
          </button>
          <button className="rounded-lg p-2 transition-colors hover:bg-gray-800">
            <Settings className="h-5 w-5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Drawing Toolbar (Left) */}
        <div className="flex w-16 flex-col items-center space-y-4 overflow-y-auto border-r border-gray-800 bg-gray-900 py-4 scrollbar-hide">
          <button 
            title="Cursor"
            onClick={() => setActiveTool('cursor')}
            className={`rounded-lg p-3 transition-colors ${activeTool === 'cursor' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
          >
            <MousePointer2 className="h-5 w-5" />
          </button>
          
          <button 
            title="Trendline"
            onClick={() => setActiveTool('trendline')}
            className={`rounded-lg p-3 transition-colors ${activeTool === 'trendline' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
          >
            <PenLine className="h-5 w-5" />
          </button>

          <button 
            title="Horizontal Line"
            onClick={() => setActiveTool('horizontal')}
            className={`rounded-lg p-3 transition-colors ${activeTool === 'horizontal' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
          >
            <Minus className="h-5 w-5" />
          </button>
          
          <button 
            title="Vertical Line"
            onClick={() => setActiveTool('vertical')}
            className={`rounded-lg p-3 transition-colors ${activeTool === 'vertical' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
          >
            <GripVertical className="h-5 w-5" />
          </button>

          <button 
            title="Rectangle"
            onClick={() => setActiveTool('rectangle')}
            className={`rounded-lg p-3 transition-colors ${activeTool === 'rectangle' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
          >
            <Square className="h-5 w-5" />
          </button>

          <button 
            title="Arrow"
            onClick={() => setActiveTool('arrow')}
            className={`rounded-lg p-3 transition-colors ${activeTool === 'arrow' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
          >
            <ArrowUpRight className="h-5 w-5" />
          </button>
          
          <button 
            title="Text Label"
            onClick={() => setActiveTool('text')}
            className={`rounded-lg p-3 transition-colors ${activeTool === 'text' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
          >
            <Type className="h-5 w-5" />
          </button>

          <div className="my-2 h-px w-8 bg-gray-800" />

          <button 
            title="Long Position"
            onClick={() => setActiveTool('long')}
            className={`rounded-lg p-3 transition-colors ${activeTool === 'long' ? 'bg-green-600 text-white' : 'text-green-500 hover:bg-gray-800 hover:text-green-400'}`}
          >
            <TrendingUp className="h-5 w-5" />
          </button>
          
          <button 
            title="Short Position"
            onClick={() => setActiveTool('short')}
            className={`rounded-lg p-3 transition-colors ${activeTool === 'short' ? 'bg-red-600 text-white' : 'text-red-500 hover:bg-gray-800 hover:text-red-400'}`}
          >
            <TrendingDown className="h-5 w-5" />
          </button>
          
          <div className="flex-1" />
          
          <button 
            title="Clear All Drawings"
            onClick={clearDrawings}
            className="rounded-lg p-3 text-gray-500 transition-colors hover:bg-gray-800 hover:text-red-400"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>

        {/* Chart Area */}
        <div className="relative flex-1 bg-[#111827]">
          <Chart />
          
          {/* Stats Panel */}
          {showStats && (
            <div className="absolute right-4 top-4 z-30 w-72 rounded-xl border border-gray-700 bg-gray-900/95 p-4 shadow-2xl backdrop-blur">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-bold text-white">Trade Statistics</h3>
                <button onClick={() => setShowStats(false)} className="text-gray-400 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-gray-800 p-3">
                  <div className="text-xs text-gray-400">Total Trades</div>
                  <div className="text-xl font-bold">{stats.total}</div>
                </div>
                <div className="rounded-lg bg-gray-800 p-3">
                  <div className="text-xs text-gray-400">Win Rate</div>
                  <div className="text-xl font-bold text-blue-400">{stats.winRate}%</div>
                </div>
                <div className="rounded-lg bg-gray-800 p-3">
                  <div className="text-xs text-gray-400">Wins</div>
                  <div className="text-xl font-bold text-green-500">{stats.wins}</div>
                </div>
                <div className="rounded-lg bg-gray-800 p-3">
                  <div className="text-xs text-gray-400">Losses</div>
                  <div className="text-xl font-bold text-red-500">{stats.losses}</div>
                </div>
                <div className="rounded-lg bg-gray-800 p-3">
                  <div className="text-xs text-gray-400">Avg RR</div>
                  <div className="text-xl font-bold text-yellow-400">{stats.avgRR}</div>
                </div>
                <div className="rounded-lg bg-gray-800 p-3">
                  <div className="text-xs text-gray-400">Best Trade</div>
                  <div className="text-lg font-bold text-green-400">+{stats.bestTrade}</div>
                </div>
                <div className="rounded-lg bg-gray-800 p-3">
                  <div className="text-xs text-gray-400">Worst Trade</div>
                  <div className="text-lg font-bold text-red-400">{stats.worstTrade}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Replay Controls */}
      <div className="flex items-center justify-center border-t border-gray-800 bg-gray-900 p-4">
        <div className="flex items-center space-x-6 rounded-full bg-gray-800 px-8 py-3 shadow-lg">
          <button 
            onClick={prevCandle}
            className="text-gray-400 transition-colors hover:text-white"
          >
            <SkipBack className="h-6 w-6" />
          </button>
          
          <button 
            onClick={isPlaying ? pause : play}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 pl-1 text-white shadow shadow-blue-900/20 transition-transform hover:scale-105 active:scale-95"
          >
            {isPlaying ? (
              <Pause className="h-6 w-6 -ml-1" />
            ) : (
              <Play className="h-6 w-6" />
            )}
          </button>
          
          <button 
            onClick={nextCandle}
            className="text-gray-400 transition-colors hover:text-white"
          >
            <SkipForward className="h-6 w-6" />
          </button>
        </div>
      </div>

      {showJournal && <TradeJournalModal onClose={() => setShowJournal(false)} />}
    </div>
  );
}
