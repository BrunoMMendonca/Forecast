import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Table, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

const DataUpload = () => {
  const [data, setData] = useState([]);
  const [file, setFile] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get('http://localhost:5000/api/data')
      .then(response => setData(response.data))
      .catch(error => {
        console.error('Error fetching data:', error);
        if (error.response && error.response.status === 401) {
          navigate('/');
        }
      });
  }, [navigate]);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = () => {
    const formData = new FormData();
    formData.append('file', file);
    axios.post('http://localhost:5000/api/data', formData)
      .then(() => {
        axios.get('http://localhost:5000/api/data')
          .then(response => setData(response.data))
          .catch(error => {
            console.error('Error fetching data:', error);
            if (error.response && error.response.status === 401) {
              navigate('/');
            }
          });
      })
      .catch(error => {
        console.error('Error uploading file:', error);
        if (error.response && error.response.status === 401) {
          navigate('/');
        }
      });
  };

  return (
    <div>
      <h2>Data Upload</h2>
      <input type="file" accept=".csv" onChange={handleFileChange} />
      <Button onClick={handleUpload} disabled={!file} className="ms-2">Upload</Button>
      {data.length > 0 && (
        <Table striped bordered hover className="mt-3">
          <thead>
            <tr>
              {Object.keys(data[0]).map((key) => (
                <th key={key}>{key}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr key={index}>
                {Object.values(row).map((value, i) => (
                  <td key={i}>{value}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
};

export default DataUpload;