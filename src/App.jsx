import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Dashboard from './pages/Dashboard';
import CustomerForm from './pages/CustomerForm';
import CustomerList from './pages/CustomerList';
import PaymentForm from './pages/PaymentForm';
import MessageSender from './pages/MessageSender';
import MarkAttendance from './pages/MarkAttendance';
import ViewAttendance from './pages/ViewAttendance';
import PendingPayments from './pages/PendingPayments';
import Reports from './pages/Reports';
import WhatsAppManager from './pages/WhatsAppManager'
import './App.css';

function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className="app-wrapper">
      <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
      <div 
        className={`main-content-wrapper ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}
        style={{ 
          marginLeft: sidebarCollapsed ? '70px' : '260px',
          transition: 'margin-left 0.3s ease'
        }}
      >
        <Topbar onToggleSidebar={toggleSidebar} />
        <main className="main-content">
          <div className="content-container">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/add-customer" element={<CustomerForm />} />
              <Route path="/customers" element={<CustomerList />} />
              <Route path="/payments" element={<PaymentForm />} />
              <Route path="/pending-payments" element={<PendingPayments />} />
              <Route path="/message" element={<MessageSender />} />
              <Route path="/mark-attendance" element={<MarkAttendance />} />
              <Route path="/view-attendance" element={<ViewAttendance />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/whatsapp" element={<WhatsAppManager />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
