import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Alert, Spinner, Modal, Form, Button, Badge } from 'react-bootstrap';
import axios from 'axios';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalCustomers: 0,
    activeMembers: 0,
    expiredMembers: 0,
    todayAttendance: 0,
    totalIncome: 0,
    pendingAmount: 0,
    monthlyIncome: 0,
    regularMembers: 0,
    trainingMembers: 0,
    premiumMembers: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Admin password (in production, this should be from environment variables or database)
  const ADMIN_PASSWORD = 'gym123admin';

  useEffect(() => {
    fetchDashboardData();
    // Check if admin is already authenticated in session storage
    const adminAuth = sessionStorage.getItem('adminAuthenticated');
    if (adminAuth === 'true') {
      setIsAdminAuthenticated(true);
    }
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [customersRes, attendanceRes] = await Promise.all([
        axios.get(`https://backend-deploy-ten-pi.vercel.app/api/customers`),
        axios.get(`https://backend-deploy-ten-pi.vercel.app/api/attendance`)
      ]);

      const customers = customersRes.data;
      const attendance = attendanceRes.data;
      const today = new Date().toISOString().split('T')[0];
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      // Calculate statistics
      const totalCustomers = customers.length;
      const activeMembers = customers.filter(c => 
        new Date(c.expiryDate) > new Date()
      ).length;
      const expiredMembers = totalCustomers - activeMembers;
      
      const todayAttendance = attendance.filter(a => a.date === today).length;
      const totalIncome = customers.reduce((sum, c) => sum + (c.fee || 0), 0);
      const pendingAmount = customers.reduce((sum, c) => sum + (c.remaining || 0), 0);
      
      const monthlyIncome = customers
        .filter(c => {
          const joinDate = new Date(c.joinDate);
          return joinDate.getMonth() === currentMonth && 
                 joinDate.getFullYear() === currentYear;
        })
        .reduce((sum, c) => sum + (c.fee || 0), 0);

      const regularMembers = customers.filter(c => c.membership === 'regular').length;
      const trainingMembers = customers.filter(c => c.membership === 'training').length;
      const premiumMembers = customers.filter(c => c.membership === 'premium').length;

      setStats({
        totalCustomers,
        activeMembers,
        expiredMembers,
        todayAttendance,
        totalIncome,
        pendingAmount,
        monthlyIncome,
        regularMembers,
        trainingMembers,
        premiumMembers
      });
    } catch (err) {
      setError('Failed to fetch dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminAuthentication = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    // Simulate authentication delay
    setTimeout(() => {
      if (adminPassword === ADMIN_PASSWORD) {
        setIsAdminAuthenticated(true);
        setShowAdminModal(false);
        setAdminPassword('');
        sessionStorage.setItem('adminAuthenticated', 'true');
      } else {
        setAuthError('Invalid password! Please try again.');
      }
      setAuthLoading(false);
    }, 1000);
  };

  const handleAdminLogout = () => {
    setIsAdminAuthenticated(false);
    sessionStorage.removeItem('adminAuthenticated');
  };

  const handleProtectedCardClick = (cardTitle) => {
    if (!isAdminAuthenticated) {
      setShowAdminModal(true);
    }
  };

  if (loading) {
    return (
      <Container className="text-center mt-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading dashboard...</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="mt-4">
        <Alert variant="danger">{error}</Alert>
      </Container>
    );
  }

  const statCards = [
    {
      title: 'Total Members',
      value: stats.totalCustomers,
      icon: 'bi-people-fill',
      color: 'primary',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      protected: false
    },
    {
      title: 'Active Members',
      value: stats.activeMembers,
      icon: 'bi-person-check-fill',
      color: 'success',
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      protected: false
    },
    {
      title: 'Expired Members',
      value: stats.expiredMembers,
      icon: 'bi-person-x-fill',
      color: 'danger',
      gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      protected: false
    },
    {
      title: 'Today\'s Attendance',
      value: stats.todayAttendance,
      icon: 'bi-calendar-check-fill',
      color: 'info',
      gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
      protected: false
    },
    {
      title: 'Total Income',
      value: isAdminAuthenticated ? `RS ${stats.totalIncome.toLocaleString()}` : 'Protected',
      icon: 'bi-currency-rupee',
      color: 'warning',
      gradient: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
      protected: true
    },
    {
      title: 'Pending Amount',
      value: isAdminAuthenticated ? `RS ${stats.pendingAmount.toLocaleString()}` : 'Protected',
      icon: 'bi-exclamation-triangle-fill',
      color: 'secondary',
      gradient: 'linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)',
      protected: true
    }
  ];

  return (
    <Container fluid className="fade-in">
      {/* Admin Status Banner */}
      {isAdminAuthenticated && (
        <Alert variant="success" className="mb-4 d-flex justify-content-between align-items-center">
          <div>
            <i className="bi bi-shield-check me-2"></i>
            <strong>Admin Mode Active</strong> - You can view all financial data
          </div>
          <Button 
            variant="outline-success" 
            size="sm"
            onClick={handleAdminLogout}
          >
            <i className="bi bi-box-arrow-right me-1"></i>
            Logout
          </Button>
        </Alert>
      )}

      <Row className="mb-4">
        <Col>
          <h1 className="display-4 text-center fw-bold mb-4">
            <i className="bi bi-speedometer2 me-3"></i>
            Gym Dashboard
          </h1>
        </Col>
      </Row>

      <Row className="g-4 mb-5">
        {statCards.map((card, index) => (
          <Col key={index} xs={12} sm={6} lg={4}>
            <Card 
              className={`h-100 stat-card border-0 shadow-sm ${card.protected && !isAdminAuthenticated ? 'protected-card' : ''}`}
              onClick={() => card.protected && handleProtectedCardClick(card.title)}
              style={{ cursor: card.protected && !isAdminAuthenticated ? 'pointer' : 'default' }}
            >
              <Card.Body className="p-4 position-relative overflow-hidden">
                <div 
                  className="position-absolute top-0 start-0 w-100 h-100 opacity-10"
                  style={{ background: card.gradient }}
                ></div>
                <div className="position-relative">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div>
                      <h3 className="fw-bold mb-0" style={{ fontSize: '2.5rem' }}>
                        {card.protected && !isAdminAuthenticated ? (
                          <i className="bi bi-lock-fill text-muted"></i>
                        ) : (
                          card.value
                        )}
                      </h3>
                      <p className="text-muted mb-0 fw-medium">
                        {card.title}
                        {card.protected && !isAdminAuthenticated && (
                          <Badge bg="warning" className="ms-2">
                            <i className="bi bi-shield-lock me-1"></i>
                            Admin Only
                          </Badge>
                        )}
                      </p>
                    </div>
                    <div 
                      className="rounded-circle p-3 d-flex align-items-center justify-content-center"
                      style={{ 
                        background: card.gradient,
                        width: '60px',
                        height: '60px'
                      }}
                    >
                      <i className={`${card.protected && !isAdminAuthenticated ? 'bi-lock-fill' : card.icon} text-white fs-4`}></i>
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      <Row className="g-4">
        <Col lg={6}>
          <Card className="shadow-sm border-0">
            <Card.Header className="bg-gradient text-white" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
              <h5 className="mb-0">
                <i className="bi bi-pie-chart-fill me-2"></i>
                Membership Distribution
              </h5>
            </Card.Header>
            <Card.Body>
              <Row className="text-center">
                <Col xs={4}>
                  <div className="p-3">
                    <h4 className="text-primary fw-bold">{stats.regularMembers}</h4>
                    <small className="text-muted">Regular</small>
                  </div>
                </Col>
                <Col xs={4}>
                  <div className="p-3">
                    <h4 className="text-success fw-bold">{stats.trainingMembers}</h4>
                    <small className="text-muted">Training</small>
                  </div>
                </Col>
                <Col xs={4}>
                  <div className="p-3">
                    <h4 className="text-warning fw-bold">{stats.premiumMembers}</h4>
                    <small className="text-muted">Premium</small>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={6}>
          <Card className="shadow-sm border-0">
            <Card.Header className="bg-gradient text-white" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
              <h5 className="mb-0">
                <i className="bi bi-graph-up me-2"></i>
                Monthly Overview
              </h5>
            </Card.Header>
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <h6 className="text-muted mb-1">This Month Income</h6>
                  <h4 className="fw-bold text-success">
                    {isAdminAuthenticated ? (
                      `RS${stats.monthlyIncome.toLocaleString()}`
                    ) : (
                      <span className="text-muted">
                        <i className="bi bi-lock-fill me-1"></i>
                        Protected
                      </span>
                    )}
                  </h4>
                </div>
                <div className="text-end">
                  <h6 className="text-muted mb-1">Attendance Rate</h6>
                  <h4 className="fw-bold text-info">
                    {stats.totalCustomers > 0 ? Math.round((stats.todayAttendance / stats.totalCustomers) * 100) : 0}%
                  </h4>
                </div>
              </div>
              {!isAdminAuthenticated && (
                <div className="text-center">
                  <Button 
                    variant="outline-primary" 
                    size="sm"
                    onClick={() => setShowAdminModal(true)}
                  >
                    <i className="bi bi-unlock me-1"></i>
                    Admin Access Required
                  </Button>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Admin Authentication Modal */}
      <Modal show={showAdminModal} onHide={() => setShowAdminModal(false)} centered>
        <Modal.Header closeButton className="bg-primary text-white">
          <Modal.Title>
            <i className="bi bi-shield-lock me-2"></i>
            Admin Authentication
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleAdminAuthentication}>
          <Modal.Body>
            <div className="text-center mb-4">
              <i className="bi bi-key-fill text-primary" style={{ fontSize: '3rem' }}></i>
              <p className="mt-2 text-muted">
                Enter admin password to view financial data
              </p>
            </div>
            
            {authError && (
              <Alert variant="danger" className="mb-3">
                <i className="bi bi-exclamation-triangle me-2"></i>
                {authError}
              </Alert>
            )}
            
            <Form.Group>
              <Form.Label className="fw-semibold">Admin Password</Form.Label>
              <Form.Control
                type="password"
                placeholder="Enter admin password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                required
                autoFocus
              />
              <Form.Text className="text-muted">
                <i className="bi bi-info-circle me-1"></i>
                Default password: gym123admin
              </Form.Text>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button 
              variant="secondary" 
              onClick={() => {
                setShowAdminModal(false);
                setAdminPassword('');
                setAuthError('');
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="primary" 
              type="submit"
              disabled={authLoading || !adminPassword}
            >
              {authLoading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Authenticating...
                </>
              ) : (
                <>
                  <i className="bi bi-unlock me-1"></i>
                  Authenticate
                </>
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default Dashboard;
