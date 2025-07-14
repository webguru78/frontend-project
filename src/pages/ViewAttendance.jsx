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
        axios.get("http://localhost:5000/api/attendance"),
        axios.get("http://localhost:5000/api/customers")
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

        await axios.post("http://localhost:5000/api/attendance/import", {
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
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading attendance data...</p>
      </Container>
    );
  }

  return (
    <Container fluid className="attendance-view-container">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <Card className="header-card">
            <Card.Body className="p-4">
              <Row className="align-items-center">
                <Col md={8}>
                  <h1 className="display-5 fw-bold mb-2">
                    <i className="bi bi-calendar-week me-3"></i>
                    Attendance Records
                  </h1>
                  <p className="text-muted mb-0">
                    View, search, and manage attendance records
                  </p>
                </Col>
                <Col md={4} className="text-end">
                  <div className="stats-mini">
                    <div className="stat-item">
                      <span className="stat-number">{attendanceStats.todayCount}</span>
                      <span className="stat-label">Today</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-number">{attendanceStats.totalRecords}</span>
                      <span className="stat-label">Total</span>
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

      {/* Statistics Cards */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="stats-card">
            <Card.Body className="text-center">
              <div className="stats-icon bg-primary">
                <i className="bi bi-calendar-check"></i>
              </div>
              <h4 className="mt-3">{attendanceStats.totalRecords}</h4>
              <p className="text-muted">Total Records</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="stats-card">
            <Card.Body className="text-center">
              <div className="stats-icon bg-success">
                <i className="bi bi-people"></i>
              </div>
              <h4 className="mt-3">{attendanceStats.todayCount}</h4>
              <p className="text-muted">Today's Attendance</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="stats-card">
            <Card.Body className="text-center">
              <div className="stats-icon bg-info">
                <i className="bi bi-person-check"></i>
              </div>
              <h4 className="mt-3">{attendanceStats.uniqueMembers}</h4>
              <p className="text-muted">Unique Members</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="stats-card">
            <Card.Body className="text-center">
              <div className="stats-icon bg-warning">
                <i className="bi bi-graph-up"></i>
              </div>
              <h4 className="mt-3">{attendanceStats.averageDaily}</h4>
              <p className="text-muted">Daily Average</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Filters and Actions */}
      <Card className="mb-4">
        <Card.Body>
          <Row className="g-3">
            <Col md={3}>
              <Form.Label className="fw-semibold">Search</Form.Label>
              <InputGroup>
                <InputGroup.Text>
                  <i className="bi bi-search"></i>
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Search by name or roll number..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </InputGroup>
            </Col>
            <Col md={3}>
              <Form.Label className="fw-semibold">Date</Form.Label>
              <Form.Control
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </Col>
            <Col md={3}>
              <Form.Label className="fw-semibold">Member</Form.Label>
              <Form.Select
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
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
              <Form.Label className="fw-semibold">Actions</Form.Label>
              <div className="d-flex gap-2">
                <Button variant="success" onClick={handleExport} className="flex-fill">
                  <i className="bi bi-download me-2"></i>
                  Export
                </Button>
                <Button 
                  variant="outline-primary" 
                  onClick={() => setShowImportModal(true)}
                  className="flex-fill"
                >
                  <i className="bi bi-upload me-2"></i>
                  Import
                </Button>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Attendance Table */}
      <Card>
        <Card.Header className="bg-light">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">
              <i className="bi bi-table me-2"></i>
              Attendance Records ({filteredAttendance.length})
            </h5>
            <div className="d-flex gap-2">
              <Button 
                variant="outline-secondary" 
                size="sm"
                onClick={() => {
                  setSearch('');
                  setSelectedDate('');
                  setSelectedCustomer('');
                }}
              >
                <i className="bi bi-arrow-clockwise me-1"></i>
                Reset Filters
              </Button>
            </div>
          </div>
        </Card.Header>
        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table hover className="mb-0">
              <thead className="table-dark">
                <tr>
                  <th width="80">Image</th>
                  <th>Roll Number</th>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Membership</th>
                  <th>Date</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Duration</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredAttendance.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="text-center py-5">
                      <i className="bi bi-calendar-x display-1 text-muted"></i>
                      <h5 className="text-muted mt-3">No attendance records found</h5>
                      <p className="text-muted">Try adjusting your search criteria</p>
                    </td>
                  </tr>
                ) : (
                  filteredAttendance.map((record, index) => {
                    const customer = record.customerId;
                    return (
                      <tr key={record._id || index}>
                        <td>
                          <div className="member-avatar-small">
                            {customer?.image ? (
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
                              className="avatar-placeholder-small"
                              style={{ display: customer?.image ? 'none' : 'flex' }}
                            >
                              <i className="bi bi-person-fill"></i>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="fw-semibold">
                            {record.rollNumber || customer?.rollNumber || 'N/A'}
                          </span>
                        </td>
                        <td>
                          <div>
                            <div className="fw-semibold">
                              {record.customerName || customer?.name || 'N/A'}
                            </div>
                            <small className="text-muted">
                              {customer?.membership || 'N/A'}
                            </small>
                          </div>
                        </td>
                        <td>{customer?.phone || 'N/A'}</td>
                        <td>
                          <Badge bg="info" className="text-capitalize">
                            {customer?.membership || 'N/A'}
                          </Badge>
                        </td>
                        <td>{formatDate(record.date)}</td>
                        <td>
                          <span className="time-badge">
                            {record.checkInTime || 'N/A'}
                          </span>
                        </td>
                        <td>
                          <span className="time-badge">
                            {record.checkOutTime || 'Not yet'}
                          </span>
                        </td>
                        <td>
                          <span className="duration-badge">
                            {record.duration || 'N/A'}
                          </span>
                        </td>
                        <td>{getStatusBadge('Present')}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      {/* Import Modal */}
      <Modal show={showImportModal} onHide={() => setShowImportModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-upload me-2"></i>
            Import Attendance Data
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="text-center mb-4">
            <i className="bi bi-file-earmark-excel text-success" style={{ fontSize: '3rem' }}></i>
            <h5 className="mt-3">Upload Excel File</h5>
            <p className="text-muted">
              Select an Excel file (.xlsx, .xls) to import attendance data
            </p>
          </div>
          <Form.Group>
            <Form.Label>Choose File</Form.Label>
            <Form.Control
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImport}
            />
            <Form.Text className="text-muted">
              Make sure the file contains columns: Name, Date, Status
            </Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowImportModal(false)}>
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default ViewAttendance;
