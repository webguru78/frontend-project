import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Row, 
  Col, 
  Card, 
  Button, 
  Alert, 
  Badge,
  Form,
  ListGroup,
  Modal,
  Spinner,
  Tabs,
  Tab
} from 'react-bootstrap';
import axios from 'axios';

const WhatsAppManager = () => {
  const [whatsappStatus, setWhatsappStatus] = useState({
    status: 'disconnected',
    isReady: false,
    qrCode: null
  });
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: '', variant: '' });
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [showQRModal, setShowQRModal] = useState(false);
  const [activeTab, setActiveTab] = useState('status');

  useEffect(() => {
    fetchWhatsAppStatus();
    fetchCustomers();
    
    // Poll status every 5 seconds
    const interval = setInterval(fetchWhatsAppStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchWhatsAppStatus = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/whatsapp/status');
      setWhatsappStatus(response.data);
      
      if (response.data.qrCode && response.data.status === 'qr_code') {
        setShowQRModal(true);
      } else if (response.data.status === 'connected') {
        setShowQRModal(false);
      }
    } catch (error) {
      console.error('Error fetching WhatsApp status:', error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/customers');
      setCustomers(response.data);
    } catch (error) {
      showAlert('Failed to fetch customers', 'danger');
    }
  };

  const showAlert = (message, variant = 'success') => {
    setAlert({ show: true, message, variant });
    setTimeout(() => setAlert({ show: false, message: '', variant: '' }), 5000);
  };

  const initializeWhatsApp = async () => {
    setLoading(true);
    try {
      await axios.post('http://localhost:5000/api/whatsapp/initialize');
      showAlert('WhatsApp initialization started. Please scan QR code.', 'info');
      setTimeout(fetchWhatsAppStatus, 2000);
    } catch (error) {
      showAlert('Failed to initialize WhatsApp', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const disconnectWhatsApp = async () => {
    setLoading(true);
    try {
      await axios.post('http://localhost:5000/api/whatsapp/disconnect');
      showAlert('WhatsApp disconnected successfully', 'success');
      setWhatsappStatus({ status: 'disconnected', isReady: false, qrCode: null });
    } catch (error) {
      showAlert('Failed to disconnect WhatsApp', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const sendCustomMessage = async () => {
    if (!selectedCustomer || !customMessage) {
      showAlert('Please select customer and enter message', 'warning');
      return;
    }

    setLoading(true);
    try {
      const customer = customers.find(c => c._id === selectedCustomer);
      await axios.post('http://localhost:5000/api/whatsapp/send-message', {
        phoneNumber: customer.phone,
        message: customMessage,
        customerId: selectedCustomer
      });
      
      showAlert(`Message sent to ${customer.name}`, 'success');
      setCustomMessage('');
      setSelectedCustomer('');
    } catch (error) {
      showAlert('Failed to send message: ' + (error.response?.data?.error || error.message), 'danger');
    } finally {
      setLoading(false);
    }
  };

  const sendWelcomeMessage = async (customerId) => {
    setLoading(true);
    try {
      await axios.post('http://localhost:5000/api/whatsapp/send-welcome', {
        customerId
      });
      showAlert('Welcome message sent successfully', 'success');
    } catch (error) {
      showAlert('Failed to send welcome message', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const sendFeeReminder = async (customerId) => {
    setLoading(true);
    try {
      await axios.post('http://localhost:5000/api/whatsapp/send-fee-reminder', {
        customerId
      });
      showAlert('Fee reminder sent successfully', 'success');
    } catch (error) {
      showAlert('Failed to send fee reminder', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const triggerAllFeeReminders = async () => {
    setLoading(true);
    try {
      await axios.post('http://localhost:5000/api/whatsapp/trigger-fee-reminders');
      showAlert('Fee reminders triggered for all pending customers', 'success');
    } catch (error) {
      showAlert('Failed to trigger fee reminders', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const triggerExpiryReminders = async () => {
    setLoading(true);
    try {
      await axios.post('http://localhost:5000/api/whatsapp/trigger-expiry-reminders');
      showAlert('Expiry reminders triggered for expiring customers', 'success');
    } catch (error) {
      showAlert('Failed to trigger expiry reminders', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      'connected': 'success',
      'disconnected': 'danger',
      'qr_code': 'warning',
      'authenticated': 'info',
      'auth_failed': 'danger',
      'error': 'danger'
    };
    
    const labels = {
      'connected': 'Connected',
      'disconnected': 'Disconnected',
      'qr_code': 'Scan QR Code',
      'authenticated': 'Authenticated',
      'auth_failed': 'Auth Failed',
      'error': 'Error'
    };

    return <Badge bg={variants[status] || 'secondary'}>{labels[status] || status}</Badge>;
  };

  const pendingPaymentCustomers = customers.filter(c => c.remaining > 0);

  return (
    <Container className="py-4">
      <Row className="mb-4">
        <Col>
          <Card className="shadow-lg border-0">
            <Card.Header className="bg-success text-white py-4">
              <h2 className="mb-0 fw-bold">
                <i className="bi bi-whatsapp me-3"></i>
                WhatsApp Message Manager
              </h2>
            </Card.Header>
            <Card.Body className="p-4">
              {alert.show && (
                <Alert variant={alert.variant} dismissible onClose={() => setAlert({ show: false })}>
                  {alert.message}
                </Alert>
              )}

              <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-4">
                <Tab eventKey="status" title={
                  <span><i className="bi bi-wifi me-2"></i>Connection Status</span>
                }>
                  <Row>
                    <Col lg={6}>
                      <Card className="mb-4">
                        <Card.Header>
                          <h5 className="mb-0">WhatsApp Connection</h5>
                        </Card.Header>
                        <Card.Body>
                          <div className="d-flex justify-content-between align-items-center mb-3">
                            <span>Status:</span>
                            {getStatusBadge(whatsappStatus.status)}
                          </div>
                          
                          <div className="d-flex justify-content-between align-items-center mb-3">
                            <span>Ready:</span>
                            <Badge bg={whatsappStatus.isReady ? 'success' : 'danger'}>
                              {whatsappStatus.isReady ? 'Yes' : 'No'}
                            </Badge>
                          </div>

                          <div className="d-flex gap-2">
                            {!whatsappStatus.isReady ? (
                              <Button 
                                variant="success" 
                                onClick={initializeWhatsApp}
                                disabled={loading}
                              >
                                {loading ? (
                                  <>
                                    <Spinner size="sm" className="me-2" />
                                    Connecting...
                                  </>
                                ) : (
                                  <>
                                    <i className="bi bi-power me-2"></i>
                                    Connect WhatsApp
                                  </>
                                )}
                              </Button>
                            ) : (
                              <Button 
                                variant="danger" 
                                onClick={disconnectWhatsApp}
                                disabled={loading}
                              >
                                <i className="bi bi-power me-2"></i>
                                Disconnect
                              </Button>
                            )}
                            
                            <Button 
                              variant="outline-primary" 
                              onClick={fetchWhatsAppStatus}
                            >
                              <i className="bi bi-arrow-clockwise me-2"></i>
                              Refresh
                            </Button>
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>

                    <Col lg={6}>
                      <Card>
                        <Card.Header>
                          <h5 className="mb-0">Auto Reminders</h5>
                        </Card.Header>
                        <Card.Body>
                          <p className="text-muted mb-3">
                            Automatic reminders are sent daily at 10:00 AM for fee payments 
                            and at 9:00 AM for membership expiry (3 days before).
                          </p>
                          
                          <div className="d-grid gap-2">
                            <Button 
                              variant="warning" 
                              onClick={triggerAllFeeReminders}
                              disabled={!whatsappStatus.isReady || loading}
                            >
                              <i className="bi bi-currency-rupee me-2"></i>
                              Trigger Fee Reminders ({pendingPaymentCustomers.length})
                            </Button>
                            
                            <Button 
                              variant="info" 
                              onClick={triggerExpiryReminders}
                              disabled={!whatsappStatus.isReady || loading}
                            >
                              <i className="bi bi-calendar-x me-2"></i>
                              Trigger Expiry Reminders
                            </Button>
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>
                </Tab>

                <Tab eventKey="manual" title={
                  <span><i className="bi bi-chat-dots me-2"></i>Manual Messages</span>
                }>
                  <Row>
                    <Col lg={8}>
                      <Card>
                        <Card.Header>
                          <h5 className="mb-0">Send Custom Message</h5>
                        </Card.Header>
                        <Card.Body>
                          <Form.Group className="mb-3">
                            <Form.Label>Select Customer</Form.Label>
                            <Form.Select
                              value={selectedCustomer}
                              onChange={(e) => setSelectedCustomer(e.target.value)}
                            >
                              <option value="">Choose customer...</option>
                              {customers.map(customer => (
                                <option key={customer._id} value={customer._id}>
                                  {customer.name} - {customer.phone} ({customer.rollNumber})
                                </option>
                              ))}
                            </Form.Select>
                          </Form.Group>

                          <Form.Group className="mb-3">
                            <Form.Label>Message</Form.Label>
                            <Form.Control
                              as="textarea"
                              rows={5}
                              value={customMessage}
                              onChange={(e) => setCustomMessage(e.target.value)}
                              placeholder="Enter your message here..."
                            />
                          </Form.Group>

                          <Button
                            variant="primary"
                            onClick={sendCustomMessage}
                            disabled={!whatsappStatus.isReady || loading}
                          >
                            {loading ? (
                              <>
                                <Spinner size="sm" className="me-2" />
                                Sending...
                              </>
                            ) : (
                              <>
                                <i className="bi bi-send me-2"></i>
                                Send Message
                              </>
                            )}
                          </Button>
                        </Card.Body>
                      </Card>
                    </Col>

                    <Col lg={4}>
                      <Card>
                        <Card.Header>
                          <h5 className="mb-0">Quick Actions</h5>
                        </Card.Header>
                        <Card.Body>
                          <p className="text-muted mb-3">Send predefined messages to customers</p>
                          
                          <Form.Group className="mb-3">
                            <Form.Label>Select Customer</Form.Label>
                            <Form.Select
                              value={selectedCustomer}
                              onChange={(e) => setSelectedCustomer(e.target.value)}
                            >
                              <option value="">Choose customer...</option>
                              {customers.map(customer => (
                                <option key={customer._id} value={customer._id}>
                                  {customer.name} ({customer.rollNumber})
                                </option>
                              ))}
                            </Form.Select>
                          </Form.Group>

                          <div className="d-grid gap-2">
                            <Button
                              variant="success"
                              size="sm"
                              onClick={() => sendWelcomeMessage(selectedCustomer)}
                              disabled={!selectedCustomer || !whatsappStatus.isReady || loading}
                            >
                              <i className="bi bi-heart me-1"></i>
                              Welcome Message
                            </Button>
                            
                            <Button
                              variant="warning"
                              size="sm"
                              onClick={() => sendFeeReminder(selectedCustomer)}
                              disabled={!selectedCustomer || !whatsappStatus.isReady || loading}
                            >
                              <i className="bi bi-currency-rupee me-1"></i>
                              Fee Reminder
                            </Button>
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>
                </Tab>

                <Tab eventKey="customers" title={
                  <span><i className="bi bi-people me-2"></i>Customer List</span>
                }>
                  <Card>
                    <Card.Header>
                      <h5 className="mb-0">Customers with Pending Payments ({pendingPaymentCustomers.length})</h5>
                    </Card.Header>
                    <Card.Body style={{ maxHeight: '500px', overflowY: 'auto' }}>
                      <ListGroup>
                        {pendingPaymentCustomers.map(customer => (
                          <ListGroup.Item key={customer._id} className="d-flex justify-content-between align-items-center">
                            <div>
                              <strong>{customer.name}</strong> ({customer.rollNumber})
                              <br />
                              <small className="text-muted">
                                Phone: {customer.phone} | Remaining: ₹{customer.remaining}
                              </small>
                            </div>
                            <div className="d-flex gap-1">
                              <Button
                                variant="outline-success"
                                size="sm"
                                onClick={() => sendWelcomeMessage(customer._id)}
                                disabled={!whatsappStatus.isReady || loading}
                              >
                                <i className="bi bi-heart"></i>
                              </Button>
                              <Button
                                variant="outline-warning"
                                size="sm"
                                onClick={() => sendFeeReminder(customer._id)}
                                disabled={!whatsappStatus.isReady || loading}
                              >
                                <i className="bi bi-currency-rupee"></i>
                              </Button>
                            </div>
                          </ListGroup.Item>
                        ))}
                      </ListGroup>
                      
                      {pendingPaymentCustomers.length === 0 && (
                        <div className="text-center py-4">
                          <i className="bi bi-check-circle display-1 text-success"></i>
                          <h5 className="text-success mt-3">All payments are up to date!</h5>
                        </div>
                      )}
                    </Card.Body>
                  </Card>
                </Tab>
              </Tabs>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* QR Code Modal */}
      <Modal show={showQRModal} onHide={() => setShowQRModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-qr-code me-2"></i>
            Scan QR Code
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          {whatsappStatus.qrCode ? (
            <div>
              <img 
                src={whatsappStatus.qrCode} 
                alt="WhatsApp QR Code" 
                className="img-fluid mb-3"
                style={{ maxWidth: '300px' }}
              />
              <p className="text-muted">
                Open WhatsApp on your phone and scan this QR code to connect.
              </p>
            </div>
          ) : (
            <div>
              <Spinner animation="border" className="mb-3" />
              <p>Generating QR Code...</p>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowQRModal(false)}>
            Close
          </Button>
          <Button variant="primary" onClick={fetchWhatsAppStatus}>
            <i className="bi bi-arrow-clockwise me-2"></i>
            Refresh
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default WhatsAppManager;
