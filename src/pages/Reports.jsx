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
  Tab,
  Modal,
  FormControl,
  Dropdown,
  ProgressBar,
  ListGroup
} from 'react-bootstrap';
import axios from 'axios';
import { Line, Bar, Doughnut, Pie } from 'react-chartjs-2';
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
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
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
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedQuarter, setSelectedQuarter] = useState(1);
  const [activeTab, setActiveTab] = useState('monthly');
  const [showPasswordModal, setShowPasswordModal] = useState(true);
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [dateRange, setDateRange] = useState('current'); // current, last3months, last6months, lastyear
  
  const [monthlyData, setMonthlyData] = useState([]);
  const [monthlyPayments, setMonthlyPayments] = useState([]);
  const [quarterlyData, setQuarterlyData] = useState([]);
  const [yearlyData, setYearlyData] = useState([]);
  const [membershipData, setMembershipData] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [paymentTrends, setPaymentTrends] = useState([]);
  const [expiredMembers, setExpiredMembers] = useState([]);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [activePayments, setActivePayments] = useState([]); // NEW: Active payments
  
  const [summaryStats, setSummaryStats] = useState({
    totalRevenue: 0,
    totalMembers: 0,
    averageMonthlyRevenue: 0,
    growthRate: 0,
    activeMembers: 0,
    pendingAmount: 0,
    currentMonthRevenue: 0,
    lastMonthRevenue: 0,
    monthlyGrowth: 0,
    totalPaidThisMonth: 0,
    totalDueThisMonth: 0,
    activePaidMembers: 0, // NEW
    activeUnpaidMembers: 0, // NEW
    upcomingExpiries: 0 // NEW
  });

  // Hard-coded admin password
  const ADMIN_PASSWORD = 'admin123';

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setShowPasswordModal(false);
      setPasswordError('');
    } else {
      setPasswordError('Invalid password');
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchReportsData();
    }
  }, [isAuthenticated, selectedYear, selectedMonth, dateRange]);

  const fetchReportsData = async () => {
    try {
      setLoading(true);
      const [customersRes, attendanceRes] = await Promise.all([
        axios.get('https://new-backend-3-yxpd.onrender.com/api/customers'),
        axios.get('https://new-backend-3-yxpd.onrender.com/api/attendance')
      ]);

      const customers = customersRes.data;
      const attendance = attendanceRes.data;

      processMonthlyData(customers);
      processMonthlyPayments(customers);
      processQuarterlyData(customers);
      processYearlyData(customers);
      processMembershipData(customers);
      processAttendanceData(attendance);
      processPaymentTrends(customers);
      processExpiredMembers(customers);
      processPendingPayments(customers);
      processActivePayments(customers); // NEW: Process active payments
      calculateSummaryStats(customers);

    } catch (error) {
      showAlert('Failed to fetch reports data', 'danger');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // NEW: Process active payments
  const processActivePayments = (customers) => {
    const currentDate = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(currentDate.getDate() + 30);

    const active = customers.filter(c => {
      if (!c.expiryDate) return false;
      const expiryDate = new Date(c.expiryDate);
      return expiryDate > currentDate; // Not expired yet
    }).map(c => ({
      ...c,
      daysUntilExpiry: Math.ceil((new Date(c.expiryDate) - currentDate) / (1000 * 60 * 60 * 24)),
      paymentStatus: (c.remaining || 0) > 0 ? 'pending' : 'paid',
      isExpiringSoon: new Date(c.expiryDate) <= thirtyDaysFromNow,
      totalPaid: (c.fee || 0) - (c.remaining || 0),
      paymentProgress: c.fee > 0 ? (((c.fee || 0) - (c.remaining || 0)) / c.fee) * 100 : 0
    })).sort((a, b) => {
      // Sort by expiry date (closest first)
      return new Date(a.expiryDate) - new Date(b.expiryDate);
    });

    setActivePayments(active);
  };

  const processMonthlyPayments = (customers) => {
    const currentDate = new Date();
    let startDate, endDate;

    switch (dateRange) {
      case 'current':
        startDate = new Date(selectedYear, selectedMonth - 1, 1);
        endDate = new Date(selectedYear, selectedMonth, 0);
        break;
      case 'last3months':
        startDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 2, 1);
        endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        break;
      case 'last6months':
        startDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 5, 1);
        endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        break;
      case 'lastyear':
        startDate = new Date(currentDate.getFullYear() - 1, 0, 1);
        endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        break;
      default:
        startDate = new Date(selectedYear, selectedMonth - 1, 1);
        endDate = new Date(selectedYear, selectedMonth, 0);
    }

    // Process monthly payments based on currentDate field
    const monthlyPaymentsData = [];
    const startYear = startDate.getFullYear();
    const startMonth = startDate.getMonth();
    const endYear = endDate.getFullYear();
    const endMonth = endDate.getMonth();

    for (let year = startYear; year <= endYear; year++) {
      const monthStart = year === startYear ? startMonth : 0;
      const monthEnd = year === endYear ? endMonth : 11;

      for (let month = monthStart; month <= monthEnd; month++) {
        const monthStart = new Date(year, month, 1);
        const monthEnd = new Date(year, month + 1, 0);

        const monthCustomers = customers.filter(c => {
          if (!c.currentDate) return false;
          const currentDate = new Date(c.currentDate);
          return currentDate >= monthStart && currentDate <= monthEnd;
        });

        const totalRevenue = monthCustomers.reduce((sum, c) => sum + (c.fee || 0), 0);
        const totalPaid = monthCustomers.reduce((sum, c) => sum + ((c.fee || 0) - (c.remaining || 0)), 0);
        const totalPending = monthCustomers.reduce((sum, c) => sum + (c.remaining || 0), 0);
        const newMembers = monthCustomers.length;
        
        // Calculate renewals (members who joined before this month but paid this month)
        const renewals = customers.filter(c => {
          if (!c.currentDate || !c.joinDate) return false;
          const joinDate = new Date(c.joinDate);
          const currentDate = new Date(c.currentDate);
          return joinDate < monthStart && currentDate >= monthStart && currentDate <= monthEnd;
        }).length;

        monthlyPaymentsData.push({
          month: months[month],
          year,
          monthIndex: month,
          totalRevenue,
          totalPaid,
          totalPending,
          newMembers,
          renewals,
          collectionRate: totalRevenue > 0 ? ((totalPaid / totalRevenue) * 100).toFixed(1) : 0
        });
      }
    }

    setMonthlyPayments(monthlyPaymentsData);
  };

  const processMonthlyData = (customers) => {
    const monthsArray = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    const currentYear = selectedYear;
    const data = monthsArray.map((month, index) => {
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

  const processPaymentTrends = (customers) => {
    const last12Months = [];
    const currentDate = new Date();

    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const monthCustomers = customers.filter(c => {
        if (!c.currentDate) return false;
        const currentDate = new Date(c.currentDate);
        return currentDate >= date && currentDate <= nextMonth;
      });

      const totalCollected = monthCustomers.reduce((sum, c) => sum + ((c.fee || 0) - (c.remaining || 0)), 0);
      const totalDue = monthCustomers.reduce((sum, c) => sum + (c.remaining || 0), 0);

      last12Months.push({
        month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        collected: totalCollected,
        due: totalDue,
        total: totalCollected + totalDue
      });
    }

    setPaymentTrends(last12Months);
  };

  const processExpiredMembers = (customers) => {
    const currentDate = new Date();
    const expired = customers.filter(c => {
      if (!c.expiryDate) return false;
      return new Date(c.expiryDate) < currentDate;
    }).map(c => ({
      ...c,
      daysExpired: Math.floor((currentDate - new Date(c.expiryDate)) / (1000 * 60 * 60 * 24))
    })).sort((a, b) => b.daysExpired - a.daysExpired);

    setExpiredMembers(expired);
  };

  const processPendingPayments = (customers) => {
    const pending = customers.filter(c => (c.remaining || 0) > 0)
      .map(c => ({
        ...c,
        pendingAmount: c.remaining || 0
      }))
      .sort((a, b) => b.pendingAmount - a.pendingAmount);

    setPendingPayments(pending);
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
    const currentDate = new Date();
    const totalRevenue = customers.reduce((sum, c) => sum + (c.fee || 0), 0);
    const totalMembers = customers.length;
    const activeMembers = customers.filter(c => new Date(c.expiryDate) > currentDate).length;
    const pendingAmount = customers.reduce((sum, c) => sum + (c.remaining || 0), 0);
    
    // Active payment statistics
    const activePaidMembers = customers.filter(c => 
      new Date(c.expiryDate) > currentDate && (c.remaining || 0) === 0
    ).length;
    
    const activeUnpaidMembers = customers.filter(c => 
      new Date(c.expiryDate) > currentDate && (c.remaining || 0) > 0
    ).length;

    // Upcoming expiries (next 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(currentDate.getDate() + 30);
    const upcomingExpiries = customers.filter(c => {
      if (!c.expiryDate) return false;
      const expiryDate = new Date(c.expiryDate);
      return expiryDate > currentDate && expiryDate <= thirtyDaysFromNow;
    }).length;
    
    // Current month calculations
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    const currentMonthCustomers = customers.filter(c => {
      if (!c.currentDate) return false;
      const date = new Date(c.currentDate);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });
    
    const lastMonthCustomers = customers.filter(c => {
      if (!c.currentDate) return false;
      const date = new Date(c.currentDate);
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear;
    });

    const currentMonthRevenue = currentMonthCustomers.reduce((sum, c) => sum + (c.fee || 0), 0);
    const lastMonthRevenue = lastMonthCustomers.reduce((sum, c) => sum + (c.fee || 0), 0);
    const monthlyGrowth = lastMonthRevenue > 0 ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;

    const totalPaidThisMonth = currentMonthCustomers.reduce((sum, c) => sum + ((c.fee || 0) - (c.remaining || 0)), 0);
    const totalDueThisMonth = currentMonthCustomers.reduce((sum, c) => sum + (c.remaining || 0), 0);

    const averageMonthlyRevenue = totalRevenue / 12;

    const lastYearCustomers = customers.filter(c => 
      new Date(c.joinDate).getFullYear() === currentYear - 1
    );
    const lastYearRevenue = lastYearCustomers.reduce((sum, c) => sum + (c.fee || 0), 0);
    const currentYearCustomers = customers.filter(c => 
      new Date(c.joinDate).getFullYear() === currentYear
    );
    const currentYearRevenue = currentYearCustomers.reduce((sum, c) => sum + (c.fee || 0), 0);
    const growthRate = lastYearRevenue > 0 ? ((currentYearRevenue - lastYearRevenue) / lastYearRevenue) * 100 : 0;

    setSummaryStats({
      totalRevenue,
      totalMembers,
      averageMonthlyRevenue,
      growthRate,
      activeMembers,
      pendingAmount,
      currentMonthRevenue,
      lastMonthRevenue,
      monthlyGrowth,
      totalPaidThisMonth,
      totalDueThisMonth,
      activePaidMembers,
      activeUnpaidMembers,
      upcomingExpiries
    });
  };

  const showAlert = (message, variant = 'success') => {
    setAlert({ show: true, message, variant });
    setTimeout(() => setAlert({ show: false, message: '', variant: '' }), 5000);
  };

  const exportReport = (type) => {
    let data = [];
    let fileName = '';

    switch (type) {
      case 'Monthly':
        data = monthlyPayments.map((item, index) => ({
          'S.No': index + 1,
          'Month': `${item.month} ${item.year}`,
          'Total Revenue': item.totalRevenue,
          'Total Paid': item.totalPaid,
          'Total Pending': item.totalPending,
          'New Members': item.newMembers,
          'Renewals': item.renewals,
          'Collection Rate': `${item.collectionRate}%`
        }));
        fileName = `monthly_payments_report_${new Date().toISOString().split('T')[0]}.xlsx`;
        break;
      case 'Active':
        data = activePayments.map((member, index) => ({
          'S.No': index + 1,
          'Name': member.name,
          'Roll Number': member.rollNumber,
          'Phone': member.phone,
          'Membership': member.membership,
          'Total Fee': member.fee,
          'Paid Amount': member.totalPaid,
          'Pending Amount': member.remaining || 0,
          'Payment Progress': `${member.paymentProgress.toFixed(1)}%`,
          'Expiry Date': member.expiryDate,
          'Days Until Expiry': member.daysUntilExpiry,
          'Status': member.paymentStatus === 'paid' ? 'Fully Paid' : 'Payment Pending',
          'Expiring Soon': member.isExpiringSoon ? 'Yes' : 'No'
        }));
        fileName = `active_members_report_${new Date().toISOString().split('T')[0]}.xlsx`;
        break;
      case 'Expired':
        data = expiredMembers.map((member, index) => ({
          'S.No': index + 1,
          'Name': member.name,
          'Roll Number': member.rollNumber,
          'Phone': member.phone,
          'Membership': member.membership,
          'Expiry Date': member.expiryDate,
          'Days Expired': member.daysExpired,
          'Pending Amount': member.remaining || 0
        }));
        fileName = `expired_members_report_${new Date().toISOString().split('T')[0]}.xlsx`;
        break;
      case 'Pending':
        data = pendingPayments.map((member, index) => ({
          'S.No': index + 1,
          'Name': member.name,
          'Roll Number': member.rollNumber,
          'Phone': member.phone,
          'Membership': member.membership,
          'Total Fee': member.fee,
          'Pending Amount': member.pendingAmount
        }));
        fileName = `pending_payments_report_${new Date().toISOString().split('T')[0]}.xlsx`;
        break;
      default:
        showAlert('Report type not supported', 'warning');
        return;
    }

    if (data.length === 0) {
      showAlert('No data to export', 'warning');
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, type);

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    saveAs(blob, fileName);
    showAlert(`${type} report exported successfully!`, 'success');
  };

  // Chart data
  const monthlyPaymentsChartData = {
    labels: monthlyPayments.map(d => `${d.month} ${d.year}`),
    datasets: [
      {
        label: 'TotalPayments.map(d => d.totalRevenue)',
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1
      },
      {
        label: 'Total Paid',
        data: monthlyPayments.map(d => d.totalPaid),
        borderColor: 'rgb(54, 162, 235)',
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        tension: 0.1
      },
      {
        label: ' monthlyPayments.map(d => d.totalPending)',
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        tension: 0.1
      }
    ]
  };

  const paymentTrendsChartData = {
    labels: paymentTrends.map(d => d.month),
    datasets: [
      {
        label: 'rends.map(d => d.collected)',
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
      },
      {
        label:d => d.due,
        backgroundColor: 'rgba(255, 99, 132, 0.6)',
      }
    ]
  };

  const monthlyChartData = {
    labels: monthlyData.map(d => d.month),
    datasets: [
      {
        label: monthlyData.map(d => d.revenue),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1
      },
      {
        label: 'NewData.map(d => d.newMembers)',
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        yAxisID: 'y1',
        tension: 0.1
      }
    ]
  };

  const membershipChartData = {
    labels: membershipData.map(d => d.type),
    datasets: [
      {
        label: '.map(d => d.count)',
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

  if (!isAuthenticated) {
    return (
      <Modal show={showPasswordModal} centered backdrop="static">
        <Modal.Header className="bg-gradient text-white" 
                     style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
          <Modal.Title className="fw-bold">
            <i className="bi bi-shield-lock me-2"></i>
            Admin Authentication Required
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <div className="text-center mb-4">
            <i className="bi bi-lock display-1 text-primary"></i>
            <h5 className="mt-3 text-primary">Secure Access</h5>
            <p className="text-muted">Enter admin password to view financial reports</p>
          </div>
          <Form onSubmit={handlePasswordSubmit}>
            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">
                <i className="bi bi-key me-2"></i>Admin Password
              </Form.Label>
              <FormControl
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                isInvalid={!!passwordError}
                className="shadow-sm"
                style={{ padding: '12px' }}
              />
              <Form.Control.Feedback type="invalid">
                <i className="bi bi-exclamation-triangle me-1"></i>
                {passwordError}
              </Form.Control.Feedback>
            </Form.Group>
            <div className="d-grid">
              <Button variant="primary" type="submit" size="lg" className="rounded-pill">
                <i className="bi bi-unlock me-2"></i>
                Access Reports
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    );
  }

  if (loading) {
    return (
      <Container className="text-center mt-5">
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
          <div className="text-center">
            <Spinner animation="border" variant="primary" style={{ width: '3rem', height: '3rem' }} />
            <h4 className="mt-3 text-primary">Loading financial reports...</h4>
            <p className="text-muted">Analyzing revenue and payment data</p>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="reports-container" style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', minHeight: '100vh' }}>
      {/* Enhanced Header */}
      <Row className="mb-4">
        <Col>
          <Card className="shadow-lg border-0 rounded-4 overflow-hidden">
            <div className="card-header text-white border-0" 
                 style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '2rem' }}>
              <Row className="align-items-center">
                <Col md={8}>
                  <h1 className="display-5 fw-bold mb-2 d-flex align-items-center">
                    <i className="bi bi-graph-up me-3" style={{ fontSize: '3rem' }}></i>
                    <span>Financial Reports & Analytics</span>
                    <i className="bi bi-currency-dollar ms-3 text-warning" style={{ fontSize: '2rem' }}></i>
                  </h1>
                  <p className="mb-0 mt-2 opacity-75 fs-5">
                    Comprehensive insights into gym performance, revenue, and payment tracking
                  </p>
                </Col>
                <Col md={4} className="text-end">
                  <div className="d-flex justify-content-end gap-2 flex-wrap">
                    <Form.Select 
                      size="sm" 
                      value={selectedYear} 
                      onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                      className="shadow-sm"
                    >
                      {[2024, 2023, 2022, 2021].map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </Form.Select>
                    <Form.Select 
                      size="sm" 
                      value={selectedMonth} 
                      onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                      className="shadow-sm"
                    >
                      {months.map((month, index) => (
                        <option key={index} value={index + 1}>{month}</option>
                      ))}
                    </Form.Select>
                    <Button variant="outline-light" size="sm" onClick={fetchReportsData} className="shadow-sm">
                      <i className="bi bi-arrow-clockwise"></i>
                    </Button>
                  </div>
                </Col>
              </Row>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Alert */}
      {alert.show && (
        <Alert variant={alert.variant} dismissible onClose={() => setAlert({ show: false })} className="shadow-sm rounded-4">
          <i className={`bi bi-${alert.variant === 'success' ? 'check-circle' : 'exclamation-triangle'} me-2`}></i>
          {alert.message}
        </Alert>
      )}

      {/* Enhanced Summary Statistics - Updated with Active Member Stats */}
      <Row className="mb-4">
        <Col md={2}>
          <Card className="shadow-sm border-0 rounded-4 h-100" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <Card.Body className="text-center text-white p-3">
              <div className="mb-2">
                <i className="bi bi-currency-rupee" style={{ fontSize: '2.5rem' }}></i>
              </div>
              <h5 className="fw-bold mb-1">RS{summaryStats.totalRevenue.toLocaleString()}</h5>
              <small className="opacity-75">Total Revenue</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2}>
          <Card className="shadow-sm border-0 rounded-4 h-100" style={{ background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' }}>
            <Card.Body className="text-center text-white p-3">
              <div className="mb-2">
                <i className="bi bi-people-fill" style={{ fontSize: '2.5rem' }}></i>
              </div>
              <h5 className="fw-bold mb-1">{summaryStats.activeMembers}</h5>
              <small className="opacity-75">Active Members</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2}>
          <Card className="shadow-sm border-0 rounded-4 h-100" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' }}>
            <Card.Body className="text-center text-white p-3">
              <div className="mb-2">
                <i className="bi bi-check-circle-fill" style={{ fontSize: '2.5rem' }}></i>
              </div>
              <h5 className="fw-bold mb-1">{summaryStats.activePaidMembers}</h5>
              <small className="opacity-75">Paid Members</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2}>
          <Card className="shadow-sm border-0 rounded-4 h-100" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
            <Card.Body className="text-center text-white p-3">
              <div className="mb-2">
                <i className="bi bi-exclamation-circle-fill" style={{ fontSize: '2.5rem' }}></i>
              </div>
              <h5 className="fw-bold mb-1">{summaryStats.activeUnpaidMembers}</h5>
              <small className="opacity-75">Unpaid Members</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2}>
          <Card className="shadow-sm border-0 rounded-4 h-100" style={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' }}>
            <Card.Body className="text-center text-white p-3">
              <div className="mb-2">
                <i className="bi bi-clock-fill" style={{ fontSize: '2.5rem' }}></i>
              </div>
              <h5 className="fw-bold mb-1">{summaryStats.upcomingExpiries}</h5>
              <small className="opacity-75">Expiring Soon</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2}>
          <Card className="shadow-sm border-0 rounded-4 h-100" style={{ background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)' }}>
            <Card.Body className="text-center text-dark p-3">
              <div className="mb-2">
                <i className="bi bi-graph-up-arrow" style={{ fontSize: '2.5rem' }}></i>
              </div>
              <h5 className="fw-bold mb-1 text-success">{summaryStats.monthlyGrowth.toFixed(1)}%</h5>
              <small className="text-muted">Monthly Growth</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Enhanced Tabs - Added Active Payments Tab */}
      <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-4 nav-pills">
        <Tab eventKey="payments" title={
          <span><i className="bi bi-credit-card me-2"></i>Monthly Payments</span>
        }>
          <Card className="shadow-lg border-0 rounded-4">
            <Card.Header className="bg-gradient text-white border-0" 
                         style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '1.5rem' }}>
              <Row className="align-items-center">
                <Col md={8}>
                  <h4 className="mb-0 fw-bold">
                    <i className="bi bi-calendar-range me-2"></i>
                    Monthly Payment Analysis
                  </h4>
                </Col>
                <Col md={4} className="text-end">
                  <Form.Select 
                    size="sm" 
                    value={dateRange} 
                    onChange={(e) => setDateRange(e.target.value)}
                    className="w-auto d-inline-block"
                  >
                    <option value="current">Current Month</option>
                    <option value="last3months">Last 3 Months</option>
                    <option value="last6months">Last 6 Months</option>
                    <option value="lastyear">Last Year</option>
                  </Form.Select>
                  <Button 
                    variant="outline-light" 
                    size="sm"
                    className="ms-2"
                    onClick={() => exportReport('Monthly')}
                  >
                    <i className="bi bi-download me-1"></i>Export
                  </Button>
                </Col>
              </Row>
            </Card.Header>
            <Card.Body className="p-0">
              <Row className="g-0">
                <Col lg={8}>
                  <div className="p-4" style={{ height: '500px' }}>
                    <Line data={monthlyPaymentsChartData} options={chartOptions} />
                  </div>
                </Col>
                <Col lg={4} className="border-start">
                  <div className="p-4" style={{ maxHeight: '500px', overflowY: 'auto', background: 'linear-gradient(180deg, #ffffff 0%, #f8f9fa 100%)' }}>
                    <h6 className="text-primary mb-3 fw-bold">
                      <i className="bi bi-list-check me-2"></i>Payment Summary
                    </h6>
                    <div className="table-responsive">
                      <Table size="sm" hover className="mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Month</th>
                            <th>Revenue</th>
                            <th>Rate</th>
                          </tr>
                        </thead>
                        <tbody>
                          {monthlyPayments.map((month, index) => (
                            <tr key={index}>
                              <td className="fw-semibold">{month.month} {month.year}</td>
                              <td className="text-success">RS{month.totalRevenue.toLocaleString()}</td>
                              <td>
                                <Badge bg={month.collectionRate >= 80 ? 'success' : month.collectionRate >= 60 ? 'warning' : 'danger'}>
                                  {month.collectionRate}%
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                    
                    {monthlyPayments.length > 0 && (
                      <div className="mt-4 p-3 bg-light rounded">
                        <h6 className="text-primary mb-2">
                          <i className="bi bi-calculator me-2"></i>Period Totals:
                        </h6>
                        <div className="row text-center">
                          <div className="col-12 mb-2">
                            <strong>Total Revenue:</strong><br/>
                            <span className="h5 text-success">
                              RS{monthlyPayments.reduce((sum, m) => sum + m.totalRevenue, 0).toLocaleString()}
                            </span>
                          </div>
                          <div className="col-6">
                            <strong>Collected:</strong><br/>
                            <span className="text-primary">
                              RS{monthlyPayments.reduce((sum, m) => sum + m.totalPaid, 0).toLocaleString()}
                            </span>
                          </div>
                          <div className="col-6">
                            <strong>Pending:</strong><br/>
                            <span className="text-danger">
                              RS{monthlyPayments.reduce((sum, m) => sum + m.totalPending, 0).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Tab>

        {/* NEW: Active Payments Tab */}
        <Tab eventKey="active" title={
          <span><i className="bi bi-check-circle me-2"></i>Active Members ({activePayments.length})</span>
        }>
          <Card className="shadow-sm border-0 rounded-4">
            <Card.Header className="bg-success text-white d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                <i className="bi bi-people-fill me-2"></i>
                Active Member Payments ({activePayments.length})
              </h5>
              <Button 
                variant="outline-light" 
                size="sm"
                onClick={() => exportReport('Active')}
              >
                <i className="bi bi-download me-1"></i>Export
              </Button>
            </Card.Header>
            <Card.Body className="p-0">
              <div className="table-responsive">
                <Table hover className="mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Name</th>
                      <th>Roll #</th>
                      <th>Phone</th>
                      <th>Membership</th>
                      <th>Payment Progress</th>
                      <th>Pending</th>
                      <th>Expiry</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activePayments.slice(0, 50).map((member, index) => (
                      <tr key={index} className={member.isExpiringSoon ? 'table-warning' : ''}>
                        <td className="fw-semibold">
                          {member.name}
                          {member.isExpiringSoon && (
                            <i className="bi bi-exclamation-triangle text-warning ms-2" title="Expiring Soon"></i>
                          )}
                        </td>
                        <td>
                          <Badge bg="secondary">{member.rollNumber}</Badge>
                        </td>
                        <td>{member.phone}</td>
                        <td>
                          <Badge bg="info" className="text-capitalize">{member.membership}</Badge>
                        </td>
                        <td style={{ width: '200px' }}>
                          <div className="d-flex align-items-center">
                            <ProgressBar 
                              now={member.paymentProgress} 
                              variant={member.paymentProgress === 100 ? 'success' : member.paymentProgress >= 50 ? 'warning' : 'danger'}
                              style={{ height: '8px', flex: 1 }}
                              className="me-2"
                            />
                            <small className="text-muted">{member.paymentProgress.toFixed(0)}%</small>
                          </div>
                          <small className="text-muted">
                            RS{member.totalPaid.toLocaleString()} / RS{(member.fee || 0).toLocaleString()}
                          </small>
                        </td>
                        <td className={`fw-semibold ${(member.remaining || 0) > 0 ? 'text-danger' : 'text-success'}`}>
                          RS{(member.remaining || 0).toLocaleString()}
                        </td>
                        <td>
                          <div>
                            {new Date(member.expiryDate).toLocaleDateString()}
                            <br />
                            <small className={`text-muted ${member.daysUntilExpiry <= 7 ? 'text-danger fw-bold' : member.daysUntilExpiry <= 30 ? 'text-warning fw-bold' : ''}`}>
                              {member.daysUntilExpiry} days left
                            </small>
                          </div>
                        </td>
                        <td>
                          <div className="d-flex flex-column gap-1">
                            <Badge bg={member.paymentStatus === 'paid' ? 'success' : 'danger'}>
                              {member.paymentStatus === 'paid' ? 'Fully Paid' : 'Payment Due'}
                            </Badge>
                            {member.isExpiringSoon && (
                              <Badge bg="warning" text="dark">
                                Expiring Soon
                              </Badge>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
                {activePayments.length === 0 && (
                  <div className="text-center py-5">
                    <i className="bi bi-people display-1 text-muted"></i>
                    <h4 className="text-muted mt-3">No active members found!</h4>
                    <p className="text-muted">All memberships have expired.</p>
                  </div>
                )}
              </div>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="trends" title={
          <span><i className="bi bi-graph-up me-2"></i>Payment Trends</span>
        }>
          <Row>
            <Col lg={8}>
              <Card className="shadow-sm border-0 rounded-4">
                <Card.Header className="bg-primary text-white">
                  <h5 className="mb-0">
                    <i className="bi bi-bar-chart me-2"></i>
                    Payment Collection Trends (Last 12 Months)
                  </h5>
                </Card.Header>
                <Card.Body style={{ height: '400px' }}>
                  <Bar data={paymentTrendsChartData} options={chartOptions} />
                </Card.Body>
              </Card>
            </Col>
            <Col lg={4}>
              <Card className="shadow-sm border-0 rounded-4 h-100">
                <Card.Header className="bg-info text-white">
                  <h5 className="mb-0">
                    <i className="bi bi-clipboard-data me-2"></i>
                    Collection Analytics
                  </h5>
                </Card.Header>
                <Card.Body>
                  <div className="mb-4 p-3 bg-light rounded">
                    <h6 className="text-primary">Average Monthly Collection</h6>
                    <div className="h4 text-success">
                      RS{paymentTrends.length > 0 ? Math.round(paymentTrends.reduce((sum, t) => sum + t.collected, 0) / paymentTrends.length).toLocaleString() : 0}
                    </div>
                  </div>
                  
                  <div className="mb-4 p-3 bg-light rounded">
                    <h6 className="text-primary">Best Performing Month</h6>
                    <div className="h6 text-success">
                      {paymentTrends.length > 0 ? 
                        paymentTrends.reduce((max, t) => t.collected > max.collected ? t : max, paymentTrends[0]).month 
                        : 'N/A'}
                    </div>
                    <small className="text-muted">
                      {paymentTrends.length > 0 ? 
                        `RS${paymentTrends.reduce((max, t) => t.collected > max.collected ? t : max, paymentTrends[0]).collected.toLocaleString()} collected`
                        : ''}
                    </small>
                  </div>

                  <div className="p-3 bg-light rounded">
                    <h6 className="text-primary">Collection Efficiency</h6>
                    {paymentTrends.slice(-3).map((trend, index) => {
                      const efficiency = trend.total > 0 ? (trend.collected / trend.total) * 100 : 0;
                      return (
                        <div key={index} className="mb-2">
                          <div className="d-flex justify-content-between">
                            <small>{trend.month}</small>
                            <small>{efficiency.toFixed(1)}%</small>
                          </div>
                          <ProgressBar 
                            now={efficiency} 
                            variant={efficiency >= 80 ? 'success' : efficiency >= 60 ? 'warning' : 'danger'}
                            style={{ height: '6px' }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>

        <Tab eventKey="expired" title={
          <span><i className="bi bi-exclamation-triangle me-2"></i>Expired Members</span>
        }>
          <Card className="shadow-sm border-0 rounded-4">
            <Card.Header className="bg-danger text-white d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                <i className="bi bi-calendar-x me-2"></i>
                Expired Memberships ({expiredMembers.length})
              </h5>
              <Button 
                variant="outline-light" 
                size="sm"
                onClick={() => exportReport('Expired')}
              >
                <i className="bi bi-download me-1"></i>Export
              </Button>
            </Card.Header>
            <Card.Body className="p-0">
              <div className="table-responsive">
                <Table hover className="mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Name</th>
                      <th>Roll #</th>
                      <th>Phone</th>
                      <th>Membership</th>
                      <th>Expiry Date</th>
                      <th>Days Expired</th>
                      <th>Pending</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expiredMembers.slice(0, 20).map((member, index) => (
                      <tr key={index}>
                        <td className="fw-semibold">{member.name}</td>
                        <td>
                          <Badge bg="secondary">{member.rollNumber}</Badge>
                        </td>
                        <td>{member.phone}</td>
                        <td>
                          <Badge bg="info" className="text-capitalize">{member.membership}</Badge>
                        </td>
                        <td>{new Date(member.expiryDate).toLocaleDateString()}</td>
                        <td>
                          <Badge bg={member.daysExpired > 30 ? 'danger' : 'warning'}>
                            {member.daysExpired} days
                          </Badge>
                        </td>
                        <td className="text-danger fw-semibold">
                          RS{(member.remaining || 0).toLocaleString()}
                        </td>
                        <td>
                          <Badge bg={member.daysExpired > 30 ? 'danger' : 'warning'}>
                            {member.daysExpired > 30 ? 'Critical' : 'Warning'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
                {expiredMembers.length === 0 && (
                  <div className="text-center py-5">
                    <i className="bi bi-check-circle display-1 text-success"></i>
                    <h4 className="text-success mt-3">All memberships are active!</h4>
                    <p className="text-muted">No expired memberships found.</p>
                  </div>
                )}
              </div>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="pending" title={
          <span><i className="bi bi-clock me-2"></i>Pending Payments</span>
        }>
          <Card className="shadow-sm border-0 rounded-4">
            <Card.Header className="bg-warning text-dark d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                <i className="bi bi-currency-exchange me-2"></i>
                Pending Payments ({pendingPayments.length})
              </h5>
              <Button 
                variant="outline-dark" 
                size="sm"
                onClick={() => exportReport('Pending')}
              >
                <i className="bi bi-download me-1"></i>Export
              </Button>
            </Card.Header>
            <Card.Body className="p-0">
              <div className="table-responsive">
                <Table hover className="mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Name</th>
                      <th>Roll #</th>
                      <th>Phone</th>
                      <th>Membership</th>
                      <th>Total Fee</th>
                      <th>Pending Amount</th>
                      <th>Priority</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingPayments.slice(0, 20).map((member, index) => (
                      <tr key={index}>
                        <td className="fw-semibold">{member.name}</td>
                        <td>
                          <Badge bg="secondary">{member.rollNumber}</Badge>
                        </td>
                        <td>{member.phone}</td>
                        <td>
                          <Badge bg="info" className="text-capitalize">{member.membership}</Badge>
                        </td>
                        <td className="text-success fw-semibold">
                          RS{(member.fee || 0).toLocaleString()}
                        </td>
                        <td className="text-danger fw-semibold">
                          RS{member.pendingAmount.toLocaleString()}
                        </td>
                        <td>
                          <Badge bg={member.pendingAmount > 5000 ? 'danger' : member.pendingAmount > 2000 ? 'warning' : 'secondary'}>
                            {member.pendingAmount > 5000 ? 'High' : member.pendingAmount > 2000 ? 'Medium' : 'Low'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
                {pendingPayments.length === 0 && (
                  <div className="text-center py-5">
                    <i className="bi bi-check-circle display-1 text-success"></i>
                    <h4 className="text-success mt-3">All payments are up to date!</h4>
                    <p className="text-muted">No pending payments found.</p>
                  </div>
                )}
              </div>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="membership" title={
          <span><i className="bi bi-pie-chart me-2"></i>Membership Analysis</span>
        }>
          <Row>
            <Col lg={6}>
              <Card className="shadow-sm border-0 rounded-4">
                <Card.Header className="bg-primary text-white">
                  <h5 className="mb-0">Membership Distribution</h5>
                </Card.Header>
                <Card.Body style={{ height: '400px' }}>
                  <Doughnut data={membershipChartData} />
                </Card.Body>
              </Card>
            </Col>
            <Col lg={6}>
              <Card className="shadow-sm border-0 rounded-4 h-100">
                <Card.Header className="bg-info text-white">
                  <h5 className="mb-0">Revenue Breakdown</h5>
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
