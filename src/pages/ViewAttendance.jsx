import React, { useState, useEffect } from "react";
import { 
  Container, 
  Row, 
  Col, 
  Card, 
  Form, 
  Button, 
  Table, 
  Badge, 
  InputGroup,
  Spinner,
  Alert,
  Modal,
  Dropdown
} from "react-bootstrap";
import axios from "axios";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import './ViewAttendance.css';

const ViewAttendance = () => {
  const [attendance, setAttendance] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ show: false, message: '', variant: '' });
  const [showImportModal, setShowImportModal] = useState(false);
  const [attendanceStats, setAttendanceStats] = useState({
    totalRecords: 0,
    todayCount: 0,
    uniqueMembers: 0,
    averageDaily: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [attendanceRes, customersRes] = await Promise.all([
        axios.get(`https://backend-deploy-ten-pi.vercel.app/api/attendance`),
        axios.get(`https://backend-deploy-ten-pi.vercel.app/api/customers`)
      ]);
      
      setAttendance(attendanceRes.data);
      setCustomers(customersRes.data);
      calculateStats(attendanceRes.data);
    } catch (error) {
      showAlert("Failed to fetch data", "danger");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (attendanceData) => {
    const today = new Date().toISOString().split('T')[0];
    const todayCount = attendanceData.filter(a => a.date === today).length;
    const uniqueMembers = new Set(attendanceData.map(a => a.customerId?._id || a.customerId)).size;
    
    // Calculate average daily attendance (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentAttendance = attendanceData.filter(a => new Date(a.date) >= thirtyDaysAgo);
    const averageDaily = Math.round(recentAttendance.length / 30);

    setAttendanceStats({
      totalRecords: attendanceData.length,
      todayCount,
      uniqueMembers,
      averageDaily
    });
  };

  const showAlert = (message, variant = 'success') => {
    setAlert({ show: true, message, variant });
    setTimeout(() => setAlert({ show: false, message: '', variant: '' }), 5000);
  };

  // Fixed image URL function
  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    
    // Handle different image path formats
    if (imagePath.startsWith('http')) {
      return imagePath; // Full URL
    } else if (imagePath.startsWith('uploads/')) {
      return `https://backend-deploy-ten-pi.vercel.app/${imagePath}`; // Path with uploads/
    } else {
      return `https://backend-deploy-ten-pi.vercel.app/uploads/${imagePath}`; // Just filename
    }
  };

  const filteredAttendance = attendance.filter((a) => {
    const customerData = a.customerId;
    const matchName = customerData?.name?.toLowerCase().includes(search.toLowerCase()) || false;
    const matchRollNumber = customerData?.rollNumber?.toLowerCase().includes(search.toLowerCase()) || false;
    const matchDate = selectedDate ? a.date === selectedDate : true;
    const matchCustomer = selectedCustomer ? (customerData?._id === selectedCustomer || a.customerId === selectedCustomer) : true;
    
    return (matchName || matchRollNumber) && matchDate && matchCustomer;
  });

  const handleExport = () => {
    if (filteredAttendance.length === 0) {
      showAlert("No data to export", "warning");
      return;
    }

    const data = filteredAttendance.map((item, index) => ({
      'S.No': index + 1,
      'Roll Number': item.rollNumber || item.customerId?.rollNumber || 'N/A',
      'Name': item.customerName || item.customerId?.name || 'N/A',
      'Phone': item.customerId?.phone || 'N/A',
      'Membership': item.customerId?.membership || 'N/A',
      'Date': item.date,
      'Check In': item.checkInTime || 'N/A',
      'Check Out': item.checkOutTime || 'N/A',
      'Duration': item.duration || 'N/A',
      'Status': 'Present'
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance Report");

    // Auto-adjust column widths
    const columnWidths = [
      { wch: 8 },  // S.No
      { wch: 15 }, // Roll Number
      { wch: 20 }, // Name
      { wch: 15 }, // Phone
      { wch: 12 }, // Membership
      { wch: 12 }, // Date
      { wch: 10 }, // Check In
      { wch: 10 }, // Check Out
      { wch: 10 }, // Duration
      { wch: 8 }   // Status
    ];
    worksheet['!cols'] = columnWidths;

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const fileName = `attendance_report_${selectedDate || 'all'}_${new Date().toISOString().split('T')[0]}.xlsx`;
    saveAs(blob, fileName);
    showAlert("Excel file exported successfully!", "success");
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const binaryStr = event.target.result;
        const workbook = XLSX.read(binaryStr, { type: "binary" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const importedData = XLSX.utils.sheet_to_json(worksheet);

        await axios.post(`https://backend-deploy-ten-pi.vercel.app/api/attendance/import`, {
        });
        
        showAlert("Data imported successfully!", "success");
        fetchData();
        setShowImportModal(false);
      } catch (error) {
        console.error(error);
        showAlert("Import failed. Please check the file format.", "danger");
      }
    };
    reader.readAsBinaryString(file);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status = 'Present') => {
    const variants = {
      'Present': 'success',
      'Absent': 'danger',
      'Late': 'warning'
    };
    return <Badge bg={variants[status] || 'success'}>{status}</Badge>;
  };

  if (loading) {
    return (
      <Container className="text-center mt-5">
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
          <div className="text-center">
            <Spinner animation="border" variant="primary" style={{ width: '3rem', height: '3rem' }} />
            <h4 className="mt-3 text-primary">Loading attendance data...</h4>
            <p className="text-muted">Please wait while we fetch the records</p>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="attendance-view-container" style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', minHeight: '100vh' }}>
      {/* Enhanced Header */}
      <Row className="mb-4">
        <Col>
          <Card className="shadow-lg border-0 rounded-4 overflow-hidden">
            <div className="card-header text-white border-0" 
                 style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '2rem' }}>
              <Row className="align-items-center">
                <Col md={8}>
                  <h1 className="display-5 fw-bold mb-2 d-flex align-items-center">
                    <i className="bi bi-calendar-week me-3" style={{ fontSize: '3rem' }}></i>
                    <span>Attendance Records</span>
                    <i className="bi bi-star-fill ms-3 text-warning" style={{ fontSize: '2rem' }}></i>
                  </h1>
                  <p className="mb-0 mt-2 opacity-75 fs-5">
                    View, search, and manage attendance records efficiently
                  </p>
                </Col>
                <Col md={4} className="text-end">
                  <div className="d-flex justify-content-end gap-3">
                    <div className="text-center">
                      <div className="display-6 fw-bold">{attendanceStats.todayCount}</div>
                      <small className="opacity-75">Today's Attendance</small>
                    </div>
                    <div className="text-center">
                      <div className="display-6 fw-bold">{attendanceStats.totalRecords}</div>
                      <small className="opacity-75">Total Records</small>
                    </div>
                  </div>
                </Col>
              </Row>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Alert */}
      {alert.show && (
        <Alert variant={alert.variant} dismissible onClose={() => setAlert({ show: false })} className="shadow-sm rounded-4">
          <i className={`bi bi-${alert.variant === 'success' ? 'check-circle' : 'exclamation-triangle'} me-2`}></i>
          {alert.message}
        </Alert>
      )}

      {/* Enhanced Statistics Cards */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="shadow-sm border-0 rounded-4 h-100" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <Card.Body className="text-center text-white p-4">
              <div className="mb-3">
                <i className="bi bi-calendar-check" style={{ fontSize: '3rem' }}></i>
              </div>
              <h2 className="fw-bold mb-1">{attendanceStats.totalRecords}</h2>
              <p className="mb-0 opacity-75">Total Records</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="shadow-sm border-0 rounded-4 h-100" style={{ background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' }}>
            <Card.Body className="text-center text-white p-4">
              <div className="mb-3">
                <i className="bi bi-people" style={{ fontSize: '3rem' }}></i>
              </div>
              <h2 className="fw-bold mb-1">{attendanceStats.todayCount}</h2>
              <p className="mb-0 opacity-75">Today's Attendance</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="shadow-sm border-0 rounded-4 h-100" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' }}>
            <Card.Body className="text-center text-white p-4">
              <div className="mb-3">
                <i className="bi bi-person-check" style={{ fontSize: '3rem' }}></i>
              </div>
              <h2 className="fw-bold mb-1">{attendanceStats.uniqueMembers}</h2>
              <p className="mb-0 opacity-75">Unique Members</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="shadow-sm border-0 rounded-4 h-100" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
            <Card.Body className="text-center text-white p-4">
              <div className="mb-3">
                <i className="bi bi-graph-up" style={{ fontSize: '3rem' }}></i>
              </div>
              <h2 className="fw-bold mb-1">{attendanceStats.averageDaily}</h2>
              <p className="mb-0 opacity-75">Daily Average</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Enhanced Filters and Actions */}
      <Card className="mb-4 shadow-sm border-0 rounded-4">
        <Card.Body className="p-4" style={{ background: 'linear-gradient(180deg, #ffffff 0%, #f8f9fa 100%)' }}>
          <Row className="g-3">
            <Col md={3}>
              <Form.Label className="fw-semibold text-primary">
                <i className="bi bi-search me-2"></i>Search
              </Form.Label>
              <InputGroup>
                <InputGroup.Text className="bg-primary text-white border-0">
                  <i className="bi bi-search"></i>
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Search by name or roll number..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="border-0 shadow-sm"
                />
              </InputGroup>
            </Col>
            <Col md={3}>
              <Form.Label className="fw-semibold text-primary">
                <i className="bi bi-calendar me-2"></i>Date
              </Form.Label>
              <Form.Control
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="shadow-sm border-0"
              />
            </Col>
            <Col md={3}>
              <Form.Label className="fw-semibold text-primary">
                <i className="bi bi-person me-2"></i>Member
              </Form.Label>
              <Form.Select
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                className="shadow-sm border-0"
              >
                <option value="">All Members</option>
                {customers.map(customer => (
                  <option key={customer._id} value={customer._id}>
                    {customer.name} ({customer.rollNumber})
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col md={3}>
              <Form.Label className="fw-semibold text-primary">
                <i className="bi bi-gear me-2"></i>Actions
              </Form.Label>
              <div className="d-flex gap-2">
                <Button 
                  variant="success" 
                  onClick={handleExport} 
                  className="flex-fill rounded-pill shadow-sm"
                  style={{ background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', border: 'none' }}
                >
                  <i className="bi bi-download me-2"></i>
                  Export
                </Button>
                <Button 
                  variant="outline-primary" 
                  onClick={() => setShowImportModal(true)}
                  className="flex-fill rounded-pill shadow-sm"
                >
                  <i className="bi bi-upload me-2"></i>
                  Import
                </Button>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Enhanced Attendance Table */}
      <Card className="shadow-lg border-0 rounded-4 overflow-hidden">
        <Card.Header className="bg-gradient text-white border-0" 
                     style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '1.5rem' }}>
          <div className="d-flex justify-content-between align-items-center">
            <h4 className="mb-0 fw-bold">
              <i className="bi bi-table me-2"></i>
              Attendance Records ({filteredAttendance.length})
            </h4>
            <div className="d-flex gap-2">
              <Button 
                variant="outline-light" 
                size="sm"
                onClick={() => {
                  setSearch('');
                  setSelectedDate('');
                  setSelectedCustomer('');
                }}
                className="rounded-pill px-3"
              >
                <i className="bi bi-arrow-clockwise me-1"></i>
                Reset Filters
              </Button>
            </div>
          </div>
        </Card.Header>
        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table hover className="mb-0 align-middle">
              <thead className="table-dark">
                <tr style={{ fontSize: '0.95rem' }}>
                  <th width="80" className="text-center py-3">
                    <i className="bi bi-image me-1"></i>Photo
                  </th>
                  <th className="text-center py-3">
                    <i className="bi bi-hash me-1"></i>Roll #
                  </th>
                  <th className="text-center py-3">
                    <i className="bi bi-person me-1"></i>Name
                  </th>
                  <th className="text-center py-3">
                    <i className="bi bi-telephone me-1"></i>Phone
                  </th>
                  <th className="text-center py-3">
                    <i className="bi bi-award me-1"></i>Membership
                  </th>
                  <th className="text-center py-3">
                    <i className="bi bi-calendar me-1"></i>Date
                  </th>
                  <th className="text-center py-3">
                    <i className="bi bi-clock me-1"></i>Check In
                  </th>
                  <th className="text-center py-3">
                    <i className="bi bi-clock-history me-1"></i>Check Out
                  </th>
                  <th className="text-center py-3">
                    <i className="bi bi-stopwatch me-1"></i>Duration
                  </th>
                  <th className="text-center py-3">
                    <i className="bi bi-check-circle me-1"></i>Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAttendance.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="text-center py-5" style={{ backgroundColor: '#f8f9fa' }}>
                      <i className="bi bi-calendar-x display-1 text-muted mb-3"></i>
                      <h4 className="text-muted">No attendance records found</h4>
                      <p className="text-muted">Try adjusting your search criteria or date range</p>
                      <Button 
                        variant="outline-primary" 
                        className="rounded-pill px-4"
                        onClick={() => {
                          setSearch('');
                          setSelectedDate('');
                          setSelectedCustomer('');
                        }}
                      >
                        <i className="bi bi-arrow-clockwise me-2"></i>
                        Reset All Filters
                      </Button>
                    </td>
                  </tr>
                ) : (
                  filteredAttendance.map((record, index) => {
                    const customer = record.customerId;
                    return (
                      <tr 
                        key={record._id || index}
                        className="align-middle"
                        style={{ 
                          backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8f9fa',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#e3f2fd';
                          e.currentTarget.style.transform = 'scale(1.01)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#ffffff' : '#f8f9fa';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        <td className="text-center py-3">
                          <div className="d-flex justify-content-center">
                            {customer?.image ? (
                              <img
                                src={getImageUrl(customer.image)}
                                alt={customer.name}
                                className="rounded-circle border border-2 border-primary shadow-sm"
                                style={{ 
                                  width: '60px', 
                                  height: '60px', 
                                  objectFit: 'cover',
                                  transition: 'transform 0.3s ease'
                                }}
                                onMouseEnter={(e) => e.target.style.transform = 'scale(1.1)'}
                                onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div 
                              className="rounded-circle d-flex align-items-center justify-content-center text-white shadow-sm"
                              style={{ 
                                width: '60px', 
                                height: '60px', 
                                fontSize: '24px',
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                display: customer?.image ? 'none' : 'flex'
                              }}
                            >
                              <i className="bi bi-person-fill"></i>
                            </div>
                          </div>
                        </td>
                        <td className="text-center py-3">
                          <span className="badge bg-secondary fs-6 px-3 py-2 rounded-pill">
                            {record.rollNumber || customer?.rollNumber || 'N/A'}
                          </span>
                        </td>
                        <td className="text-center py-3">
                          <div>
                            <div className="fw-bold text-primary mb-1">
                              {record.customerName || customer?.name || 'N/A'}
                            </div>
                            <small className="text-muted">
                              Member since: {customer?.joinDate ? formatDate(customer.joinDate) : 'N/A'}
                            </small>
                          </div>
                        </td>
                        <td className="text-center py-3">
                          <div className="fw-semibold">
                            <i className="bi bi-telephone-fill text-success me-1"></i>
                            {customer?.phone || 'N/A'}
                          </div>
                        </td>
                        <td className="text-center py-3">
                          <Badge 
                            bg={customer?.membership === 'premium' ? 'primary' : customer?.membership === 'training' ? 'warning' : 'success'} 
                            className="fs-6 px-3 py-2 rounded-pill text-capitalize"
                          >
                            {customer?.membership === 'premium' && '👑 '}
                            {customer?.membership === 'training' && '🏋️ '}
                            {customer?.membership === 'regular' && '💪 '}
                            {customer?.membership || 'N/A'}
                          </Badge>
                        </td>
                        <td className="text-center py-3">
                          <div className="badge bg-primary px-3 py-2 rounded-pill">
                            <i className="bi bi-calendar-day me-1"></i>
                            {formatDate(record.date)}
                          </div>
                        </td>
                        <td className="text-center py-3">
                          <div className="badge bg-success px-3 py-2 rounded-pill">
                            <i className="bi bi-clock me-1"></i>
                            {record.checkInTime || 'N/A'}
                          </div>
                        </td>
                        <td className="text-center py-3">
                          <div className={`badge px-3 py-2 rounded-pill ${record.checkOutTime ? 'bg-info' : 'bg-warning text-dark'}`}>
                            <i className="bi bi-clock-history me-1"></i>
                            {record.checkOutTime || 'Not yet'}
                          </div>
                        </td>
                        <td className="text-center py-3">
                          <div className="badge bg-dark px-3 py-2 rounded-pill">
                            <i className="bi bi-stopwatch me-1"></i>
                            {record.duration || 'N/A'}
                          </div>
                        </td>
                        <td className="text-center py-3">
                          <Badge bg="success" className="fs-6 px-3 py-2 rounded-pill">
                            <i className="bi bi-check-circle me-1"></i>
                            Present
                          </Badge>
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

      {/* Enhanced Import Modal */}
      <Modal show={showImportModal} onHide={() => setShowImportModal(false)} centered size="lg">
        <Modal.Header closeButton className="bg-gradient text-white border-0" 
                     style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
          <Modal.Title className="fw-bold">
            <i className="bi bi-upload me-2"></i>
            Import Attendance Data
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4" style={{ background: 'linear-gradient(180deg, #ffffff 0%, #f8f9fa 100%)' }}>
          <div className="text-center mb-4">
            <i className="bi bi-file-earmark-excel text-success mb-3" style={{ fontSize: '4rem' }}></i>
            <h4 className="text-primary">Upload Excel File</h4>
            <p className="text-muted">
              Select an Excel file (.xlsx, .xls) to import attendance data
            </p>
          </div>
          
          <div className="alert alert-info border-0 rounded-4">
            <h6 className="alert-heading">
              <i className="bi bi-info-circle me-2"></i>
              File Format Requirements:
            </h6>
            <ul className="mb-0">
              <li>File should contain columns: Name, Date, Status</li>
              <li>Date format: YYYY-MM-DD</li>
              <li>Status values: Present, Absent, Late</li>
            </ul>
          </div>

          <Form.Group>
            <Form.Label className="fw-semibold text-primary">
              <i className="bi bi-file-earmark-arrow-up me-2"></i>
              Choose File
            </Form.Label>
            <Form.Control
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImport}
              className="shadow-sm border-0 rounded-3"
              style={{ padding: '12px' }}
            />
            <Form.Text className="text-muted">
              <i className="bi bi-shield-check me-1"></i>
              Your data is secure and will be processed safely
            </Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer className="border-0 bg-light">
          <Button 
            variant="secondary" 
            onClick={() => setShowImportModal(false)}
            className="rounded-pill px-4"
          >
            <i className="bi bi-x-circle me-2"></i>
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default ViewAttendance;
