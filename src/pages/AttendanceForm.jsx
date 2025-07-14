import { useState } from 'react';
import './AttendanceForm.css';

const AttendanceForm = () => {
  const [customerName, setCustomerName] = useState('');
  const [date, setDate] = useState('');
  const [status, setStatus] = useState('present');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!customerName || !date) {
      alert('Please fill in all fields!');
      return;
    }

    // Placeholder for real logic
    alert(`✅ Attendance marked for ${customerName} on ${date} as ${status.toUpperCase()}`);
    setCustomerName('');
    setDate('');
    setStatus('present');
  };

  return (
    <div className="attendance-form">
      <h2>📅 Mark Attendance</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label>Customer Name</label>
          <input
            type="text"
            className="form-control"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="e.g. Ahmed Raza"
            required
          />
        </div>

        <div className="mb-3">
          <label>Date</label>
          <input
            type="date"
            className="form-control"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        <div className="mb-3">
          <label>Status</label>
          <select
            className="form-select"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="present">Present</option>
            <option value="absent">Absent</option>
          </select>
        </div>

        <button className="btn btn-success w-100">Mark Attendance</button>
      </form>
    </div>
  );
};

export default AttendanceForm;
