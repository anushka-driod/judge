import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { ToastContainer } from '../common/ToastContainer';
import './AppLayout.css';

export function AppLayout() {
  const location = useLocation();
  const isChat = location.pathname.startsWith('/chat');

  return (
    <div className="app-layout">
      <Navbar />
      <div className="app-body">
        <Sidebar />
        <main className={`app-main ${isChat ? 'app-main-chat' : ''}`}>
          <div className={`app-content-container ${isChat ? 'app-content-chat' : ''}`}>
            <Outlet />
          </div>
        </main>
      </div>
      <ToastContainer />
    </div>
  );
}
