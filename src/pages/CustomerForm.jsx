import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Image } from 'react-bootstrap';
import axios from 'axios';

const CustomerForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    joinDate: '',
    expiryDate: '',
    membership: '',
    fee: '',
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

  const membershipFees = {
    regular: 1200,
    training: 5000,
    premium: 8000
  };

  useEffect(() => {
    fetchNextRollNumber();
  }, []);

  const fetchNextRollNumber = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/customers/count');
      const count = response.data.count + 1;
      setRollNumber(`GYM-${String(count).padStart(4, '0')}`);
    } catch (error) {
      console.error('Error fetching roll number:', error);
      setRollNumber('GYM-XXXX');
    }
  };

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

  const handleJoinDateChange = (e) => {
    const date = e.target.value;
    setFormData(prev => ({ ...prev, joinDate: date }));
    
    // Auto calculate expiry date (1 month later)
    const expiry = new Date(date);
    expiry.setMonth(expiry.getMonth() + 1);
    setFormData(prev => ({ ...prev, expiryDate: expiry.toISOString().split('T')[0] }));
  };

  const handleMembershipChange = (e) => {
    const membership = e.target.value;
    const fee = membershipFees[membership] || 0;
    
    setFormData(prev => ({
      ...prev,
      membership,
      fee,
      remaining: fee - (parseFloat(prev.paidAmount) || 0)
    }));
  };

  const handlePaidAmountChange = (e) => {
    const paidAmount = parseFloat(e.target.value) || 0;
    setFormData(prev => ({
      ...prev,
      paidAmount,
      remaining: prev.fee - paidAmount
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const showAlert = (message, variant = 'success') => {
    setAlert({ show: true, message, variant });
    setTimeout(() => setAlert({ show: false, message: '', variant: '' }), 5000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = new FormData();
      Object.keys(formData).forEach(key => {
        if (key === 'emergencyContact') {
          submitData.append(key, JSON.stringify(formData[key]));
        } else {
          submitData.append(key, formData[key]);
        }
      });
      
      if (image) {
        submitData.append('image', image);
      }

      await axios.post('http://localhost:5000/api/customers', submitData);
      
      showAlert('Customer added successfully!', 'success');
      
      // Reset form
      setFormData({
        name: '',
        phone: '',
        email: '',
        address: '',
        joinDate: '',
        expiryDate: '',
        membership: '',
        fee: '',
        paidAmount: '',
        remaining: '',
        emergencyContact: { name: '', phone: '' }
      });
      setImage(null);
      setPreview('');
      fetchNextRollNumber();
      
    } catch (error) {
      showAlert('Error adding customer: ' + (error.response?.data?.error || error.message), 'danger');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="py-4">
      <Row className="justify-content-center">
        <Col lg={8}>
          <Card className="shadow-lg border-0">
            <Card.Header className="bg-primary text-white text-center py-4">
              <h2 className="mb-0 fw-bold">
                <i className="bi bi-person-plus-fill me-3"></i>
                Add New Member
              </h2>
            </Card.Header>
            <Card.Body className="p-5">
              {alert.show && (
                <Alert variant={alert.variant} dismissible onClose={() => setAlert({ show: false })}>
                  {alert.message}
                </Alert>
              )}

              <Form onSubmit={handleSubmit}>
                {/* Roll Number */}
                <Row className="mb-4">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="fw-semibold">
                        <i className="bi bi-hash me-2"></i>Roll Number
                      </Form.Label>
                      <Form.Control
                        type="text"
                        value={rollNumber}
                        readOnly
                        className="bg-light"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="fw-semibold">
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
                            width={100}
                            height={100}
                            className="rounded-circle border"
                          />
                        </div>
                      )}
                    </Form.Group>
                  </Col>
                </Row>

                {/* Personal Information */}
                <h5 className="text-primary mb-3">
                  <i className="bi bi-person me-2"></i>Personal Information
                </h5>
                <Row className="mb-4">
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label className="fw-semibold">Full Name *</Form.Label>
                      <Form.Control
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        placeholder="Enter full name"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label className="fw-semibold">Phone Number *</Form.Label>
                      <Form.Control
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        required
                        placeholder="Enter phone number"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row className="mb-4">
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label className="fw-semibold">Email</Form.Label>
                      <Form.Control
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="Enter email address"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label className="fw-semibold">Address</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={1}
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        placeholder="Enter address"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                {/* Membership Information */}
                <h5 className="text-primary mb-3">
                  <i className="bi bi-award me-2"></i>Membership Information
                </h5>
                <Row className="mb-4">
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label className="fw-semibold">Join Date *</Form.Label>
                      <Form.Control
                        type="date"
                        name="joinDate"
                        value={formData.joinDate}
                        onChange={handleJoinDateChange}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label className="fw-semibold">Expiry Date</Form.Label>
                      <Form.Control
                        type="date"
                        name="expiryDate"
                        value={formData.expiryDate}
                        onChange={handleInputChange}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label className="fw-semibold">Membership Type *</Form.Label>
                      <Form.Select
                        name="membership"
                        value={formData.membership}
                        onChange={handleMembershipChange}
                        required
                      >
                        <option value="">Select Membership</option>
                        <option value="regular">Regular (RS1,200)</option>
                        <option value="training">Training (RS5,000)</option>
                        <option value="premium">Premium (RS8,000)</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>

                {/* Payment Information */}
                <h5 className="text-primary mb-3">
                  <i className="bi bi-credit-card me-2"></i>Payment Information
                </h5>
                <Row className="mb-4">
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label className="fw-semibold">Total Fee</Form.Label>
                      <Form.Control
                        type="number"
                        name="fee"
                        value={formData.fee}
                        readOnly
                        className="bg-light"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label className="fw-semibold">Paid Amount *</Form.Label>
                      <Form.Control
                        type="number"
                        name="paidAmount"
                        value={formData.paidAmount}
                        onChange={handlePaidAmountChange}
                        required
                        min="0"
                        max={formData.fee}
                        placeholder="0"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label className="fw-semibold">Remaining Amount</Form.Label>
                      <Form.Control
                        type="number"
                        name="remaining"
                        value={formData.remaining}
                        readOnly
                        className="bg-light"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                {/* Emergency Contact */}
                <h5 className="text-primary mb-3">
                  <i className="bi bi-telephone me-2"></i>Emergency Contact
                </h5>
                <Row className="mb-4">
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label className="fw-semibold">Contact Name</Form.Label>
                      <Form.Control
                        type="text"
                        name="emergencyContact.name"
                        value={formData.emergencyContact.name}
                        onChange={handleInputChange}
                        placeholder="Emergency contact name"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label className="fw-semibold">Contact Phone</Form.Label>
                      <Form.Control
                        type="tel"
                        name="emergencyContact.phone"
                        value={formData.emergencyContact.phone}
                        onChange={handleInputChange}
                        placeholder="Emergency contact phone"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <div className="text-center">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="px-5 py-3"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Adding Member...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-person-plus me-2"></i>
                        Add Member
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
