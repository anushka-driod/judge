import React, { createContext, useContext, useState } from 'react';

const UIContext = createContext(null);

export function UIProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('vidhisetu_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const showToast = (message, type = 'info', duration = 4000) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const toast = { id, message, type };
    setToasts((prev) => [...prev, toast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);
  const closeSidebar = () => setIsSidebarOpen(false);

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('vidhisetu_sidebar_collapsed', String(next));
      } catch (err) {
        console.error(err);
      }
      return next;
    });
  };

  const setSidebarCollapsed = (val) => {
    setIsSidebarCollapsed(val);
    try {
      localStorage.setItem('vidhisetu_sidebar_collapsed', String(val));
    } catch (err) {
      console.error(err);
    }
  };

  const value = {
    toasts,
    showToast,
    removeToast,
    isSidebarOpen,
    toggleSidebar,
    closeSidebar,
    isSidebarCollapsed,
    toggleSidebarCollapse,
    setSidebarCollapsed,
  };

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI() {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
}
