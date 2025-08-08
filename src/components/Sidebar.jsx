import React from 'react';
import { NavLink } from 'react-router-dom';
import './Sidebar.css';

const Sidebar = ({ collapsed, onToggle }) => {
  const menuItems = [
    {
      path: '/',
      icon: 'bi-speedometer2',
      label: 'Dashboard',
      badge: null
    },
    {
      path: '/add-customer',
      icon: 'bi-person-plus',
      label: 'Add Member',
      badge: null
    },
    {
      path: '/customers',
      icon: 'bi-people',
      label: 'All Members',
      badge: null
    },
    {
      path: '/mark-attendance',
      icon: 'bi-check2-circle',
      label: 'Mark Attendance',
      badge: null
    },
    {
      path: '/view-attendance',
      icon: 'bi-calendar-week',
      label: 'View Attendance',
      badge: null
    },
    {
      path: '/payments',
      icon: 'bi-credit-card',
      label: 'Payments',
      badge: null
    },
    {
      path: '/pending-payments',
      icon: 'bi-exclamation-triangle',
      label: 'Pending Payments',
      badge: 'hot'
    },
    {
      path: '/message',
      icon: 'bi-chat-dots',
      label: 'Messages',
      badge: null
    },
    {
      path: '/reports',
      icon: 'bi-graph-up',
      label: 'Reports',
      badge: null
    },
    {
      path: '/whatsapp',
      icon: 'bi-graph-up',
      label: 'Whatsapp',
      badge: null
    }
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {!collapsed && (
        <div 
          className="sidebar-overlay d-md-none"
          onClick={onToggle}
        />
      )}

      <div className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
        {/* Logo */}
        <div className="sidebar-header">
          <div className="logo">
            <i className="bi bi-lightning-charge-fill"></i>
            {!collapsed && <span>AM FITNESS</span>}
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <ul className="nav-list">
            {menuItems.map((item, index) => (
              <li key={index} className="nav-item">
                <NavLink
                  to={item.path}
                  className={({ isActive }) => 
                    `nav-link ${isActive ? 'active' : ''}`
                  }
                  title={collapsed ? item.label : ''}
                >
                  <i className={`bi ${item.icon}`}></i>
                  {!collapsed && (
                    <>
                      <span className="nav-text">{item.label}</span>
                      {item.badge && (
                        <span className={`badge badge-${item.badge}`}>
                          {item.badge === 'hot' ? '!' : item.badge}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        {!collapsed && (
          <div className="sidebar-footer">
            <div className="footer-content">
              <small className="text-muted">© 2024 AM FITNESS</small>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Sidebar;
