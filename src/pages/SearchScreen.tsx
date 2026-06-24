import React, { useState, useEffect } from 'react';
import { Search, Download, Play, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fetchSymbolData } from '../lib/tvDatafeed';
import { DatabaseService } from '../lib/sqlite';
import { useReplayStore } from '../store/useReplayStore';

const POPULAR_SYMBOLS = ['NIFTY', 'BANKNIFTY', 'RELIANCE', 'HDFCBANK', 'TCS', 'INFY', 'SBIN'];
const TIMEFRAMES = ['1 Minute', '5 Minute', '15 Minute', '1 Hour', '1 Day'];

export function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTimeframe, setSelectedTimeframe] = useState('15 Minute');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadedSymbols, setDownloadedSymbols] = useState<string[]>([]);
  const [githubStatus, setGithubStatus] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const setSymbol = useReplayStore(state => state.setSymbol);
  const loadCandles = useReplayStore(state => state.loadCandles);
  const setDrawings = useReplayStore(state => state.setDrawings);

  useEffect(() => {
    try {
      DatabaseService.getInstance().getDownloadedSymbols()
        .then(setDownloadedSymbols)
        .catch(err => console.error('Failed to get downloaded symbols:', err));
    } catch (err) {
      console.error('Sync error in DatabaseService:', err);
    }
  }, []);

  const handleSearch = async (symbol: string) => {
    if (!symbol) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const dbService = DatabaseService.getInstance();
      await dbService.initDatabase(symbol);
      
      let candles = await dbService.getCandles();
      
      if (candles.length === 0) {
        // Download if not exists
        candles = await fetchSymbolData(symbol, selectedTimeframe);
        
        if (candles.length > 0) {
          await dbService.saveCandles(candles);
        } else {
          throw new Error('No data found for this symbol.');
        }
      }
      
      const savedDrawings = await dbService.getDrawings(symbol);
      
      setSymbol(symbol);
      loadCandles(candles);
      setDrawings(savedDrawings);
      navigate('/replay');
      
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching data.');
    } finally {
      setLoading(false);
    }
  };

  const triggerBulkImport = async (groupName: string) => {
    const pat = localStorage.getItem('github_pat') || prompt('Enter your GitHub Personal Access Token (with repo access) to trigger the cloud import:');
    if (!pat) return;
    
    // Using the default repository provided by the user
    const ownerRepo = prompt('Enter your GitHub Owner/Repo:', localStorage.getItem('github_repo') || 'studyge/Share-market-bar-reply-');
    if (!ownerRepo) return;
    
    localStorage.setItem('github_pat', pat);
    localStorage.setItem('github_repo', ownerRepo);
    
    setGithubStatus(`Triggering Cloud Bulk Import for ${groupName}... (This will take ~40 seconds in the background)`);
    
    try {
      const response = await fetch(`https://api.github.com/repos/${ownerRepo}/actions/workflows/fetch.yml/dispatches`, {
        method: 'POST',
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `token ${pat}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ref: 'main', // Assuming the branch is main
          inputs: {
            group: groupName,
            interval: '15m'
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`GitHub API Error: ${response.status}`);
      }
      
      setGithubStatus(`Success! GitHub is now downloading ${groupName} in the background. Check your repository Actions tab, and pull the latest changes when done.`);
    } catch (err: any) {
      setError('Failed to trigger GitHub Action: ' + err.message);
      setGithubStatus(null);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-gray-900 p-6 text-white">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Bar Replay</h1>
        <p className="text-gray-400">Search for a symbol to practice trading</p>
      </div>
      
      <div className="mb-6 flex space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search Indian stocks or indices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchQuery)}
            className="w-full rounded-xl bg-gray-800 py-4 pl-10 pr-4 text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={selectedTimeframe}
          onChange={(e) => setSelectedTimeframe(e.target.value)}
          className="rounded-xl bg-gray-800 px-4 py-4 text-white outline-none focus:ring-2 focus:ring-blue-500"
        >
          {TIMEFRAMES.map(tf => (
            <option key={tf} value={tf}>{tf}</option>
          ))}
        </select>
        <button
          onClick={() => handleSearch(searchQuery)}
          disabled={loading || !searchQuery}
          className="flex items-center justify-center rounded-xl bg-blue-600 px-6 py-4 font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? (
            <span className="animate-pulse">Loading...</span>
          ) : (
            <>
              <Download className="mr-2 h-5 w-5" /> Load
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="mb-6 flex items-center rounded-lg bg-red-900/50 p-4 text-red-200">
          <AlertCircle className="mr-3 h-5 w-5" />
          <p>{error}</p>
        </div>
      )}

      {downloadedSymbols.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-green-400">Downloaded / Offline Symbols</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {downloadedSymbols.map((symbol) => (
              <button
                key={symbol}
                onClick={() => {
                  setSearchQuery(symbol);
                  handleSearch(symbol);
                }}
                className="flex items-center justify-between rounded-xl border border-green-900 bg-gray-800 p-4 transition-colors hover:bg-gray-700"
              >
                <span className="font-semibold">{symbol}</span>
                <Play className="h-4 w-4 text-green-500" />
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-400">Bulk Cloud Import (GitHub Actions)</h2>
        
        {githubStatus && (
          <div className="mb-4 rounded-lg bg-blue-900/50 p-4 text-sm text-blue-200">
            {githubStatus}
          </div>
        )}
        
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          <button
            onClick={() => triggerBulkImport('nifty50')}
            className="flex items-center justify-center rounded-xl bg-indigo-600 p-4 font-semibold transition-colors hover:bg-indigo-700"
          >
            <Download className="mr-2 h-5 w-5" /> Import NIFTY 50
          </button>
          <button
            onClick={() => triggerBulkImport('sector_bank')}
            className="flex items-center justify-center rounded-xl bg-purple-600 p-4 font-semibold transition-colors hover:bg-purple-700"
          >
            <Download className="mr-2 h-5 w-5" /> Import Bank Sector
          </button>
          <button
            onClick={() => triggerBulkImport('sector_it')}
            className="flex items-center justify-center rounded-xl bg-cyan-600 p-4 font-semibold transition-colors hover:bg-cyan-700"
          >
            <Download className="mr-2 h-5 w-5" /> Import IT Sector
          </button>
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-400">Popular Symbols</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {POPULAR_SYMBOLS.map((symbol) => (
            <button
              key={symbol}
              onClick={() => {
                setSearchQuery(symbol);
                handleSearch(symbol);
              }}
              className="flex items-center justify-between rounded-xl bg-gray-800 p-4 transition-colors hover:bg-gray-700"
            >
              <span className="font-semibold">{symbol}</span>
              <Play className="h-4 w-4 text-gray-400" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
