import React from 'react';
import AppLayout from './components/AppLayout';
import Dashboard from './app/page';

/**
 * Main App component for the WMS Pro application.
 * This component acts as the root of the React application rendered by index.tsx.
 * It wraps the application with the necessary providers (via AppLayout) and
 * renders the initial Dashboard view.
 */
const App: React.FC = () => {
  return (
    <AppLayout>
      <Dashboard />
    </AppLayout>
  );
};

export default App;