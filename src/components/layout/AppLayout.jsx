import React from 'react';
<<<<<<< HEAD
<<<<<<< HEAD
import { Outlet, useLocation } from 'react-router-dom';
=======
import { Outlet } from 'react-router-dom';
>>>>>>> origin/main
=======
import { Outlet, useLocation } from 'react-router-dom';
>>>>>>> 3aab4be (dhanush commits)
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { ToastContainer } from '../common/ToastContainer';
import './AppLayout.css';

export function AppLayout() {
<<<<<<< HEAD
<<<<<<< HEAD
  const location = useLocation();
  const isChat = location.pathname.startsWith('/chat');

=======
>>>>>>> origin/main
=======
  const location = useLocation();
  const isChat = location.pathname.startsWith('/chat');

>>>>>>> 3aab4be (dhanush commits)
  return (
    <div className="app-layout">
      <Navbar />
      <div className="app-body">
        <Sidebar />
<<<<<<< HEAD
<<<<<<< HEAD
        <main className={`app-main ${isChat ? 'app-main-chat' : ''}`}>
          <div className={`app-content-container ${isChat ? 'app-content-chat' : ''}`}>
=======
        <main className="app-main">
          <div className="app-content-container">
>>>>>>> origin/main
=======
        <main className={`app-main ${isChat ? 'app-main-chat' : ''}`}>
          <div className={`app-content-container ${isChat ? 'app-content-chat' : ''}`}>
>>>>>>> 3aab4be (dhanush commits)
            <Outlet />
          </div>
        </main>
      </div>
      <ToastContainer />
    </div>
  );
}
