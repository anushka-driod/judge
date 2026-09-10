import React from 'react';
import './Tabs.css';

export function Tabs({ tabs, activeTab, onChange, className = '' }) {
  return (
    <div className={`tabs-container ${className}`}>
      <div className="tabs-nav" role="tablist">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              className={`tab-btn ${isActive ? 'tab-btn-active' : ''}`}
              onClick={() => onChange(tab.id)}
            >
              {Icon && <Icon size={16} className="tab-icon" />}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span className={`tab-badge ${isActive ? 'tab-badge-active' : ''}`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
