import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Image, Badge, Modal } from 'react-bootstrap';
import axios from 'axios';

const CustomerForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    joinDate: '',
    currentDate: new Date().toISOString().split('T')[0], // Auto set to today
    expiryDate: '',
    membership: '',
    customFee: '',
    paidAmount: '',
    remaining: '',
    emergencyContact: {
      name: '',
      phone: ''
    }
  });
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: '', variant: '' });

  const membershipTypes = [
    { value: 'regular', label: '💪 Regular Membership' },
    { value: 'training', label: '🏋️ Training Membership' },
    { value: 'premium', label: '👑 Premium Membership' },
    { value: 'basic', label: '🔰 Basic Membership' },
    { value: 'vip', label: '⭐ VIP Membership' },
    { value: 'student', label: '🎓 Student Membership' }
  ];

  useEffect(() => {
    resetCurrentDate();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('emergencyContact.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        emergencyContact: {
          ...prev.emergencyContact,
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleRollNumberChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, ''); // Only allow numbers
    setRollNumber(value);
  };

  const handleJoinDateChange = (e) => {
    const joinDate = e.target.value;
    setFormData(prev => ({ ...prev, joinDate }));
    
    // Only auto-calculate expiry if current date is set
    if (formData.currentDate) {
      calculateExpiryFromCurrentDate(formData.currentDate);
    }
  };

  const handleCurrentDateChange = (e) => {
    const currentDate = e.target.value;
    setFormData(prev => ({ ...prev, currentDate }));
    calculateExpiryFromCurrentDate(currentDate);
  };

  const calculateExpiryFromCurrentDate = (currentDate) => {
    if (currentDate) {
      const expiry = new Date(currentDate);
      expiry.setMonth(expiry.getMonth() + 1);
      setFormData(prev => ({ 
        ...prev, 
        expiryDate: expiry.toISOString().split('T')[0] 
      }));
    }
  };

  const handleCustomFeeChange = (e) => {
    const customFee = parseFloat(e.target.value) || 0;
    setFormData(prev => ({
      ...prev,
      customFee,
      remaining: customFee - (parseFloat(prev.paidAmount) || 0)
    }));
  };

  const handlePaidAmountChange = (e) => {
    const paidAmount = parseFloat(e.target.value) || 0;
    setFormData(prev => ({
      ...prev,
      paidAmount,
      remaining: (prev.customFee || 0) - paidAmount
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        showAlert('Image size should be less than 5MB', 'danger');
        return;
      }
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        showAlert('Please select a valid image file', 'danger');
        return;
      }
      
      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const showAlert = (message, variant = 'success') => {
    setAlert({ show: true, message, variant });
    setTimeout(() => setAlert({ show: false, message: '', variant: '' }), 5000);
  };

  const calculateDaysDifference = (startDate, endDate) => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStatusBadge = () => {
    if (!formData.joinDate || !formData.currentDate) return null;
    
    const daysDiff = calculateDaysDifference(formData.joinDate, formData.currentDate);
    const joinYear = new Date(formData.joinDate).getFullYear();
    const currentYear = new Date(formData.currentDate).getFullYear();
    
    if (currentYear > joinYear) {
      return <Badge bg="warning" className="ms-2">Returning Member ({daysDiff} days gap)</Badge>;
    } else {
      return <Badge bg="success" className="ms-2">New Member</Badge>;
    }
  };

  const checkRollNumberExists = async (rollNum) => {
    try {
      const response = await axios.get(`https://backend-deploy-ten-pi.vercel.app/api/customers/check-roll/${rollNum}`);
      return response.data.exists;
    } catch (error) {
      console.error('Error checking roll number:', error);
      return false;
    }
  };

  const validateForm = async () => {
    // Check required fields
    if (!formData.name.trim()) {
      showAlert('Name is required', 'danger');
      return false;
    }
    
    if (!formData.phone.trim()) {
      showAlert('Phone number is required', 'danger');
      return false;
    }

    if (!rollNumber.trim()) {
      showAlert('Roll number is required', 'danger');
      return false;
    }

    if (rollNumber.length < 1) {
      showAlert('Roll number must be at least 1 digit', 'danger');
      return false;
    }
    
    if (!formData.joinDate) {
      showAlert('Join date is required', 'danger');
      return false;
    }
    
    if (!formData.currentDate) {
      showAlert('Current date is required', 'danger');
      return false;
    }
    
    if (!formData.membership) {
      showAlert('Please select a membership type', 'danger');
      return false;
    }

    if (!formData.customFee || formData.customFee <= 0) {
      showAlert('Please enter a valid membership fee', 'danger');
      return false;
    }
    
    if (formData.paidAmount < 0) {
      showAlert('Paid amount cannot be negative', 'danger');
      return false;
    }

    if (formData.paidAmount > formData.customFee) {
      showAlert('Paid amount cannot be greater than total fee', 'danger');
      return false;
    }

    // Check if roll number already exists
    const rollExists = await checkRollNumberExists(rollNumber);
    if (rollExists) {
      showAlert(`Roll number ${rollNumber} already exists. Please choose a different number.`, 'danger');
      return false;
    }
    
    // Validate phone number format (basic validation)
    const phoneRegex = /^[0-9+\-\s()]+$/;
    if (!phoneRegex.test(formData.phone)) {
      showAlert('Please enter a valid phone number', 'danger');
      return false;
    }
    
    // Validate email if provided
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      showAlert('Please enter a valid email address', 'danger');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const isValid = await validateForm();
    if (!isValid) {
      return;
    }
    
    setLoading(true);

    // Validation for dates
    if (formData.joinDate && formData.currentDate) {
      const joinDate = new Date(formData.joinDate);
      const currentDate = new Date(formData.currentDate);
      
      if (currentDate < joinDate) {
        showAlert('Current date cannot be before joining date!', 'danger');
        setLoading(false);
        return;
      }
    }

    try {
      const submitData = new FormData();
      
      // Add roll number to form data (just the number, server will format it)
      submitData.append('rollNumber', rollNumber);
      
      // Add custom fee instead of predefined fee
      const dataToSubmit = {
        ...formData,
        fee: formData.customFee, // Use custom fee as the main fee
        remaining: formData.customFee - (formData.paidAmount || 0)
      };

      Object.keys(dataToSubmit).forEach(key => {
        if (key === 'emergencyContact') {
          submitData.append(key, JSON.stringify(dataToSubmit[key]));
        } else if (key !== 'customFee') { // Don't send customFee separately
          submitData.append(key, dataToSubmit[key]);
        }
      });
      
      if (image) {
        submitData.append('image', image);
      }

      // Try to submit to server
      const response = await axios.post(`https://backend-deploy-ten-pi.vercel.app/api/customers`, submitData, {
        timeout: 10000, // 10 second timeout
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      showAlert(`Customer added successfully with Roll Number: ${rollNumber}`, 'success');
      
      // Reset form
      resetForm();
      
    } catch (error) {
      console.error('Submission error:', error);
      
      if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
        showAlert(`Server connection failed. Please check your connection and try again.`, 'warning');
      } else if (error.response?.status === 400 && error.response?.data?.error?.includes('duplicate')) {
        showAlert('This roll number already exists. Please choose a different number.', 'danger');
      } else if (error.response) {
        showAlert('Error adding customer: ' + (error.response?.data?.error || error.response?.data?.message || 'Unknown server error'), 'danger');
      } else {
        showAlert('Error adding customer: ' + error.message, 'danger');
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      address: '',
      joinDate: '',
      currentDate: new Date().toISOString().split('T')[0],
      expiryDate: '',
      membership: '',
      customFee: '',
      paidAmount: '',
      remaining: '',
      emergencyContact: { name: '', phone: '' }
    });
    setImage(null);
    setPreview('');
    setRollNumber('');
  };

  const resetCurrentDate = () => {
    const today = new Date().toISOString().split('T')[0];
    setFormData(prev => ({ ...prev, currentDate: today }));
    calculateExpiryFromCurrentDate(today);
  };

  // Test server connection
  const testServerConnection = async () => {
    try {
      setLoading(true);
      await axios.get(`https://backend-deploy-ten-pi.vercel.app/api/health`, { timeout: 5000 });
      showAlert('Server connection successful!', 'success');
    } catch (error) {
      showAlert('Server connection failed. Please check if the server is running.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="py-4">
      <Row className="justify-content-center">
        <Col lg={10}>
          <Card className="shadow-lg border-0">
            <Card.Header className="bg-gradient text-white text-center py-4" 
                        style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
              <h2 className="mb-0 fw-bold">
                <i className="bi bi-person-plus-fill me-3"></i>
                Add New Member
              </h2>
              {/* Server Connection Control */}
              <div className="mt-3">
                <Button 
                  variant="outline-light" 
                  size="sm" 
                  onClick={testServerConnection}
                  className="me-2"
                  disabled={loading}
                >
                  <i className="bi bi-wifi me-1"></i>
                  Test Server
                </Button>
              </div>
            </Card.Header>
            <Card.Body className="p-5">
              {alert.show && (
                <Alert variant={alert.variant} dismissible onClose={() => setAlert({ show: false })}>
                  <i className={`bi bi-${alert.variant === 'success' ? 'check-circle' : alert.variant === 'warning' ? 'exclamation-triangle' : 'x-circle'} me-2`}></i>
                  {alert.message}
                </Alert>
              )}

              <Form onSubmit={handleSubmit}>
                {/* Roll Number and Image */}
                <Row className="mb-4">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="fw-semibold text-primary">
                        <i className="bi bi-hash me-2"></i>Roll Number *
                      </Form.Label>
                      <Form.Control
                        type="text"
                        value={rollNumber}
                        onChange={handleRollNumberChange}
                        placeholder="Enter roll number (e.g., 456, 111)"
                        required
                        className="fw-bold"
                        style={{ fontSize: '1.2rem' }}
                      />
                      <Form.Text className="text-muted">
                        <i className="bi bi-info-circle me-1"></i>
                        Enter any number (e.g., 456, 111, 1001). Only numbers allowed.
                      </Form.Text>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="fw-semibold text-primary">
                        <i className="bi bi-camera me-2"></i>Profile Image
                      </Form.Label>
                      <Form.Control
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                      />
                      {preview && (
                        <div className="text-center mt-3">
                          <Image
                            src={preview}
                            alt="Preview"
                            width={120}
                            height={120}
                            className="rounded-circle border border-3 border-primary shadow"
                          />
                        </div>
                      )}
                    </Form.Group>
                  </Col>
                </Row>

                {/* Roll Number Preview */}
                {rollNumber && (
                  <Alert variant="info" className="mb-4">
                    <Row className="align-items-center">
                      <Col>
                        <strong><i className="bi bi-eye me-2"></i>Roll Number Preview:</strong>
                        <br />
                        Final Roll Number: <Badge bg="success" className="fs-6">GYM-{String(rollNumber).padStart(4, '0')}</Badge>
                      </Col>
                    </Row>
                  </Alert>
                )}

                {/* Personal Information */}
                <Card className="mb-4 border-0 shadow-sm">
                  <Card.Header className="bg-light">
                    <h5 className="text-primary mb-0">
                      <i className="bi bi-person me-2"></i>Personal Information
                    </h5>
                  </Card.Header>
                  <Card.Body>
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label className="fw-semibold">
                            <i className="bi bi-person-circle me-1"></i>Full Name *
                          </Form.Label>
                          <Form.Control
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            required
                            placeholder="Enter full name"
                            className="rounded-3"
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label className="fw-semibold">
                            <i className="bi bi-telephone me-1"></i>Phone Number *
                          </Form.Label>
                          <Form.Control
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleInputChange}
                            required
                            placeholder="Enter phone number"
                            className="rounded-3"
                          />
                        </Form.Group>
                      </Col>
                    </Row>

                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label className="fw-semibold">
                            <i className="bi bi-envelope me-1"></i>Email
                          </Form.Label>
                          <Form.Control
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            placeholder="Enter email address"
                            className="rounded-3"
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label className="fw-semibold">
                            <i className="bi bi-geo-alt me-1"></i>Address
                          </Form.Label>
                          <Form.Control
                            as="textarea"
                            rows={2}
                            name="address"
                            value={formData.address}
                            onChange={handleInputChange}
                            placeholder="Enter address"
                            className="rounded-3"
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>

                {/* Date Information */}
                <Card className="mb-4 border-0 shadow-sm">
                  <Card.Header className="bg-light">
                    <h5 className="text-primary mb-0">
                      <i className="bi bi-calendar-event me-2"></i>Date Information
                      {getStatusBadge()}
                    </h5>
                  </Card.Header>
                  <Card.Body>
                    <Row>
                      <Col md={4}>
                        <Form.Group className="mb-3">
                          <Form.Label className="fw-semibold">
                            <i className="bi bi-calendar-plus me-1"></i>Original Joining Date *
                          </Form.Label>
                          <Form.Control
                            type="date"
                            name="joinDate"
                            value={formData.joinDate}
                            onChange={handleJoinDateChange}
                            required
                            className="rounded-3"
                          />
                          <Form.Text className="text-muted">
                            <i className="bi bi-info-circle me-1"></i>
                            When member first joined the gym
                          </Form.Text>
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group className="mb-3">
                          <Form.Label className="fw-semibold">
                            <i className="bi bi-calendar-check me-1"></i>Current Visit Date *
                          </Form.Label>
                          <div className="d-flex">
                            <Form.Control
                              type="date"
                              name="currentDate"
                              value={formData.currentDate}
                              onChange={handleCurrentDateChange}
                              required
                              className="rounded-3 me-2"
                            />
                            <Button 
                              variant="outline-primary" 
                              size="sm"
                              onClick={resetCurrentDate}
                              title="Set to today"
                              className="rounded-3"
                            >
                              <i className="bi bi-calendar-day"></i>
                            </Button>
                          </div>
                          <Form.Text className="text-muted">
                            <i className="bi bi-info-circle me-1"></i>
                            Today's date or when member visited
                          </Form.Text>
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group className="mb-3">
                          <Form.Label className="fw-semibold">
                            <i className="bi bi-calendar-x me-1"></i>Membership Expiry Date
                          </Form.Label>
                          <Form.Control
                            type="date"
                            name="expiryDate"
                            value={formData.expiryDate}
                            onChange={handleInputChange}
                            required
                            className="rounded-3"
                          />
                          <Form.Text className="text-muted">
                            <i className="bi bi-info-circle me-1"></i>
                            Auto-calculated from current date + 1 month
                          </Form.Text>
                        </Form.Group>
                      </Col>
                    </Row>

                    {/* Date Information Display */}
                    {formData.joinDate && formData.currentDate && (
                      <Alert variant="info" className="mt-3">
                        <Row>
                          <Col md={4} className="text-center">
                            <strong>Original Join:</strong><br/>
                            <Badge bg="primary" className="fs-6">
                              {new Date(formData.joinDate).toLocaleDateString()}
                            </Badge>
                          </Col>
                          <Col md={4} className="text-center">
                            <strong>Current Visit:</strong><br/>
                            <Badge bg="success" className="fs-6">
                              {new Date(formData.currentDate).toLocaleDateString()}
                            </Badge>
                          </Col>
                          <Col md={4} className="text-center">
                            <strong>Days Gap:</strong><br/>
                            <Badge bg="warning" className="fs-6">
                              {calculateDaysDifference(formData.joinDate, formData.currentDate)} days
                            </Badge>
                          </Col>
                        </Row>
                      </Alert>
                    )}
                  </Card.Body>
                </Card>

                {/* Membership Information */}
                <Card className="mb-4 border-0 shadow-sm">
                  <Card.Header className="bg-light">
                    <h5 className="text-primary mb-0">
                      <i className="bi bi-award me-2"></i>Membership Information
                    </h5>
                  </Card.Header>
                  <Card.Body>
                    <Row>
                      <Col md={12}>
                        <Form.Group className="mb-3">
                          <Form.Label className="fw-semibold">
                            <i className="bi bi-star me-1"></i>Membership Type *
                          </Form.Label>
                          <Form.Select
                            name="membership"
                            value={formData.membership}
                            onChange={handleInputChange}
                            required
                            className="rounded-3"
                          >
                            <option value="">Select Membership Plan</option>
                            {membershipTypes.map((type) => (
                              <option key={type.value} value={type.value}>
                                {type.label}
                              </option>
                            ))}
                          </Form.Select>
                          <Form.Text className="text-muted">
                            <i className="bi bi-info-circle me-1"></i>
                            Choose the type of membership for this customer
                          </Form.Text>
                        </Form.Group>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>

                {/* Payment Information */}
                <Card className="mb-4 border-0 shadow-sm">
                  <Card.Header className="bg-light">
                    <h5 className="text-primary mb-0">
                      <i className="bi bi-credit-card me-2"></i>Payment Information
                    </h5>
                  </Card.Header>
                  <Card.Body>
                    <Row>
                      <Col md={4}>
                        <Form.Group className="mb-3">
                          <Form.Label className="fw-semibold">
                            <i className="bi bi-currency-dollar me-1"></i>Membership Fee (PKR) *
                          </Form.Label>
                          <Form.Control
                            type="number"
                            name="customFee"
                            value={formData.customFee}
                            onChange={handleCustomFeeChange}
                            required
                            min="0"
                            step="0.01"
                            placeholder="Enter membership fee"
                            className="fw-bold rounded-3"
                            style={{ fontSize: '1.1rem' }}
                          />
                          <Form.Text className="text-muted">
                            <i className="bi bi-info-circle me-1"></i>
                            Enter the custom membership fee for this customer
                          </Form.Text>
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group className="mb-3">
                          <Form.Label className="fw-semibold">
                            <i className="bi bi-cash me-1"></i>Paid Amount (PKR) *
                          </Form.Label>
                          <Form.Control
                            type="number"
                            name="paidAmount"
                            value={formData.paidAmount}
                            onChange={handlePaidAmountChange}
                            required
                            min="0"
                            max={formData.customFee}
                            step="0.01"
                            placeholder="0"
                            className="rounded-3"
                          />
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group className="mb-3">
                          <Form.Label className="fw-semibold">
                            <i className="bi bi-exclamation-circle me-1"></i>Remaining (PKR)
                          </Form.Label>
                          <Form.Control
                            type="number"
                            name="remaining"
                            value={formData.remaining}
                            readOnly
                            className={`fw-bold rounded-3 ${formData.remaining > 0 ? 'bg-danger text-white' : 'bg-success text-white'}`}
                            style={{ fontSize: '1.1rem' }}
                          />
                        </Form.Group>
                      </Col>
                    </Row>

                    {/* Payment Status */}
                    {formData.customFee > 0 && (
                      <Alert variant={formData.remaining > 0 ? 'warning' : 'success'} className="mt-3">
                        <Row className="align-items-center">
                          <Col>
                            <strong>Payment Status:</strong> 
                            {formData.remaining > 0 ? (
                              <Badge bg="danger" className="ms-2">Pending PKR {formData.remaining}</Badge>
                            ) : (
                              <Badge bg="success" className="ms-2">Fully Paid ✓</Badge>
                            )}
                          </Col>
                          <Col xs="auto">
                            <div className="progress" style={{ width: '200px', height: '25px' }}>
                              <div 
                                className="progress-bar bg-success" 
                                role="progressbar" 
                                style={{ width: `${((formData.paidAmount / formData.customFee) * 100) || 0}%` }}
                              >
                                {Math.round(((formData.paidAmount / formData.customFee) * 100) || 0)}%
                              </div>
                            </div>
                          </Col>
                        </Row>
                      </Alert>
                    )}
                  </Card.Body>
                </Card>

                {/* Emergency Contact */}
                <Card className="mb-4 border-0 shadow-sm">
                  <Card.Header className="bg-light">
                    <h5 className="text-primary mb-0">
                      <i className="bi bi-telephone me-2"></i>Emergency Contact
                    </h5>
                  </Card.Header>
                  <Card.Body>
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label className="fw-semibold">
                            <i className="bi bi-person-lines-fill me-1"></i>Contact Name
                          </Form.Label>
                          <Form.Control
                            type="text"
                            name="emergencyContact.name"
                            value={formData.emergencyContact.name}
                            onChange={handleInputChange}
                            placeholder="Emergency contact name"
                            className="rounded-3"
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label className="fw-semibold">
                            <i className="bi bi-telephone-plus me-1"></i>Contact Phone
                          </Form.Label>
                          <Form.Control
                            type="tel"
                            name="emergencyContact.phone"
                            value={formData.emergencyContact.phone}
                            onChange={handleInputChange}
                            placeholder="Emergency contact phone"
                            className="rounded-3"
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>

                {/* Action Buttons */}
                <div className="text-center mt-5">
                  <Button
                    type="button"
                    variant="outline-secondary"
                    size="lg"
                    className="px-4 py-2 rounded-4 me-3"
                    onClick={resetForm}
                    disabled={loading}
                  >
                    <i className="bi bi-arrow-clockwise me-2"></i>
                    Reset Form
                  </Button>
                  
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="px-5 py-3 rounded-4 shadow"
                    disabled={loading}
                    style={{ 
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      border: 'none',
                      fontSize: '1.2rem'
                    }}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-3"></span>
                        Adding Member...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-person-plus me-3"></i>
                        Add New Member
                      </>
                    )}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default CustomerForm;
