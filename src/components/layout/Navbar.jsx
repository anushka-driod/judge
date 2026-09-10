import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useUI } from '../../hooks/useUI';
import {
  Scale,
  Menu,
  ChevronDown,
  User,
  UserCheck,
  Settings,
  KeyRound,
  LogOut,
} from 'lucide-react';
import { ProfileModal } from '../profile/ProfileModal';
import './Navbar.css';

export function Navbar() {
  const { currentUser, logout } = useAuth();
  const { toggleSidebar, toggleSidebarCollapse, isSidebarCollapsed } = useUI();
  const navigate = useNavigate();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [profileModalTab, setProfileModalTab] = useState(null); // 'view' | 'edit' | 'password' | 'settings' | null
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isDropdownOpen]);

  // Close dropdown on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isDropdownOpen]);

  const handleLogout = async () => {
    setIsDropdownOpen(false);
    await logout();
    navigate('/login');
  };

  const handleToggleSidebar = () => {
    if (window.innerWidth <= 768) {
      toggleSidebar();
    } else {
      toggleSidebarCollapse();
    }
  };

  const handleOpenModal = (tab) => {
    setIsDropdownOpen(false);
    setProfileModalTab(tab);
  };

  // Get compact short name (first name)
  const getShortName = () => {
    if (!currentUser?.name) return 'User';
    const first = currentUser.name.trim().split(' ')[0];
    return first.length > 14 ? `${first.substring(0, 12)}…` : first;
  };

  const shortName = getShortName();
  const avatarLetter = shortName[0]?.toUpperCase() || 'U';

  return (
    <>
      <header className="navbar vidhisetu-navbar">
        <div className="navbar-left">
          <button
            type="button"
            className="navbar-menu-btn"
            onClick={handleToggleSidebar}
            aria-label={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            <Menu size={20} />
          </button>

          <Link to="/chat" className="navbar-brand">
            <div className="navbar-logo-icon">
              <Scale size={18} />
            </div>
            <div className="navbar-brand-text">
              <span className="brand-name">VidhiSetu</span>
              <span className="brand-tagline">AI Legal Assistant</span>
            </div>
          </Link>
        </div>

        <div className="navbar-right">
          {/* Top-right "New Case" and "Report Lawyer" buttons have been removed as requested */}

          {currentUser && (
            <div className="navbar-account-container" ref={dropdownRef}>
              {/* Compact Account Section: [Small avatar] [Short name] [Dropdown arrow] */}
              <button
                type="button"
                className={`navbar-compact-account-btn ${isDropdownOpen ? 'account-active' : ''}`}
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                aria-haspopup="true"
                aria-expanded={isDropdownOpen}
                aria-label={`User menu for ${shortName}`}
                id="navbar-user-dropdown-btn"
              >
                <div className="compact-avatar" aria-hidden="true">
                  <span>{avatarLetter}</span>
                </div>
                <span className="compact-name">{shortName}</span>
                <ChevronDown
                  size={14}
                  className={`compact-chevron ${isDropdownOpen ? 'chevron-open' : ''}`}
                />
              </button>

              {/* Profile Dropdown Popover Menu */}
              {isDropdownOpen && (
                <div className="account-dropdown-menu" role="menu" aria-orientation="vertical">
                  <div className="dropdown-user-header">
                    <div className="header-avatar-circle">
                      <span>{avatarLetter}</span>
                    </div>
                    <div className="header-text-block">
                      <span className="header-full-name">{currentUser.name || 'VidhiSetu User'}</span>
                      <span className="header-email">{currentUser.email || 'user@example.com'}</span>
                    </div>
                  </div>

                  <div className="dropdown-separator" role="separator" />

                  <button
                    type="button"
                    className="account-menu-item"
                    role="menuitem"
                    onClick={() => handleOpenModal('view')}
                  >
                    <User size={15} className="menu-icon" />
                    <span>Profile</span>
                  </button>

                  <button
                    type="button"
                    className="account-menu-item"
                    role="menuitem"
                    onClick={() => handleOpenModal('edit')}
                  >
                    <UserCheck size={15} className="menu-icon" />
                    <span>Edit Profile</span>
                  </button>

                  <button
                    type="button"
                    className="account-menu-item"
                    role="menuitem"
                    onClick={() => handleOpenModal('settings')}
                  >
                    <Settings size={15} className="menu-icon" />
                    <span>Account Settings</span>
                  </button>

                  <button
                    type="button"
                    className="account-menu-item"
                    role="menuitem"
                    onClick={() => handleOpenModal('password')}
                  >
                    <KeyRound size={15} className="menu-icon" />
                    <span>Change Password</span>
                  </button>

                  <div className="dropdown-separator" role="separator" />

                  <button
                    type="button"
                    className="account-menu-item item-logout"
                    role="menuitem"
                    onClick={handleLogout}
                  >
                    <LogOut size={15} className="menu-icon icon-logout" />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Profile & Security Modal */}
      <ProfileModal
        isOpen={Boolean(profileModalTab)}
        initialTab={profileModalTab || 'view'}
        onClose={() => setProfileModalTab(null)}
      />
    </>
  );
}
