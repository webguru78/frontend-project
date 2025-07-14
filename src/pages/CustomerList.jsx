import { useState, useEffect } from 'react';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';

const CustomerList = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    phone: '',
    joinDate: '',
    expiryDate: '',
    membership: '',
    fee: '',
    remaining: '',
    rollNumber: '',
    image: null,
  });

  // Fetch customers from API
  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/customers');
      setCustomers(response.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
      alert('Error loading customers. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (customerId) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      try {
        const response = await axios.delete(`http://localhost:5000/api/customers/${customerId}`);
        if (response.status === 200) {
          setCustomers(customers.filter((customer) => customer._id !== customerId));
          alert('Customer deleted successfully!');
        } else {
          throw new Error('Failed to delete customer');
        }
      } catch (error) {
        console.error('Error deleting customer:', error);
        alert('Error deleting customer. Please try again.');
      }
    }
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setEditFormData({
      name: customer.name || '',
      phone: customer.phone || '',
      joinDate: customer.joinDate || '',
      expiryDate: customer.expiryDate || '',
      membership: customer.membership || '',
      fee: customer.fee || '',
      remaining: customer.remaining || '',
      rollNumber: customer.rollNumber || '',
      image: null,
    });
    setShowEditModal(true);
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    // Validate roll number as a positive integer
    if (!/^[1-9]\d*$/.test(editFormData.rollNumber)) {
      alert('Roll number must be a positive integer (e.g., 1, 2, 3)');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('name', editFormData.name);
      formData.append('phone', editFormData.phone);
      formData.append('joinDate', editFormData.joinDate);
      formData.append('expiryDate', editFormData.expiryDate);
      formData.append('membership', editFormData.membership);
      formData.append('fee', editFormData.fee);
      formData.append('remaining', editFormData.remaining);
      formData.append('rollNumber', editFormData.rollNumber);
      if (editFormData.image) {
        formData.append('image', editFormData.image);
      }

      const response = await axios.put(
        `http://localhost:5000/api/customers/${editingCustomer._id}`,
        formData
      );

      if (response.status === 200) {
        setShowEditModal(false);
        setEditingCustomer(null);
        fetchCustomers();
        alert('Customer updated successfully!');
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
    setEditFormData({
      ...editFormData,
      [name]: name === 'image' ? files[0] : value,
    });
  };

  const filtered = customers.filter(
    (cust) =>
      (cust.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cust.phone || '').includes(searchTerm) ||
      (cust.rollNumber || '').includes(searchTerm)
  );

  return (
    <div className="container mt-5">
      <div className="card shadow-lg border-0 rounded-4">
        <div className="card-body p-4">
          <h2 className="card-title text-center mb-4 fw-bold text-primary d-flex align-items-center justify-content-center">
            <i className="bi bi-list-ul me-2"></i> Customer List
          </h2>

          <div className="mb-4">
            <input
              type="text"
              placeholder="Search by name, phone, or roll number"
              className="form-control rounded-3"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="text-center">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-2">Loading customers...</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover table-bordered text-center align-middle">
                <thead className="table-dark">
                  <tr>
                    <th>Image</th>
                    <th>Roll Number</th>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Join Date</th>
                    <th>Expiry</th>
                    <th>Type</th>
                    <th>Fee</th>
                    <th>Remaining</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c._id}>
                      <td>
                        {c.image ? (
                          <img
                            src={`http://localhost:5000/uploads/${c.image}`}
                            alt="Customer"
                            className="rounded-3"
                            style={{ width: '60px', height: '60px', objectFit: 'cover' }}
                          />
                        ) : (
                          <div
                            className="rounded-3 bg-light d-flex align-items-center justify-content-center"
                            style={{ width: '60px', height: '60px', fontSize: '24px' }}
                          >
                            <i className="bi bi-person"></i>
                          </div>
                        )}
                      </td>
                      <td>{c.rollNumber || '-'}</td>
                      <td>{c.name || '-'}</td>
                      <td>{c.phone || '-'}</td>
                      <td>{c.joinDate || '-'}</td>
                      <td>{c.expiryDate || '-'}</td>
                      <td>{c.membership || '-'}</td>
                      <td>{c.fee ? `${c.fee} PKR` : '-'}</td>
                      <td>{c.remaining ? `${c.remaining} PKR` : '-'}</td>
                      <td>
                        <button
                          className="btn btn-sm btn-primary me-2 rounded-3"
                          onClick={() => handleEdit(c)}
                        >
                          <i className="bi bi-pencil"></i> Edit
                        </button>
                        <button
                          className="btn btn-sm btn-danger rounded-3"
                          onClick={() => handleDelete(c._id)}
                        >
                          <i className="bi bi-trash"></i> Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <p className="text-center text-muted mt-3">
                  No matching customers found <i className="bi bi-emoji-frown"></i>
                </p>
              )}
            </div>
          )}

          {/* Edit Modal */}
          {showEditModal && (
            <div
              className="modal fade show"
              style={{
                display: 'block',
                backgroundColor: 'rgba(0,0,0,0.5)',
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: 1000,
              }}
            >
              <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '600px' }}>
                <div className="modal-content rounded-4">
                  <div className="modal-header border-bottom p-3">
                    <h5 className="modal-title fw-bold">Edit Customer</h5>
                    <button
                      type="button"
                      className="btn-close"
                      onClick={() => setShowEditModal(false)}
                    ></button>
                  </div>
                  <div className="modal-body p-4">
                    <div className="mb-3">
                      <label className="form-label fw-semibold">Roll Number</label>
                      <input
                        type="text"
                        className="form-control rounded-3"
                        name="rollNumber"
                        value={editFormData.rollNumber}
                        onChange={handleInputChange}
                        required
                        placeholder="Enter number (e.g., 1, 2, 3)"
                        pattern="[1-9]\d*"
                        title="Roll number must be a positive integer (e.g., 1, 2, 3)"
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label fw-semibold">Name</label>
                      <input
                        type="text"
                        className="form-control rounded-3"
                        name="name"
                        value={editFormData.name}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label fw-semibold">Phone</label>
                      <input
                        type="text"
                        className="form-control rounded-3"
                        name="phone"
                        value={editFormData.phone}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label fw-semibold">Join Date</label>
                      <input
                        type="date"
                        className="form-control rounded-3"
                        name="joinDate"
                        value={editFormData.joinDate}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label fw-semibold">Expiry Date</label>
                      <input
                        type="date"
                        className="form-control rounded-3"
                        name="expiryDate"
                        value={editFormData.expiryDate}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label fw-semibold">Membership Type</label>
                      <select
                        className="form-select rounded-3"
                        name="membership"
                        value={editFormData.membership}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="">Select Membership</option>
                        <option value="regular">Regular</option>
                        <option value="training">Training</option>
                      </select>
                    </div>
                    <div className="mb-3">
                      <label className="form-label fw-semibold">Fee (PKR)</label>
                      <input
                        type="number"
                        className="form-control rounded-3"
                        name="fee"
                        value={editFormData.fee}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label fw-semibold">Remaining (PKR)</label>
                      <input
                        type="number"
                        className="form-control rounded-3"
                        name="remaining"
                        value={editFormData.remaining}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label fw-semibold">Update Image (Optional)</label>
                      <input
                        type="file"
                        className="form-control rounded-3"
                        name="image"
                        accept="image/*"
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                  <div className="modal-footer border-top p-3">
                    <button
                      type="button"
                      className="btn btn-secondary rounded-3"
                      onClick={() => setShowEditModal(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary rounded-3"
                      onClick={handleUpdateSubmit}
                    >
                      Update Customer
                    </button>
                  </div>
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