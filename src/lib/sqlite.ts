import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { Capacitor } from '@capacitor/core';
import { Candle } from '../store/useReplayStore';

export interface TradeRecord {
  id?: number;
  symbol: string;
  date: string;
  direction: string;
  entry: number;
  sl: number;
  tp: number;
  result: string;
  notes: string;
}

let sqlite: SQLiteConnection | null = null;
const isWeb = Capacitor.getPlatform() === 'web';

if (!isWeb) {
  try {
    sqlite = new SQLiteConnection(CapacitorSQLite);
  } catch (e) {
    console.warn("SQLite not natively available.", e);
  }
}

// In-memory mock storage for Web preview
const mockDB = {
  candles: new Map<string, Candle[]>(),
  trades: [] as TradeRecord[],
  drawings: new Map<string, any[]>()
};

export class DatabaseService {
  private static instance: DatabaseService;
  private db: SQLiteDBConnection | null = null;
  private currentSymbol: string | null = null;

  private constructor() {}

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  async initDatabase(symbol: string): Promise<void> {
    if (this.currentSymbol === symbol && this.db) {
      return;
    }

    this.currentSymbol = symbol;

    if (isWeb) {
      console.log(`[Web Mock] Initialized DB for ${symbol}`);
      return;
    }

    if (!sqlite) throw new Error("SQLite plugin not initialized. Use Android/iOS.");
    try {
      const dbName = `${symbol}.db`;
      this.db = await sqlite.createConnection(
        dbName,
        false,
        'no-encryption',
        1,
        false
      );

      await this.db.open();

      const query = `
        CREATE TABLE IF NOT EXISTS candles (
          time INTEGER PRIMARY KEY,
          open REAL,
          high REAL,
          low REAL,
          close REAL,
          volume INTEGER
        );
        CREATE TABLE IF NOT EXISTS trades (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          symbol TEXT,
          date TEXT,
          direction TEXT,
          entry REAL,
          sl REAL,
          tp REAL,
          result TEXT,
          notes TEXT
        );
        CREATE TABLE IF NOT EXISTS drawings (
          id TEXT PRIMARY KEY,
          symbol TEXT,
          type TEXT,
          points TEXT,
          meta TEXT
        );
      `;
      await this.db.execute(query);
    } catch (error) {
      console.error('Error initializing database', error);
      throw error;
    }
  }

  async saveCandles(candles: Candle[]): Promise<void> {
    if (isWeb && this.currentSymbol) {
      mockDB.candles.set(this.currentSymbol, candles);
      return;
    }
    
    if (!this.db) throw new Error('Database not initialized');
    
    try {
      // Chunk insertions for performance
      const chunkSize = 500;
      for (let i = 0; i < candles.length; i += chunkSize) {
        const chunk = candles.slice(i, i + chunkSize);
        
        let query = 'INSERT OR REPLACE INTO candles (time, open, high, low, close, volume) VALUES ';
        const values: any[] = [];
        
        chunk.forEach((candle, index) => {
          query += `(?, ?, ?, ?, ?, ?)${index === chunk.length - 1 ? ';' : ','}`;
          values.push(candle.time, candle.open, candle.high, candle.low, candle.close, candle.volume);
        });
        
        await this.db.run(query, values);
      }
    } catch (error) {
      console.error('Error saving candles', error);
      throw error;
    }
  }

  async getCandles(): Promise<Candle[]> {
    if (isWeb && this.currentSymbol) {
      return mockDB.candles.get(this.currentSymbol) || [];
    }
    
    if (!this.db) throw new Error('Database not initialized');
    
    try {
      const res = await this.db.query('SELECT * FROM candles ORDER BY time ASC');
      return (res.values as Candle[]) || [];
    } catch (error) {
      console.error('Error getting candles', error);
      return [];
    }
  }

  async saveTrade(trade: TradeRecord): Promise<void> {
    if (isWeb) {
      mockDB.trades.unshift({ ...trade, id: Date.now() });
      return;
    }
    
    if (!this.db) throw new Error('Database not initialized');
    
    try {
      const query = 'INSERT INTO trades (symbol, date, direction, entry, sl, tp, result, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
      await this.db.run(query, [
        trade.symbol, trade.date, trade.direction, trade.entry, trade.sl, trade.tp, trade.result, trade.notes
      ]);
    } catch (error) {
      console.error('Error saving trade', error);
      throw error;
    }
  }

  async getTrades(): Promise<TradeRecord[]> {
    if (isWeb) {
      return mockDB.trades;
    }
    
    if (!this.db) throw new Error('Database not initialized');
    
    try {
      const res = await this.db.query('SELECT * FROM trades ORDER BY id DESC');
      return (res.values as TradeRecord[]) || [];
    } catch (error) {
      console.error('Error getting trades', error);
      return [];
    }
  }

  async saveDrawings(symbol: string, drawings: any[]): Promise<void> {
    if (isWeb) {
      mockDB.drawings.set(symbol, drawings);
      // Let's also save to localstorage so they persist refresh
      try {
        localStorage.setItem(`drawings_${symbol}`, JSON.stringify(drawings));
      } catch (e) {}
      return;
    }
    
    if (!this.db) throw new Error('Database not initialized');
    
    try {
      // Clear existing for symbol and reinsert (simple sync)
      await this.db.run('DELETE FROM drawings WHERE symbol = ?', [symbol]);
      
      if (drawings.length === 0) return;

      const chunkSize = 100;
      for (let i = 0; i < drawings.length; i += chunkSize) {
        const chunk = drawings.slice(i, i + chunkSize);
        
        let query = 'INSERT INTO drawings (id, symbol, type, points, meta) VALUES ';
        const values: any[] = [];
        
        chunk.forEach((d, index) => {
          query += `(?, ?, ?, ?, ?)${index === chunk.length - 1 ? ';' : ','}`;
          values.push(d.id, symbol, d.type, JSON.stringify(d.points), JSON.stringify(d.meta || {}));
        });
        
        await this.db.run(query, values);
      }
    } catch (error) {
      console.error('Error saving drawings', error);
    }
  }

  async getDrawings(symbol: string): Promise<any[]> {
    if (isWeb) {
      try {
        const saved = localStorage.getItem(`drawings_${symbol}`);
        if (saved) return JSON.parse(saved);
      } catch (e) {}
      return mockDB.drawings.get(symbol) || [];
    }
    
    if (!this.db) throw new Error('Database not initialized');
    
    try {
      const res = await this.db.query('SELECT * FROM drawings WHERE symbol = ?', [symbol]);
      const raw = res.values || [];
      return raw.map(r => ({
        id: r.id,
        type: r.type,
        points: JSON.parse(r.points),
        meta: JSON.parse(r.meta)
      }));
    } catch (error) {
      console.error('Error getting drawings', error);
      return [];
    }
  }

  async getDownloadedSymbols(): Promise<string[]> {
    if (isWeb) {
      return Array.from(mockDB.candles.keys());
    }
    
    if (!sqlite) return [];
    
    try {
      const dbList = await sqlite.getDatabaseList();
      const names = dbList.values || [];
      // Remove the .db extension
      return names
        .filter(n => n.endsWith('.db'))
        .map(n => n.replace('.db', ''));
    } catch (error) {
      console.error('Error getting database list', error);
      return [];
    }
  }
}
