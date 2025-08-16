import { useState, useEffect } from 'react';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';

const CustomerList = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [customersPerPage] = useState(20);
  const [editFormData, setEditFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    joinDate: '',
    currentDate: '',
    expiryDate: '',
    membership: '',
    fee: '',
    paidAmount: '',
    remaining: '',
    rollNumber: '',
    emergencyContact: {
      name: '',
      phone: ''
    },
    image: null,
  });

  // Fetch customers from API
  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`https://backend-deploy-ten-pi.vercel.app/api/customers`);
      setCustomers(response.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
      alert('Error loading customers. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (customerId, e) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this member?')) {
      try {
        const response = await axios.delete(`https://backend-deploy-ten-pi.vercel.app/api/customers/${customerId}`);
        if (response.status === 200) {
          setCustomers(customers.filter((customer) => customer._id !== customerId));
          
          // Success notification
          const successAlert = document.createElement('div');
          successAlert.className = 'alert alert-success alert-dismissible fade show position-fixed';
          successAlert.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
          successAlert.innerHTML = `
            <i class="bi bi-check-circle me-2"></i>Member deleted successfully!
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
          `;
          document.body.appendChild(successAlert);
          setTimeout(() => successAlert.remove(), 3000);
          
          // Adjust current page if necessary after deletion
          const totalPages = Math.ceil((customers.length - 1) / customersPerPage);
          if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(totalPages);
          }
        } else {
          throw new Error('Failed to delete customer');
        }
      } catch (error) {
        console.error('Error deleting customer:', error);
        alert('Error deleting customer. Please try again.');
      }
    }
  };

  const handleEdit = (customer, e) => {
    e.stopPropagation();
    setEditingCustomer(customer);
    setEditFormData({
      name: customer.name || '',
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      joinDate: customer.joinDate ? customer.joinDate.split('T')[0] : '',
      currentDate: customer.currentDate ? customer.currentDate.split('T')[0] : '',
      expiryDate: customer.expiryDate ? customer.expiryDate.split('T')[0] : '',
      membership: customer.membership || '',
      fee: customer.fee || '',
      paidAmount: customer.paidAmount || '',
      remaining: customer.remaining || '',
      rollNumber: customer.rollNumber || '',
      emergencyContact: {
        name: customer.emergencyContact?.name || '',
        phone: customer.emergencyContact?.phone || ''
      },
      image: null,
    });
    setShowEditModal(true);
  };

  const handleViewDetails = (customer, e) => {
    if (e) e.stopPropagation();
    setSelectedCustomer(customer);
    setShowDetailsModal(true);
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();

    try {
      const formData = new FormData();
      formData.append('name', editFormData.name);
      formData.append('phone', editFormData.phone);
      formData.append('email', editFormData.email);
      formData.append('address', editFormData.address);
      formData.append('joinDate', editFormData.joinDate);
      formData.append('currentDate', editFormData.currentDate);
      formData.append('expiryDate', editFormData.expiryDate);
      formData.append('membership', editFormData.membership);
      formData.append('fee', editFormData.fee);
      formData.append('paidAmount', editFormData.paidAmount);
      formData.append('remaining', editFormData.remaining);
      formData.append('rollNumber', editFormData.rollNumber);
      formData.append('emergencyContact', JSON.stringify(editFormData.emergencyContact));
      
      if (editFormData.image) {
        formData.append('image', editFormData.image);
      }

      const response = await axios.put(
        `https://backend-deploy-ten-pi.vercel.app/api/customers/${editingCustomer._id}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.status === 200) {
        setShowEditModal(false);
        setEditingCustomer(null);
        fetchCustomers();
        
        // Success notification
        const successAlert = document.createElement('div');
        successAlert.className = 'alert alert-success alert-dismissible fade show position-fixed';
        successAlert.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        successAlert.innerHTML = `
          <i class="bi bi-check-circle me-2"></i>Member updated successfully!
          <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        document.body.appendChild(successAlert);
        setTimeout(() => successAlert.remove(), 3000);
      } else {
        throw new Error('Failed to update customer');
      }
    } catch (error) {
      console.error('Error updating customer:', error);
      alert('Error updating customer: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleInputChange = (e) => {
    const { name, value, files } = e.target;
    
    if (name.startsWith('emergencyContact.')) {
      const field = name.split('.')[1];
      setEditFormData(prev => ({
        ...prev,
        emergencyContact: {
          ...prev.emergencyContact,
          [field]: value
        }
      }));
    } else {
      setEditFormData(prev => ({
        ...prev,
        [name]: name === 'image' ? files[0] : value,
      }));
    }
  };

  // Filter customers based on search term
  const filteredCustomers = customers.filter(
    (cust) =>
      (cust.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cust.phone || '').includes(searchTerm) ||
      (cust.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cust.rollNumber || '').toString().includes(searchTerm)
  );

  // Pagination logic
  const indexOfLastCustomer = currentPage * customersPerPage;
  const indexOfFirstCustomer = indexOfLastCustomer - customersPerPage;
  const currentCustomers = filteredCustomers.slice(indexOfFirstCustomer, indexOfLastCustomer);
  const totalPages = Math.ceil(filteredCustomers.length / customersPerPage);

  // Reset to first page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

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

  const getMembershipBadge = (membership) => {
    const badges = {
      regular: 'bg-success',
      training: 'bg-warning text-dark',
      premium: 'bg-primary'
    };
    return badges[membership] || 'bg-secondary';
  };

  const getMembershipIcon = (membership) => {
    const icons = {
      regular: '💪',
      training: '🏋️',
      premium: '👑'
    };
    return icons[membership] || '🏃';
  };

  const calculateDaysDifference = (startDate, endDate) => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStatusBadge = (customer) => {
    if (!customer.joinDate || !customer.currentDate) return null;
    
    const daysDiff = calculateDaysDifference(customer.joinDate, customer.currentDate);
    const joinYear = new Date(customer.joinDate).getFullYear();
    const currentYear = new Date(customer.currentDate).getFullYear();
    
    if (currentYear > joinYear || daysDiff > 30) {
      return <span className="badge bg-warning text-dark ms-2" title={`${daysDiff} days gap`}>Returning</span>;
    } else {
      return <span className="badge bg-success ms-2">New</span>;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const renderPaginationButtons = () => {
    const buttons = [];
    const maxVisibleButtons = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisibleButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxVisibleButtons - 1);
    
    if (endPage - startPage + 1 < maxVisibleButtons) {
      startPage = Math.max(1, endPage - maxVisibleButtons + 1);
    }

    // Previous button
    buttons.push(
      <button
        key="prev"
        className={`btn btn-outline-primary me-1 ${currentPage === 1 ? 'disabled' : ''}`}
        onClick={() => currentPage > 1 && paginate(currentPage - 1)}
        disabled={currentPage === 1}
      >
        <i className="bi bi-chevron-left"></i> Previous
      </button>
    );

    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <button
          key={i}
          className={`btn me-1 ${currentPage === i ? 'btn-primary' : 'btn-outline-primary'}`}
          onClick={() => paginate(i)}
        >
          {i}
        </button>
      );
    }

    // Next button
    buttons.push(
      <button
        key="next"
        className={`btn btn-outline-primary ms-1 ${currentPage === totalPages ? 'disabled' : ''}`}
        onClick={() => currentPage < totalPages && paginate(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        Next <i className="bi bi-chevron-right"></i>
      </button>
    );

    return buttons;
  };

  return (
    <div className="container-fluid mt-4" style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', minHeight: '100vh' }}>
      <div className="card shadow-lg border-0 rounded-4 overflow-hidden">
        {/* Header with gradient */}
        <div className="card-header text-white text-center py-4 border-0" 
             style={{ 
               background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
               borderRadius: '1rem 1rem 0 0'
             }}>
          <h2 className="mb-0 fw-bold d-flex align-items-center justify-content-center">
            <i className="bi bi-people-fill me-3" style={{ fontSize: '2rem' }}></i>
            <span style={{ fontSize: '2.2rem' }}>Gym Members List</span>
            <i className="bi bi-star-fill ms-3 text-warning" style={{ fontSize: '1.5rem' }}></i>
          </h2>
          <p className="mb-0 mt-2 opacity-75">Manage your gym members efficiently</p>
        </div>

        <div className="card-body p-4" style={{ background: 'linear-gradient(180deg, #ffffff 0%, #f8f9fa 100%)' }}>
          {/* Search and Info Bar */}
          <div className="row mb-4">
            <div className="col-md-8">
              <div className="input-group shadow-sm">
                <span className="input-group-text bg-primary text-white border-0">
                  <i className="bi bi-search fs-5"></i>
                </span>
                <input
                  type="text"
                  placeholder="🔍 Search by name, phone, email, or roll number..."
                  className="form-control border-0 fs-6"
                  style={{ fontSize: '1.1rem', padding: '12px' }}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-4 d-flex align-items-center justify-content-end gap-2">
              <div className="badge bg-info fs-6 px-3 py-2 rounded-pill shadow-sm">
                <i className="bi bi-people me-2"></i>
                Total: {filteredCustomers.length} members
              </div>
              <div className="badge bg-success fs-6 px-3 py-2 rounded-pill shadow-sm">
                <i className="bi bi-eye me-2"></i>
                Page: {filteredCustomers.length > 0 ? currentPage : 0}/{totalPages}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary mb-3" role="status" style={{ width: '4rem', height: '4rem' }}>
                <span className="visually-hidden">Loading...</span>
              </div>
              <h4 className="text-primary">Loading members...</h4>
              <p className="text-muted">Please wait while we fetch the data</p>
            </div>
          ) : (
            <>
              {/* Enhanced Table */}
              <div className="table-responsive shadow-sm rounded-4 overflow-hidden">
                <table className="table table-hover mb-0 align-middle">
                  <thead className="table-dark">
                    <tr style={{ fontSize: '0.95rem' }}>
                      <th className="text-center py-3">
                        <i className="bi bi-image me-2"></i>Photo
                      </th>
                      <th className="text-center py-3">
                        <i className="bi bi-hash me-2"></i>Roll #
                      </th>
                      <th className="text-center py-3">
                        <i className="bi bi-person me-2"></i>Name & Status
                      </th>
                      <th className="text-center py-3">
                        <i className="bi bi-telephone me-2"></i>Contact
                      </th>
                      <th className="text-center py-3">
                        <i className="bi bi-calendar-event me-2"></i>Join Date
                      </th>
                      <th className="text-center py-3">
                        <i className="bi bi-calendar-check me-2"></i>Current Date
                      </th>
                      <th className="text-center py-3">
                        <i className="bi bi-calendar-x me-2"></i>Expiry
                      </th>
                      <th className="text-center py-3">
                        <i className="bi bi-award me-2"></i>Membership
                      </th>
                      <th className="text-center py-3">
                        <i className="bi bi-currency-dollar me-2"></i>Payment
                      </th>
                      <th className="text-center py-3">
                        <i className="bi bi-gear me-2"></i>Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentCustomers.map((c, index) => (
                      <tr 
                        key={c._id} 
                        className="align-middle"
                        style={{ 
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8f9fa'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#e3f2fd';
                          e.currentTarget.style.transform = 'scale(1.01)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#ffffff' : '#f8f9fa';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                        onClick={() => handleViewDetails(c)}
                      >
                        <td className="text-center py-3">
                          {c.image ? (
                            <img
                              src={getImageUrl(c.image)}
                              alt="Member"
                              className="rounded-circle border border-3 border-primary shadow-sm"
                              style={{ 
                                width: '70px', 
                                height: '70px', 
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
                            className="rounded-circle d-flex align-items-center justify-content-center text-white shadow-sm mx-auto"
                            style={{ 
                              width: '70px', 
                              height: '70px', 
                              fontSize: '28px',
                              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                              display: c.image ? 'none' : 'flex',
                              transition: 'transform 0.3s ease'
                            }}
                            onMouseEnter={(e) => e.target.style.transform = 'scale(1.1)'}
                            onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                          >
                            <i className="bi bi-person"></i>
                          </div>
                        </td>
                        
                        <td className="text-center py-3">
                          <span className="badge bg-secondary fs-6 px-3 py-2 rounded-pill shadow-sm">
                            {c.rollNumber || '-'}
                          </span>
                        </td>
                        
                        <td className="text-center py-3">
                          <div className="fw-bold text-primary mb-1" style={{ fontSize: '1.1rem' }}>
                            {c.name || '-'}
                          </div>
                          {getStatusBadge(c)}
                        </td>
                        
                        <td className="text-center py-3">
                          <div className="mb-1">
                            <i className="bi bi-telephone-fill text-success me-1"></i>
                            <span className="fw-semibold">{c.phone || '-'}</span>
                          </div>
                          <div>
                            <i className="bi bi-envelope-fill text-info me-1"></i>
                            <small className="text-muted">{c.email || '-'}</small>
                          </div>
                        </td>
                        
                        <td className="text-center py-3">
                          <div className="badge bg-primary px-3 py-2 rounded-pill shadow-sm">
                            <i className="bi bi-calendar-plus me-1"></i>
                            {formatDate(c.joinDate)}
                          </div>
                        </td>
                        
                        <td className="text-center py-3">
                          <div className="badge bg-success px-3 py-2 rounded-pill shadow-sm">
                            <i className="bi bi-calendar-check me-1"></i>
                            {formatDate(c.currentDate)}
                          </div>
                        </td>
                        
                        <td className="text-center py-3">
                          <div className={`badge px-3 py-2 rounded-pill shadow-sm ${new Date(c.expiryDate) < new Date() ? 'bg-danger' : 'bg-warning text-dark'}`}>
                            <i className="bi bi-calendar-x me-1"></i>
                            {formatDate(c.expiryDate)}
                            {new Date(c.expiryDate) < new Date() && <i className="bi bi-exclamation-triangle ms-1"></i>}
                          </div>
                        </td>
                        
                        <td className="text-center py-3">
                          <div className={`badge ${getMembershipBadge(c.membership)} fs-6 px-3 py-2 rounded-pill shadow-sm`}>
                            <span style={{ fontSize: '1.2rem' }}>{getMembershipIcon(c.membership)}</span>
                            <span className="ms-1 fw-bold">{c.membership || '-'}</span>
                          </div>
                        </td>
                        
                        <td className="text-center py-3">
                          <div className="mb-1">
                            <strong className="text-success">
                              <i className="bi bi-currency-dollar me-1"></i>
                              {c.fee ? `${c.fee} PKR` : '-'}
                            </strong>
                          </div>
                          <div className={`badge fs-6 px-2 py-1 rounded-pill ${c.remaining > 0 ? 'bg-danger' : 'bg-success'}`}>
                            Remaining: {c.remaining || 0} PKR
                            {c.remaining > 0 && <i className="bi bi-exclamation-triangle ms-1"></i>}
                          </div>
                        </td>
                        
                        <td className="text-center py-3">
                          <div className="btn-group shadow-sm" role="group">
                            <button
                              className="btn btn-sm btn-info text-white px-3"
                              onClick={(e) => handleViewDetails(c, e)}
                              title="View Details"
                              style={{ transition: 'all 0.3s ease' }}
                            >
                              <i className="bi bi-eye"></i>
                            </button>
                            <button
                              className="btn btn-sm btn-warning text-white px-3"
                              onClick={(e) => handleEdit(c, e)}
                              title="Edit Member"
                              style={{ transition: 'all 0.3s ease' }}
                            >
                              <i className="bi bi-pencil"></i>
                            </button>
                            <button
                              className="btn btn-sm btn-danger px-3"
                              onClick={(e) => handleDelete(c._id, e)}
                              title="Delete Member"
                              style={{ transition: 'all 0.3s ease' }}
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {currentCustomers.length === 0 && !loading && (
                  <div className="text-center py-5" style={{ backgroundColor: '#f8f9fa' }}>
                    <i className="bi bi-emoji-frown display-1 text-muted mb-3"></i>
                    <h4 className="text-muted">No matching members found</h4>
                    <p className="text-muted">Try adjusting your search criteria</p>
                    {searchTerm && (
                      <button 
                        className="btn btn-outline-primary rounded-pill px-4 shadow-sm"
                        onClick={() => setSearchTerm('')}
                      >
                        <i className="bi bi-x-circle me-2"></i>Clear Search
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Enhanced Pagination */}
              {totalPages > 1 && (
                <div className="d-flex justify-content-between align-items-center mt-4 p-4 bg-light rounded-4 shadow-sm">
                  <div className="text-muted">
                    <i className="bi bi-info-circle me-2"></i>
                    Showing <strong>{indexOfFirstCustomer + 1}</strong> to <strong>{Math.min(indexOfLastCustomer, filteredCustomers.length)}</strong> of <strong>{filteredCustomers.length}</strong> members
                  </div>
                  <div className="d-flex flex-wrap justify-content-center gap-1">
                    {renderPaginationButtons()}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Details Modal */}
          {showDetailsModal && selectedCustomer && (
            <div
              className="modal fade show"
              style={{
                display: 'block',
                backgroundColor: 'rgba(0,0,0,0.8)',
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: 1050,
              }}
              onClick={() => setShowDetailsModal(false)}
            >
              <div 
                className="modal-dialog modal-dialog-centered modal-lg"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-content rounded-4 border-0 shadow-lg overflow-hidden">
                  <div className="modal-header text-white border-0" 
                       style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                    <h5 className="modal-title fw-bold">
                      <i className="bi bi-person-lines-fill me-2"></i>
                      Member Details
                    </h5>
                    <button
                      type="button"
                      className="btn-close btn-close-white"
                      onClick={() => setShowDetailsModal(false)}
                    ></button>
                  </div>
                  <div className="modal-body p-4" style={{ background: 'linear-gradient(180deg, #ffffff 0%, #f8f9fa 100%)' }}>
                    <div className="row">
                      <div className="col-md-4 text-center mb-4">
                        {selectedCustomer.image ? (
                          <img
                            src={getImageUrl(selectedCustomer.image)}
                            alt="Member"
                            className="img-fluid rounded-4 border border-3 border-primary shadow-lg"
                            style={{ maxWidth: '200px', maxHeight: '200px', objectFit: 'cover' }}
                          />
                        ) : (
                          <div
                            className="rounded-4 d-flex align-items-center justify-content-center text-white shadow-lg mx-auto"
                            style={{ 
                              width: '200px', 
                              height: '200px', 
                              fontSize: '4rem',
                              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                            }}
                          >
                            <i className="bi bi-person"></i>
                          </div>
                        )}
                      </div>
                      <div className="col-md-8">
                        <div className="row">
                          <div className="col-12 mb-3">
                            <h3 className="text-primary fw-bold d-flex align-items-center">
                              {selectedCustomer.name}
                              <span className="badge bg-secondary ms-3 fs-6">{selectedCustomer.rollNumber}</span>
                              {getStatusBadge(selectedCustomer)}
                            </h3>
                          </div>
                          
                          <div className="col-md-6 mb-3">
                            <div className="card border-0 bg-light h-100">
                              <div className="card-body">
                                <label className="fw-semibold text-muted mb-1">Phone:</label>
                                <div className="h5 mb-0">
                                  <i className="bi bi-telephone-fill text-success me-2"></i>
                                  {selectedCustomer.phone || 'N/A'}
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="col-md-6 mb-3">
                            <div className="card border-0 bg-light h-100">
                              <div className="card-body">
                                <label className="fw-semibold text-muted mb-1">Email:</label>
                                <div className="h6 mb-0">
                                  <i className="bi bi-envelope-fill text-info me-2"></i>
                                  {selectedCustomer.email || 'N/A'}
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="col-12 mb-3">
                            <div className="card border-0 bg-light">
                              <div className="card-body">
                                <label className="fw-semibold text-muted mb-1">Address:</label>
                                <div className="h6 mb-0">
                                  <i className="bi bi-geo-alt-fill text-warning me-2"></i>
                                  {selectedCustomer.address || 'N/A'}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Date Information */}
                    <div className="row mt-4">
                      <div className="col-12 mb-3">
                        <h5 className="text-primary border-bottom pb-2">
                          <i className="bi bi-calendar-event me-2"></i>Date Information
                        </h5>
                      </div>
                      <div className="col-md-4 mb-3">
                        <div className="card border-0 bg-primary text-white h-100">
                          <div className="card-body text-center">
                            <i className="bi bi-calendar-plus fs-1 mb-2"></i>
                            <h6 className="mb-1">Join Date</h6>
                            <h5 className="mb-0">{formatDate(selectedCustomer.joinDate)}</h5>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-4 mb-3">
                        <div className="card border-0 bg-success text-white h-100">
                          <div className="card-body text-center">
                            <i className="bi bi-calendar-check fs-1 mb-2"></i>
                            <h6 className="mb-1">Current Date</h6>
                            <h5 className="mb-0">{formatDate(selectedCustomer.currentDate)}</h5>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-4 mb-3">
                        <div className={`card border-0 text-white h-100 ${new Date(selectedCustomer.expiryDate) < new Date() ? 'bg-danger' : 'bg-warning'}`}>
                          <div className="card-body text-center">
                            <i className="bi bi-calendar-x fs-1 mb-2"></i>
                            <h6 className="mb-1">Expiry Date</h6>
                            <h5 className="mb-0">{formatDate(selectedCustomer.expiryDate)}</h5>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Payment Information */}
                    <div className="row mt-4">
                      <div className="col-12 mb-3">
                        <h5 className="text-primary border-bottom pb-2">
                          <i className="bi bi-credit-card me-2"></i>Payment Information
                        </h5>
                      </div>
                      <div className="col-md-4 mb-3">
                        <div className="card border-0 bg-success text-white h-100">
                          <div className="card-body text-center">
                            <i className="bi bi-currency-dollar fs-1 mb-2"></i>
                            <h6 className="mb-1">Total Fee</h6>
                            <h4 className="mb-0">{selectedCustomer.fee ? `${selectedCustomer.fee} PKR` : 'N/A'}</h4>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-4 mb-3">
                        <div className="card border-0 bg-info text-white h-100">
                          <div className="card-body text-center">
                            <i className="bi bi-cash fs-1 mb-2"></i>
                            <h6 className="mb-1">Paid Amount</h6>
                            <h4 className="mb-0">{selectedCustomer.paidAmount ? `${selectedCustomer.paidAmount} PKR` : 'N/A'}</h4>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-4 mb-3">
                        <div className={`card border-0 text-white h-100 ${selectedCustomer.remaining > 0 ? 'bg-danger' : 'bg-success'}`}>
                          <div className="card-body text-center">
                            <i className="bi bi-exclamation-circle fs-1 mb-2"></i>
                            <h6 className="mb-1">Remaining</h6>
                            <h4 className="mb-0">{selectedCustomer.remaining ? `${selectedCustomer.remaining} PKR` : '0 PKR'}</h4>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Membership Information */}
                    <div className="row mt-4">
                      <div className="col-md-6 mb-3">
                        <div className="card border-0 bg-light h-100">
                          <div className="card-body text-center">
                            <h5 className="text-primary mb-3">
                              <i className="bi bi-award me-2"></i>Membership Type
                            </h5>
                            <div className={`badge ${getMembershipBadge(selectedCustomer.membership)} fs-4 px-4 py-3 rounded-pill`}>
                              <span style={{ fontSize: '1.5rem' }}>{getMembershipIcon(selectedCustomer.membership)}</span>
                              <span className="ms-2 fw-bold">{selectedCustomer.membership || 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-6 mb-3">
                        <div className="card border-0 bg-light h-100">
                          <div className="card-body text-center">
                            <h5 className="text-primary mb-3">
                              <i className="bi bi-calendar-range me-2"></i>Days Since Joining
                            </h5>
                            <div className="badge bg-primary fs-4 px-4 py-3 rounded-pill">
                              {selectedCustomer.joinDate && selectedCustomer.currentDate 
                                ? `${calculateDaysDifference(selectedCustomer.joinDate, selectedCustomer.currentDate)} days`
                                : 'N/A'
                              }
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Emergency Contact */}
                    {selectedCustomer.emergencyContact && (selectedCustomer.emergencyContact.name || selectedCustomer.emergencyContact.phone) && (
                      <div className="row mt-4">
                        <div className="col-12 mb-3">
                          <h5 className="text-primary border-bottom pb-2">
                            <i className="bi bi-telephone me-2"></i>Emergency Contact
                          </h5>
                        </div>
                        <div className="col-12">
                          <div className="card border-0 bg-light">
                            <div className="card-body">
                              <div className="row">
                                <div className="col-md-6">
                                  <strong className="text-muted">Name:</strong> 
                                  <span className="ms-2 h6">{selectedCustomer.emergencyContact.name || 'N/A'}</span>
                                </div>
                                <div className="col-md-6">
                                  <strong className="text-muted">Phone:</strong> 
                                  <span className="ms-2 h6">{selectedCustomer.emergencyContact.phone || 'N/A'}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Status Information */}
                    <div className="row mt-4">
                      <div className="col-12">
                        <div className="alert alert-info border-0 shadow-sm">
                          <div className="row text-center">
                            <div className="col-md-4 mb-2">
                              <h6 className="fw-bold text-primary">Membership Status</h6>
                              <span className={`badge fs-6 px-3 py-2 ${new Date(selectedCustomer.expiryDate) < new Date() ? 'bg-danger' : 'bg-success'}`}>
                                {new Date(selectedCustomer.expiryDate) < new Date() ? 'Expired ⚠️' : 'Active ✅'}
                              </span>
                            </div>
                            <div className="col-md-4 mb-2">
                              <h6 className="fw-bold text-primary">Payment Status</h6>
                              <span className={`badge fs-6 px-3 py-2 ${selectedCustomer.remaining > 0 ? 'bg-danger' : 'bg-success'}`}>
                                {selectedCustomer.remaining > 0 ? 'Pending 💳' : 'Paid ✅'}
                              </span>
                            </div>
                            <div className="col-md-4 mb-2">
                              <h6 className="fw-bold text-primary">Member Type</h6>
                              {getStatusBadge(selectedCustomer) || <span className="badge bg-secondary">Unknown</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer border-0 bg-light">
                    <button
                      type="button"
                      className="btn btn-secondary rounded-pill px-4"
                      onClick={() => setShowDetailsModal(false)}
                    >
                      <i className="bi bi-x-circle me-2"></i>Close
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary rounded-pill px-4"
                      onClick={() => {
                        setShowDetailsModal(false);
                        handleEdit(selectedCustomer, { stopPropagation: () => {} });
                      }}
                    >
                      <i className="bi bi-pencil me-2"></i>Edit Member
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Edit Modal - keeping the same structure but with better styling */}
          {showEditModal && (
            <div
              className="modal fade show"
              style={{
                display: 'block',
                backgroundColor: 'rgba(0,0,0,0.8)',
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: 1050,
              }}
              onClick={() => setShowEditModal(false)}
            >
              <div 
                className="modal-dialog modal-dialog-centered modal-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-content rounded-4 border-0 shadow-lg overflow-hidden">
                  <div className="modal-header text-white border-0" 
                       style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                    <h5 className="modal-title fw-bold">
                      <i className="bi bi-pencil-square me-2"></i>
                      Edit Member Details
                    </h5>
                    <button
                      type="button"
                      className="btn-close btn-close-white"
                      onClick={() => setShowEditModal(false)}
                    ></button>
                  </div>
                  <form onSubmit={handleUpdateSubmit}>
                    <div className="modal-body p-4" style={{ maxHeight: '70vh', overflowY: 'auto', background: 'linear-gradient(180deg, #ffffff 0%, #f8f9fa 100%)' }}>
                      <div className="row">
                        {/* Personal Information */}
                        <div className="col-12 mb-4">
                          <h6 className="text-primary border-bottom pb-2 fw-bold">
                            <i className="bi bi-person me-2"></i>Personal Information
                          </h6>
                        </div>
                        
                        <div className="col-md-6 mb-3">
                          <label className="form-label fw-semibold">
                            <i className="bi bi-hash me-1"></i>Roll Number
                          </label>
                          <input
                            type="text"
                            className="form-control rounded-3 shadow-sm"
                            name="rollNumber"
                            value={editFormData.rollNumber}
                            onChange={handleInputChange}
                            required
                            placeholder="Roll number"
                          />
                        </div>
                        
                        <div className="col-md-6 mb-3">
                          <label className="form-label fw-semibold">
                            <i className="bi bi-person me-1"></i>Full Name
                          </label>
                          <input
                            type="text"
                            className="form-control rounded-3 shadow-sm"
                            name="name"
                            value={editFormData.name}
                            onChange={handleInputChange}
                            required
                          />
                        </div>
                        
                        <div className="col-md-6 mb-3">
                          <label className="form-label fw-semibold">
                            <i className="bi bi-telephone me-1"></i>Phone
                          </label>
                          <input
                            type="text"
                            className="form-control rounded-3 shadow-sm"
                            name="phone"
                            value={editFormData.phone}
                            onChange={handleInputChange}
                            required
                          />
                        </div>
                        
                        <div className="col-md-6 mb-3">
                          <label className="form-label fw-semibold">
                            <i className="bi bi-envelope me-1"></i>Email
                          </label>
                          <input
                            type="email"
                            className="form-control rounded-3 shadow-sm"
                            name="email"
                            value={editFormData.email}
                            onChange={handleInputChange}
                          />
                        </div>
                        
                        <div className="col-12 mb-3">
                          <label className="form-label fw-semibold">
                            <i className="bi bi-geo-alt me-1"></i>Address
                          </label>
                          <textarea
                            className="form-control rounded-3 shadow-sm"
                            name="address"
                            value={editFormData.address}
                            onChange={handleInputChange}
                            rows="2"
                          />
                        </div>

                        {/* Date Information */}
                        <div className="col-12 mb-4 mt-4">
                          <h6 className="text-primary border-bottom pb-2 fw-bold">
                            <i className="bi bi-calendar me-2"></i>Date Information
                          </h6>
                        </div>
                        
                        <div className="col-md-4 mb-3">
                          <label className="form-label fw-semibold">
                            <i className="bi bi-calendar-plus me-1"></i>Join Date
                          </label>
                          <input
                            type="date"
                            className="form-control rounded-3 shadow-sm"
                            name="joinDate"
                            value={editFormData.joinDate}
                            onChange={handleInputChange}
                            required
                          />
                        </div>
                        
                        <div className="col-md-4 mb-3">
                          <label className="form-label fw-semibold">
                            <i className="bi bi-calendar-check me-1"></i>Current Date
                          </label>
                          <input
                            type="date"
                            className="form-control rounded-3 shadow-sm"
                            name="currentDate"
                            value={editFormData.currentDate}
                            onChange={handleInputChange}
                            required
                          />
                        </div>
                        
                        <div className="col-md-4 mb-3">
                          <label className="form-label fw-semibold">
                            <i className="bi bi-calendar-x me-1"></i>Expiry Date
                          </label>
                          <input
                            type="date"
                            className="form-control rounded-3 shadow-sm"
                            name="expiryDate"
                            value={editFormData.expiryDate}
                            onChange={handleInputChange}
                            required
                          />
                        </div>

                        {/* Membership Information */}
                        <div className="col-12 mb-4 mt-4">
                          <h6 className="text-primary border-bottom pb-2 fw-bold">
                            <i className="bi bi-award me-2"></i>Membership & Payment
                          </h6>
                        </div>
                        
                        <div className="col-md-4 mb-3">
                          <label className="form-label fw-semibold">
                            <i className="bi bi-star me-1"></i>Membership Type
                          </label>
                          <select
                            className="form-select rounded-3 shadow-sm"
                            name="membership"
                            value={editFormData.membership}
                            onChange={handleInputChange}
                            required
                          >
                            <option value="">Select Membership</option>
                            <option value="regular">💪 Regular</option>
                            <option value="training">🏋️ Training</option>
                            <option value="premium">👑 Premium</option>
                          </select>
                        </div>
                        
                        <div className="col-md-4 mb-3">
                          <label className="form-label fw-semibold">
                            <i className="bi bi-currency-dollar me-1"></i>Fee (PKR)
                          </label>
                          <input
                            type="number"
                            className="form-control rounded-3 shadow-sm"
                            name="fee"
                            value={editFormData.fee}
                            onChange={handleInputChange}
                            required
                            min="0"
                          />
                        </div>
                        
                        <div className="col-md-4 mb-3">
                          <label className="form-label fw-semibold">
                            <i className="bi bi-cash me-1"></i>Paid Amount (PKR)
                          </label>
                          <input
                            type="number"
                            className="form-control rounded-3 shadow-sm"
                            name="paidAmount"
                            value={editFormData.paidAmount}
                            onChange={handleInputChange}
                            required
                            min="0"
                          />
                        </div>
                        
                        <div className="col-md-12 mb-3">
                          <label className="form-label fw-semibold">
                            <i className="bi bi-exclamation-circle me-1"></i>Remaining (PKR)
                          </label>
                          <input
                            type="number"
                            className="form-control rounded-3 shadow-sm"
                            name="remaining"
                            value={editFormData.remaining}
                            onChange={handleInputChange}
                            required
                            min="0"
                          />
                        </div>

                        {/* Emergency Contact */}
                        <div className="col-12 mb-4 mt-4">
                          <h6 className="text-primary border-bottom pb-2 fw-bold">
                            <i className="bi bi-telephone me-2"></i>Emergency Contact
                          </h6>
                        </div>
                        
                        <div className="col-md-6 mb-3">
                          <label className="form-label fw-semibold">
                            <i className="bi bi-person-lines-fill me-1"></i>Contact Name
                          </label>
                          <input
                            type="text"
                            className="form-control rounded-3 shadow-sm"
                            name="emergencyContact.name"
                            value={editFormData.emergencyContact.name}
                            onChange={handleInputChange}
                            placeholder="Emergency contact name"
                          />
                        </div>
                        
                        <div className="col-md-6 mb-3">
                          <label className="form-label fw-semibold">
                            <i className="bi bi-telephone-plus me-1"></i>Contact Phone
                          </label>
                          <input
                            type="tel"
                            className="form-control rounded-3 shadow-sm"
                            name="emergencyContact.phone"
                            value={editFormData.emergencyContact.phone}
                            onChange={handleInputChange}
                            placeholder="Emergency contact phone"
                          />
                        </div>
                        
                        <div className="col-12 mb-3">
                          <label className="form-label fw-semibold">
                            <i className="bi bi-image me-1"></i>Update Image (Optional)
                          </label>
                          <input
                            type="file"
                            className="form-control rounded-3 shadow-sm"
                            name="image"
                            accept="image/*"
                            onChange={handleInputChange}
                          />
                          <div className="form-text">
                            <i className="bi bi-info-circle me-1"></i>
                            Supported formats: JPG, PNG, GIF (Max 5MB)
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="modal-footer border-0 bg-light">
                      <button
                        type="button"
                        className="btn btn-secondary rounded-pill px-4"
                        onClick={() => setShowEditModal(false)}
                      >
                        <i className="bi bi-x-circle me-2"></i>Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary rounded-pill px-4"
                      >
                        <i className="bi bi-check-circle me-2"></i>Update Member
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerList;
