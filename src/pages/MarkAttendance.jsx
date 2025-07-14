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
  Tabs,
  Tab,
  Spinner
} from 'react-bootstrap';
import axios from 'axios';
import './MarkAttendance.css';

const MarkAttendance = () => {
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [attendanceLoading, setAttendanceLoading] = useState({});
  const [alert, setAlert] = useState({ show: false, message: '', variant: '' });
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState({
    today: 0,
    thisWeek: 0,
    thisMonth: 0
  });
  const [activeTab, setActiveTab] = useState('mark-attendance');

  useEffect(() => {
    fetchCustomers();
    fetchTodayAttendance();
  }, []);

  useEffect(() => {
    filterCustomers();
  }, [searchTerm, customers]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/customers');
      const customersData = response.data.map(customer => ({
        ...customer,
        status: getCustomerStatus(customer),
        paymentStatus: getPaymentStatus(customer),
        daysUntilExpiry: getDaysUntilExpiry(customer.expiryDate)
      }));
      setCustomers(customersData);
    } catch (error) {
      showAlert('Failed to fetch customers', 'danger');
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTodayAttendance = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await axios.get(`http://localhost:5000/api/attendance?date=${today}`);
      setTodayAttendance(response.data);
      
      // Calculate attendance stats
      const stats = {
        today: response.data.length,
        thisWeek: response.data.length, // You can implement proper week calculation
        thisMonth: response.data.length // You can implement proper month calculation
      };
      setAttendanceStats(stats);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    }
  };

  const getCustomerStatus = (customer) => {
    const today = new Date();
    const expiryDate = new Date(customer.expiryDate);
    const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) return 'expired';
    if (daysUntilExpiry <= 5) return 'expiring';
    return 'active';
  };

  const getPaymentStatus = (customer) => {
    const remaining = customer.remaining || 0;
    const today = new Date();
    const expiryDate = new Date(customer.expiryDate);
    const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
    
    if (remaining > 0) {
      if (daysUntilExpiry <= 5) return 'overdue';
      return 'pending';
    }
    return 'paid';
  };

  const getDaysUntilExpiry = (expiryDate) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    return Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
  };

  const filterCustomers = () => {
    if (!searchTerm.trim()) {
      setFilteredCustomers(customers);
      return;
    }

    const filtered = customers.filter(customer =>
      customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.rollNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone?.includes(searchTerm)
    );
    setFilteredCustomers(filtered);
  };

  const showAlert = (message, variant = 'success') => {
    setAlert({ show: true, message, variant });
    setTimeout(() => setAlert({ show: false, message: '', variant: '' }), 5000);
  };

  const handleMarkAttendance = async (customer) => {
    if (customer.status === 'expired') {
      showAlert('Cannot mark attendance for expired membership!', 'danger');
      return;
    }

    // Check if already marked
    if (isAttendanceMarked(customer._id)) {
      showAlert('Attendance already marked for today!', 'warning');
      return;
    }

    // Set loading for this specific customer
    setAttendanceLoading(prev => ({ ...prev, [customer._id]: true }));

    try {
      const response = await axios.post('http://localhost:5000/api/attendance', {
        customerId: customer._id
      });
      
      showAlert(`Attendance marked for ${customer.name}`, 'success');
      
      // Refresh today's attendance to update the UI
      await fetchTodayAttendance();
      
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to mark attendance';
      showAlert(errorMessage, 'danger');
      console.error('Error marking attendance:', error);
    } finally {
      // Remove loading for this customer
      setAttendanceLoading(prev => {
        const newState = { ...prev };
        delete newState[customer._id];
        return newState;
      });
    }
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
      await axios.put(`http://localhost:5000/api/customers/${selectedCustomer._id}/payment`, {
        amount: parseFloat(paymentAmount)
      });
      showAlert(`Payment of RS${paymentAmount} recorded for ${selectedCustomer.name}`, 'success');
      setShowPaymentModal(false);
      setPaymentAmount('');
      setSelectedCustomer(null);
      fetchCustomers();
    } catch (error) {
      showAlert('Failed to record payment', 'danger');
      console.error('Error recording payment:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      active: <Badge bg="success"><i className="bi bi-check-circle me-1"></i>Active</Badge>,
      expiring: <Badge bg="warning"><i className="bi bi-clock me-1"></i>Expiring Soon</Badge>,
      expired: <Badge bg="danger"><i className="bi bi-x-circle me-1"></i>Expired</Badge>
    };
    return badges[status] || badges.active;
  };

  const getPaymentBadge = (paymentStatus) => {
    const badges = {
      paid: <Badge bg="success"><i className="bi bi-check-circle me-1"></i>Paid</Badge>,
      pending: <Badge bg="warning"><i className="bi bi-clock me-1"></i>Pending</Badge>,
      overdue: <Badge bg="danger"><i className="bi bi-exclamation-triangle me-1"></i>Overdue</Badge>
    };
    return badges[paymentStatus] || badges.paid;
  };

  // Fixed the attendance check function
  const isAttendanceMarked = (customerId) => {
    return todayAttendance.some(record => {
      // Handle both populated and non-populated customer data
      const recordCustomerId = record.customerId?._id || record.customerId;
      return recordCustomerId === customerId;
    });
  };

  const getPendingPaymentCustomers = () => {
    return customers.filter(customer => 
      customer.paymentStatus === 'overdue' || customer.paymentStatus === 'pending'
    );
  };

  const getExpiringCustomers = () => {
    return customers.filter(customer => 
      customer.status === 'expiring' || customer.status === 'expired'
    );
  };

  if (loading) {
    return (
      <Container className="text-center mt-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading customers...</p>
      </Container>
    );
  }

  return (
    <Container fluid className="attendance-container">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <Card className="header-card">
            <Card.Body className="p-4">
              <Row className="align-items-center">
                <Col md={8}>
                  <h1 className="display-5 fw-bold mb-2">
                    <i className="bi bi-calendar-check me-3 text-primary"></i>
                    Attendance Management
                  </h1>
                  <p className="text-muted mb-0">
                    Mark attendance, manage payments, and track member status
                  </p>
                </Col>
                <Col md={4} className="text-end">
                  <div className="stats-mini">
                    <div className="stat-item">
                      <span className="stat-number">{attendanceStats.today}</span>
                      <span className="stat-label">Today</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-number">{customers.length}</span>
                      <span className="stat-label">Total Members</span>
                    </div>
                  </div>
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

      {/* Tabs */}
      <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-4">
        <Tab eventKey="mark-attendance" title={
          <span><i className="bi bi-check-circle me-2"></i>Mark Attendance</span>
        }>
          {/* Search and Filter */}
          <Card className="mb-4">
            <Card.Body>
              <Row>
                <Col md={6}>
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
                <Col md={6}>
                  <div className="d-flex gap-2">
                    <Button variant="outline-primary" size="sm">
                      <i className="bi bi-funnel me-1"></i>
                      All ({filteredCustomers.length})
                    </Button>
                    <Button variant="outline-success" size="sm">
                      <i className="bi bi-check-circle me-1"></i>
                      Active ({customers.filter(c => c.status === 'active').length})
                    </Button>
                    <Button variant="outline-warning" size="sm">
                      <i className="bi bi-exclamation-triangle me-1"></i>
                      Expiring ({customers.filter(c => c.status === 'expiring').length})
                    </Button>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* Members Grid */}
          <Row className="g-4">
            {filteredCustomers.map(customer => {
              const attendanceMarked = isAttendanceMarked(customer._id);
              const isLoadingAttendance = attendanceLoading[customer._id];

              return (
                <Col key={customer._id} xs={12} sm={6} lg={4} xl={3}>
                  <Card className={`member-card h-100 ${customer.status === 'expired' ? 'expired' : ''}`}>
                    <Card.Body className="p-4">
                      {/* Member Image and Basic Info */}
                      <div className="text-center mb-3">
                        <div className="member-avatar">
                          {customer.image ? (
                            <img
                              src={`http://localhost:5000/uploads/${customer.image}`}
                              alt={customer.name}
                              className="rounded-circle"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div 
                            className="avatar-placeholder"
                            style={{ display: customer.image ? 'none' : 'flex' }}
                          >
                            <i className="bi bi-person-fill"></i>
                          </div>
                        </div>
                        <h5 className="mb-1 fw-bold">{customer.name}</h5>
                        <p className="text-muted mb-2">{customer.rollNumber}</p>
                        <div className="badges-container">
                          {getStatusBadge(customer.status)}
                          {getPaymentBadge(customer.paymentStatus)}
                        </div>
                      </div>

                      {/* Member Details */}
                      <div className="member-details">
                        <div className="detail-item">
                          <i className="bi bi-phone text-muted me-2"></i>
                          <span>{customer.phone}</span>
                        </div>
                        <div className="detail-item">
                          <i className="bi bi-calendar text-muted me-2"></i>
                          <span>Expires: {new Date(customer.expiryDate).toLocaleDateString()}</span>
                        </div>
                        <div className="detail-item">
                          <i className="bi bi-award text-muted me-2"></i>
                          <span className="text-capitalize">{customer.membership}</span>
                        </div>
                        {customer.remaining > 0 && (
                          <div className="detail-item">
                            <i className="bi bi-currency-rupee text-danger me-2"></i>
                            <span className="text-danger fw-bold">
                              Remaining: RS{customer.remaining}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Progress Bar for Payment */}
                      {customer.fee > 0 && (
                        <div className="payment-progress mb-3">
                          <div className="d-flex justify-content-between mb-1">
                            <small className="text-muted">Payment Progress</small>
                            <small className="text-muted">
                              RS{customer.paidAmount || 0} / RS{customer.fee}
                            </small>
                          </div>
                          <ProgressBar
                            now={((customer.paidAmount || 0) / customer.fee) * 100}
                            variant={customer.paymentStatus === 'paid' ? 'success' : 
                                    customer.paymentStatus === 'overdue' ? 'danger' : 'warning'}
                          />
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="action-buttons">
                        <Button
                          variant={attendanceMarked ? 'success' : 'primary'}
                          className="w-100 mb-2"
                          onClick={() => handleMarkAttendance(customer)}
                          disabled={isLoadingAttendance || customer.status === 'expired' || attendanceMarked}
                        >
                          {isLoadingAttendance ? (
                            <>
                              <Spinner size="sm" className="me-2" />
                              Marking...
                            </>
                          ) : attendanceMarked ? (
                            <>
                              <i className="bi bi-check-circle me-2"></i>
                              Present Today
                            </>
                          ) : (
                            <>
                              <i className="bi bi-calendar-check me-2"></i>
                              Mark Present
                            </>
                          )}
                        </Button>

                        {customer.remaining > 0 && (
                          <Button
                            variant="outline-warning"
                            size="sm"
                            className="w-100"
                            onClick={() => handlePaymentClick(customer)}
                          >
                            <i className="bi bi-credit-card me-2"></i>
                            Pay RS{customer.remaining}
                          </Button>
                        )}
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              );
            })}
          </Row>

          {filteredCustomers.length === 0 && (
            <div className="text-center py-5">
              <i className="bi bi-search display-1 text-muted"></i>
              <h4 className="text-muted mt-3">No members found</h4>
              <p className="text-muted">Try adjusting your search criteria</p>
            </div>
          )}
        </Tab>

        <Tab eventKey="pending-payments" title={
          <span>
            <i className="bi bi-exclamation-triangle me-2"></i>
            Pending Payments ({getPendingPaymentCustomers().length})
          </span>
        }>
          <Card>
            <Card.Header className="bg-warning text-dark">
              <h5 className="mb-0">
                <i className="bi bi-credit-card me-2"></i>
                Members with Pending Payments
              </h5>
            </Card.Header>
            <Card.Body className="p-0">
              <Table hover responsive>
                <thead className="bg-light">
                  <tr>
                    <th>Member</th>
                    <th>Roll Number</th>
                    <th>Phone</th>
                    <th>Total Fee</th>
                    <th>Paid</th>
                    <th>Remaining</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {getPendingPaymentCustomers().map(customer => (
                    <tr key={customer._id}>
                      <td>
                        <div className="d-flex align-items-center">
                          <div className="member-avatar-small me-3">
                            {customer.image ? (
                              <img
                                src={`http://localhost:5000/uploads/${customer.image}`}
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
                            <small className="text-muted">{customer.membership}</small>
                          </div>
                        </div>
                      </td>
                      <td>{customer.rollNumber}</td>
                      <td>{customer.phone}</td>
                      <td>RS{customer.fee?.toLocaleString()}</td>
                      <td className="text-success">RS{(customer.paidAmount || 0).toLocaleString()}</td>
                      <td className="text-danger fw-bold">RS{customer.remaining?.toLocaleString()}</td>
                      <td>{getPaymentBadge(customer.paymentStatus)}</td>
                      <td>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => handlePaymentClick(customer)}
                        >
                          <i className="bi bi-credit-card me-1"></i>
                          Pay Now
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              {getPendingPaymentCustomers().length === 0 && (
                <div className="text-center py-5">
                  <i className="bi bi-check-circle display-1 text-success"></i>
                  <h4 className="text-success mt-3">All payments are up to date!</h4>
                  <p className="text-muted">No pending payments found</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="expiring-members" title={
          <span>
            <i className="bi bi-clock me-2"></i>
            Expiring Soon ({getExpiringCustomers().length})
          </span>
        }>
          <Card>
            <Card.Header className="bg-danger text-white">
              <h5 className="mb-0">
                <i className="bi bi-calendar-x me-2"></i>
                Members with Expiring/Expired Memberships
              </h5>
            </Card.Header>
            <Card.Body className="p-0">
              <Table hover responsive>
                <thead className="bg-light">
                  <tr>
                    <th>Member</th>
                    <th>Roll Number</th>
                    <th>Phone</th>
                    <th>Expiry Date</th>
                    <th>Days Remaining</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {getExpiringCustomers().map(customer => (
                    <tr key={customer._id}>
                      <td>
                        <div className="d-flex align-items-center">
                          <div className="member-avatar-small me-3">
                            {customer.image ? (
                              <img
                                src={`http://localhost:5000/uploads/${customer.image}`}
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
                            <small className="text-muted">{customer.membership}</small>
                          </div>
                        </div>
                      </td>
                      <td>{customer.rollNumber}</td>
                      <td>{customer.phone}</td>
                      <td>{new Date(customer.expiryDate).toLocaleDateString()}</td>
                      <td>
                        <span className={`fw-bold ${customer.daysUntilExpiry < 0 ? 'text-danger' : 'text-warning'}`}>
                          {customer.daysUntilExpiry < 0 ? 
                            `${Math.abs(customer.daysUntilExpiry)} days ago` : 
                            `${customer.daysUntilExpiry} days`
                          }
                        </span>
                      </td>
                      <td>{getStatusBadge(customer.status)}</td>
                      <td>
                        <Button
                          variant="outline-success"
                          size="sm"
                          onClick={() => {
                            // You can implement renewal functionality here
                            showAlert('Renewal functionality will be implemented soon!', 'info');
                          }}
                        >
                          <i className="bi bi-arrow-clockwise me-1"></i>
                          Renew
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              {getExpiringCustomers().length === 0 && (
                <div className="text-center py-5">
                  <i className="bi bi-shield-check display-1 text-success"></i>
                  <h4 className="text-success mt-3">All memberships are active!</h4>
                  <p className="text-muted">No expiring memberships found</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>

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
              <div className="text-center mb-4">
                <div className="member-avatar-large">
                  {selectedCustomer.image ? (
                    <img
                      src={`http://localhost:5000/uploads/${selectedCustomer.image}`}
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
            )}

            <div className="payment-summary mb-4">
              <Row>
                <Col xs={6}>
                  <div className="summary-item">
                    <label className="text-muted">Total Fee</label>
                    <div className="fw-bold">RS{selectedCustomer?.fee?.toLocaleString()}</div>
                  </div>
                </Col>
                <Col xs={6}>
                  <div className="summary-item">
                    <label className="text-muted">Already Paid</label>
                    <div className="fw-bold text-success">RS{(selectedCustomer?.paidAmount || 0).toLocaleString()}</div>
                  </div>
                </Col>
              </Row>
              <Row className="mt-3">
                <Col xs={12}>
                  <div className="summary-item">
                    <label className="text-muted">Remaining Amount</label>
                    <div className="fw-bold text-danger display-6">RS{selectedCustomer?.remaining?.toLocaleString()}</div>
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
                  max={selectedCustomer?.remaining}
                  placeholder="Enter amount"
                  required
                />
              </InputGroup>
              <Form.Text className="text-muted">
                Maximum amount: RS{selectedCustomer?.remaining?.toLocaleString()}
              </Form.Text>
            </Form.Group>
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

export default MarkAttendance;
