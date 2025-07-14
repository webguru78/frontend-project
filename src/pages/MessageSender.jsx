import { useState } from 'react';
import './MessageSender.css';

const MessageSender = () => {
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');

  const handleSend = (e) => {
    e.preventDefault();

    if (!phone || !message) {
      alert('Please fill all fields!');
      return;
    }

    // Placeholder for sending logic (e.g. CallMeBot API)
    alert(`📲 Message sent to ${phone}:\n\n"${message}"`);

    setPhone('');
    setMessage('');
  };

  return (
    <div className="message-sender">
      <h2>💬 Send WhatsApp Message</h2>
      <form onSubmit={handleSend}>
        <div className="mb-3">
          <label>Customer Phone (with country code)</label>
          <input
            type="text"
            className="form-control"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+923001234567"
            required
          />
        </div>

        <div className="mb-3">
          <label>Message</label>
          <textarea
            className="form-control"
            rows="4"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message here..."
            required
          ></textarea>
        </div>

        <button className="btn btn-dark w-100">Send Message</button>
      </form>
    </div>
  );
};

export default MessageSender;
