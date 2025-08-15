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
  Spinner,
  Pagination
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
  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState({
    today: 0,
    thisWeek: 0,
    thisMonth: 0
  });
  const [activeTab, setActiveTab] = useState('mark-attendance');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [customersPerPage] = useState(20);
  
  // Filter state
  const [activeFilter, setActiveFilter] = useState('all');
  
  // Renewal form state
  const [renewalData, setRenewalData] = useState({
    membership: '',
    duration: 1,
    durationType: 'month',
    fee: '',
    paidAmount: '',
    startDate: new Date().toISOString().split('T')[0]
  });

  const membershipOptions = [
    { value: 'basic', label: 'Basic', defaultFee: 1200 },
    { value: 'premium', label: 'Premium', defaultFee: 1500 },
    { value: 'vip', label: 'VIP', defaultFee: 2000 },
    { value: 'student', label: 'Student', defaultFee: 800 }
  ];

  useEffect(() => {
    fetchCustomers();
    fetchTodayAttendance();
    
    // Set up automatic status updates
    const interval = setInterval(() => {
      updateCustomerStatuses();
    }, 24 * 60 * 60 * 1000); // Check every 24 hours
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    filterCustomers();
  }, [searchTerm, customers, activeFilter]);

  useEffect(() => {
    setCurrentPage(1); // Reset to first page when filters change
  }, [filteredCustomers]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await axios.get('https://backend-deploy-xevv.vercel.app/api/customers');
      const customersData = response.data.map(customer => ({
        ...customer,
        status: getCustomerStatus(customer),
        paymentStatus: getPaymentStatus(customer),
        daysUntilExpiry: getDaysUntilExpiry(customer.expiryDate),
        daysInShortlist: getDaysInShortlist(customer),
        autoStatus: getAutoStatus(customer)
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
      const response = await axios.get(`https://backend-deploy-xevv.vercel.app/api/attendance?date=${today}`);
      setTodayAttendance(response.data);
      
      const stats = {
        today: response.data.length,
        thisWeek: response.data.length,
        thisMonth: response.data.length
      };
      setAttendanceStats(stats);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    }
  };

  // NEW: Enhanced status calculation with shortlist logic
  const getAutoStatus = (customer) => {
    const today = new Date();
    const expiryDate = new Date(customer.expiryDate);
    const joinDate = new Date(customer.joinDate || customer.currentDate);
    const remaining = customer.remaining || 0;
    
    // Calculate days since expiry
    const daysSinceExpiry = Math.floor((today - expiryDate) / (1000 * 60 * 60 * 24));
    const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
    
    // Shortlist logic: If payment is pending and expiry date has passed
    if (remaining > 0 && daysSinceExpiry >= 0) {
      if (daysSinceExpiry <= 10) {
        return 'shortlist';
      } else {
        return 'expired';
      }
    }
    
    // Regular status checks
    if (daysSinceExpiry > 10) return 'expired';
    if (daysUntilExpiry < 0 && daysSinceExpiry <= 10) return 'shortlist';
    if (daysUntilExpiry <= 5) return 'expiring';
    return 'active';
  };

  const getCustomerStatus = (customer) => {
    return getAutoStatus(customer);
  };

  const getPaymentStatus = (customer) => {
    const remaining = customer.remaining || 0;
    const autoStatus = getAutoStatus(customer);
    
    if (remaining > 0) {
      if (autoStatus === 'expired' || autoStatus === 'shortlist') return 'overdue';
      return 'pending';
    }
    return 'paid';
  };

  const getDaysUntilExpiry = (expiryDate) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    return Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
  };

  const getDaysInShortlist = (customer) => {
    const autoStatus = getAutoStatus(customer);
    if (autoStatus !== 'shortlist') return 0;
    
    const today = new Date();
    const expiryDate = new Date(customer.expiryDate);
    return Math.floor((today - expiryDate) / (1000 * 60 * 60 * 24));
  };

  // NEW: Update customer statuses automatically
  const updateCustomerStatuses = () => {
    setCustomers(prevCustomers => 
      prevCustomers.map(customer => ({
        ...customer,
        status: getCustomerStatus(customer),
        paymentStatus: getPaymentStatus(customer),
        daysUntilExpiry: getDaysUntilExpiry(customer.expiryDate),
        daysInShortlist: getDaysInShortlist(customer),
        autoStatus: getAutoStatus(customer)
      }))
    );
  };

  const filterCustomers = () => {
    let filtered = customers;

    // Apply search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(customer =>
        customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.rollNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone?.includes(searchTerm)
      );
    }

    // Apply status filter
    if (activeFilter !== 'all') {
      filtered = filtered.filter(customer => customer.status === activeFilter);
    }

    setFilteredCustomers(filtered);
  };

  // NEW: Pagination functions
  const indexOfLastCustomer = currentPage * customersPerPage;
  const indexOfFirstCustomer = indexOfLastCustomer - customersPerPage;
  const currentCustomers = filteredCustomers.slice(indexOfFirstCustomer, indexOfLastCustomer);
  const totalPages = Math.ceil(filteredCustomers.length / customersPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

    if (isAttendanceMarked(customer._id)) {
      showAlert('Attendance already marked for today!', 'warning');
      return;
    }

    setAttendanceLoading(prev => ({ ...prev, [customer._id]: true }));

    try {
      const response = await axios.post('https://backend-deploy-xevv.vercel.app/api/attendance', {
        customerId: customer._id
      });
      
      showAlert(`Attendance marked for ${customer.name}`, 'success');
      await fetchTodayAttendance();
      
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to mark attendance';
      showAlert(errorMessage, 'danger');
      console.error('Error marking attendance:', error);
    } finally {
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
      await axios.put(`https://backend-deploy-xevv.vercel.app/api/customers/${selectedCustomer._id}/payment`, {
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

  const handleRenewalClick = (customer) => {
    setSelectedCustomer(customer);
    const defaultMembership = membershipOptions.find(m => m.value === customer.membership) || membershipOptions[0];
    
    setRenewalData({
      membership: customer.membership || 'basic',
      duration: 1,
      durationType: 'month',
      fee: defaultMembership.defaultFee.toString(),
      paidAmount: '',
      startDate: new Date().toISOString().split('T')[0]
    });
    setShowRenewalModal(true);
  };

  const handleRenewalDataChange = (field, value) => {
    setRenewalData(prev => {
      const updated = { ...prev, [field]: value };
      
      if (field === 'membership') {
        const selectedMembership = membershipOptions.find(m => m.value === value);
        if (selectedMembership) {
          updated.fee = selectedMembership.defaultFee.toString();
        }
      }
      
      return updated;
    });
  };

  const calculateExpiryDate = () => {
    const startDate = new Date(renewalData.startDate);
    const duration = parseInt(renewalData.duration);
    
    if (renewalData.durationType === 'month') {
      startDate.setMonth(startDate.getMonth() + duration);
    } else if (renewalData.durationType === 'year') {
      startDate.setFullYear(startDate.getFullYear() + duration);
    } else if (renewalData.durationType === 'day') {
      startDate.setDate(startDate.getDate() + duration);
    }
    
    return startDate;
  };

  const handleRenewalSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    setLoading(true);
    try {
      const expiryDate = calculateExpiryDate();
      const fee = parseFloat(renewalData.fee);
      const paidAmount = parseFloat(renewalData.paidAmount) || 0;
      
      const renewalPayload = {
        membership: renewalData.membership,
        fee: fee,
        paidAmount: paidAmount,
        remaining: fee - paidAmount,
        startDate: renewalData.startDate,
        expiryDate: expiryDate.toISOString(),
        duration: renewalData.duration,
        durationType: renewalData.durationType
      };

      await axios.put(`https://backend-deploy-xevv.vercel.app/api/customers/${selectedCustomer._id}/renew`, renewalPayload);
      
      showAlert(`Membership renewed successfully for ${selectedCustomer.name}`, 'success');
      setShowRenewalModal(false);
      setSelectedCustomer(null);
      setRenewalData({
        membership: '',
        duration: 1,
        durationType: 'month',
        fee: '',
        paidAmount: '',
        startDate: new Date().toISOString().split('T')[0]
      });
      fetchCustomers();
    } catch (error) {
      showAlert('Failed to renew membership', 'danger');
      console.error('Error renewing membership:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      active: <Badge bg="success"><i className="bi bi-check-circle me-1"></i>Active</Badge>,
      expiring: <Badge bg="warning"><i className="bi bi-clock me-1"></i>Expiring Soon</Badge>,
      shortlist: <Badge bg="info"><i className="bi bi-list-check me-1"></i>Shortlisted</Badge>,
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

  const isAttendanceMarked = (customerId) => {
    return todayAttendance.some(record => {
      const recordCustomerId = record.customerId?._id || record.customerId;
      return recordCustomerId === customerId;
    });
  };

  // NEW: Get customers by status
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

  const getShortlistedCustomers = () => {
    return customers.filter(customer => customer.status === 'shortlist');
  };

  // NEW: Filter buttons data
  const filterOptions = [
    { key: 'all', label: 'All', count: customers.length, variant: 'outline-primary', icon: 'funnel' },
    { key: 'active', label: 'Active', count: customers.filter(c => c.status === 'active').length, variant: 'outline-success', icon: 'check-circle' },
    { key: 'expiring', label: 'Expiring', count: customers.filter(c => c.status === 'expiring').length, variant: 'outline-warning', icon: 'clock' },
    { key: 'shortlist', label: 'Shortlisted', count: customers.filter(c => c.status === 'shortlist').length, variant: 'outline-info', icon: 'list-check' },
    { key: 'expired', label: 'Expired', count: customers.filter(c => c.status === 'expired').length, variant: 'outline-danger', icon: 'x-circle' }
  ];

  // NEW: Pagination component
  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const paginationItems = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // First page
    if (startPage > 1) {
      paginationItems.push(
        <Pagination.Item key={1} onClick={() => handlePageChange(1)} active={currentPage === 1}>
          1
        </Pagination.Item>
      );
      if (startPage > 2) {
        paginationItems.push(<Pagination.Ellipsis key="ellipsis-start" />);
      }
    }

    // Visible pages
    for (let i = startPage; i <= endPage; i++) {
      paginationItems.push(
        <Pagination.Item key={i} onClick={() => handlePageChange(i)} active={currentPage === i}>
          {i}
        </Pagination.Item>
      );
    }

    // Last page
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        paginationItems.push(<Pagination.Ellipsis key="ellipsis-end" />);
      }
      paginationItems.push(
        <Pagination.Item key={totalPages} onClick={() => handlePageChange(totalPages)} active={currentPage === totalPages}>
          {totalPages}
        </Pagination.Item>
      );
    }

    return (
      <div className="d-flex justify-content-center align-items-center mt-4">
        <Pagination className="mb-0">
          <Pagination.Prev 
            onClick={() => handlePageChange(Math.max(1, currentPage - 1))} 
            disabled={currentPage === 1}
          />
          {paginationItems}
          <Pagination.Next 
            onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))} 
            disabled={currentPage === totalPages}
          />
        </Pagination>
        <div className="ms-3 text-muted">
          Showing {indexOfFirstCustomer + 1}-{Math.min(indexOfLastCustomer, filteredCustomers.length)} of {filteredCustomers.length} members
        </div>
      </div>
    );
  };

  if (loading && customers.length === 0) {
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
                    Mark attendance, manage payments, and track member status with automatic shortlisting
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
                    <div className="stat-item">
                      <span className="stat-number">{getShortlistedCustomers().length}</span>
                      <span className="stat-label">Shortlisted</span>
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
          {/* Search and Filter Controls */}
          <Card className="mb-4">
            <Card.Body>
              <Row className="align-items-center">
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
                  <div className="d-flex gap-2 flex-wrap">
                    {filterOptions.map(option => (
                      <Button
                        key={option.key}
                        variant={activeFilter === option.key ? option.variant.replace('outline-', '') : option.variant}
                        size="sm"
                        onClick={() => setActiveFilter(option.key)}
                        className="text-nowrap"
                      >
                        <i className={`bi bi-${option.icon} me-1`}></i>
                        {option.label} ({option.count})
                      </Button>
                    ))}
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* Members Grid */}
          <Row className="g-4">
            {currentCustomers.map(customer => {
              const attendanceMarked = isAttendanceMarked(customer._id);
              const isLoadingAttendance = attendanceLoading[customer._id];

              return (
                <Col key={customer._id} xs={12} sm={6} lg={4} xl={3}>
                  <Card className={`member-card h-100 ${customer.status === 'expired' ? 'expired' : customer.status === 'shortlist' ? 'shortlisted' : ''}`}>
                    <Card.Body className="p-4">
                      {/* Member Image and Basic Info */}
                      <div className="text-center mb-3">
                        <div className="member-avatar">
                          {customer.image ? (
                            <img
                              src={`https://backend-deploy-xevv.vercel.app/uploads/${customer.image}`}
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
                        
                        {/* Show shortlist info */}
                        {customer.status === 'shortlist' && (
                          <div className="detail-item">
                            <i className="bi bi-clock text-info me-2"></i>
                            <span className="text-info">
                              Shortlisted: {customer.daysInShortlist} day{customer.daysInShortlist !== 1 ? 's' : ''}
                            </span>
                          </div>
                        )}
                        
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

                        <Row className="g-2">
                          {customer.remaining > 0 && (
                            <Col xs={6}>
                              <Button
                                variant="outline-warning"
                                size="sm"
                                className="w-100"
                                onClick={() => handlePaymentClick(customer)}
                              >
                                <i className="bi bi-credit-card me-1"></i>
                                Pay
                              </Button>
                            </Col>
                          )}
                          {(customer.status === 'expiring' || customer.status === 'expired' || customer.status === 'shortlist') && (
                            <Col xs={customer.remaining > 0 ? 6 : 12}>
                              <Button
                                variant="outline-success"
                                size="sm"
                                className="w-100"
                                onClick={() => handleRenewalClick(customer)}
                              >
                                <i className="bi bi-arrow-clockwise me-1"></i>
                                Renew
                              </Button>
                            </Col>
                          )}
                        </Row>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              );
            })}
          </Row>

          {/* No Results */}
          {filteredCustomers.length === 0 && (
            <div className="text-center py-5">
              <i className="bi bi-search display-1 text-muted"></i>
              <h4 className="text-muted mt-3">No members found</h4>
              <p className="text-muted">Try adjusting your search criteria</p>
            </div>
          )}

          {/* Pagination */}
          {renderPagination()}
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
                            <small className="text-muted">{customer.membership}</small>
                          </div>
                        </div>
                      </td>
                      <td>{customer.rollNumber}</td>
                      <td>{customer.phone}</td>
                      <td>RS{customer.fee?.toLocaleString()}</td>
                      <td className="text-success">RS{(customer.paidAmount || 0).toLocaleString()}</td>
                      <td className="text-danger fw-bold">RS{customer.remaining?.toLocaleString()}</td>
                      <td>
                        {getStatusBadge(customer.status)}
                        {getPaymentBadge(customer.paymentStatus)}
                      </td>
                      <td>
                        <div className="d-flex gap-1">
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => handlePaymentClick(customer)}
                          >
                            <i className="bi bi-credit-card me-1"></i>
                            Pay
                          </Button>
                          <Button
                            variant="outline-success"
                            size="sm"
                            onClick={() => handleRenewalClick(customer)}
                          >
                            <i className="bi bi-arrow-clockwise me-1"></i>
                            Renew
                          </Button>
                        </div>
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

        {/* NEW: Shortlisted Members Tab */}
        <Tab eventKey="shortlisted-members" title={
          <span>
            <i className="bi bi-list-check me-2"></i>
            Shortlisted ({getShortlistedCustomers().length})
          </span>
        }>
          <Card>
            <Card.Header className="bg-info text-white">
              <h5 className="mb-0">
                <i className="bi bi-list-check me-2"></i>
                Shortlisted Members (Auto-moved after expiry with pending payment)
              </h5>
            </Card.Header>
            <Card.Body className="p-0">
              <Table hover responsive>
                <thead className="bg-light">
                  <tr>
                    <th>Member</th>
                    <th>Roll Number</th>
                    <th>Phone</th>
                    <th>Expired Date</th>
                    <th>Days in Shortlist</th>
                    <th>Remaining Payment</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {getShortlistedCustomers().map(customer => (
                    <tr key={customer._id}>
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
                            <small className="text-muted">{customer.membership}</small>
                          </div>
                        </div>
                      </td>
                      <td>{customer.rollNumber}</td>
                      <td>{customer.phone}</td>
                      <td>{new Date(customer.expiryDate).toLocaleDateString()}</td>
                      <td>
                        <Badge bg="info">
                          {customer.daysInShortlist} day{customer.daysInShortlist !== 1 ? 's' : ''}
                        </Badge>
                        <br />
                        <small className="text-muted">
                          ({10 - customer.daysInShortlist} days to expire)
                        </small>
                      </td>
                      <td className="text-danger fw-bold">RS{customer.remaining?.toLocaleString()}</td>
                      <td>{getStatusBadge(customer.status)}</td>
                      <td>
                        <div className="d-flex gap-1">
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => handlePaymentClick(customer)}
                          >
                            <i className="bi bi-credit-card me-1"></i>
                            Pay
                          </Button>
                          <Button
                            variant="outline-success"
                            size="sm"
                            onClick={() => handleRenewalClick(customer)}
                          >
                            <i className="bi bi-arrow-clockwise me-1"></i>
                            Renew
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              {getShortlistedCustomers().length === 0 && (
                <div className="text-center py-5">
                  <i className="bi bi-check-circle display-1 text-success"></i>
                  <h4 className="text-success mt-3">No shortlisted members!</h4>
                  <p className="text-muted">Members with pending payments are automatically moved here after expiry</p>
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
                        <div className="d-flex gap-1">
                          {customer.remaining > 0 && (
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => handlePaymentClick(customer)}
                            >
                              <i className="bi bi-credit-card me-1"></i>
                              Pay
                            </Button>
                          )}
                          <Button
                            variant="outline-success"
                            size="sm"
                            onClick={() => handleRenewalClick(customer)}
                          >
                            <i className="bi bi-arrow-clockwise me-1"></i>
                            Renew
                          </Button>
                        </div>
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
                <div className="badges-container">
                  {getStatusBadge(selectedCustomer.status)}
                  {getPaymentBadge(selectedCustomer.paymentStatus)}
                </div>
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

      {/* Renewal Modal */}
      <Modal show={showRenewalModal} onHide={() => setShowRenewalModal(false)} centered size="lg">
        <Modal.Header closeButton className="bg-success text-white">
          <Modal.Title>
            <i className="bi bi-arrow-clockwise me-2"></i>
            Renew Membership
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleRenewalSubmit}>
          <Modal.Body>
            {selectedCustomer && (
              <>
                {/* Member Info Header */}
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
                  <div className="badges-container">
                    {getStatusBadge(selectedCustomer.status)}
                    {getPaymentBadge(selectedCustomer.paymentStatus)}
                  </div>
                </div>

                {/* Current Membership Info */}
                <Card className="mb-4 bg-light">
                  <Card.Header>
                    <h6 className="mb-0">Current Membership Details</h6>
                  </Card.Header>
                  <Card.Body>
                    <Row>
                      <Col md={6}>
                        <div className="mb-2">
                          <small className="text-muted">Joining Date</small>
                          <div className="fw-bold">
                            {new Date(selectedCustomer.joinDate || selectedCustomer.currentDate).toLocaleDateString()}
                          </div>
                        </div>
                      </Col>
                      <Col md={6}>
                        <div className="mb-2">
                          <small className="text-muted">Current Expiry</small>
                          <div className="fw-bold text-danger">
                            {new Date(selectedCustomer.expiryDate).toLocaleDateString()}
                          </div>
                        </div>
                      </Col>
                      <Col md={6}>
                        <div className="mb-2">
                          <small className="text-muted">Current Membership</small>
                          <div className="fw-bold text-capitalize">
                            {selectedCustomer.membership}
                          </div>
                        </div>
                      </Col>
                      <Col md={6}>
                        <div className="mb-2">
                          <small className="text-muted">Status</small>
                          <div>{getStatusBadge(selectedCustomer.status)}</div>
                        </div>
                      </Col>
                      {selectedCustomer.status === 'shortlist' && (
                        <Col md={12}>
                          <Alert variant="info" className="mt-2 mb-0">
                            <i className="bi bi-info-circle me-2"></i>
                            <strong>Shortlisted Member:</strong> This member has been automatically shortlisted for {selectedCustomer.daysInShortlist} day{selectedCustomer.daysInShortlist !== 1 ? 's' : ''} due to pending payment after expiry.
                          </Alert>
                        </Col>
                      )}
                    </Row>
                  </Card.Body>
                </Card>

                {/* Renewal Form */}
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label className="fw-semibold">
                        <i className="bi bi-award me-2"></i>
                        Membership Type
                      </Form.Label>
                      <Form.Select
                        value={renewalData.membership}
                        onChange={(e) => handleRenewalDataChange('membership', e.target.value)}
                        required
                      >
                        {membershipOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label} (RS{option.defaultFee})
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label className="fw-semibold">
                        <i className="bi bi-calendar-plus me-2"></i>
                        Start Date
                      </Form.Label>
                      <Form.Control
                        type="date"
                        value={renewalData.startDate}
                        onChange={(e) => handleRenewalDataChange('startDate', e.target.value)}
                        required
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label className="fw-semibold">
                        <i className="bi bi-clock me-2"></i>
                        Duration
                      </Form.Label>
                      <Form.Control
                        type="number"
                        value={renewalData.duration}
                        onChange={(e) => handleRenewalDataChange('duration', e.target.value)}
                        min="1"
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label className="fw-semibold">Duration Type</Form.Label>
                      <Form.Select
                        value={renewalData.durationType}
                        onChange={(e) => handleRenewalDataChange('durationType', e.target.value)}
                        required
                      >
                        <option value="day">Days</option>
                        <option value="month">Months</option>
                        <option value="year">Years</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label className="fw-semibold">New Expiry Date</Form.Label>
                      <Form.Control
                        type="text"
                        value={calculateExpiryDate().toLocaleDateString()}
                        readOnly
                        className="bg-light"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label className="fw-semibold">
                        <i className="bi bi-currency-rupee me-2"></i>
                        Total Fee
                      </Form.Label>
                      <InputGroup>
                        <InputGroup.Text>RS</InputGroup.Text>
                        <Form.Control
                          type="number"
                          value={renewalData.fee}
                          onChange={(e) => handleRenewalDataChange('fee', e.target.value)}
                          min="0"
                          required
                        />
                      </InputGroup>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label className="fw-semibold">
                        <i className="bi bi-credit-card me-2"></i>
                        Amount Paid Now
                      </Form.Label>
                      <InputGroup>
                        <InputGroup.Text>RS</InputGroup.Text>
                        <Form.Control
                          type="number"
                          value={renewalData.paidAmount}
                          onChange={(e) => handleRenewalDataChange('paidAmount', e.target.value)}
                          min="0"
                          max={renewalData.fee}
                          placeholder="0"
                        />
                      </InputGroup>
                    </Form.Group>
                  </Col>
                </Row>

                {/* Renewal Summary */}
                <Card className="bg-success bg-opacity-10 border-success">
                  <Card.Body>
                    <h6 className="text-success mb-3">
                      <i className="bi bi-info-circle me-2"></i>
                      Renewal Summary
                    </h6>
                    <Row>
                      <Col md={6}>
                        <div className="mb-2">
                          <small className="text-muted">New Membership</small>
                          <div className="fw-bold text-capitalize">
                            {renewalData.membership} ({renewalData.duration} {renewalData.durationType}
                            {renewalData.duration > 1 ? 's' : ''})
                          </div>
                        </div>
                      </Col>
                      <Col md={6}>
                        <div className="mb-2">
                          <small className="text-muted">Valid Until</small>
                          <div className="fw-bold text-success">
                            {calculateExpiryDate().toLocaleDateString()}
                          </div>
                        </div>
                      </Col>
                      <Col md={6}>
                        <div className="mb-2">
                          <small className="text-muted">Total Fee</small>
                          <div className="fw-bold">RS{parseFloat(renewalData.fee || 0).toLocaleString()}</div>
                        </div>
                      </Col>
                      <Col md={6}>
                        <div className="mb-2">
                          <small className="text-muted">Remaining Amount</small>
                          <div className="fw-bold text-warning">
                            RS{(parseFloat(renewalData.fee || 0) - parseFloat(renewalData.paidAmount || 0)).toLocaleString()}
                          </div>
                        </div>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowRenewalModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="success" disabled={loading}>
              {loading ? (
                <>
                  <Spinner size="sm" className="me-2" />
                  Renewing...
                </>
              ) : (
                <>
                  <i className="bi bi-arrow-clockwise me-2"></i>
                  Renew Membership
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
