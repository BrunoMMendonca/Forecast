import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Table, Form } from 'react-bootstrap';
import Plot from 'react-plotly.js';
import { useNavigate } from 'react-router-dom';

const Forecast = () => {
  const [skuList, setSkuList] = useState([]);
  const [selectedSku, setSelectedSku] = useState('');
  const [tableData, setTableData] = useState([]);
  const [chartData, setChartData] = useState({ historical: {}, forecast: {} });
  const navigate = useNavigate();

  useEffect(() => {
    axios.get('http://localhost:5000/api/forecast/1')
      .then(response => {
        setSkuList(response.data.sku_list);
        setSelectedSku(response.data.sku_list[0] || '');
        setTableData(response.data.table_data);
        setChartData(response.data.chart_data);
      })
      .catch(error => {
        console.error('Error fetching forecast:', error);
        if (error.response && error.response.status === 401) {
          navigate('/');
        }
      });
  }, [navigate]);

  useEffect(() => {
    if (selectedSku) {
      axios.get(`http://localhost:5000/api/forecast/${selectedSku}`)
        .then(response => {
          setTableData(response.data.table_data);
          setChartData(response.data.chart_data);
        })
        .catch(error => {
          console.error('Error fetching forecast:', error);
          if (error.response && error.response.status === 401) {
            navigate('/');
          }
        });
    }
  }, [selectedSku, navigate]);

  const handleAdjustmentChange = (month, value) => {
    const updatedTableData = tableData.map(row => {
      if (row.Metric === 'Adjustment') {
        return { ...row, [month]: parseFloat(value) || 0 };
      }
      return row;
    });

    const historicalUnits = updatedTableData.find(row => row.Metric === 'Historical Units');
    const adjustments = updatedTableData.find(row => row.Metric === 'Adjustment');
    const correctedUnits = updatedTableData.find(row => row.Metric === 'Corrected Units');
    Object.keys(historicalUnits).forEach(key => {
      if (key !== 'Metric' && historicalUnits[key] !== null) {
        correctedUnits[key] = (historicalUnits[key] || 0) + (adjustments[key] || 0);
      }
    });

    setTableData([...updatedTableData]);

    const adjustmentsRow = updatedTableData.find(row => row.Metric === 'Adjustment');
    const adjustmentValues = {};
    Object.keys(adjustmentsRow).forEach(key => {
      if (key !== 'Metric') {
        adjustmentValues[key] = adjustmentsRow[key] || 0;
      }
    });
    axios.post(`http://localhost:5000/api/adjustments/${selectedSku}`, { adjustments: adjustmentValues })
      .catch(error => {
        console.error('Error updating adjustments:', error);
        if (error.response && error.response.status === 401) {
          navigate('/');
        }
      });
  };

  const columns = tableData.length > 0 ? Object.keys(tableData[0]) : [];

  return (
    <div>
      <h2>Forecast</h2>
      <Form.Group className="mb-3">
        <Form.Label>Select SKU</Form.Label>
        <Form.Select value={selectedSku} onChange={(e) => setSelectedSku(e.target.value)}>
          {skuList.map(sku => (
            <option key={sku} value={sku}>{sku}</option>
          ))}
        </Form.Select>
      </Form.Group>

      {tableData.length > 0 && (
        <Table striped bordered hover>
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {columns.map(col => (
                  <td key={col}>
                    {row.Metric === 'Adjustment' && col !== 'Metric' && row.Type !== 'Forecast' ? (
                      <Form.Control
                        type="number"
                        value={row[col] || 0}
                        onChange={(e) => handleAdjustmentChange(col, e.target.value)}
                      />
                    ) : (
                      row[col]
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <Plot
        data={[
          {
            x: chartData.historical.x,
            y: chartData.historical.units,
            type: 'scatter',
            mode: 'lines+markers',
            name: 'Historical Units',
            marker: { color: 'blue' }
          },
          {
            x: chartData.historical.x,
            y: chartData.historical.corrected_units,
            type: 'scatter',
            mode: 'lines+markers',
            name: 'Corrected Units',
            marker: { color: 'orange' }
          },
          {
            x: chartData.forecast.x,
            y: chartData.forecast.sma_forecast,
            type: 'scatter',
            mode: 'lines+markers',
            name: 'Simple Moving Average',
            marker: { symbol: 'x' },
            line: { dash: 'dash' }
          }
        ]}
        layout={{
          xaxis: { title: 'Date', tickformat: '%Y-%m', tickangle: 45 },
          yaxis: { title: 'Units' },
          showlegend: true,
          margin: { l: 40, r: 40, t: 40, b: 40 }
        }}
        style={{ width: '100%', height: '500px' }}
      />
    </div>
  );
};

export default Forecast;