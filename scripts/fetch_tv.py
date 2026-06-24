import argparse
import json
import os
import traceback
from tvDatafeed import TvDatafeed, Interval

# Group Definitions for Bulk Import
GROUPS = {
    "nifty50": [
        "RELIANCE", "TCS", "HDFCBANK", "ICICIBANK", "INFY", "ITC", 
        "SBIN", "BHARTIARTL", "BAJFINANCE", "LARSEN" # Trimmed for demo speed, full 50 can be added
    ],
    "sector_bank": [
        "HDFCBANK", "ICICIBANK", "SBIN", "KOTAKBANK", "AXISBANK", 
        "INDUSINDBK", "PNB", "BANKBARODA"
    ],
    "sector_it": [
        "TCS", "INFY", "HCLTECH", "WIPRO", "TECHM", "LTIM"
    ]
}

def fetch_symbol(tv, symbol, exchange, interval_str, n_bars=5000):
    interval_map = {
        '1m': Interval.in_1_minute,
        '5m': Interval.in_5_minute,
        '15m': Interval.in_15_minute,
        '1h': Interval.in_1_hour,
        '1d': Interval.in_daily,
    }
    interval = interval_map.get(interval_str, Interval.in_15_minute)
    
    print(f"Fetching {symbol} from {exchange} at {interval_str}...")
    try:
        df = tv.get_hist(symbol=symbol, exchange=exchange, interval=interval, n_bars=n_bars)
        if df is None or df.empty:
            print(f"No data found for {symbol}")
            return None
            
        df.reset_index(inplace=True)
        df.rename(columns={'datetime': 'time'}, inplace=True)
        df['time'] = df['time'].astype('int64') // 10**9
        return df[['time', 'open', 'high', 'low', 'close', 'volume']].to_dict(orient='records')
    except Exception as e:
        print(f"Error fetching {symbol}: {e}")
        return None

def main():
    parser = argparse.ArgumentParser(description='Fetch data from tvDatafeed')
    parser.add_argument('--symbol', type=str, help='Single symbol to fetch')
    parser.add_argument('--group', type=str, help='Group of symbols to fetch (e.g. nifty50, sector_bank)')
    parser.add_argument('--interval', type=str, default='15m', help='Timeframe interval')
    parser.add_argument('--exchange', type=str, default='NSE', help='Exchange')
    
    args = parser.parse_args()
    
    symbols_to_fetch = []
    if args.symbol:
        symbols_to_fetch.append(args.symbol)
    if args.group and args.group in GROUPS:
        symbols_to_fetch.extend(GROUPS[args.group])
        
    if not symbols_to_fetch:
        print("No valid symbol or group provided.")
        return

    # Ensure output directory exists
    os.makedirs('public/data', exist_ok=True)
    
    tv = TvDatafeed()
    
    for sym in symbols_to_fetch:
        data = fetch_symbol(tv, sym, args.exchange, args.interval)
        if data:
            filepath = f"public/data/{sym}_{args.interval}.json"
            with open(filepath, 'w') as f:
                json.dump(data, f)
            print(f"Saved {filepath}")

if __name__ == '__main__':
    main()
