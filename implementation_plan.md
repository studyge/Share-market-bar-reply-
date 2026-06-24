# Indian Market Bar Replay Android App

This document outlines the architecture, tech stack, and step-by-step implementation plan to build a professional, offline-capable Indian Market Bar Replay and backtesting application for Android.

## User Review Required

> [!WARNING]
> **Python vs. Android Native Conflict**
> The requirement specifies using the Python library `tvDatafeed` for data downloading. However, running Python natively within an Android application is complex and heavily bloats the app size (requiring wrappers like Chaquopy).
> 
> **Recommendation**: Since `tvDatafeed` simply makes HTTP/WebSocket requests to TradingView's public APIs, I strongly recommend **porting the specific data-fetching logic to TypeScript/JavaScript**. This allows us to build a smooth, high-performance, native-feeling app without the massive overhead of a Python runtime.

> [!TIP]
> **Technology Stack Proposal**
> Based on your previous projects, you have experience with React and Capacitor. I propose building this app using:
> - **Frontend**: React (Vite) + TailwindCSS (for rapid UI, if allowed, or pure CSS per guidelines)
> - **Mobile Wrapper**: Capacitor (for building the Android APK and accessing the native file system)
> - **Database**: `@capacitor-community/sqlite` for native, offline, high-performance SQLite storage on Android.
> - **Charting**: `lightweight-charts` by TradingView. This is a free, high-performance HTML5 canvas charting library that supports 5000+ candles smoothly, wicks, custom drawings, and panning/zooming.

## Open Questions

> [!IMPORTANT]
> Please provide your feedback on the following before we proceed:
> 1. **Data Fetching**: Are you comfortable with rewriting the `tvDatafeed` logic in TypeScript/JavaScript to keep the app lightweight and performant, instead of forcing Python onto Android?
> 2. **Framework Choice**: Do you prefer React + Capacitor (similar to your school project) or React Native (Expo) for this Android application?
> 3. **Design**: Should I proceed with a dark-mode-first, premium UI design (e.g., glassmorphism, smooth animations) suitable for professional traders?

## Proposed Architecture & Workflow

### 1. Data Layer (SQLite & Fetching)
- **Local Storage**: We will create a robust SQLite service that initializes databases per symbol (e.g., `RELIANCE.db`).
- **Table Schema**: `candles (datetime INTEGER PRIMARY KEY, open REAL, high REAL, low REAL, close REAL, volume INTEGER)`.
- **Downloader**: A service that queries TradingView for historical data, parses the response, and bulk-inserts it into the local SQLite database.

### 2. Replay Engine State Management
- A dedicated React Context or Zustand store to manage the `current_index` of the replay.
- Expose controls: `play()`, `pause()`, `nextCandle()`, `prevCandle()`, `jumpToDate()`, and speed modifiers.
- Slice the loaded SQLite data (`candles.slice(0, current_index)`) and feed it to the chart instance.

### 3. Charting Interface
- Utilize `lightweight-charts`.
- Implement custom plugins or overlays for drawing tools (Trend Lines, Rectangles) and Trade Simulation (Long/Short Position tools with RR ratio calculations).
- Sync crosshair data to state to display the current price and time on touch.

### 4. Trade Journal & Statistics
- Create a `trades.db` or a separate table to store simulated trades.
- Calculate dynamic statistics: Total Trades, Win Rate, Average RR, based on the journal entries.

## Proposed Changes (Phased Execution)

### Phase 1: Project Initialization & UI Shell
- [NEW] Initialize React + Vite project in `/Users/jiyajahnavi/Documents/sharemarket`.
- [NEW] Configure Capacitor for Android.
- [NEW] Set up routing (Search Screen, Replay Chart Screen, Journal Screen).
- [NEW] Implement premium styling structure (CSS variables, dark theme).

### Phase 2: Data Fetching & SQLite Storage
- [NEW] Setup `@capacitor-community/sqlite`.
- [NEW] Create TypeScript implementation of TradingView data fetching (simulating `tvDatafeed`).
- [NEW] Build the Search & Download screen with progress indicators.

### Phase 3: Chart Integration & Replay Engine
- [NEW] Integrate `lightweight-charts`.
- [NEW] Build the Replay controls component (Play, Pause, Fast Forward).
- [NEW] Connect the SQLite local data to the chart, slicing it based on the replay engine's index.

### Phase 4: Trading Tools & Journaling
- [NEW] Implement Drawing tools and Long/Short position risk-reward overlays.
- [NEW] Build Trade Journal screen and SQLite storage for trade records.
- [NEW] Build Statistics dashboard.

## Verification Plan

### Automated/Local Tests
- Verify the TradingView TS fetcher successfully downloads NIFTY and RELIANCE data on 5m and 15m timeframes.
- Run `npm run dev` to verify the UI, charting performance (5000+ candles), and replay logic in the browser.

### Manual Verification
- Compile to Android Studio using `npx cap open android`.
- Test SQLite persistence on a physical Android device or emulator.
- Verify offline capabilities (disabling Wi-Fi and loading a downloaded symbol).
- Test touch interactions (panning, zooming, crosshair) on mobile.
