import React, { useEffect, useState } from 'react';
import { X, Save, Check } from 'lucide-react';
import { DatabaseService, TradeRecord } from '../lib/sqlite';
import { useReplayStore } from '../store/useReplayStore';

interface TradeJournalModalProps {
  onClose: () => void;
}

export function TradeJournalModal({ onClose }: TradeJournalModalProps) {
  const { symbol, drawings, allCandles, currentIndex } = useReplayStore();
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Load historical trades from DB
    const loadTrades = async () => {
      try {
        const dbService = DatabaseService.getInstance();
        const history = await dbService.getTrades();
        
        // Also map current active mock trades from drawings
        const activeDrawings = drawings.filter(d => d.type === 'long' || d.type === 'short');
        
        const currentTrades: TradeRecord[] = activeDrawings.map(d => {
          const entry = d.points[0]?.price || 0;
          const tp = d.points[1]?.price || 0;
          const isLong = d.type === 'long';
          const tpDiff = tp - entry;
          const sl = entry - (tpDiff / 2); // default demo SL
          
          const currentPrice = allCandles[currentIndex]?.close || entry;
          const isWinning = isLong ? currentPrice > entry : currentPrice < entry;
          const isLosing = isLong ? currentPrice < entry : currentPrice > entry;
          
          let result = 'Open';
          if (Math.abs(currentPrice - entry) > Math.abs(tp - entry)) {
            result = isWinning ? 'Win' : 'Loss';
          }

          return {
            symbol: symbol || 'UNKNOWN',
            date: new Date(d.points[0]?.time * 1000).toLocaleDateString(),
            direction: d.type,
            entry,
            sl,
            tp,
            result,
            notes: ''
          };
        });

        // Combine history with unsaved current trades (simplification for demo)
        setTrades([...currentTrades, ...history]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    loadTrades();
  }, [drawings, currentIndex, allCandles, symbol]);

  const handleSave = async (index: number) => {
    const trade = trades[index];
    trade.notes = notes[index] || '';
    
    try {
      await DatabaseService.getInstance().saveTrade(trade);
      setSaved({ ...saved, [index]: true });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="flex h-[80vh] w-[90vw] max-w-4xl flex-col rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl">
        
        <div className="flex items-center justify-between border-b border-gray-800 p-6">
          <h2 className="text-2xl font-bold text-white">Trade Journal</h2>
          <button onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center text-gray-400">Loading trades...</div>
          ) : trades.length === 0 ? (
            <div className="text-center text-gray-500">No trades found. Draw a Long/Short position to start.</div>
          ) : (
            <div className="space-y-4">
              {trades.map((trade, i) => (
                <div key={i} className="flex flex-col gap-4 rounded-xl border border-gray-800 bg-gray-800/50 p-5 md:flex-row md:items-start">
                  
                  {/* Trade Details */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">{trade.symbol}</span>
                      <span className="text-sm text-gray-400">{trade.date}</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                      <div>
                        <div className="text-gray-500">Direction</div>
                        <div className={`font-semibold capitalize ${trade.direction === 'long' ? 'text-green-500' : 'text-red-500'}`}>
                          {trade.direction}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500">Entry</div>
                        <div className="text-white">{trade.entry.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Take Profit</div>
                        <div className="text-white">{trade.tp.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Result</div>
                        <div className={`font-bold ${trade.result === 'Win' ? 'text-green-500' : trade.result === 'Loss' ? 'text-red-500' : 'text-yellow-500'}`}>
                          {trade.result}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Journal Notes */}
                  <div className="flex w-full flex-col gap-2 md:w-64">
                    <textarea 
                      placeholder="Trade notes..."
                      value={notes[i] !== undefined ? notes[i] : trade.notes}
                      onChange={(e) => setNotes({ ...notes, [i]: e.target.value })}
                      className="h-24 w-full resize-none rounded-lg bg-gray-900 p-3 text-sm text-white outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button 
                      onClick={() => handleSave(i)}
                      disabled={saved[i] || trade.id !== undefined}
                      className="flex items-center justify-center rounded-lg bg-blue-600 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-400"
                    >
                      {saved[i] || trade.id !== undefined ? (
                        <><Check className="mr-2 h-4 w-4" /> Saved</>
                      ) : (
                        <><Save className="mr-2 h-4 w-4" /> Save to Journal</>
                      )}
                    </button>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
