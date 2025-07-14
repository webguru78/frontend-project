import React, { useState, useEffect } from 'react';
import { Navbar, Nav, Dropdown, Badge } from 'react-bootstrap';
import './Topbar.css';

const Topbar = ({ onToggleSidebar }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [notifications] = useState([
    { id: 1, message: '5 new members joined today', type: 'success', time: '2m ago' },
    { id: 2, message: 'Payment reminder for 3 members', type: 'warning', time: '5m ago' },
    { id: 3, message: 'Monthly report is ready', type: 'info', time: '1h ago' },
  ]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <Navbar className="topbar" expand="lg">
      <div className="d-flex justify-content-between align-items-center w-100">
        {/* Left Side */}
        <div className="d-flex align-items-center">
          <button
            className="sidebar-toggle-btn"
            onClick={onToggleSidebar}
            aria-label="Toggle Sidebar"
          >
            <i className="bi bi-list"></i>
          </button>
          
          <div className="page-title ms-3">
            <h4 className="mb-0 text-white">Gym Management System</h4>
            <small className="text-light opacity-75">Welcome back, Admin!</small>
          </div>
        </div>

        {/* Center - Date & Time */}
        <div className="datetime-display d-none d-lg-block">
          <div className="time-display">
            <i className="bi bi-clock me-2"></i>
            {formatTime(currentTime)}
          </div>
          <div className="date-display">
            {formatDate(currentTime)}
          </div>
        </div>

        {/* Right Side */}
        <div className="d-flex align-items-center">
          {/* Notifications */}
          <Dropdown align="end" className="me-3">
            <Dropdown.Toggle variant="link" className="notification-btn p-0 border-0">
              <i className="bi bi-bell"></i>
              <Badge bg="danger" className="notification-badge">
                {notifications.length}
              </Badge>
            </Dropdown.Toggle>

            <Dropdown.Menu className="notification-menu">
              <Dropdown.Header>
                <i className="bi bi-bell me-2"></i>
                Notifications ({notifications.length})
              </Dropdown.Header>
              <Dropdown.Divider />
              
              {notifications.map((notification) => (
                <Dropdown.Item key={notification.id} className="notification-item">
                  <div className="d-flex">
                    <div className={`notification-icon notification-${notification.type}`}>
                      <i className={`bi bi-${
                        notification.type === 'success' ? 'check-circle' :
                        notification.type === 'warning' ? 'exclamation-triangle' :
                        'info-circle'
                      }`}></i>
                    </div>
                    <div className="notification-content">
                      <p className="notification-message mb-1">
                        {notification.message}
                      </p>
                      <small className="notification-time text-muted">
                        {notification.time}
                      </small>
                    </div>
                  </div>
                </Dropdown.Item>
              ))}
              
              <Dropdown.Divider />
              <Dropdown.Item className="text-center text-primary">
                <i className="bi bi-eye me-2"></i>
                View All Notifications
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>

          {/* Quick Actions */}
          <Dropdown align="end" className="me-3">
            <Dropdown.Toggle variant="link" className="quick-action-btn p-0 border-0">
              <i className="bi bi-plus-circle"></i>
            </Dropdown.Toggle>

            <Dropdown.Menu>
              <Dropdown.Header>Quick Actions</Dropdown.Header>
              <Dropdown.Divider />
              <Dropdown.Item href="/add-customer">
                <i className="bi bi-person-plus me-2"></i>
                Add New Member
              </Dropdown.Item>
              <Dropdown.Item href="/mark-attendance">
                <i className="bi bi-check2-circle me-2"></i>
                Mark Attendance
              </Dropdown.Item>
              <Dropdown.Item href="/payments">
                <i className="bi bi-credit-card me-2"></i>
                Add Payment
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>

          {/* User Profile */}
          <Dropdown align="end">
            <Dropdown.Toggle variant="link" className="user-profile-btn p-0 border-0">
              <div className="user-avatar">
                <img
                  src="https://via.placeholder.com/40x40/3498db/ffffff?text=A"
                  alt="Admin"
                  className="rounded-circle"
                />
              </div>
              <div className="user-info d-none d-md-block ms-2">
                <div className="user-name">Admin</div>
                <div className="user-role">Administrator</div>
              </div>
              <i className="bi bi-chevron-down ms-2"></i>
            </Dropdown.Toggle>

            <Dropdown.Menu className="user-menu">
              <Dropdown.Header>
                <div className="d-flex align-items-center">
                  <img
                    src="https://via.placeholder.com/50x50/3498db/ffffff?text=A"
                    alt="Admin"
                    className="rounded-circle me-3"
                  />
                  <div>
                    <div className="fw-bold">Admin User</div>
                    <small className="text-muted">admin@gymmaster.com</small>
                  </div>
                </div>
              </Dropdown.Header>
              <Dropdown.Divider />
              
              <Dropdown.Item>
                <i className="bi bi-person me-2"></i>
                Profile Settings
              </Dropdown.Item>
              <Dropdown.Item>
                <i className="bi bi-gear me-2"></i>
                System Settings
              </Dropdown.Item>
              <Dropdown.Item>
                <i className="bi bi-question-circle me-2"></i>
                Help & Support
              </Dropdown.Item>
              
              <Dropdown.Divider />
              <Dropdown.Item className="text-danger">
                <i className="bi bi-box-arrow-right me-2"></i>
                Logout
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </div>
      </div>
    </Navbar>
  );
};

export default Topbar;
