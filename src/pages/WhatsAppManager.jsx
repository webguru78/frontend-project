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
  Tab,
  InputGroup
} from 'react-bootstrap';
import axios from 'axios';

const WhatsAppManager = () => {
  const [whatsappStatus, setWhatsappStatus] = useState({
    status: 'disconnected',
    isReady: false,
    method: 'none',
    provider: 'none',
    qrCode: null
  });
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: '', variant: '' });
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [activeTab, setActiveTab] = useState('setup');
  const [showQRModal, setShowQRModal] = useState(false);
  
  // WhatsApp Verification
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationStep, setVerificationStep] = useState('phone'); // 'phone' or 'code'

  useEffect(() => {
    fetchWhatsAppStatus();
    fetchCustomers();
    
    // Poll status every 3 seconds when not ready
    const interval = setInterval(() => {
      if (!whatsappStatus.isReady) {
        fetchWhatsAppStatus();
      }
    }, 3000);
    
    return () => clearInterval(interval);
  }, [whatsappStatus.isReady]);

  const fetchWhatsAppStatus = async () => {
    try {
      const response = await axios.get('https://amfitness.fun/api/whatsapp/status');
      setWhatsappStatus(response.data);
      
      // Show QR modal if QR code is available
      if (response.data.qrCode && response.data.status === 'qr_ready') {
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
      const response = await axios.get('https://amfitness.fun/api/customers');
      setCustomers(response.data);
    } catch (error) {
      showAlert('Failed to fetch customers', 'danger');
    }
  };

  const showAlert = (message, variant = 'success') => {
    setAlert({ show: true, message, variant });
    setTimeout(() => setAlert({ show: false, message: '', variant: '' }), 5000);
  };

  const initializeWhatsAppWeb = async () => {
    setLoading(true);
    try {
      await axios.post('https://amfitness.fun/api/whatsapp/init-whatsapp-web');
      showAlert('WhatsApp Web initialization started. Please scan the QR code when it appears.', 'info');
      setTimeout(fetchWhatsAppStatus, 2000);
    } catch (error) {
      showAlert('Failed to initialize WhatsApp Web: ' + (error.response?.data?.error || error.message), 'danger');
    } finally {
      setLoading(false);
    }
  };

  const requestWhatsAppVerification = async () => {
    if (!phoneNumber) {
      showAlert('Please enter your phone number', 'warning');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('https://amfitness.fun/api/whatsapp/request-whatsapp-verification', {
        phoneNumber: phoneNumber
      });
      
      showAlert(response.data.message + (response.data.devMessage ? '\n' + response.data.devMessage : ''), 'success');
      setVerificationStep('code');
      
    } catch (error) {
      showAlert('Failed to send verification code: ' + (error.response?.data?.error || error.message), 'danger');
    } finally {
      setLoading(false);
    }
  };

  const verifyWhatsAppCode = async () => {
    if (!verificationCode) {
      showAlert('Please enter the verification code', 'warning');
      return;
    }

    setLoading(true);
    try {
      await axios.post('https://amfitness.fun/api/whatsapp/verify-whatsapp-code', {
        phoneNumber: phoneNumber,
        verificationCode: verificationCode
      });
      
      showAlert('Phone number verified successfully! You can now send WhatsApp messages.', 'success');
      setVerificationStep('phone');
      setPhoneNumber('');
      setVerificationCode('');
      fetchWhatsAppStatus();
      
    } catch (error) {
      showAlert('Verification failed: ' + (error.response?.data?.error || error.message), 'danger');
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
      
      if (!customer.phone || customer.phone.trim() === '') {
        showAlert(`Customer ${customer.name} does not have a valid phone number`, 'danger');
        return;
      }

      const response = await axios.post('https://amfitness.fun/api/whatsapp/send-message', {
        phoneNumber: customer.phone,
        message: customMessage,
        customerId: selectedCustomer
      });
      
      showAlert(`Message sent to ${customer.name} via WhatsApp`, 'success');
      setCustomMessage('');
      setSelectedCustomer('');
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message;
      showAlert(`Failed to send message: ${errorMessage}`, 'danger');
    } finally {
      setLoading(false);
    }
  };

  const sendWelcomeMessage = async (customerId) => {
    setLoading(true);
    try {
      await axios.post('https://amfitness.fun/api/whatsapp/send-welcome', {
        customerId
      });
      showAlert('Welcome message sent successfully via WhatsApp', 'success');
    } catch (error) {
      showAlert('Failed to send welcome message: ' + (error.response?.data?.error || error.message), 'danger');
    } finally {
      setLoading(false);
    }
  };

  const sendFeeReminder = async (customerId) => {
    setLoading(true);
    try {
      await axios.post('https://amfitness.fun/api/whatsapp/send-fee-reminder', {
        customerId
      });
      showAlert('Fee reminder sent successfully via WhatsApp', 'success');
    } catch (error) {
      showAlert('Failed to send fee reminder: ' + (error.response?.data?.error || error.message), 'danger');
    } finally {
      setLoading(false);
    }
  };

  const triggerAllFeeReminders = async () => {
    setLoading(true);
    try {
      const response = await axios.post('https://amfitness.fun/api/whatsapp/trigger-fee-reminders');
      showAlert(`Fee reminders sent via WhatsApp! ${response.data.stats.sent} sent, ${response.data.stats.failed} failed`, 'success');
    } catch (error) {
      showAlert('Failed to trigger fee reminders: ' + (error.response?.data?.error || error.message), 'danger');
    } finally {
      setLoading(false);
    }
  };

  const disconnectWhatsApp = async () => {
    setLoading(true);
    try {
      await axios.post('https://amfitness.fun/api/whatsapp/disconnect');
      showAlert('WhatsApp disconnected successfully', 'success');
      setWhatsappStatus({ status: 'disconnected', isReady: false, method: 'none', qrCode: null });
      setShowQRModal(false);
    } catch (error) {
      showAlert('Failed to disconnect WhatsApp', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      'connected': 'success',
      'disconnected': 'danger',
      'qr_ready': 'warning',
      'initializing': 'info',
      'authenticated': 'info',
      'auth_failure': 'danger'
    };
    
    const labels = {
      'connected': 'Connected & Ready',
      'disconnected': 'Disconnected',
      'qr_ready': 'QR Code Ready - Scan Now',
      'initializing': 'Starting Up...',
      'authenticated': 'Authenticated',
      'auth_failure': 'Authentication Failed'
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
              <p className="mb-0 mt-2">Direct WhatsApp integration - No external services needed!</p>
            </Card.Header>
            <Card.Body className="p-4">
              {alert.show && (
                <Alert variant={alert.variant} dismissible onClose={() => setAlert({ show: false })}>
                  <div style={{ whiteSpace: 'pre-line' }}>{alert.message}</div>
                </Alert>
              )}

              <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-4">
                <Tab eventKey="setup" title={
                  <span><i className="bi bi-gear me-2"></i>Setup & Status</span>
                }>
                  <Row>
                    <Col lg={6}>
                      <Card className="mb-4 border-success">
                        <Card.Header>
                          <h5 className="mb-0 text-success">
                            <i className="bi bi-whatsapp me-2"></i>
                            WhatsApp Web Connection
                          </h5>
                        </Card.Header>
                        <Card.Body>
                          <div className="d-flex justify-content-between align-items-center mb-3">
                            <span><strong>Status:</strong></span>
                            {getStatusBadge(whatsappStatus.status)}
                          </div>
                          
                          <div className="d-flex justify-content-between align-items-center mb-4">
                            <span><strong>Ready to Send:</strong></span>
                            <Badge bg={whatsappStatus.isReady ? 'success' : 'danger'}>
                              {whatsappStatus.isReady ? 'Yes ✅' : 'No ❌'}
                            </Badge>
                          </div>

                          <Alert variant="info" className="mb-3">
                            <h6><i className="bi bi-info-circle me-2"></i>How it works:</h6>
                            <ol className="mb-0 ps-3">
                              <li>Click "Connect WhatsApp Web"</li>
                              <li>Scan the QR code with your phone</li>
                              <li>Send verification code to yourself</li>
                              <li>Start sending messages!</li>
                            </ol>
                          </Alert>

                          <div className="d-grid gap-2">
                            {!whatsappStatus.isReady ? (
                              <Button 
                                variant="success" 
                                size="lg"
                                onClick={initializeWhatsAppWeb}
                                disabled={loading}
                              >
                                {loading ? (
                                  <>
                                    <Spinner size="sm" className="me-2" />
                                    Connecting...
                                  </>
                                ) : (
                                  <>
                                    <i className="bi bi-whatsapp me-2"></i>
                                    Connect WhatsApp Web
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
                                Disconnect WhatsApp
                              </Button>
                            )}
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>

                    <Col lg={6}>
                      <Card className="mb-4 border-primary">
                        <Card.Header>
                          <h5 className="mb-0 text-primary">
                            <i className="bi bi-shield-check me-2"></i>
                            Verification Setup
                          </h5>
                        </Card.Header>
                        <Card.Body>
                          <Alert variant="warning" className="mb-3">
                            <small>
                              <strong>One-time setup:</strong> Enter your WhatsApp number to receive and verify codes.
                            </small>
                          </Alert>

                          {verificationStep === 'phone' ? (
                            <>
                              <Form.Group className="mb-3">
                                <Form.Label>Your WhatsApp Number</Form.Label>
                                <InputGroup>
                                  <InputGroup.Text>+92</InputGroup.Text>
                                  <Form.Control
                                    type="tel"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    placeholder="3001234567"
                                    disabled={!whatsappStatus.isReady}
                                  />
                                </InputGroup>
                                <Form.Text className="text-muted">
                                  Enter without +92 (e.g., 3001234567)
                                </Form.Text>
                              </Form.Group>

                              <Button
                                variant="primary"
                                onClick={requestWhatsAppVerification}
                                disabled={!whatsappStatus.isReady || !phoneNumber || loading}
                                className="w-100"
                              >
                                {loading ? (
                                  <>
                                    <Spinner size="sm" className="me-2" />
                                    Sending to WhatsApp...
                                  </>
                                ) : (
                                  <>
                                    <i className="bi bi-send me-2"></i>
                                    Send Verification to My WhatsApp
                                  </>
                                )}
                              </Button>
                            </>
                          ) : (
                            <>
                              <Alert variant="success" className="mb-3">
                                <i className="bi bi-check-circle me-2"></i>
                                Verification code sent to your WhatsApp: <strong>+92{phoneNumber}</strong>
                              </Alert>

                              <Form.Group className="mb-3">
                                <Form.Label>Enter Verification Code</Form.Label>
                                <Form.Control
                                  type="text"
                                  value={verificationCode}
                                  onChange={(e) => setVerificationCode(e.target.value)}
                                  placeholder="Enter 6-digit code"
                                  maxLength="6"
                                />
                              </Form.Group>

                              <div className="d-grid gap-2">
                                <Button
                                  variant="success"
                                  onClick={verifyWhatsAppCode}
                                  disabled={!verificationCode || loading}
                                >
                                  {loading ? (
                                    <>
                                      <Spinner size="sm" className="me-2" />
                                      Verifying...
                                    </>
                                  ) : (
                                    <>
                                      <i className="bi bi-shield-check me-2"></i>
                                      Verify & Complete Setup
                                    </>
                                  )}
                                </Button>
                                
                                <Button
                                  variant="outline-secondary"
                                  size="sm"
                                  onClick={() => setVerificationStep('phone')}
                                >
                                  ← Back to Phone Number
                                </Button>
                              </div>
                            </>
                          )}

                          {!whatsappStatus.isReady && (
                            <Alert variant="warning" className="mt-3 mb-0">
                              <small>Please connect WhatsApp Web first before verification</small>
                            </Alert>
                          )}
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>
                </Tab>

                <Tab eventKey="send" title={
                  <span><i className="bi bi-chat-dots me-2"></i>Send Messages</span>
                } disabled={!whatsappStatus.isReady}>
                  <Row>
                    <Col lg={8}>
                      <Card>
                        <Card.Header>
                          <h5 className="mb-0">Send WhatsApp Message</h5>
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
                                  {customer.name} - {customer.phone || 'No phone'} ({customer.rollNumber})
                                </option>
                              ))}
                            </Form.Select>
                          </Form.Group>

                          <Form.Group className="mb-3">
                            <Form.Label>WhatsApp Message</Form.Label>
                            <Form.Control
                              as="textarea"
                              rows={6}
                              value={customMessage}
                              onChange={(e) => setCustomMessage(e.target.value)}
                              placeholder="Type your WhatsApp message here...
                              
You can use:
*Bold text*
_Italic text_
~Strikethrough~

🎉 Emojis work too!"
                            />
                            <Form.Text className="text-muted">
                              WhatsApp formatting: *bold*, _italic_, ~strikethrough~
                            </Form.Text>
                          </Form.Group>

                          <Button
                            variant="success"
                            size="lg"
                            onClick={sendCustomMessage}
                            disabled={!whatsappStatus.isReady || loading}
                            className="w-100"
                          >
                            {loading ? (
                              <>
                                <Spinner size="sm" className="me-2" />
                                Sending to WhatsApp...
                              </>
                            ) : (
                              <>
                                <i className="bi bi-whatsapp me-2"></i>
                                Send WhatsApp Message
                              </>
                            )}
                          </Button>
                        </Card.Body>
                      </Card>
                    </Col>

                    <Col lg={4}>
                      <Card className="mb-3">
                        <Card.Header>
                          <h5 className="mb-0">Quick Actions</h5>
                        </Card.Header>
                        <Card.Body>
                          <div className="d-grid gap-2">
                            <Button
                              variant="warning"
                              onClick={triggerAllFeeReminders}
                              disabled={!whatsappStatus.isReady || loading}
                            >
                              <i className="bi bi-currency-rupee me-2"></i>
                              Send All Fee Reminders ({pendingPaymentCustomers.length})
                            </Button>
                            
                            <hr />
                            
                            <Form.Group className="mb-3">
                              <Form.Label>Individual Actions:</Form.Label>
                              <Form.Select
                                value={selectedCustomer}
                                onChange={(e) => setSelectedCustomer(e.target.value)}
                                size="sm"
                              >
                                <option value="">Choose customer...</option>
                                {customers.map(customer => (
                                  <option key={customer._id} value={customer._id}>
                                    {customer.name} ({customer.rollNumber})
                                  </option>
                                ))}
                              </Form.Select>
                            </Form.Group>

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
                              variant="outline-warning"
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
                  <span><i className="bi bi-people me-2"></i>Pending ({pendingPaymentCustomers.length})</span>
                } disabled={!whatsappStatus.isReady}>
                  <Card>
                    <Card.Header>
                      <div className="d-flex justify-content-between align-items-center">
                        <h5 className="mb-0">Customers with Pending Payments</h5>
                        <Button
                          variant="warning"
                          size="sm"
                          onClick={triggerAllFeeReminders}
                          disabled={!whatsappStatus.isReady || loading || pendingPaymentCustomers.length === 0}
                        >
                          <i className="bi bi-whatsapp me-1"></i>
                          Send All WhatsApp Reminders
                        </Button>
                      </div>
                    </Card.Header>
                    <Card.Body style={{ maxHeight: '500px', overflowY: 'auto' }}>
                      <ListGroup>
                        {pendingPaymentCustomers.map(customer => (
                          <ListGroup.Item key={customer._id} className="d-flex justify-content-between align-items-center">
                            <div>
                              <strong>{customer.name}</strong> ({customer.rollNumber})
                              <br />
                              <small className="text-muted">
                                📱 Phone: {customer.phone || 'No phone'} | 💰 Remaining: PKR {customer.remaining}
                              </small>
                            </div>
                            <div className="d-flex gap-1">
                              <Button
                                variant="outline-success"
                                size="sm"
                                onClick={() => sendWelcomeMessage(customer._id)}
                                disabled={!whatsappStatus.isReady || loading || !customer.phone}
                                title="Welcome Message"
                              >
                                <i className="bi bi-heart"></i>
                              </Button>
                              <Button
                                variant="outline-warning"
                                size="sm"
                                onClick={() => sendFeeReminder(customer._id)}
                                disabled={!whatsappStatus.isReady || loading || !customer.phone}
                                title="Fee Reminder"
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
      <Modal show={showQRModal} onHide={() => setShowQRModal(false)} centered size="md">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-qr-code me-2"></i>
            Scan QR Code with WhatsApp
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          {whatsappStatus.qrCode ? (
            <div>
              <img 
                src={whatsappStatus.qrCode} 
                alt="WhatsApp QR Code" 
                className="img-fluid mb-3"
                style={{ maxWidth: '300px', border: '2px solid #25D366', borderRadius: '10px' }}
              />
              <Alert variant="success">
                <h6><i className="bi bi-phone me-2"></i>Steps to connect:</h6>
                <ol className="text-start mb-0">
                  <li>Open WhatsApp on your phone</li>
                  <li>Tap Menu (⋮) → Linked Devices</li>
                  <li>Tap "Link a Device"</li>
                  <li>Point your phone at this QR code</li>
                </ol>
              </Alert>
            </div>
          ) : (
            <div>
              <Spinner animation="border" size="lg" className="mb-3 text-success" />
              <p>Generating QR Code...</p>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowQRModal(false)}>
            Close
          </Button>
          <Button variant="success" onClick={fetchWhatsAppStatus}>
            <i className="bi bi-arrow-clockwise me-2"></i>
            Refresh Status
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default WhatsAppManager;
