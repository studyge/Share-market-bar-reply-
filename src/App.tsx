import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SearchScreen } from './pages/SearchScreen';
import { ReplayScreen } from './pages/ReplayScreen';

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, color: 'white', backgroundColor: 'black', height: '100vh' }}>
          <h1>Something went wrong.</h1>
          <pre style={{ color: 'red' }}>{this.state.error?.toString()}</pre>
          <pre>{this.state.error?.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
        <Route path="/" element={<SearchScreen />} />
        <Route path="/replay" element={<ReplayScreen />} />
      </Routes>
    </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
