import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Link, Navigate } from 'react-router-dom';
import { Container, Nav, Navbar, Form, Button, Modal } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import DataUpload from './components/DataUpload';
import Forecast from './components/Forecast';
import Logs from './components/Logs';
import axios from 'axios';

// Configure Axios to include credentials (cookies) with requests
axios.defaults.withCredentials = true;

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Check authentication status on app load
  useEffect(() => {
    axios.get('http://localhost:5000/api/check-auth')
      .then(response => {
        setIsLoggedIn(response.data.authenticated);
        if (response.data.authenticated) {
          setUsername(response.data.username);
        }
      })
      .catch(error => {
        console.error('Error checking auth:', error);
        setIsLoggedIn(false);
      });
  }, []);

  const handleLogin = () => {
    axios.post('http://localhost:5000/api/login', { username, password })
      .then(response => {
        setIsLoggedIn(true);
        setShowLogin(false);
        setUsername(username); // Keep username for display
      })
      .catch(error => {
        console.error('Login failed:', error);
        alert('Invalid credentials');
      });
  };

  const handleLogout = () => {
    axios.post('http://localhost:5000/api/logout')
      .then(() => {
        setIsLoggedIn(false);
        setUsername('');
      })
      .catch(error => console.error('Logout failed:', error));
  };

  return (
    <Router>
      <div>
        <Navbar bg="dark" variant="dark" expand="lg">
          <Container>
            <Navbar.Brand as={Link} to="/">DemandForecastApp</Navbar.Brand>
            <Nav className="me-auto">
              {isLoggedIn ? (
                <>
                  <Nav.Link as={Link} to="/data-upload">Data Upload</Nav.Link>
                  <Nav.Link as={Link} to="/forecast">Forecast</Nav.Link>
                  <Nav.Link as={Link} to="/logs">Logs</Nav.Link>
                  <Nav.Link onClick={handleLogout}>Logout ({username})</Nav.Link>
                </>
              ) : (
                <Nav.Link onClick={() => setShowLogin(true)}>Login</Nav.Link>
              )}
            </Nav>
          </Container>
        </Navbar>

        <Container className="mt-4">
          <Routes>
            <Route path="/data-upload" element={isLoggedIn ? <DataUpload /> : <Navigate to="/" />} />
            <Route path="/forecast" element={isLoggedIn ? <Forecast /> : <Navigate to="/" />} />
            <Route path="/logs" element={isLoggedIn ? <Logs /> : <Navigate to="/" />} />
            <Route path="/" element={<div>{!isLoggedIn && <h2>Please log in to access the app.</h2>}</div>} />
          </Routes>
        </Container>

        <Modal show={showLogin} onHide={() => setShowLogin(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Login</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form>
              <Form.Group>
                <Form.Label>Username</Form.Label>
                <Form.Control
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </Form.Group>
              <Form.Group>
                <Form.Label>Password</Form.Label>
                <Form.Control
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Form.Group>
              <Button variant="primary" onClick={handleLogin} className="mt-3">
                Login
              </Button>
            </Form>
          </Modal.Body>
        </Modal>
      </div>
    </Router>
  );
}

export default App;