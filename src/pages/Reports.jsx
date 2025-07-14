import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Row, 
  Col, 
  Card, 
  Form, 
  Button, 
  Alert, 
  Badge, 
  Table,
  Spinner,
  Tabs,
  Tab
} from 'react-bootstrap';
import axios from 'axios';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import './Reports.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const Reports = () => {
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ show: false, message: '', variant: '' });
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedQuarter, setSelectedQuarter] = useState(1);
  const [activeTab, setActiveTab] = useState('monthly');
  
  const [monthlyData, setMonthlyData] = useState([]);
  const [quarterlyData, setQuarterlyData] = useState([]);
  const [yearlyData, setYearlyData] = useState([]);
  const [membershipData, setMembershipData] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  
  const [summaryStats, setSummaryStats] = useState({
    totalRevenue: 0,
    totalMembers: 0,
    averageMonthlyRevenue: 0,
    growthRate: 0,
    activeMembers: 0,
    pendingAmount: 0
  });

  useEffect(() => {
    fetchReportsData();
  }, [selectedYear, selectedQuarter]);

  const fetchReportsData = async () => {
    try {
      setLoading(true);
      const [
        customersRes,
        attendanceRes
      ] = await Promise.all([
        axios.get('http://localhost:5000/api/customers'),
        axios.get('http://localhost:5000/api/attendance')
      ]);

      const customers = customersRes.data;
      const attendance = attendanceRes.data;

      processMonthlyData(customers);
      processQuarterlyData(customers);
      processYearlyData(customers);
      processMembershipData(customers);
      processAttendanceData(attendance);
      calculateSummaryStats(customers);

    } catch (error) {
      showAlert('Failed to fetch reports data', 'danger');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const processMonthlyData = (customers) => {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    const currentYear = selectedYear;
    const data = months.map((month, index) => {
      const monthCustomers = customers.filter(c => {
        const joinDate = new Date(c.joinDate);
        return joinDate.getFullYear() === currentYear && joinDate.getMonth() === index;
      });

      const monthlyRevenue = monthCustomers.reduce((sum, c) => sum + (c.fee || 0), 0);
      const newMembers = monthCustomers.length;

      return {
        month,
        revenue: monthlyRevenue,
        newMembers,
        totalMembers: customers.filter(c => new Date(c.joinDate) <= new Date(currentYear, index + 1, 0)).length
      };
    });

    setMonthlyData(data);
  };

  const processQuarterlyData = (customers) => {
    const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
    const currentYear = selectedYear;

    const data = quarters.map((quarter, index) => {
      const startMonth = index * 3;
      const endMonth = startMonth + 2;

      const quarterCustomers = customers.filter(c => {
        const joinDate = new Date(c.joinDate);
        return joinDate.getFullYear() === currentYear && 
               joinDate.getMonth() >= startMonth && 
               joinDate.getMonth() <= endMonth;
      });

      const revenue = quarterCustomers.reduce((sum, c) => sum + (c.fee || 0), 0);

      return {
        quarter,
        revenue,
        newMembers: quarterCustomers.length,
        averageMonthlyRevenue: revenue / 3
      };
    });

    setQuarterlyData(data);
  };

  const processYearlyData = (customers) => {
    const currentYear = new Date().getFullYear();
    const years = [currentYear - 2, currentYear - 1, currentYear];

    const data = years.map(year => {
      const yearCustomers = customers.filter(c => {
        const joinDate = new Date(c.joinDate);
        return joinDate.getFullYear() === year;
      });

      const revenue = yearCustomers.reduce((sum, c) => sum + (c.fee || 0), 0);

      return {
        year,
        revenue,
        newMembers: yearCustomers.length
      };
    });

    setYearlyData(data);
  };

  const processMembershipData = (customers) => {
    const membershipTypes = ['regular', 'training', 'premium'];
    
    const data = membershipTypes.map(type => {
      const typeCustomers = customers.filter(c => c.membership === type);
      const revenue = typeCustomers.reduce((sum, c) => sum + (c.fee || 0), 0);
      
      return {
        type: type.charAt(0).toUpperCase() + type.slice(1),
        count: typeCustomers.length,
        revenue,
        averageRevenue: typeCustomers.length > 0 ? revenue / typeCustomers.length : 0
      };
    });

    setMembershipData(data);
  };

  const processAttendanceData = (attendance) => {
    const last7Days = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      
      const dayAttendance = attendance.filter(a => a.date === dateString).length;
      
      last7Days.push({
        date: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        count: dayAttendance
      });
    }

    setAttendanceData(last7Days);
  };

  const calculateSummaryStats = (customers) => {
    const totalRevenue = customers.reduce((sum, c) => sum + (c.fee || 0), 0);
    const totalMembers = customers.length;
    const activeMembers = customers.filter(c => new Date(c.expiryDate) > new Date()).length;
    const pendingAmount = customers.reduce((sum, c) => sum + (c.remaining || 0), 0);
    
    const currentYear = new Date().getFullYear();
    const currentYearCustomers = customers.filter(c => 
      new Date(c.joinDate).getFullYear() === currentYear
    );
    const averageMonthlyRevenue = currentYearCustomers.reduce((sum, c) => sum + (c.fee || 0), 0) / 12;

    const lastYearCustomers = customers.filter(c => 
      new Date(c.joinDate).getFullYear() === currentYear - 1
    );
    const lastYearRevenue = lastYearCustomers.reduce((sum, c) => sum + (c.fee || 0), 0);
    const currentYearRevenue = currentYearCustomers.reduce((sum, c) => sum + (c.fee || 0), 0);
    const growthRate = lastYearRevenue > 0 ? ((currentYearRevenue - lastYearRevenue) / lastYearRevenue) * 100 : 0;

    setSummaryStats({
      totalRevenue,
      totalMembers,
      averageMonthlyRevenue,
      growthRate,
      activeMembers,
      pendingAmount
    });
  };

  const showAlert = (message, variant = 'success') => {
    setAlert({ show: true, message, variant });
    setTimeout(() => setAlert({ show: false, message: '', variant: '' }), 5000);
  };

  const exportReport = (type) => {
    // Implement export functionality
    showAlert(`${type} report export will be implemented soon!`, 'info');
  };

  // Chart configurations - COMPLETELY FIXED
 const monthlyChartData = {
  labels: monthlyData.map(d => d.month),
  datasets: [
    {
      label: 'Monthly Revenue (RS)',
      data: monthlyData.map(d => d.revenue),
      borderColor: 'rgb(75, 192, 192)',
      backgroundColor: 'rgba(75, 192, 192, 0.2)',
      tension: 0.1
    },
    {
      label: 'New Members',
      data: monthlyData.map(d => d.newMembers),
      borderColor: 'rgb(255, 99, 132)',
      backgroundColor: 'rgba(255, 99, 132, 0.2)',
      yAxisID: 'y1',
      tension: 0.1
    }
  ]
};


  const quarterlyChartData = {
    labels: quarterlyData.map(d => d.quarter),
    datasets: [
      {
        label: 'Quarterly Revenue (RS)',
        data: quarterlyData.map(d => d.revenue),
        backgroundColor: [
          'rgba(255, 99, 132, 0.2)',
          'rgba(54, 162, 235, 0.2)',
          'rgba(255, 205, 86, 0.2)',
          'rgba(75, 192, 192, 0.2)'
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 205, 86, 1)',
          'rgba(75, 192, 192, 1)'
        ],
        borderWidth: 1
      }
    ]
  };

  const membershipChartData = {
    labels: membershipData.map(d => d.type),
    datasets: [
      {
        label:  membershipData.map(d => d.count),
        backgroundColor: [
          '#FF6384',
          '#36A2EB',
          '#FFCE56'
        ],
        hoverBackgroundColor: [
          '#FF6384',
          '#36A2EB',
          '#FFCE56'
        ]
      }
    ]
  };

  const attendanceChartData = {
  labels: attendanceData.map(d => d.date),
  datasets: [
    {
      label: 'Daily Attendance',
      data: attendanceData.map(d => d.count),
      backgroundColor: 'rgba(54, 162, 235, 0.2)',
      borderColor: 'rgba(54, 162, 235, 1)',
      borderWidth: 1
    }
  ]
};


  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        position: 'left',
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        grid: {
          drawOnChartArea: false,
        },
        beginAtZero: true,
      },
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.parsed;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    },
  };

  if (loading) {
    return (
      <Container className="text-center mt-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading reports...</p>
      </Container>
    );
  }

  return (
    <Container fluid className="reports-container">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <Card className="header-card">
            <Card.Body className="p-4">
              <Row className="align-items-center">
                <Col md={8}>
                  <h1 className="display-5 fw-bold mb-2">
                    <i className="bi bi-graph-up me-3 text-success"></i>
                    Financial Reports & Analytics
                  </h1>
                  <p className="text-muted mb-0">
                    Comprehensive insights into gym performance and revenue
                  </p>
                </Col>
                <Col md={4} className="text-end">
                  <div className="d-flex gap-2">
                    <Form.Select 
                      size="sm" 
                      value={selectedYear} 
                      onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                      style={{ width: 'auto' }}
                    >
                      {[2024, 2023, 2022].map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </Form.Select>
                    <Button variant="outline-primary" size="sm" onClick={fetchReportsData}>
                      <i className="bi bi-arrow-clockwise"></i>
                    </Button>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Alert */}
      {alert.show && (
        <Alert variant={alert.variant} dismissible onClose={() => setAlert({ show: false })}>
          {alert.message}
        </Alert>
      )}

      {/* Summary Statistics */}
      <Row className="mb-4">
        <Col md={2}>
          <Card className="stats-card border-primary">
            <Card.Body className="text-center">
              <div className="stats-icon bg-primary">
                <i className="bi bi-currency-rupee"></i>
              </div>
              <h4 className="mt-3 text-primary">RS{summaryStats.totalRevenue.toLocaleString()}</h4>
              <p className="text-muted mb-0">Total Revenue</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2}>
          <Card className="stats-card border-success">
            <Card.Body className="text-center">
              <div className="stats-icon bg-success">
                <i className="bi bi-people"></i>
              </div>
              <h4 className="mt-3 text-success">{summaryStats.totalMembers}</h4>
              <p className="text-muted mb-0">Total Members</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2}>
          <Card className="stats-card border-info">
            <Card.Body className="text-center">
              <div className="stats-icon bg-info">
                <i className="bi bi-graph-up"></i>
              </div>
              <h4 className="mt-3 text-info">RS{Math.round(summaryStats.averageMonthlyRevenue).toLocaleString()}</h4>
              <p className="text-muted mb-0">Avg Monthly</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2}>
          <Card className="stats-card border-warning">
            <Card.Body className="text-center">
              <div className="stats-icon bg-warning">
                <i className="bi bi-percent"></i>
              </div>
              <h4 className="mt-3 text-warning">{summaryStats.growthRate.toFixed(1)}%</h4>
              <p className="text-muted mb-0">Growth Rate</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2}>
          <Card className="stats-card border-success">
            <Card.Body className="text-center">
              <div className="stats-icon bg-success">
                <i className="bi bi-person-check"></i>
              </div>
              <h4 className="mt-3 text-success">{summaryStats.activeMembers}</h4>
              <p className="text-muted mb-0">Active Members</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2}>
          <Card className="stats-card border-danger">
            <Card.Body className="text-center">
              <div className="stats-icon bg-danger">
                <i className="bi bi-exclamation-triangle"></i>
              </div>
              <h4 className="mt-3 text-danger">RS{summaryStats.pendingAmount.toLocaleString()}</h4>
              <p className="text-muted mb-0">Pending</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Charts Tabs */}
      <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-4">
        <Tab eventKey="monthly" title={
          <span><i className="bi bi-calendar-month me-2"></i>Monthly Analysis</span>
        }>
          <Row>
            <Col lg={8}>
              <Card>
                <Card.Header>
                  <div className="d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">Monthly Revenue & Member Growth ({selectedYear})</h5>
                    <Button 
                      variant="outline-primary" 
                      size="sm"
                      onClick={() => exportReport('Monthly')}
                    >
                      <i className="bi bi-download me-1"></i>Export
                    </Button>
                  </div>
                </Card.Header>
                <Card.Body style={{ height: '400px' }}>
                  <Line data={monthlyChartData} options={chartOptions} />
                </Card.Body>
              </Card>
            </Col>
            <Col lg={4}>
              <Card>
                <Card.Header>
                  <h5 className="mb-0">Monthly Summary ({selectedYear})</h5>
                </Card.Header>
                <Card.Body style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  <Table size="sm" hover>
                    <thead>
                      <tr>
                        <th>Month</th>
                        <th>Revenue</th>
                        <th>Members</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyData.map((month, index) => (
                        <tr key={index}>
                          <td className="fw-semibold">{month.month}</td>
                          <td className="text-success">RS{month.revenue.toLocaleString()}</td>
                          <td className="text-primary">{month.newMembers}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                  <div className="mt-3 p-3 bg-light rounded">
                    <strong>Total for {selectedYear}:</strong>
                    <div>Revenue: RS{monthlyData.reduce((sum, m) => sum + m.revenue, 0).toLocaleString()}</div>
                    <div>New Members: {monthlyData.reduce((sum, m) => sum + m.newMembers, 0)}</div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>

        <Tab eventKey="quarterly" title={
          <span><i className="bi bi-calendar3 me-2"></i>Quarterly Analysis</span>
        }>
          <Row>
            <Col lg={8}>
              <Card>
                <Card.Header>
                  <div className="d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">Quarterly Revenue Comparison ({selectedYear})</h5>
                    <Button 
                      variant="outline-primary" 
                      size="sm"
                      onClick={() => exportReport('Quarterly')}
                    >
                      <i className="bi bi-download me-1"></i>Export
                    </Button>
                  </div>
                </Card.Header>
                <Card.Body style={{ height: '400px' }}>
                  <Bar data={quarterlyChartData} options={barChartOptions} />
                </Card.Body>
              </Card>
            </Col>
            <Col lg={4}>
              <Card>
                <Card.Header>
                  <h5 className="mb-0">Quarterly Performance ({selectedYear})</h5>
                </Card.Header>
                <Card.Body>
                  {quarterlyData.map((quarter, index) => (
                    <div key={index} className="mb-3 p-3 bg-light rounded">
                      <h6 className="mb-2 text-primary">{quarter.quarter} {selectedYear}</h6>
                      <div><strong>Revenue:</strong> <span className="text-success">RS{quarter.revenue.toLocaleString()}</span></div>
                      <div><strong>New Members:</strong> <span className="text-info">{quarter.newMembers}</span></div>
                      <div><strong>Avg Monthly:</strong> <span className="text-warning">RS{Math.round(quarter.averageMonthlyRevenue).toLocaleString()}</span></div>
                    </div>
                  ))}
                  <div className="mt-3 p-3 bg-primary text-white rounded">
                    <strong>Year Total:</strong>
                    <div>Revenue: RS{quarterlyData.reduce((sum, q) => sum + q.revenue, 0).toLocaleString()}</div>
                    <div>New Members: {quarterlyData.reduce((sum, q) => sum + q.newMembers, 0)}</div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>

        <Tab eventKey="membership" title={
          <span><i className="bi bi-pie-chart me-2"></i>Membership Analysis</span>
        }>
          <Row>
            <Col lg={6}>
              <Card>
                <Card.Header>
                  <h5 className="mb-0">Membership Distribution</h5>
                </Card.Header>
                <Card.Body style={{ height: '400px' }}>
                  <Doughnut data={membershipChartData} options={doughnutOptions} />
                </Card.Body>
              </Card>
            </Col>
            <Col lg={6}>
              <Card>
                <Card.Header>
                  <h5 className="mb-0">Membership Revenue Breakdown</h5>
                </Card.Header>
                <Card.Body>
                  <Table hover>
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Members</th>
                        <th>Total Revenue</th>
                        <th>Avg Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {membershipData.map((type, index) => (
                        <tr key={index}>
                          <td>
                            <Badge bg="primary" className="text-capitalize">{type.type}</Badge>
                          </td>
                          <td className="text-info fw-semibold">{type.count}</td>
                          <td className="text-success fw-semibold">RS{type.revenue.toLocaleString()}</td>
                          <td className="text-warning fw-semibold">RS{Math.round(type.averageRevenue).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                  
                  <div className="mt-4">
                    <h6>Revenue Distribution:</h6>
                    {membershipData.map((type, index) => {
                      const totalRevenue = membershipData.reduce((sum, t) => sum + t.revenue, 0);
                      const percentage = totalRevenue > 0 ? ((type.revenue / totalRevenue) * 100).toFixed(1) : 0;
                      return (
                        <div key={index} className="mb-2">
                          <div className="d-flex justify-content-between">
                            <span>{type.type}</span>
                            <span>{percentage}%</span>
                          </div>
                          <div className="progress" style={{ height: '6px' }}>
                            <div 
                              className="progress-bar" 
                              style={{ 
                                width: `${percentage}%`,
                                backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56'][index]
                              }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>

        <Tab eventKey="attendance" title={
          <span><i className="bi bi-calendar-week me-2"></i>Attendance Trends</span>
        }>
          <Row>
            <Col lg={8}>
              <Card>
                <Card.Header>
                  <h5 className="mb-0">Daily Attendance (Last 7 Days)</h5>
                </Card.Header>
                <Card.Body style={{ height: '400px' }}>
                  <Bar data={attendanceChartData} options={barChartOptions} />
                </Card.Body>
              </Card>
            </Col>
            <Col lg={4}>
              <Card>
                <Card.Header>
                  <h5 className="mb-0">Attendance Statistics</h5>
                </Card.Header>
                <Card.Body>
                  <div className="mb-4 p-3 bg-primary text-white rounded">
                    <strong>Average Daily Attendance:</strong>
                    <div className="fs-2 fw-bold">
                      {attendanceData.length > 0 ? Math.round(attendanceData.reduce((sum, d) => sum + d.count, 0) / attendanceData.length) : 0}
                    </div>
                  </div>
                  
                  <div className="mb-4 p-3 bg-success text-white rounded">
                    <strong>Peak Day:</strong>
                    <div className="fs-5 fw-bold">
                      {attendanceData.length > 0 ? 
                        attendanceData.reduce((max, d) => d.count > max.count ? d : max, attendanceData[0]).date 
                        : 'N/A'}
                    </div>
                    <small>
                      {attendanceData.length > 0 ? 
                        `${attendanceData.reduce((max, d) => d.count > max.count ? d : max, attendanceData[0]).count} attendees`
                        : ''}
                    </small>
                  </div>
                  
                  <div className="mb-4 p-3 bg-info text-white rounded">
                    <strong>Total Week Attendance:</strong>
                    <div className="fs-3 fw-bold">
                      {attendanceData.reduce((sum, d) => sum + d.count, 0)}
                    </div>
                  </div>

                  <div className="p-3 bg-light rounded">
                    <h6>Daily Breakdown:</h6>
                    {attendanceData.map((day, index) => (
                      <div key={index} className="d-flex justify-content-between mb-1">
                        <span>{day.date}</span>
                        <Badge bg="primary">{day.count}</Badge>
                      </div>
                    ))}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>
      </Tabs>
    </Container>
  );
};

export default Reports;
