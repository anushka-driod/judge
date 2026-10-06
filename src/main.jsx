import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './App.jsx'

<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 3aab4be (dhanush commits)
// Register Service Worker for offline PWA operation
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('[PWA] Service Worker registration skipped:', err.message);
    });
  });
}

<<<<<<< HEAD
=======
>>>>>>> origin/main
=======
>>>>>>> 3aab4be (dhanush commits)
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
