import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useCases } from '../../context/CaseContext';
import { useUI } from '../../hooks/useUI';
import {
  Scale,
  Plus,
  Pin,
  PinOff,
  MoreVertical,
  Edit2,
  Trash2,
  AlertOctagon,
  X,
  MessageSquare,
  Check,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import './Sidebar.css';

export function Sidebar() {
  const {
    cases,
    activeCaseId,
    selectCase,
    startFreshChat,
    togglePinCase,
    renameCase,
    deleteCase,
  } = useCases();

  const { isSidebarOpen, closeSidebar, isSidebarCollapsed, toggleSidebarCollapse } = useUI();
  const navigate = useNavigate();
  const location = useLocation();

  const [menuOpenCaseId, setMenuOpenCaseId] = useState(null);
  const [editingCaseId, setEditingCaseId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const menuRef = useRef(null);
  const editInputRef = useRef(null);

  // Close popup menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpenCaseId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Focus input when editing starts
  useEffect(() => {
    if (editingCaseId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingCaseId]);

  const handleNewCase = () => {
    startFreshChat();
    navigate('/chat');
    closeSidebar();
  };

  const handleSelectCase = (caseId) => {
    selectCase(caseId);
    if (location.pathname !== '/chat') {
      navigate('/chat');
    }
    closeSidebar();
  };

  const handleStartRename = (c, e) => {
    e.stopPropagation();
    setEditingCaseId(c.id);
    setEditTitle(c.title);
    setMenuOpenCaseId(null);
  };

  const handleSaveRename = (caseId, e) => {
    if (e) e.stopPropagation();
    if (editTitle.trim()) {
      renameCase(caseId, editTitle.trim());
    }
    setEditingCaseId(null);
  };

  const handleKeyDownRename = (caseId, e) => {
    if (e.key === 'Enter') {
      handleSaveRename(caseId, e);
    } else if (e.key === 'Escape') {
      setEditingCaseId(null);
    }
  };

  const handleDelete = (caseId, e) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this case and its conversation history?')) {
      deleteCase(caseId);
      setMenuOpenCaseId(null);
    }
  };

  const handleTogglePin = (caseId, e) => {
    e.stopPropagation();
    togglePinCase(caseId);
    setMenuOpenCaseId(null);
  };

  return (
    <>
      {isSidebarOpen && <div className="sidebar-backdrop" onClick={closeSidebar} />}
      <aside
        className={`sidebar vidhisetu-sidebar ${isSidebarOpen ? 'sidebar-open' : ''} ${
          isSidebarCollapsed ? 'sidebar-collapsed' : ''
        }`}
      >
        {/* Brand Header */}
        <div className="sidebar-header">
          <div
            className="sidebar-brand"
            onClick={() => navigate('/chat')}
            title="VidhiSetu — AI Legal Chatbot"
          >
            <div className="brand-logo-badge">
              <Scale size={20} className="brand-icon" />
            </div>
            {!isSidebarCollapsed && (
              <div className="brand-text-block">
                <span className="brand-title">VidhiSetu</span>
                <span className="brand-subtitle">AI Legal Chatbot</span>
              </div>
            )}
          </div>

          {/* Desktop Toggle Button */}
          <button
            type="button"
            className="sidebar-collapse-toggle-btn"
            onClick={toggleSidebarCollapse}
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isSidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>

          {/* Mobile Close Button */}
          <button
            type="button"
            className="sidebar-close-btn"
            onClick={closeSidebar}
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        {/* 3. Prominent "+ New Case" Button */}
        <div className="sidebar-action-container">
          <button
            type="button"
            className={`btn-new-case ${isSidebarCollapsed ? 'btn-new-case-collapsed' : ''}`}
            onClick={handleNewCase}
            title="Start a new legal case conversation (+ New Case)"
            aria-label="New Case"
          >
            <Plus size={18} className="btn-plus-icon" />
            {!isSidebarCollapsed && <span>+ New Case</span>}
          </button>
        </div>

        {/* 4. MY CASES Section (ChatGPT Recents Style) */}
        <div className="sidebar-scroll-content">
          {!isSidebarCollapsed && (
            <div className="cases-section-header">
              <span className="cases-section-label">MY CASES</span>
              <span className="cases-count-badge">{cases.length}</span>
            </div>
          )}

          <div className="cases-list" role="list">
            {cases.length === 0 ? (
              !isSidebarCollapsed && (
                <div
                  className="empty-cases-note"
                  onClick={handleNewCase}
                  style={{ cursor: 'pointer' }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleNewCase(); }}
                  title="Click to register a new case"
                >
                  <MessageSquare size={16} />
                  <span>No cases yet. Click + New Case to begin.</span>
                </div>
              )
            ) : (
              cases.map((c) => {
                const isActive = activeCaseId === c.id && location.pathname === '/chat';
                const isEditing = editingCaseId === c.id;
                const isMenuOpen = menuOpenCaseId === c.id;

                if (isSidebarCollapsed) {
                  return (
                    <button
                      key={c.id}
                      type="button"
                      className={`case-item-collapsed ${isActive ? 'case-item-active' : ''} ${
                        c.isPinned ? 'case-item-pinned-collapsed' : ''
                      }`}
                      onClick={() => handleSelectCase(c.id)}
                      title={`${c.isPinned ? '[Pinned] ' : ''}${c.title}`}
                      aria-label={c.title}
                    >
                      {c.isPinned ? (
                        <Pin size={16} className="pin-icon-filled" />
                      ) : (
                        <MessageSquare size={16} />
                      )}
                    </button>
                  );
                }

                return (
                  <div
                    key={c.id}
                    className={`case-item ${isActive ? 'case-item-active' : ''} ${c.isPinned ? 'case-item-pinned' : ''}`}
                    onClick={() => !isEditing && handleSelectCase(c.id)}
                    role="listitem"
                  >
                    {/* Pin Indicator Icon */}
                    {c.isPinned && (
                      <span className="pin-indicator" title="Pinned Case">
                        <Pin size={13} className="pin-icon-filled" />
                      </span>
                    )}

                    {/* Case Title or Inline Rename Input */}
                    <div className="case-title-wrapper">
                      {isEditing ? (
                        <div className="rename-input-row" onClick={(e) => e.stopPropagation()}>
                          <input
                            ref={editInputRef}
                            type="text"
                            className="rename-input"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onKeyDown={(e) => handleKeyDownRename(c.id, e)}
                            onBlur={() => handleSaveRename(c.id)}
                          />
                          <button
                            type="button"
                            className="btn-save-rename"
                            onClick={(e) => handleSaveRename(c.id, e)}
                            title="Save Title"
                          >
                            <Check size={14} />
                          </button>
                        </div>
                      ) : (
                        <span className="case-title" title={c.title}>
                          {c.title}
                        </span>
                      )}
                    </div>

                    {/* Three-Dot Menu & Pin Shortcut */}
                    {!isEditing && (
                      <div className="case-actions-group" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className={`case-action-btn pin-btn ${c.isPinned ? 'pinned-active' : ''}`}
                          onClick={(e) => handleTogglePin(c.id, e)}
                          title={c.isPinned ? 'Unpin case' : 'Pin case to top'}
                          aria-label={c.isPinned ? 'Unpin case' : 'Pin case'}
                        >
                          <Pin size={14} />
                        </button>

                        <button
                          type="button"
                          className="case-action-btn menu-btn"
                          onClick={() => setMenuOpenCaseId(isMenuOpen ? null : c.id)}
                          title="More options"
                          aria-label="More options"
                        >
                          <MoreVertical size={14} />
                        </button>

                        {/* Dropdown Menu */}
                        {isMenuOpen && (
                          <div className="case-dropdown-menu" ref={menuRef}>
                            <button
                              type="button"
                              className="dropdown-item"
                              onClick={(e) => handleTogglePin(c.id, e)}
                            >
                              {c.isPinned ? <PinOff size={14} /> : <Pin size={14} />}
                              <span>{c.isPinned ? 'Unpin case' : 'Pin to top'}</span>
                            </button>
                            <button
                              type="button"
                              className="dropdown-item"
                              onClick={(e) => handleStartRename(c, e)}
                            >
                              <Edit2 size={14} />
                              <span>Rename</span>
                            </button>
                            <button
                              type="button"
                              className="dropdown-item dropdown-item-danger"
                              onClick={(e) => handleDelete(c.id, e)}
                            >
                              <Trash2 size={14} />
                              <span>Delete case</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 2 & 3. REPORT LAWYER ISSUE (Footer Link) */}
        <div className="sidebar-footer">
          <NavLink
            to="/cases/case-102/complaint"
            className={({ isActive }) =>
              `sidebar-complaint-btn ${isActive ? 'complaint-active' : ''} ${
                isSidebarCollapsed ? 'complaint-btn-collapsed' : ''
              }`
            }
            onClick={closeSidebar}
            title="Report Lawyer Issue — Report a concern or grievance regarding an advocate"
            aria-label="Report Lawyer Issue"
          >
            <AlertOctagon size={18} className="complaint-icon" />
            {!isSidebarCollapsed && <span className="complaint-text">REPORT LAWYER ISSUE</span>}
          </NavLink>
        </div>
      </aside>
    </>
  );
}
