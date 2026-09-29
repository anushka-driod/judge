import React from 'react';
<<<<<<< HEAD
import { Outlet, useLocation } from 'react-router-dom';
=======
import { Outlet } from 'react-router-dom';
>>>>>>> origin/main
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { ToastContainer } from '../common/ToastContainer';
import './AppLayout.css';

export function AppLayout() {
<<<<<<< HEAD
  const location = useLocation();
  const isChat = location.pathname.startsWith('/chat');

=======
>>>>>>> origin/main
  return (
    <div className="app-layout">
      <Navbar />
      <div className="app-body">
        <Sidebar />
<<<<<<< HEAD
        <main className={`app-main ${isChat ? 'app-main-chat' : ''}`}>
          <div className={`app-content-container ${isChat ? 'app-content-chat' : ''}`}>
=======
        <main className="app-main">
          <div className="app-content-container">
>>>>>>> origin/main
            <Outlet />
          </div>
        </main>
      </div>
      <ToastContainer />
    </div>
  );
}
