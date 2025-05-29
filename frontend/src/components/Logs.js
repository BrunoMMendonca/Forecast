import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ListGroup } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

const Logs = () => {
  const [logs, setLogs] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get('http://localhost:5000/api/logs')
      .then(response => setLogs(response.data))
      .catch(error => {
        console.error('Error fetching logs:', error);
        if (error.response && error.response.status === 401) {
          navigate('/');
        }
      });
  }, [navigate]);

  return (
    <div>
      <h2>Processing Log</h2>
      <ListGroup>
        {logs.map((log, index) => (
          <ListGroup.Item key={index}>{log}</ListGroup.Item>
        ))}
      </ListGroup>
    </div>
  );
};

export default Logs;