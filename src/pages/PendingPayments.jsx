import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Row, 
  Col, 
  Card, 
  Form, 
  Button, 
  Alert, 
  Badge, 
  Modal, 
  Table,
  InputGroup,
  ProgressBar,
  Spinner,
  Dropdown
} from 'react-bootstrap';
import axios from 'axios';
import './PendingPayments.css';

const PendingPayments = () => {
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ show: false, message: '', variant: '' });
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('remaining');
  const [stats, setStats] = useState({
    totalPending: 0,
    totalAmount: 0,
    overdueCount: 0,
    overdueAmount: 0
  });

  useEffect(() => {
    fetchPendingPayments();
  }, []);

  useEffect(() => {
    filterAndSortCustomers();
  }, [searchTerm, filterType, sortBy, customers]);

  const fetchPendingPayments = async () => {
    try {
      setLoading(true);
      const response = await axios.get('https://backend-deploy-xevv.vercel.app/api/customers');
      const allCustomers = response.data;
      
      // Filter customers with pending payments
      const pendingCustomers = allCustomers
        .filter(customer => customer.remaining > 0)
        .map(customer => ({
          ...customer,
          paymentStatus: getPaymentStatus(customer),
          daysOverdue: getDaysOverdue(customer.expiryDate)
        }));

      setCustomers(pendingCustomers);
      calculateStats(pendingCustomers);
    } catch (error) {
      showAlert('Failed to fetch pending payments', 'danger');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPaymentStatus = (customer) => {
    const today = new Date();
    const expiryDate = new Date(customer.expiryDate);
    const remaining = customer.remaining || 0;
    
    if (remaining > 0 && expiryDate < today) return 'overdue';
    if (remaining > 0) return 'pending';
    return 'paid';
  };

  const getDaysOverdue = (expiryDate) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = today - expiry;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const calculateStats = (pendingCustomers) => {
    const totalAmount = pendingCustomers.reduce((sum, c) => sum + c.remaining, 0);
    const overdueCustomers = pendingCustomers.filter(c => c.paymentStatus === 'overdue');
    const overdueAmount = overdueCustomers.reduce((sum, c) => sum + c.remaining, 0);

    setStats({
      totalPending: pendingCustomers.length,
      totalAmount,
      overdueCount: overdueCustomers.length,
      overdueAmount
    });
  };

  const filterAndSortCustomers = () => {
    let filtered = customers.filter(customer => {
      const matchesSearch = customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           customer.rollNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           customer.phone?.includes(searchTerm);
      
      const matchesFilter = filterType === 'all' || customer.paymentStatus === filterType;
      
      return matchesSearch && matchesFilter;
    });

    // Sort customers
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'remaining':
          return b.remaining - a.remaining;
        case 'name':
          return a.name.localeCompare(b.name);
        case 'daysOverdue':
          return b.daysOverdue - a.daysOverdue;
        case 'rollNumber':
          return a.rollNumber.localeCompare(b.rollNumber);
        default:
          return 0;
      }
    });

    setFilteredCustomers(filtered);
  };

  const showAlert = (message, variant = 'success') => {
    setAlert({ show: true, message, variant });
    setTimeout(() => setAlert({ show: false, message: '', variant: '' }), 5000);
  };

  const handlePaymentClick = (customer) => {
    setSelectedCustomer(customer);
    setPaymentAmount(customer.remaining || 0);
    setShowPaymentModal(true);
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCustomer || !paymentAmount) return;

    setLoading(true);
    try {
      await axios.put(`https://backend-deploy-xevv.vercel.app/api/customers/${selectedCustomer._id}/payment`, {
        amount: parseFloat(paymentAmount)
      });
      
      showAlert(`Payment of RS${paymentAmount} recorded for ${selectedCustomer.name}`, 'success');
      setShowPaymentModal(false);
      setPaymentAmount('');
      setSelectedCustomer(null);
      fetchPendingPayments();
    } catch (error) {
      showAlert('Failed to record payment', 'danger');
      console.error('Error recording payment:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendReminder = async (customer) => {
    try {
      await axios.post(`https://backend-deploy-xevv.vercel.app/api/customers/${customer._id}/reminder`);
      showAlert(`Reminder sent to ${customer.name}`, 'success');
    } catch (error) {
      showAlert('Failed to send reminder', 'danger');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: <Badge bg="warning"><i className="bi bi-clock me-1"></i>Pending</Badge>,
      overdue: <Badge bg="danger"><i className="bi bi-exclamation-triangle me-1"></i>Overdue</Badge>
    };
    return badges[status] || badges.pending;
  };

  const getPriorityLevel = (customer) => {
    if (customer.paymentStatus === 'overdue' && customer.daysOverdue > 30) return 'high';
    if (customer.paymentStatus === 'overdue') return 'medium';
    return 'low';
  };

  const getPriorityBadge = (priority) => {
    const badges = {
      high: <Badge bg="danger">High Priority</Badge>,
      medium: <Badge bg="warning">Medium Priority</Badge>,
      low: <Badge bg="info">Low Priority</Badge>
    };
    return badges[priority] || badges.low;
  };

  if (loading) {
    return (
      <Container className="text-center mt-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading pending payments...</p>
      </Container>
    );
  }

  return (
    <Container fluid className="pending-payments-container">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <Card className="header-card">
            <Card.Body className="p-4">
              <Row className="align-items-center">
                <Col md={8}>
                  <h1 className="display-5 fw-bold mb-2">
                    <i className="bi bi-credit-card me-3 text-warning"></i>
                    Pending Payments
                  </h1>
                  <p className="text-muted mb-0">
                    Manage and track outstanding payments from members
                  </p>
                </Col>
                <Col md={4} className="text-end">
                  <Button 
                    variant="primary" 
                    onClick={fetchPendingPayments}
                    disabled={loading}
                  >
                    <i className="bi bi-arrow-clockwise me-2"></i>
                    Refresh
                  </Button>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Alert */}
      {alert.show && (
        <Alert variant={alert.variant} dismissible onClose={() => setAlert({ show: false })}>
          {alert.message}
        </Alert>
      )}

      {/* Statistics Cards */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="stats-card border-warning">
            <Card.Body className="text-center">
              <div className="stats-icon bg-warning">
                <i className="bi bi-people"></i>
              </div>
              <h3 className="mt-3 text-warning">{stats.totalPending}</h3>
              <p className="text-muted">Total Pending</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="stats-card border-info">
            <Card.Body className="text-center">
              <div className="stats-icon bg-info">
                <i className="bi bi-currency-rupee"></i>
              </div>
              <h3 className="mt-3 text-info">RS{stats.totalAmount.toLocaleString()}</h3>
              <p className="text-muted">Total Amount</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="stats-card border-danger">
            <Card.Body className="text-center">
              <div className="stats-icon bg-danger">
                <i className="bi bi-exclamation-triangle"></i>
              </div>
              <h3 className="mt-3 text-danger">{stats.overdueCount}</h3>
              <p className="text-muted">Overdue</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="stats-card border-dark">
            <Card.Body className="text-center">
              <div className="stats-icon bg-dark">
                <i className="bi bi-graph-down"></i>
              </div>
              <h3 className="mt-3 text-dark">RS{stats.overdueAmount.toLocaleString()}</h3>
              <p className="text-muted">Overdue Amount</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Filters and Search */}
      <Card className="mb-4">
        <Card.Body>
          <Row className="g-3">
            <Col md={4}>
              <Form.Label className="fw-semibold">Search</Form.Label>
              <InputGroup>
                <InputGroup.Text>
                  <i className="bi bi-search"></i>
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Search by name, roll number, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </InputGroup>
            </Col>
            <Col md={3}>
              <Form.Label className="fw-semibold">Filter by Status</Form.Label>
              <Form.Select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                <option value="all">All Pending</option>
                <option value="pending">Just Pending</option>
                <option value="overdue">Overdue Only</option>
              </Form.Select>
            </Col>
            <Col md={3}>
              <Form.Label className="fw-semibold">Sort by</Form.Label>
              <Form.Select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="remaining">Amount (High to Low)</option>
                <option value="name">Name (A to Z)</option>
                <option value="daysOverdue">Days Overdue</option>
                <option value="rollNumber">Roll Number</option>
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Label className="fw-semibold">Export</Form.Label>
              <Button variant="outline-success" className="w-100">
                <i className="bi bi-download me-1"></i>
                Excel
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Pending Payments Table */}
      <Card>
        <Card.Header className="bg-light">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">
              <i className="bi bi-table me-2"></i>
              Pending Payments ({filteredCustomers.length})
            </h5>
          </div>
        </Card.Header>
        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table hover className="mb-0">
              <thead className="table-dark">
                <tr>
                  <th>Member</th>
                  <th>Contact</th>
                  <th>Membership</th>
                  <th>Total Fee</th>
                  <th>Paid</th>
                  <th>Remaining</th>
                  <th>Progress</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="text-center py-5">
                      <i className="bi bi-check-circle display-1 text-success"></i>
                      <h5 className="text-success mt-3">No pending payments!</h5>
                      <p className="text-muted">All members have completed their payments</p>
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((customer) => {
                    const paymentProgress = ((customer.paidAmount || 0) / customer.fee) * 100;
                    const priority = getPriorityLevel(customer);
                    
                    return (
                      <tr key={customer._id} className={priority === 'high' ? 'table-danger' : priority === 'medium' ? 'table-warning' : ''}>
                        <td>
                          <div className="d-flex align-items-center">
                            <div className="member-avatar-small me-3">
                              {customer.image ? (
                                <img
                                  src={`https://backend-deploy-xevv.vercel.app/uploads/${customer.image}`}
                                  alt={customer.name}
                                  className="rounded-circle"
                                />
                              ) : (
                                <div className="avatar-placeholder-small">
                                  <i className="bi bi-person-fill"></i>
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="fw-bold">{customer.name}</div>
                              <small className="text-muted">{customer.rollNumber}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div>
                            <div><i className="bi bi-phone me-1"></i>{customer.phone}</div>
                            {customer.email && (
                              <small className="text-muted">
                                <i className="bi bi-envelope me-1"></i>{customer.email}
                              </small>
                            )}
                          </div>
                        </td>
                        <td>
                          <Badge bg="info" className="text-capitalize">
                            {customer.membership}
                          </Badge>
                          <br />
                          <small className="text-muted">
                            Expires: {new Date(customer.expiryDate).toLocaleDateString()}
                          </small>
                        </td>
                        <td className="fw-bold">RS{customer.fee?.toLocaleString()}</td>
                        <td className="text-success fw-bold">RS{(customer.paidAmount || 0).toLocaleString()}</td>
                        <td className="text-danger fw-bold">RS{customer.remaining?.toLocaleString()}</td>
                        <td style={{ width: '120px' }}>
                          <ProgressBar
                            now={paymentProgress}
                            variant={paymentProgress > 75 ? 'success' : paymentProgress > 50 ? 'warning' : 'danger'}
                            className="mb-1"
                          />
                          <small className="text-muted">{Math.round(paymentProgress)}% paid</small>
                        </td>
                        <td>
                          {getStatusBadge(customer.paymentStatus)}
                          {customer.daysOverdue > 0 && (
                            <div>
                              <small className="text-danger">
                                {customer.daysOverdue} days overdue
                              </small>
                            </div>
                          )}
                        </td>
                        <td>{getPriorityBadge(priority)}</td>
                        <td>
                          <Dropdown>
                            <Dropdown.Toggle variant="outline-primary" size="sm">
                              <i className="bi bi-three-dots"></i>
                            </Dropdown.Toggle>
                            <Dropdown.Menu>
                              <Dropdown.Item onClick={() => handlePaymentClick(customer)}>
                                <i className="bi bi-credit-card me-2"></i>
                                Record Payment
                              </Dropdown.Item>
                              <Dropdown.Item onClick={() => sendReminder(customer)}>
                                <i className="bi bi-bell me-2"></i>
                                Send Reminder
                              </Dropdown.Item>
                              <Dropdown.Divider />
                              <Dropdown.Item className="text-info">
                                <i className="bi bi-eye me-2"></i>
                                View Details
                              </Dropdown.Item>
                            </Dropdown.Menu>
                          </Dropdown>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      {/* Payment Modal */}
      <Modal show={showPaymentModal} onHide={() => setShowPaymentModal(false)} centered>
        <Modal.Header closeButton className="bg-primary text-white">
          <Modal.Title>
            <i className="bi bi-credit-card me-2"></i>
            Record Payment
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handlePaymentSubmit}>
          <Modal.Body>
            {selectedCustomer && (
              <>
                <div className="text-center mb-4">
                  <div className="member-avatar-large">
                    {selectedCustomer.image ? (
                      <img
                        src={`https://backend-deploy-xevv.vercel.app/uploads/${selectedCustomer.image}`}
                        alt={selectedCustomer.name}
                        className="rounded-circle"
                      />
                    ) : (
                      <div className="avatar-placeholder-large">
                        <i className="bi bi-person-fill"></i>
                      </div>
                    )}
                  </div>
                  <h5 className="mt-3">{selectedCustomer.name}</h5>
                  <p className="text-muted">{selectedCustomer.rollNumber}</p>
                </div>

                <div className="payment-summary mb-4">
                  <Row>
                    <Col xs={6}>
                      <div className="summary-item">
                        <label className="text-muted">Total Fee</label>
                        <div className="fw-bold">RS{selectedCustomer.fee?.toLocaleString()}</div>
                      </div>
                    </Col>
                    <Col xs={6}>
                      <div className="summary-item">
                        <label className="text-muted">Already Paid</label>
                        <div className="fw-bold text-success">RS{(selectedCustomer.paidAmount || 0).toLocaleString()}</div>
                      </div>
                    </Col>
                  </Row>
                  <Row className="mt-3">
                    <Col xs={12}>
                      <div className="summary-item">
                        <label className="text-muted">Remaining Amount</label>
                        <div className="fw-bold text-danger display-6">RS{selectedCustomer.remaining?.toLocaleString()}</div>
                      </div>
                    </Col>
                  </Row>
                </div>

                <Form.Group>
                  <Form.Label className="fw-semibold">Payment Amount</Form.Label>
                  <InputGroup>
                    <InputGroup.Text>RS</InputGroup.Text>
                    <Form.Control
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      min="0"
                      max={selectedCustomer.remaining}
                      placeholder="Enter amount"
                      required
                    />
                  </InputGroup>
                  <Form.Text className="text-muted">
                    Maximum amount: RS{selectedCustomer.remaining?.toLocaleString()}
                  </Form.Text>
                </Form.Group>
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowPaymentModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? (
                <>
                  <Spinner size="sm" className="me-2" />
                  Processing...
                </>
              ) : (
                <>
                  <i className="bi bi-check-circle me-2"></i>
                  Record Payment
                </>
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default PendingPayments;
