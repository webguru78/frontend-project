import React, { useState } from 'react';
import { Modal, Form, Button, Alert, Spinner } from 'react-bootstrap';

const ProtectedRoute = ({ children, isAuthenticated, onAuthenticate }) => {
  const [showModal, setShowModal] = useState(!isAuthenticated);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    setTimeout(() => {
      if (password === 'gym123admin') {
        onAuthenticate();
        setShowModal(false);
      } else {
        setError('Invalid password!');
      }
      setLoading(false);
    }, 1000);
  };

  if (!isAuthenticated) {
    return (
      <Modal show={showModal} onHide={() => {}} centered backdrop="static">
        <Modal.Header className="bg-primary text-white">
          <Modal.Title>
            <i className="bi bi-shield-lock me-2"></i>
            Admin Access Required
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleAuth}>
          <Modal.Body>
            {error && <Alert variant="danger">{error}</Alert>}
            <Form.Group>
              <Form.Label>Admin Password</Form.Label>
              <Form.Control
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                required
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button type="submit" disabled={loading}>
              {loading ? <Spinner size="sm" className="me-2" /> : null}
              Authenticate
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    );
  }

  return children;
};

export default ProtectedRoute;
