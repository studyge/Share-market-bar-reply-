from flask import Flask, request, jsonify
from flask_cors import CORS
from tvDatafeed import TvDatafeed, Interval
import traceback
import ssl
import requests
import warnings
from urllib3.exceptions import InsecureRequestWarning

# Suppress insecure warnings
warnings.simplefilter('ignore', InsecureRequestWarning)

# Fix macOS Python SSL certificate verification error (Deep Monkey Patch)
ssl._create_default_https_context = ssl._create_unverified_context
if hasattr(ssl, 'create_default_context'):
    ssl.create_default_context = ssl._create_unverified_context

# Monkey-patch requests to completely disable SSL verification
old_request = requests.Session.request
def new_request(self, method, url, **kwargs):
    kwargs['verify'] = False
    return old_request(self, method, url, **kwargs)
requests.Session.request = new_request

app = Flask(__name__)
# Enable CORS so the React app running on port 5173 can call this server
CORS(app)

# We will initialize on demand for better error reporting
tv = None

@app.route('/api/candles', methods=['GET'])
def get_candles():
    global tv
    try:
        if not tv:
            print("Initializing tvDatafeed...")
            tv = TvDatafeed()
    except Exception as e:
        return jsonify({"error": f"Failed to initialize tvDatafeed: {str(e)}\n{traceback.format_exc()}"}), 500

    symbol = request.args.get('symbol', 'NIFTY')
    exchange = request.args.get('exchange', 'NSE')
    interval_str = request.args.get('interval', '15m')
    
    # Map React timeframe strings to tvDatafeed Interval enums
    # e.g., '1m', '5m', '15m', '1h', '1d'
    interval_map = {
        '1m': Interval.in_1_minute,
        '3m': Interval.in_3_minute,
        '5m': Interval.in_5_minute,
        '15m': Interval.in_15_minute,
        '30m': Interval.in_30_minute,
        '1h': Interval.in_1_hour,
        '4h': Interval.in_4_hour,
        '1d': Interval.in_daily,
        '1w': Interval.in_weekly,
        '1M': Interval.in_monthly,
    }
    
    interval = interval_map.get(interval_str, Interval.in_15_minute)
    
    try:
        print(f"Fetching {symbol} from {exchange} at {interval_str}...")
        
        # Fetch 5000 bars for comprehensive backtesting
        df = tv.get_hist(
            symbol=symbol,
            exchange=exchange,
            interval=interval,
            n_bars=5000
        )
        
        if df is None or df.empty:
            return jsonify({"error": f"No data found for {symbol}"}), 404
            
        # tvDatafeed returns a DataFrame with datetime index
        # Format: datetime, symbol, open, high, low, close, volume
        
        # Reset index to make datetime a column
        df.reset_index(inplace=True)
        
        # Rename columns to match React Candle interface
        df.rename(columns={'datetime': 'time'}, inplace=True)
        
        # Convert datetime to unix timestamp in seconds
        df['time'] = df['time'].astype('int64') // 10**9
        
        # Keep only needed columns and convert to list of dicts
        result = df[['time', 'open', 'high', 'low', 'close', 'volume']].to_dict(orient='records')
        
        return jsonify(result)
        
    except Exception as e:
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("Starting tvDatafeed Server on port 5000...")
    app.run(host='0.0.0.0', port=5000, debug=True)
