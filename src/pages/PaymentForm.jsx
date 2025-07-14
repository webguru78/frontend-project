import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Row, 
  Col, 
  Card, 
  Form, 
  Button, 
  Alert, 
  Table,
  Badge,
  InputGroup,
  Modal,
  Spinner
} from 'react-bootstrap';
import axios from 'axios';

const PaymentForm = () => {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: '', variant: '' });
  const [recentPayments, setRecentPayments] = useState([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    fetchCustomers();
    fetchRecentPayments();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/customers');
      // Filter customers with pending payments
      const pendingCustomers = response.data.filter(customer => customer.remaining > 0);
      setCustomers(pendingCustomers);
    } catch (error) {
      showAlert('Failed to fetch customers', 'danger');
    }
  };

  const fetchRecentPayments = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/payments/recent');
      setRecentPayments(response.data || []);
    } catch (error) {
      console.error('Error fetching recent payments:', error);
    }
  };

  const showAlert = (message, variant = 'success') => {
    setAlert({ show: true, message, variant });
    setTimeout(() => setAlert({ show: false, message: '', variant: '' }), 5000);
  };

  const handleCustomerSelect = (e) => {
    const customerId = e.target.value;
    setSelectedCustomer(customerId);
    
    const customer = customers.find(c => c._id === customerId);
    if (customer) {
      setPaymentAmount(customer.remaining);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const customer = customers.find(c => c._id === selectedCustomer);
    if (!customer) {
      showAlert('Please select a customer', 'danger');
      return;
    }

    if (parseFloat(paymentAmount) > customer.remaining) {
      showAlert('Payment amount cannot exceed remaining amount', 'danger');
      return;
    }

    setShowConfirmModal(true);
  };

  const confirmPayment = async () => {
    setLoading(true);
    setShowConfirmModal(false);

    try {
      await axios.put(`http://localhost:5000/api/customers/${selectedCustomer}/payment`, {
        amount: parseFloat(paymentAmount),
        method: paymentMethod,
        description
      });

      showAlert('Payment recorded successfully!', 'success');
      
      // Reset form
      setSelectedCustomer('');
      setPaymentAmount('');
      setPaymentMethod('cash');
      setDescription('');
      
      // Refresh data
      fetchCustomers();
      fetchRecentPayments();
      
    } catch (error) {
      showAlert('Failed to record payment', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const selectedCustomerData = customers.find(c => c._id === selectedCustomer);

  return (
    <Container className="py-4">
      <Row>
        <Col lg={8}>
          <Card className="shadow-lg border-0">
            <Card.Header className="bg-success text-white py-4">
              <h2 className="mb-0 fw-bold">
                <i className="bi bi-credit-card me-3"></i>
                Record Payment
              </h2>
            </Card.Header>
            <Card.Body className="p-5">
              {alert.show && (
                <Alert variant={alert.variant} dismissible onClose={() => setAlert({ show: false })}>
                  {alert.message}
                </Alert>
              )}

              <Form onSubmit={handleSubmit}>
                {/* Customer Selection */}
                <Form.Group className="mb-4">
                  <Form.Label className="fw-semibold">
                    <i className="bi bi-person me-2"></i>Select Customer *
                  </Form.Label>
                  <Form.Select
                    value={selectedCustomer}
                    onChange={handleCustomerSelect}
                    required
                  >
                    <option value="">Choose a customer with pending payment...</option>
                    {customers.map(customer => (
                      <option key={customer._id} value={customer._id}>
                        {customer.rollNumber} - {customer.name} (Pending: ₹{customer.remaining})
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>

                {/* Customer Details */}
                {selectedCustomerData && (
                  <Card className="mb-4 bg-light">
                    <Card.Body>
                      <Row>
                        <Col md={6}>
                          <h6 className="text-primary">Customer Details</h6>
                          <p><strong>Name:</strong> {selectedCustomerData.name}</p>
                          <p><strong>Roll Number:</strong> {selectedCustomerData.rollNumber}</p>
                          <p><strong>Phone:</strong> {selectedCustomerData.phone}</p>
                        </Col>
                        <Col md={6}>
                          <h6 className="text-primary">Payment Information</h6>
                          <p><strong>Total Fee:</strong> ₹{selectedCustomerData.fee}</p>
                          <p><strong>Paid Amount:</strong> ₹{selectedCustomerData.paidAmount || 0}</p>
                          <p><strong>Remaining:</strong> <span className="text-danger fw-bold">₹{selectedCustomerData.remaining}</span></p>
                        </Col>
                      </Row>
                    </Card.Body>
                  </Card>
                )}

                {/* Payment Details */}
                <Row className="mb-4">
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label className="fw-semibold">Payment Amount *</Form.Label>
                      <InputGroup>
                        <InputGroup.Text>₹</InputGroup.Text>
                        <Form.Control
                          type="number"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                          placeholder="Enter amount"
                          min="1"
                          max={selectedCustomerData?.remaining || 0}
                          required
                        />
                      </InputGroup>
                      {selectedCustomerData && (
                        <Form.Text className="text-muted">
                          Maximum amount: ₹{selectedCustomerData.remaining}
                        </Form.Text>
                      )}
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label className="fw-semibold">Payment Method *</Form.Label>
                      <Form.Select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        required
                      >
                        <option value="cash">Cash</option>
                        <option value="card">Credit/Debit Card</option>
                        <option value="upi">UPI</option>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="cheque">Cheque</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-4">
                  <Form.Label className="fw-semibold">Description (Optional)</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter payment description or notes..."
                  />
                </Form.Group>

                <div className="text-center">
                  <Button
                    type="submit"
                    variant="success"
                    size="lg"
                    className="px-5 py-3"
                    disabled={loading || !selectedCustomer}
                  >
                    <i className="bi bi-check-circle me-2"></i>
                    Record Payment
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          {/* Recent Payments */}
          <Card className="shadow border-0">
            <Card.Header className="bg-info text-white">
              <h5 className="mb-0">
                <i className="bi bi-clock-history me-2"></i>
                Recent Payments
              </h5>
            </Card.Header>
            <Card.Body style={{ maxHeight: '500px', overflowY: 'auto' }}>
              {recentPayments.length === 0 ? (
                <p className="text-muted text-center">No recent payments</p>
              ) : (
                recentPayments.map((payment, index) => (
                  <div key={index} className="mb-3 p-3 border rounded">
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <h6 className="mb-1">{payment.customerName}</h6>
                        <small className="text-muted">{payment.rollNumber}</small>
                      </div>
                      <Badge bg="success">₹{payment.amount}</Badge>
                    </div>
                    <div className="mt-2">
                      <small className="text-muted">
                        <i className="bi bi-calendar me-1"></i>
                        {new Date(payment.date).toLocaleDateString()}
                      </small>
                      <br />
                      <small className="text-muted">
                        <i className="bi bi-credit-card me-1"></i>
                        {payment.method}
                      </small>
                    </div>
                  </div>
                ))
              )}
            </Card.Body>
          </Card>

          {/* Quick Stats */}
          <Card className="shadow border-0 mt-4">
            <Card.Header className="bg-warning text-dark">
              <h5 className="mb-0">
                <i className="bi bi-graph-up me-2"></i>
                Payment Stats
              </h5>
            </Card.Header>
            <Card.Body>
              <div className="text-center">
                <h4 className="text-primary">{customers.length}</h4>
                <p className="text-muted mb-3">Pending Payments</p>
                
                <h4 className="text-danger">
                  ₹{customers.reduce((sum, c) => sum + c.remaining, 0).toLocaleString()}
                </h4>
                <p className="text-muted">Total Pending Amount</p>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Confirmation Modal */}
      <Modal show={showConfirmModal} onHide={() => setShowConfirmModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Payment</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedCustomerData && (
            <div>
              <p><strong>Customer:</strong> {selectedCustomerData.name} ({selectedCustomerData.rollNumber})</p>
              <p><strong>Payment Amount:</strong> ₹{paymentAmount}</p>
              <p><strong>Payment Method:</strong> {paymentMethod}</p>
              <p><strong>Remaining After Payment:</strong> ₹{selectedCustomerData.remaining - parseFloat(paymentAmount || 0)}</p>
              {description && <p><strong>Description:</strong> {description}</p>}
            </div>
          )}
          <p className="text-muted">Are you sure you want to record this payment?</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowConfirmModal(false)}>
            Cancel
          </Button>
          <Button variant="success" onClick={confirmPayment} disabled={loading}>
            {loading ? (
              <>
                <Spinner size="sm" className="me-2" />
                Processing...
              </>
            ) : (
              'Confirm Payment'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default PaymentForm;
