import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CaseProvider } from './context/CaseContext';
import { NotificationProvider } from './context/NotificationContext';
import { UIProvider } from './context/UIContext';
import { AppRoutes } from './routes/AppRoutes';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CaseProvider>
          <NotificationProvider>
            <UIProvider>
              <AppRoutes />
            </UIProvider>
          </NotificationProvider>
        </CaseProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
