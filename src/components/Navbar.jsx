import React from 'react';
import { Navbar, Nav, Container } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';

const NavigationBar = () => {
  return (
    <Navbar bg="dark" variant="dark" expand="lg" fixed="top" className="shadow">
      <Container>
        <Navbar.Brand href="/" className="fw-bold">
          <i className="bi bi-lightning-charge-fill me-2"></i>
          GYM MASTER
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="ms-auto">
            <LinkContainer to="/">
              <Nav.Link>
                <i className="bi bi-speedometer2 me-1"></i>
                Dashboard
              </Nav.Link>
            </LinkContainer>
            <LinkContainer to="/add-customer">
              <Nav.Link>
                <i className="bi bi-person-plus me-1"></i>
                Add Member
              </Nav.Link>
            </LinkContainer>
            <LinkContainer to="/customers">
              <Nav.Link>
                <i className="bi bi-people me-1"></i>
                Members
              </Nav.Link>
            </LinkContainer>
            <LinkContainer to="/mark-attendance">
              <Nav.Link>
                <i className="bi bi-check2-circle me-1"></i>
                Attendance
              </Nav.Link>
            </LinkContainer>
            <LinkContainer to="/view-attendance">
              <Nav.Link>
                <i className="bi bi-calendar-week me-1"></i>
                View Attendance
              </Nav.Link>
            </LinkContainer>
            <LinkContainer to="/pending-payments">
              <Nav.Link>
                <i className="bi bi-credit-card me-1"></i>
                Payments
              </Nav.Link>
            </LinkContainer>
            <LinkContainer to="/reports">
              <Nav.Link>
                <i className="bi bi-graph-up me-1"></i>
                Reports
              </Nav.Link>
            </LinkContainer>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default NavigationBar;
