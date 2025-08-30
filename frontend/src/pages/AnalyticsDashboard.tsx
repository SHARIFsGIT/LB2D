import React, { useCallback, useEffect, useState } from 'react';
import { NotificationData, useWebSocket } from '../hooks/useWebSocket';

const AnalyticsDashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState('year');
  const [activeTab, setActiveTab] = useState<'students' | 'supervisors'>('students');
  const [studentAnalytics, setStudentAnalytics] = useState<any>(null);
  const [supervisorAnalytics, setSupervisorAnalytics] = useState<any>(null);
  const [assessmentReports, setAssessmentReports] = useState<any>(null);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [showStudentPopup, setShowStudentPopup] = useState(false);
  const [realTimeUpdates, setRealTimeUpdates] = useState<NotificationData[]>([]);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  // Handle real-time notifications
  const handleNotification = useCallback((notification: NotificationData) => {
    console.log('📡 Real-time notification received:', notification);
    
    // Check if it's a user registration, enrollment, or video comment notification
    if ((notification.type === 'admin' && notification.title.includes('Registration')) || 
        notification.type === 'user_registration' ||
        notification.type === 'enrollment' ||
        notification.type === 'student_action' ||
        notification.type === 'video_comment') {
      
      // Add to real-time updates
      setRealTimeUpdates(prev => [notification, ...prev.slice(0, 9)]); // Keep last 10
      setLastUpdate(new Date().toLocaleTimeString());
      
      // Refresh analytics data for registration and enrollment notifications
      if (notification.type !== 'video_comment') {
        if (activeTab === 'students') {
          fetchStudentAnalytics();
        } else if (activeTab === 'supervisors') {
          fetchSupervisorAnalytics();
        }
      }
    }
  }, [activeTab]);

  // WebSocket connection
  const { isConnected, subscribe } = useWebSocket({
    onNotification: handleNotification,
    onConnect: () => {
      console.log('📡 Admin dashboard connected to WebSocket');
      // Subscribe to admin notifications
      subscribe(['admin', 'user-management', 'general']);
    }
  });

  useEffect(() => {
    if (activeTab === 'students') {
      fetchStudentAnalytics();
      fetchAssessmentReports();
    } else if (activeTab === 'supervisors') {
      fetchSupervisorAnalytics();
    }
  }, [timeRange, activeTab]);


  const fetchStudentAnalytics = async () => {
    try {
      const token = sessionStorage.getItem('accessToken');
      
      const [testsRes, certificatesRes, paymentsRes, progressRes, studentsRes] = await Promise.all([
        fetch(`${process.env.REACT_APP_API_URL}/analytics/student-results?timeRange=${timeRange}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${process.env.REACT_APP_API_URL}/analytics/student-certificates?timeRange=${timeRange}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${process.env.REACT_APP_API_URL}/analytics/student-payments?timeRange=${timeRange}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${process.env.REACT_APP_API_URL}/analytics/student-progress?timeRange=${timeRange}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${process.env.REACT_APP_API_URL}/analytics/recent-students?timeRange=${timeRange}&limit=20&showAllEnrolled=true`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      const [tests, certificates, payments, progress, students] = await Promise.all([
        testsRes.ok ? testsRes.json() : { data: null },
        certificatesRes.ok ? certificatesRes.json() : { data: null },
        paymentsRes.ok ? paymentsRes.json() : { data: null },
        progressRes.ok ? progressRes.json() : { data: null },
        studentsRes.ok ? studentsRes.json() : { data: null }
      ]);


      // Merge the results data with student analytics
      const mergedResults = {
        ...tests.data,
        recentStudents: students.data?.students || [],
        totalStudents: students.data?.totalStudents || 0,
        activeStudents: students.data?.activeStudents || 0,
        newStudentsThisMonth: students.data?.newStudentsThisMonth || 0
      };

      setStudentAnalytics({
        results: mergedResults,
        certificates: certificates.data,
        payments: payments.data,
        progress: progress.data
      });
    } catch (error) {
      console.error('Failed to fetch student analytics:', error);
      setStudentAnalytics({
        results: null,
        certificates: null,
        payments: null,
        progress: null
      });
    }
  };

  const fetchSupervisorAnalytics = async () => {
    try {
      const token = sessionStorage.getItem('accessToken');
      
      const [salaryRes, videosRes] = await Promise.all([
        fetch(`${process.env.REACT_APP_API_URL}/analytics/supervisor-salary?timeRange=${timeRange}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${process.env.REACT_APP_API_URL}/analytics/supervisor-videos?timeRange=${timeRange}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      const [salary, videos] = await Promise.all([
        salaryRes.ok ? salaryRes.json() : { data: null },
        videosRes.ok ? videosRes.json() : { data: null }
      ]);

      setSupervisorAnalytics({
        salary: salary.data,
        videos: videos.data
      });
    } catch (error) {
      console.error('Failed to fetch supervisor analytics:', error);
      setSupervisorAnalytics({
        salary: null,
        videos: null
      });
    }
  };

  const fetchAssessmentReports = async () => {
    try {
      const token = sessionStorage.getItem('accessToken');
      console.log('Fetching assessment reports with token:', token ? 'present' : 'missing');
      
      const response = await fetch(`${process.env.REACT_APP_API_URL}/tests/admin/reports?limit=50`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      console.log('Assessment reports response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Assessment reports data:', data);
        setAssessmentReports(data.data || { tests: [] });
      } else {
        console.error('Failed to fetch assessment reports:', response.status, await response.text());
        setAssessmentReports({ tests: [] });
      }
    } catch (error) {
      console.error('Failed to fetch assessment reports:', error);
      setAssessmentReports({ tests: [] });
    }
  };

  const downloadTestPDF = async (testId: string) => {
    try {
      const token = sessionStorage.getItem('accessToken');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/tests/admin/details/${testId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Create PDF content
        const testData = data.data;
        const pdfContent = generateTestReportPDF(testData);
        
        // Create and download PDF
        const blob = new Blob([pdfContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `test-report-${testData.user.firstName}-${testData.user.lastName}-${testData.step}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to download test report:', error);
      alert('Failed to download test report');
    }
  };

  const generateTestReportPDF = (testData: any) => {
    const formatTime = (seconds: number) => {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds}s`;
    };

    return `
GERMAN LANGUAGE ASSESSMENT REPORT
=================================

Student Information:
- Name: ${testData.user.firstName} ${testData.user.lastName}
- Email: ${testData.user.email}
- Test Date: ${new Date(testData.completedAt).toLocaleDateString()}
- Assessment Step: ${testData.step}

Test Results:
- Score: ${testData.score}%
- Certification Level: ${testData.certificationLevel}
- Completion Time: ${formatTime(testData.totalCompletionTime)}
- Status: ${testData.status}

Question-by-Question Analysis:
${testData.questions.map((q: any) => `
${q.questionNumber}. ${q.questionText}
   Selected Answer: ${q.selectedOption}
   Correct Answer: ${q.correctOption}
   Result: ${q.isCorrect ? '✓ CORRECT' : '✗ INCORRECT'}
   Time Spent: ${q.timeSpent}s
`).join('')}

Summary:
- Total Questions: ${testData.questions.length}
- Correct Answers: ${testData.questions.filter((q: any) => q.isCorrect).length}
- Accuracy: ${Math.round((testData.questions.filter((q: any) => q.isCorrect).length / testData.questions.length) * 100)}%

Generated on: ${new Date().toLocaleString()}
    `.trim();
  };

  const handleStudentClick = async (student: any) => {
    try {
      const token = sessionStorage.getItem('accessToken');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/tests/admin/reports?userId=${student.id}&limit=100`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSelectedStudent({
          ...student,
          tests: data.data.tests
        });
        setShowStudentPopup(true);
      }
    } catch (error) {
      console.error('Failed to fetch student details:', error);
    }
  };

  const clearPaymentData = async () => {
    const isConfirmed = window.confirm(
      '⚠️ WARNING: This will permanently delete ALL payment and revenue data.\n\n' +
      'This action cannot be undone. Are you absolutely sure you want to proceed?'
    );

    if (!isConfirmed) return;

    const doubleConfirm = window.confirm(
      '🚨 FINAL CONFIRMATION: You are about to delete all payment records.\n\n' +
      'This will remove all revenue analytics, payment history, and transaction data.\n\n' +
      'Type YES to confirm or Cancel to abort.'
    );

    if (!doubleConfirm) return;

    try {
      const token = sessionStorage.getItem('accessToken');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/analytics/clear-payment-data`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ confirmClear: true })
      });

      if (response.ok) {
        const data = await response.json();
        alert(`✅ Success! Cleared ${data.data.deletedPayments} payment records.`);
        
        // Refresh the analytics data
        if (activeTab === 'students') {
          fetchStudentAnalytics();
        }
      } else {
        const errorData = await response.json();
        alert(`❌ Error: ${errorData.message || 'Failed to clear payment data'}`);
      }
    } catch (error) {
      console.error('Error clearing payment data:', error);
      alert('❌ Network error occurred while clearing data. Please try again.');
    }
  };

  const clearTestData = async () => {
    const isConfirmed = window.confirm(
      '⚠️ WARNING: This will permanently delete ALL test and assessment data.\n\n' +
      'This includes all student exam results, scores, and certificates.\n\n' +
      'This action cannot be undone. Are you absolutely sure you want to proceed?'
    );

    if (!isConfirmed) return;

    const doubleConfirm = window.confirm(
      '🚨 FINAL CONFIRMATION: You are about to delete all test records.\n\n' +
      'This will remove all student results, assessment analytics, and examination data.\n\n' +
      'This action is IRREVERSIBLE. Confirm to proceed.'
    );

    if (!doubleConfirm) return;

    try {
      const token = sessionStorage.getItem('accessToken');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/analytics/clear-test-data`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ confirmClear: true })
      });

      if (response.ok) {
        const data = await response.json();
        alert(`✅ Success! Cleared ${data.data.deletedTests} test records.`);
        
        // Refresh the analytics data
        fetchAssessmentReports();
        if (activeTab === 'students') {
          fetchStudentAnalytics();
        }
      } else {
        const errorData = await response.json();
        alert(`❌ Error: ${errorData.message || 'Failed to clear test data'}`);
      }
    } catch (error) {
      console.error('Error clearing test data:', error);
      alert('❌ Network error occurred while clearing data. Please try again.');
    }
  };

  const initializeSupervisorSalaries = async () => {
    const isConfirmed = window.confirm(
      '📋 Initialize supervisor salary records for all existing supervisors?\n\n' +
      'This will create salary tracking records for supervisors who don\'t have them yet.\n\n' +
      'Existing salary records will not be modified.'
    );
    
    if (!isConfirmed) return;
    
    try {
      const token = sessionStorage.getItem('accessToken');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/analytics/initialize-supervisor-salaries`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        alert(`✅ Success! Initialized salary records.\n\nCreated: ${data.data.created} new records\nExisting: ${data.data.existing} records\nTotal: ${data.data.totalProcessed} supervisors processed`);
        
        // Refresh the analytics data
        if (activeTab === 'supervisors') {
          fetchSupervisorAnalytics();
        }
      } else {
        let errorMessage = 'Failed to initialize supervisor salaries';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || `Server responded with status ${response.status}`;
        } catch (parseError) {
          errorMessage = `Server responded with status ${response.status}`;
        }
        console.error('Initialize error:', response.status, errorMessage);
        alert(`❌ ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error initializing supervisor salaries:', error);
      alert('❌ Network error occurred while initializing salary records. Please try again.');
    }
  };

  const clearSupervisorSalaryData = async () => {
    const isConfirmed = window.confirm(
      '⚠️ WARNING: This will permanently delete ALL supervisor salary and compensation data.\n\n' +
      'This action cannot be undone. Are you absolutely sure you want to proceed?'
    );
    
    if (!isConfirmed) return;
    
    try {
      const token = sessionStorage.getItem('accessToken');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/analytics/clear-supervisor-salary`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        alert(`✅ Success! Cleared supervisor salary data.`);
        
        // Refresh the analytics data
        if (activeTab === 'supervisors') {
          fetchSupervisorAnalytics();
        }
      } else {
        const error = await response.json();
        alert(`❌ Failed to clear supervisor salary data: ${error.message}`);
      }
    } catch (error) {
      console.error('Error clearing supervisor salary data:', error);
      alert('❌ Network error occurred while clearing data. Please try again.');
    }
  };

  const handleEditSupervisor = (supervisor: any) => {
    const newSalary = prompt(
      `💼 Edit Monthly Salary\n\nSupervisor: ${supervisor.name}\nCurrent Salary: €${supervisor.monthlySalary?.toLocaleString() || 0}\n\nEnter new monthly salary amount:`, 
      supervisor.monthlySalary?.toString() || '0'
    );
    
    if (newSalary && !isNaN(Number(newSalary)) && Number(newSalary) >= 0) {
      const amount = Number(newSalary);
      const confirmed = window.confirm(
        `✅ Confirm Salary Update\n\nSupervisor: ${supervisor.name}\nOld Salary: €${supervisor.monthlySalary?.toLocaleString() || 0}\nNew Salary: €${amount.toLocaleString()}\n\nProceed with update?`
      );
      
      if (confirmed) {
        updateSupervisorSalary(supervisor.supervisorId, amount);
      }
    } else if (newSalary !== null && newSalary !== '') {
      alert('❌ Please enter a valid positive number for the salary amount.');
    }
  };

  const updateSupervisorSalary = async (supervisorId: string, newSalary: number) => {
    try {
      const token = sessionStorage.getItem('accessToken');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/analytics/supervisor-salary`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          supervisorId,
          monthlySalary: newSalary
        })
      });

      if (response.ok) {
        alert('✅ Salary Updated Successfully!\n\nThe supervisor salary has been updated and will be reflected in future payments.');
        fetchSupervisorAnalytics();
      } else {
        let errorMessage = 'Failed to update salary';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || `Server responded with status ${response.status}`;
        } catch (parseError) {
          errorMessage = `Server responded with status ${response.status}`;
        }
        console.error('Salary update error:', response.status, errorMessage);
        alert(`❌ ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error updating salary:', error);
      alert('❌ Network error occurred while updating salary. Please try again.');
    }
  };

  const handlePaySupervisor = async (supervisor: any) => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1; // 1-based month
    const currentYear = currentDate.getFullYear();
    
    // Validate required data
    if (!supervisor.supervisorId) {
      alert('❌ Error: Supervisor ID is missing. Please refresh the page and try again.');
      return;
    }
    
    console.log('Paying supervisor:', supervisor.supervisorId, 'Month:', currentMonth, 'Year:', currentYear);
    
    // Payment method selection
    const paymentMethods = ['bank_transfer', 'paypal', 'stripe', 'cash', 'check'];
    const paymentMethodLabels = {
      'bank_transfer': 'Bank Transfer',
      'paypal': 'PayPal',
      'stripe': 'Stripe',
      'cash': 'Cash',
      'check': 'Check'
    };
    
    const methodChoice = prompt(
      `💰 Select Payment Method\n\n` +
      `Supervisor: ${supervisor.name}\n` +
      `Month: ${currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}\n` +
      `Amount: €${supervisor.monthlySalary?.toLocaleString() || 0}\n\n` +
      `Available payment methods:\n` +
      `1 - Bank Transfer\n` +
      `2 - PayPal\n` +
      `3 - Stripe\n` +
      `4 - Cash\n` +
      `5 - Check\n\n` +
      `Enter number (1-5):`,
      '1'
    );
    
    if (!methodChoice || isNaN(Number(methodChoice)) || Number(methodChoice) < 1 || Number(methodChoice) > 5) {
      if (methodChoice !== null) {
        alert('❌ Please enter a valid number between 1-5.');
      }
      return;
    }
    
    const selectedMethod = paymentMethods[Number(methodChoice) - 1];
    const methodLabel = paymentMethodLabels[selectedMethod as keyof typeof paymentMethodLabels];
    
    const confirmed = window.confirm(
      `✅ Confirm Payment\n\n` +
      `Supervisor: ${supervisor.name}\n` +
      `Email: ${supervisor.email}\n` +
      `Month: ${currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}\n` +
      `Amount: €${supervisor.monthlySalary?.toLocaleString() || 0}\n` +
      `Payment Method: ${methodLabel}\n\n` +
      `Mark this payment as completed?`
    );
    
    if (confirmed) {
      try {
        const token = sessionStorage.getItem('accessToken');
        const requestBody = {
          supervisorId: String(supervisor.supervisorId), // Ensure it's a string
          month: currentMonth,
          year: currentYear,
          paymentMethod: selectedMethod
        };
        console.log('Payment request body:', requestBody);
        console.log('API URL:', `${process.env.REACT_APP_API_URL}/analytics/supervisor-payment`);
        
        const response = await fetch(`${process.env.REACT_APP_API_URL}/analytics/supervisor-payment`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });

        console.log('Payment response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Payment success response:', data);
          alert('✅ Payment Processed Successfully!\n\nThe salary payment has been marked as completed for the current month.');
          fetchSupervisorAnalytics();
        } else {
          let errorMessage = 'Failed to mark payment';
          let fullResponseText = '';
          
          try {
            const responseText = await response.text();
            fullResponseText = responseText;
            console.log('Full error response:', responseText);
            
            const errorData = JSON.parse(responseText);
            errorMessage = errorData.message || `Server responded with status ${response.status}`;
            
            // Provide helpful suggestions for common errors
            if (response.status === 400) {
              if (errorMessage.includes('required')) {
                errorMessage += '\n\n🔧 Debug: Some required fields may be missing from the request.';
              } else {
                errorMessage += '\n\n🔧 Debug: Invalid request data. Check console for details.';
              }
            } else if (errorMessage.includes('Supervisor salary record not found')) {
              errorMessage += '\n\n💡 Tip: Click the "Initialize" button first to create salary records for all supervisors.';
            }
          } catch (parseError) {
            console.log('Could not parse error response:', fullResponseText);
            errorMessage = `Server responded with status ${response.status}. Check console for details.`;
          }
          
          console.error('Payment marking error:', response.status, errorMessage);
          alert(`❌ ${errorMessage}`);
        }
      } catch (error) {
        console.error('Error marking payment:', error);
        alert('❌ Network error occurred while marking payment. Please try again.');
      }
    }
  };

  const handleSalaryPaymentToggle = async (supervisorId: string, monthIndex: number, currentStatus: boolean) => {
    try {
      const token = sessionStorage.getItem('accessToken');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/analytics/supervisor-salary-payment`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          supervisorId,
          monthIndex,
          paid: !currentStatus
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Payment toggle success:', data);
        fetchSupervisorAnalytics();
      } else {
        let errorMessage = 'Failed to update payment status';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (parseError) {
          errorMessage = `Server responded with status ${response.status}`;
        }
        console.error('Payment toggle error:', response.status, errorMessage);
        alert(`❌ ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error updating salary payment:', error);
      alert('❌ Network error occurred while updating payment status. Please try again.');
    }
  };

  const clearVideoAnalyticsData = async () => {
    const isConfirmed = window.confirm(
      '⚠️ WARNING: This will permanently delete ALL course video analytics data.\n\n' +
      'This includes video views, completion rates, and engagement metrics.\n\n' +
      'This action cannot be undone. Are you absolutely sure you want to proceed?'
    );
    
    if (!isConfirmed) return;
    
    try {
      const token = sessionStorage.getItem('accessToken');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/analytics/clear-video-analytics`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        alert(`✅ Success! Cleared video analytics data.`);
        
        // Refresh the analytics data
        if (activeTab === 'supervisors') {
          fetchSupervisorAnalytics();
        }
      } else {
        const error = await response.json();
        alert(`❌ Failed to clear video analytics data: ${error.message}`);
      }
    } catch (error) {
      console.error('Error clearing video analytics data:', error);
      alert('❌ Network error occurred while clearing data. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
            Analytics Dashboard
          </h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
        {/* Time Range Filter & Real-time Status */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8 border border-gray-100">
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-4">
              <span className="text-lg font-semibold text-gray-700">📅 Time Range:</span>
              <select 
                value={timeRange} 
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-6 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all font-semibold"
              >
                <option value="day">📅 Today</option>
                <option value="week">📊 This Week</option>
                <option value="month">📈 This Month</option>
                <option value="year">🗓️ This Year</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('students')}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'students'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500'
                }`}
              >
                <span>🎓</span>
                <span>Student Analysis</span>
              </button>
              <button
                onClick={() => setActiveTab('supervisors')}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'supervisors'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500'
                }`}
              >
                <span>👨‍🏫</span>
                <span>Supervisor Analysis</span>
              </button>
            </nav>
          </div>
        </div>

        {/* Content based on active tab */}

        {/* Student Analysis Tab */}
        {activeTab === 'students' && (
          <div className="space-y-8">
            {/* Student Result & Analysis Section */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 p-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-3xl font-bold text-white flex items-center">
                    Student Result & Analysis
                  </h2>
                  <button
                    onClick={clearTestData}
                    className="bg-transparent hover:bg-white hover:bg-opacity-20 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center space-x-1.5 border border-white border-opacity-30 hover:border-opacity-50"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                    <span>Clear Data</span>
                  </button>
                </div>
              </div>
              <div className="p-6">
                {/* Summary Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                  <div className="bg-blue-50 p-4 rounded-xl">
                    <h3 className="text-lg font-semibold text-blue-800 mb-2">Total Students</h3>
                    <p className="text-3xl font-bold text-blue-600">
                      {studentAnalytics?.results?.totalStudents || 0}
                    </p>
                    <p className="text-sm text-blue-600 mt-1">
                      +{studentAnalytics?.results?.newStudentsThisMonth || 0} this month
                    </p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-xl">
                    <h3 className="text-lg font-semibold text-green-800 mb-2">Active Students</h3>
                    <p className="text-3xl font-bold text-green-600">
                      {studentAnalytics?.results?.activeStudents || 0}
                    </p>
                    <p className="text-sm text-green-600 mt-1">
                      {studentAnalytics?.results?.totalStudents ? 
                        Math.round((studentAnalytics.results.activeStudents / studentAnalytics.results.totalStudents) * 100) : 0}% of total
                    </p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-xl">
                    <h3 className="text-lg font-semibold text-purple-800 mb-2">Completed Tests</h3>
                    <p className="text-3xl font-bold text-purple-600">
                      {assessmentReports?.tests?.length || 0}
                    </p>
                    <p className="text-sm text-purple-600 mt-1">Assessment results</p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-xl">
                    <h3 className="text-lg font-semibold text-orange-800 mb-2">Average Score</h3>
                    <p className="text-3xl font-bold text-orange-600">
                      {assessmentReports?.tests?.length ? 
                        Math.round(assessmentReports.tests.reduce((acc: number, test: any) => acc + test.score, 0) / assessmentReports.tests.length) : 0}%
                    </p>
                    <p className="text-sm text-orange-600 mt-1">Overall performance</p>
                  </div>
                </div>

                {/* Recently Registered Students */}
                <div className="bg-gray-50 rounded-xl p-6 mb-8">
                  <h3 className="text-xl font-bold mb-4">Recently Registered Students</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full bg-white rounded-lg overflow-hidden shadow-sm">
                      <thead>
                        <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                          <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Student</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Contact</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Registered</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Status</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Supervisor</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Course</th>
                        </tr>
                      </thead>
                      <tbody>
                        {studentAnalytics?.results?.recentStudents && studentAnalytics.results.recentStudents.length > 0 ? (
                          studentAnalytics.results.recentStudents.slice(0, 10).map((student: any, index: number) => (
                            <tr key={student.id || index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                              <td className="py-3 px-4">
                                <div className="flex items-center">
                                  <div className="w-10 h-10 rounded-full overflow-hidden mr-3">
                                    {student.profilePhoto ? (
                                      <img 
                                        src={student.profilePhoto} 
                                        alt={student.name} 
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          const target = e.target as HTMLImageElement;
                                          target.style.display = 'none';
                                          target.nextElementSibling?.setAttribute('style', 'display: flex');
                                        }}
                                      />
                                    ) : null}
                                    <div className="w-full h-full bg-blue-100 flex items-center justify-center" style={student.profilePhoto ? {display: 'none'} : {}}>
                                      <span className="text-sm font-semibold text-blue-600">
                                        {student.firstName ? student.firstName.charAt(0) : student.name?.charAt(0) || 'S'}
                                      </span>
                                    </div>
                                  </div>
                                  <div>
                                    <div className="font-medium text-gray-900">
                                      {student.firstName ? `${student.firstName} ${student.lastName}` : student.name || 'Unknown'}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="text-sm">
                                  <div className="font-medium text-gray-900">{student.email || 'No email'}</div>
                                  <div className="text-gray-500">{student.phone || 'No phone'}</div>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="text-sm">
                                  <div className="font-medium text-gray-900">
                                    {student.createdAt ? new Date(student.createdAt).toLocaleDateString() : 'Unknown'}
                                  </div>
                                  <div className="text-gray-500">
                                    {student.createdAt ? new Date(student.createdAt).toLocaleTimeString() : ''}
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                  student.isActive ? 'bg-green-100 text-green-800' : 
                                  student.emailVerified ? 'bg-yellow-100 text-yellow-800' : 
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {student.isActive ? 'Active' : 
                                   student.emailVerified ? 'Pending' : 
                                   'Inactive'}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <div className="text-sm">
                                  {student.supervisor ? (
                                    <span className="font-medium text-gray-700">{student.supervisor.name}</span>
                                  ) : (
                                    <span className="text-gray-400 italic">Not assigned</span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="text-sm">
                                  {student.course ? (
                                    <div>
                                      <div className="font-medium text-gray-900">{student.course.title}</div>
                                      <div className="text-gray-500">{student.course.level}</div>
                                    </div>
                                  ) : (
                                    <span className="text-gray-400 italic">No course</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="py-12 text-center">
                              <div className="flex flex-col items-center">
                                <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/>
                                </svg>
                                <p className="text-gray-500 font-medium">No recent student registrations</p>
                                <p className="text-gray-400 text-sm mt-1">New student registrations will appear here</p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Student Test Results & Performance Analysis */}
                {assessmentReports ? (
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="text-xl font-bold mb-4">Student Test Results & Performance Analysis</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full bg-white rounded-lg overflow-hidden shadow-sm">
                        <thead>
                          <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                            <th className="text-left py-4 px-4 font-semibold text-gray-700 text-sm">Rank</th>
                            <th className="text-left py-4 px-4 font-semibold text-gray-700 text-sm">Student</th>
                            <th className="text-left py-4 px-4 font-semibold text-gray-700 text-sm">Email</th>
                            <th className="text-left py-4 px-4 font-semibold text-gray-700 text-sm">Subject</th>
                            <th className="text-left py-4 px-4 font-semibold text-gray-700 text-sm">Supervisor</th>
                            <th className="text-left py-4 px-4 font-semibold text-gray-700 text-sm">Level</th>
                            <th className="text-center py-4 px-4 font-semibold text-gray-700 text-sm">Quiz Score</th>
                            <th className="text-center py-4 px-4 font-semibold text-gray-700 text-sm">Exam Score</th>
                            <th className="text-left py-4 px-4 font-semibold text-gray-700 text-sm">Report</th>
                            <th className="text-center py-4 px-4 font-semibold text-gray-700 text-sm">Certificate</th>
                            <th className="text-left py-4 px-4 font-semibold text-gray-700 text-sm">Date & Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {assessmentReports.tests?.map((test: any, index: number) => {
                            // Mock subject data - replace with actual subject from test data
                            const subject = test.subject || ['Grammar', 'Vocabulary', 'Listening', 'Reading', 'Writing'][Math.floor(Math.random() * 5)];
                            // Mock quiz and exam scores - replace with actual data structure
                            const quizScore = test.quizScore || Math.floor(test.score * 0.4 + Math.random() * 20);
                            const examScore = test.examScore || Math.floor(test.score * 0.6 + Math.random() * 20);
                            const totalScore = Math.round((quizScore + examScore) / 2);
                            
                            return (
                              <tr key={test.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                <td className="py-4 px-4">
                                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold text-sm">
                                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`}
                                  </div>
                                </td>
                                <td className="py-4 px-4">
                                  <button
                                    onClick={() => handleStudentClick(test.user)}
                                    className="font-semibold text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                                  >
                                    {test.user.firstName} {test.user.lastName}
                                  </button>
                                </td>
                                <td className="py-4 px-4 text-gray-600 font-medium text-sm">{test.user.email}</td>
                                <td className="py-4 px-4">
                                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                    subject === 'Grammar' ? 'bg-red-100 text-red-800' :
                                    subject === 'Vocabulary' ? 'bg-blue-100 text-blue-800' :
                                    subject === 'Listening' ? 'bg-green-100 text-green-800' :
                                    subject === 'Reading' ? 'bg-purple-100 text-purple-800' :
                                    'bg-orange-100 text-orange-800'
                                  }`}>
                                    {subject}
                                  </span>
                                </td>
                                <td className="py-4 px-4">
                                  <div className="flex items-center">
                                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center mr-2">
                                      <span className="text-xs font-semibold text-gray-600">
                                        {test.supervisorName ? test.supervisorName.charAt(0).toUpperCase() : 'N'}
                                      </span>
                                    </div>
                                    <span className="font-medium text-gray-700 text-sm">
                                      {test.supervisorName || 'Not Assigned'}
                                    </span>
                                  </div>
                                </td>
                                <td className="py-4 px-4">
                                  <div className="flex items-center space-x-1">
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                      test.step === 1 ? 'bg-green-100 text-green-800' :
                                      test.step === 2 ? 'bg-blue-100 text-blue-800' :
                                      'bg-purple-100 text-purple-800'
                                    }`}>
                                      Step {test.step}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      {test.step === 1 ? 'Basic' : test.step === 2 ? 'Int.' : 'Adv.'}
                                    </span>
                                  </div>
                                </td>
                                <td className="py-4 px-4 text-center">
                                  <div className="flex flex-col items-center">
                                    <span className={`text-lg font-bold ${
                                      quizScore >= 90 ? 'text-emerald-600' :
                                      quizScore >= 80 ? 'text-green-600' :
                                      quizScore >= 70 ? 'text-blue-600' :
                                      quizScore >= 60 ? 'text-yellow-600' :
                                      quizScore >= 50 ? 'text-orange-600' :
                                      'text-red-600'
                                    }`}>
                                      {quizScore}%
                                    </span>
                                    <div className="w-12 h-1 bg-gray-200 rounded-full overflow-hidden mt-1">
                                      <div 
                                        className={`h-full rounded-full ${
                                          quizScore >= 90 ? 'bg-emerald-500' :
                                          quizScore >= 80 ? 'bg-green-500' :
                                          quizScore >= 70 ? 'bg-blue-500' :
                                          quizScore >= 60 ? 'bg-yellow-500' :
                                          quizScore >= 50 ? 'bg-orange-500' :
                                          'bg-red-500'
                                        }`}
                                        style={{ width: `${Math.min(quizScore, 100)}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-4 px-4 text-center">
                                  <div className="flex flex-col items-center">
                                    <span className={`text-lg font-bold ${
                                      examScore >= 90 ? 'text-emerald-600' :
                                      examScore >= 80 ? 'text-green-600' :
                                      examScore >= 70 ? 'text-blue-600' :
                                      examScore >= 60 ? 'text-yellow-600' :
                                      examScore >= 50 ? 'text-orange-600' :
                                      'text-red-600'
                                    }`}>
                                      {examScore}%
                                    </span>
                                    <div className="w-12 h-1 bg-gray-200 rounded-full overflow-hidden mt-1">
                                      <div 
                                        className={`h-full rounded-full ${
                                          examScore >= 90 ? 'bg-emerald-500' :
                                          examScore >= 80 ? 'bg-green-500' :
                                          examScore >= 70 ? 'bg-blue-500' :
                                          examScore >= 60 ? 'bg-yellow-500' :
                                          examScore >= 50 ? 'bg-orange-500' :
                                          'bg-red-500'
                                        }`}
                                        style={{ width: `${Math.min(examScore, 100)}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-4 px-4">
                                  <button
                                    onClick={() => downloadTestPDF(test.id)}
                                    className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-3 py-1 rounded-lg text-xs font-medium shadow-sm hover:shadow-md transition-all duration-200 hover:from-green-600 hover:to-emerald-700 flex items-center space-x-1"
                                  >
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                                    </svg>
                                    <span>PDF</span>
                                  </button>
                                </td>
                                <td className="py-4 px-4 text-center">
                                  <div className="flex flex-col items-center">
                                    <span className={`px-3 py-1 rounded-full text-sm font-semibold shadow-sm border ${
                                      test.certificationLevel === 'Failed' ? 'bg-red-100 text-red-800 border-red-200' :
                                      test.certificationLevel === 'C2' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                                      test.certificationLevel === 'C1' ? 'bg-indigo-100 text-indigo-800 border-indigo-200' :
                                      test.certificationLevel === 'B2' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                                      test.certificationLevel === 'B1' ? 'bg-cyan-100 text-cyan-800 border-cyan-200' :
                                      test.certificationLevel === 'A2' ? 'bg-green-100 text-green-800 border-green-200' :
                                      'bg-yellow-100 text-yellow-800 border-yellow-200'
                                    }`}>
                                      {test.certificationLevel}
                                    </span>
                                    <div className="text-xs text-gray-600 mt-1 font-semibold">
                                      {totalScore}% Total
                                    </div>
                                  </div>
                                </td>
                                <td className="py-4 px-4">
                                  <div className="text-gray-700">
                                    <div className="font-semibold text-xs">{new Date(test.completedAt).toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric'
                                    })}</div>
                                    <div className="text-xs text-gray-500 mt-1">{new Date(test.completedAt).toLocaleTimeString('en-US', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      hour12: true
                                    })}</div>
                                  </div>
                                </td>
                              </tr>
                            );
                          }) || (
                            <tr>
                              <td colSpan={11} className="py-12 text-center">
                                <div className="flex flex-col items-center">
                                  <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                  </svg>
                                  <p className="text-gray-500 font-medium">No student exam data available</p>
                                  <p className="text-gray-400 text-sm mt-1">Student examination results will appear here once available</p>
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-gray-500">
                      {assessmentReports === null ? 'Loading student results...' : 'No student exam results found'}
                    </div>
                    <button 
                      onClick={fetchAssessmentReports}
                      className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
                    >
                      Reload Data
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Student Payment Analysis */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 p-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-3xl font-bold text-white flex items-center">
                    Payment & Revenue Analysis
                  </h2>
                  <button
                    onClick={clearPaymentData}
                    className="bg-transparent hover:bg-white hover:bg-opacity-20 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center space-x-1.5 border border-white border-opacity-30 hover:border-opacity-50"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                    <span>Clear Data</span>
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-green-50 p-4 rounded-xl">
                    <h3 className="text-lg font-semibold text-green-800 mb-2">Total Revenue</h3>
                    <p className="text-3xl font-bold text-green-600">
                      ${studentAnalytics?.payments?.totalRevenue?.toFixed(2) || '0.00'}
                    </p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-xl">
                    <h3 className="text-lg font-semibold text-blue-800 mb-2">Total Payments</h3>
                    <p className="text-3xl font-bold text-blue-600">
                      {studentAnalytics?.payments?.totalPayments || 0}
                    </p>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-xl">
                    <h3 className="text-lg font-semibold text-yellow-800 mb-2">Pending Payments</h3>
                    <p className="text-3xl font-bold text-yellow-600">
                      {studentAnalytics?.payments?.pendingPayments || 0}
                    </p>
                  </div>
                </div>


                {/* Recent Payment Receipts */}
                <div className="mt-6 bg-gray-50 rounded-xl p-6">
                  <h3 className="text-xl font-bold mb-4">Recent Payment Receipts</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">Student</th>
                          <th className="text-left py-2">Email</th>
                          <th className="text-left py-2">Course</th>
                          <th className="text-left py-2">Transaction ID</th>
                          <th className="text-left py-2">Amount</th>
                          <th className="text-left py-2">Method</th>
                          <th className="text-left py-2">Status</th>
                          <th className="text-left py-2">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {studentAnalytics?.payments?.recentPayments && studentAnalytics.payments.recentPayments.length > 0 ? (
                          studentAnalytics.payments.recentPayments.map((payment: any) => (
                            <tr key={payment._id} className="border-b hover:bg-gray-50">
                              <td className="py-2 font-medium">{payment.studentName}</td>
                              <td className="py-2 text-gray-600">{payment.email}</td>
                              <td className="py-2">
                                <div>
                                  <div className="font-medium">{payment.courseName}</div>
                                  <div className="text-sm text-gray-500">{payment.courseLevel}</div>
                                </div>
                              </td>
                              <td className="py-2 font-mono text-sm">{payment.transactionId}</td>
                              <td className="py-2 font-semibold">${payment.amount}</td>
                              <td className="py-2">
                                <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium capitalize">
                                  {payment.paymentMethod === 'card' ? 'Credit/Debit Card' :
                                   payment.paymentMethod === 'sepa_debit' ? 'SEPA Direct Debit' :
                                   payment.paymentMethod === 'sofort' ? 'Sofort Banking' :
                                   payment.paymentMethod === 'giropay' ? 'Giropay' :
                                   payment.paymentMethod === 'ideal' ? 'iDEAL' :
                                   payment.paymentMethod === 'bancontact' ? 'Bancontact' :
                                   payment.paymentMethod === 'eps' ? 'EPS' :
                                   payment.paymentMethod === 'p24' ? 'Przelewy24' :
                                   payment.paymentMethod === 'paypal' ? 'PayPal' :
                                   payment.paymentMethod === 'bkash' ? 'bKash' :
                                   payment.paymentMethod === 'nagad' ? 'Nagad' :
                                   payment.paymentMethod === 'rocket' ? 'Rocket' :
                                   payment.paymentMethod === 'upay' ? 'Upay' :
                                   payment.paymentMethod}
                                </span>
                              </td>
                              <td className="py-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  payment.status === 'completed' ? 'bg-green-100 text-green-800' :
                                  payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                  payment.status === 'failed' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {payment.status}
                                </span>
                              </td>
                              <td className="py-2 text-sm">
                                {payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString() : 'N/A'}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={8} className="py-4 text-center text-gray-500">No recent payment data available</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Supervisor Analysis Tab */}
        {activeTab === 'supervisors' && (
          <div className="space-y-8">
            {/* Supervisor Salary Information */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 p-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-3xl font-bold text-white flex items-center">
                    Supervisor Salary & Compensation
                  </h2>
                  <div className="flex space-x-3">
                    <button
                      onClick={initializeSupervisorSalaries}
                      className="bg-transparent hover:bg-white hover:bg-opacity-20 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center space-x-1.5 border border-white border-opacity-30 hover:border-opacity-50"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                      </svg>
                      <span>Initialize</span>
                    </button>
                    <button
                      onClick={clearSupervisorSalaryData}
                      className="bg-transparent hover:bg-white hover:bg-opacity-20 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center space-x-1.5 border border-white border-opacity-30 hover:border-opacity-50"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                      </svg>
                      <span>Clear Data</span>
                    </button>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                  <div className="bg-purple-50 p-4 rounded-xl">
                    <h3 className="text-lg font-semibold text-purple-800 mb-2">Total Supervisors</h3>
                    <p className="text-3xl font-bold text-purple-600">
                      {supervisorAnalytics?.salary?.totalSupervisors || 0}
                    </p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-xl">
                    <h3 className="text-lg font-semibold text-green-800 mb-2">Total Salary Paid</h3>
                    <p className="text-3xl font-bold text-green-600">
                      €{supervisorAnalytics?.salary?.totalSalaryPaid?.toFixed(2) || '0.00'}
                    </p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-xl">
                    <h3 className="text-lg font-semibold text-blue-800 mb-2">Average Salary</h3>
                    <p className="text-3xl font-bold text-blue-600">
                      €{supervisorAnalytics?.salary?.averageSalary?.toFixed(2) || '0.00'}
                    </p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-xl">
                    <h3 className="text-lg font-semibold text-orange-800 mb-2">Active Supervisors</h3>
                    <p className="text-3xl font-bold text-orange-600">
                      {supervisorAnalytics?.salary?.activeSupervisors || 0}
                    </p>
                  </div>
                </div>

                {/* Supervisor Salary Details */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-xl font-bold mb-4">Supervisor Salary Breakdown</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full bg-white rounded-lg overflow-hidden shadow-sm">
                      <thead>
                        <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                          <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Name</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Email</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Course</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Salary</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Joined</th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700 text-sm">Jan</th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700 text-sm">Feb</th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700 text-sm">Mar</th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700 text-sm">Apr</th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700 text-sm">May</th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700 text-sm">Jun</th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700 text-sm">Jul</th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700 text-sm">Aug</th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700 text-sm">Sep</th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700 text-sm">Oct</th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700 text-sm">Nov</th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700 text-sm">Dec</th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700 text-sm">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {supervisorAnalytics?.salary?.supervisorDetails && supervisorAnalytics.salary.supervisorDetails.length > 0 ? (
                          supervisorAnalytics.salary.supervisorDetails.map((supervisor: any, index: number) => (
                            <tr key={supervisor.supervisorId || index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                              <td className="py-3 px-4">
                                <div className="font-medium text-gray-900">
                                  {supervisor.name || 'Unknown'}
                                </div>
                              </td>
                              <td className="py-3 px-4 text-gray-600">{supervisor.email || 'No email'}</td>
                              <td className="py-3 px-4">
                                <div className="text-sm">
                                  {supervisor.assignedCourses && supervisor.assignedCourses.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {supervisor.assignedCourses.map((course: any, courseIndex: number) => (
                                        <span key={courseIndex} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                          {course.title}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-gray-400 italic">No course assigned</span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <span className="font-semibold text-green-600">€{supervisor.monthlySalary || 0}</span>
                              </td>
                              <td className="py-3 px-4">
                                <div className="text-sm">
                                  <div className="font-medium text-gray-900">
                                    {supervisor.joinedAt ? new Date(supervisor.joinedAt).toLocaleDateString() : 'Not available'}
                                  </div>
                                  <div className="text-gray-500">
                                    {supervisor.joinedAt ? new Date(supervisor.joinedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                  </div>
                                </div>
                              </td>
                              {/* Monthly payment status columns */}
                              {Array.from({ length: 12 }, (_, monthIndex) => {
                                const monthPayment = supervisor.monthlyPayments?.[monthIndex];
                                const isPaid = monthPayment?.paid;
                                return (
                                  <td key={monthIndex} className="py-3 px-4 text-center">
                                    <button
                                      onClick={() => handleSalaryPaymentToggle(supervisor.supervisorId, monthIndex, isPaid)}
                                      className={`w-6 h-6 rounded-md border-2 transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                        isPaid 
                                          ? 'bg-green-500 border-green-500 text-white hover:bg-green-600' 
                                          : 'bg-white border-gray-300 text-gray-400 hover:border-gray-400'
                                      }`}
                                      title={`${isPaid ? '✅ Paid' : '⏳ Pending'} - ${new Date(2024, monthIndex).toLocaleDateString('en-US', { month: 'long' })} ${new Date().getFullYear()}\n${isPaid ? 'Click to mark as unpaid' : 'Click to mark as paid'}\nAmount: €${supervisor.monthlySalary?.toLocaleString() || 0}`}
                                    >
                                      {isPaid ? '✓' : ''}
                                    </button>
                                  </td>
                                );
                              })}
                              <td className="py-3 px-4 text-center">
                                <div className="flex space-x-1 justify-center">
                                  <button 
                                    onClick={() => handlePaySupervisor(supervisor)}
                                    className="text-green-600 hover:text-green-800 bg-green-50 px-2 py-1 rounded text-xs font-medium transition-colors"
                                    title="Mark current month as paid"
                                  >
                                    Pay
                                  </button>
                                  <button 
                                    onClick={() => handleEditSupervisor(supervisor)}
                                    className="text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded text-xs font-medium transition-colors"
                                    title="Edit salary amount"
                                  >
                                    Edit
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={18} className="py-12 text-center">
                              <div className="flex flex-col items-center">
                                <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
                                </svg>
                                <p className="text-gray-500 font-medium">No supervisor salary data available</p>
                                <p className="text-gray-400 text-sm mt-1">Supervisor compensation information will appear here once available</p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* Course Video Analytics */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 p-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-3xl font-bold text-white flex items-center">
                    Course Video Analytics
                  </h2>
                  <button
                    onClick={clearVideoAnalyticsData}
                    className="bg-transparent hover:bg-white hover:bg-opacity-20 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center space-x-1.5 border border-white border-opacity-30 hover:border-opacity-50"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                    <span>Clear Data</span>
                  </button>
                </div>
              </div>
              <div className="p-6">
                {/* Loading state */}
                {!supervisorAnalytics?.videos ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                      <p className="text-gray-500 font-medium">Loading video analytics...</p>
                      <p className="text-gray-400 text-sm mt-1">Please wait while we gather the data</p>
                    </div>
                  </div>
                ) : (
                <React.Fragment>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                  <div className="bg-orange-50 p-4 rounded-xl">
                    <h3 className="text-lg font-semibold text-orange-800 mb-2">Total Videos</h3>
                    <p className="text-3xl font-bold text-orange-600">
                      {supervisorAnalytics?.videos?.totalVideos || 0}
                    </p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-xl">
                    <h3 className="text-lg font-semibold text-green-800 mb-2">Approved Videos</h3>
                    <p className="text-3xl font-bold text-green-600">
                      {supervisorAnalytics?.videos?.approvedVideos || 0}
                    </p>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-xl">
                    <h3 className="text-lg font-semibold text-yellow-800 mb-2">Pending Review</h3>
                    <p className="text-3xl font-bold text-yellow-600">
                      {supervisorAnalytics?.videos?.pendingVideos || 0}
                    </p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-xl">
                    <h3 className="text-lg font-semibold text-blue-800 mb-2">Total Duration</h3>
                    <p className="text-3xl font-bold text-blue-600">
                      {supervisorAnalytics?.videos?.totalDuration || 0}h
                    </p>
                  </div>
                </div>

                {/* Video Status Distribution */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="text-xl font-bold mb-4">Video Status Distribution</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Approved</span>
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                          {supervisorAnalytics?.videos?.statusDistribution?.approved || 0}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Pending</span>
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                          {supervisorAnalytics?.videos?.statusDistribution?.pending || 0}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Rejected</span>
                        <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-sm">
                          {supervisorAnalytics?.videos?.statusDistribution?.rejected || 0}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="text-xl font-bold mb-4">Upload Trends</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">This Week</span>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                          {supervisorAnalytics?.videos?.uploadTrends?.thisWeek || 0}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium">This Month</span>
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                          {supervisorAnalytics?.videos?.uploadTrends?.thisMonth || 0}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium">This Year</span>
                        <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm">
                          {supervisorAnalytics?.videos?.uploadTrends?.thisYear || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Top Contributing Supervisors */}
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                  <div className="bg-gradient-to-l from-red-500 via-yellow-500 to-green-500 p-6">
                    <h3 className="text-2xl font-bold text-white flex items-center">
                      Top Contributing Supervisors
                    </h3>
                  </div>
                  <div className="p-6">
                    <div className="overflow-x-auto">
                      <table className="min-w-full bg-white rounded-lg overflow-hidden shadow-sm">
                        <thead>
                          <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                            <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Rank</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Supervisor</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Contact</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Joined</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Courses</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Videos</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Approved</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Duration</th>
                            <th className="text-center py-3 px-4 font-semibold text-gray-700 text-sm">Approval Rate</th>
                          </tr>
                        </thead>
                      <tbody>
                        {supervisorAnalytics?.videos?.topSupervisors && supervisorAnalytics.videos.topSupervisors.length > 0 ? (
                          supervisorAnalytics.videos.topSupervisors.map((supervisor: any, index: number) => (
                            <tr key={supervisor._id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                              <td className="py-3 px-4">
                                <div className="flex items-center justify-center text-2xl">
                                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="font-medium text-gray-900">
                                  {supervisor.firstName && supervisor.lastName ? 
                                    `${supervisor.firstName} ${supervisor.lastName}` : 
                                    supervisor.name || 'Unknown Supervisor'
                                  }
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="text-sm">
                                  <div className="font-medium text-gray-900">{supervisor.email}</div>
                                  <div className="text-gray-500">{supervisor.phone || supervisor.phoneNumber || 'No phone'}</div>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="text-sm">
                                  <div className="font-medium text-gray-900">
                                    {supervisor.joinedAt || supervisor.createdAt ? 
                                      new Date(supervisor.joinedAt || supervisor.createdAt).toLocaleDateString() : 
                                      'Not available'
                                    }
                                  </div>
                                  <div className="text-gray-500">
                                    {supervisor.joinedAt || supervisor.createdAt ? 
                                      new Date(supervisor.joinedAt || supervisor.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 
                                      ''
                                    }
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="text-sm">
                                  {supervisor.assignedCourses && supervisor.assignedCourses.length > 0 ? (
                                    <div>
                                      <div className="font-medium text-gray-900">{supervisor.assignedCourses[0].title || supervisor.assignedCourses[0].name}</div>
                                      {supervisor.assignedCourses.length > 1 && (
                                        <div className="text-gray-500">+{supervisor.assignedCourses.length - 1} more</div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="font-medium text-gray-900">{supervisor.totalCourses || 0} courses</div>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="font-medium text-gray-900">
                                  {supervisor.totalVideos || 0}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="font-medium text-gray-900">
                                  {supervisor.approvedVideos || 0}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="font-medium text-gray-900">
                                  {Math.round((supervisor.totalDuration || 0) / 60)}m
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <div className="flex items-center justify-center">
                                  <div className={`px-4 py-2 rounded text-sm font-bold shadow-md ${
                                    (supervisor.approvalRate || 0) >= 80 ? 'bg-green-100 text-green-800' :
                                    (supervisor.approvalRate || 0) >= 60 ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                  }`}>
                                    {(supervisor.approvalRate || 0).toFixed(1)}%
                                    {(supervisor.approvalRate || 0) >= 80 ? '🏆' : (supervisor.approvalRate || 0) >= 60 ? '👍' : '⚠️'}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={7} className="py-8 text-center">
                              <div className="flex flex-col items-center">
                                <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                                </svg>
                                <p className="text-gray-500">No supervisor data available</p>
                                <p className="text-gray-400 text-sm mt-1">Data will appear here once supervisors upload videos</p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

                {/* Recent Video Uploads */}
                <div className="mt-8 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                  <div className="bg-gradient-to-l from-red-500 via-yellow-500 to-green-500 p-6">
                    <h3 className="text-2xl font-bold text-white flex items-center">
                      Recent Video Uploads
                    </h3>
                  </div>
                  <div className="p-4">
                    {supervisorAnalytics?.videos?.recentUploads && supervisorAnalytics.videos.recentUploads.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="min-w-full bg-white rounded-lg overflow-hidden shadow-sm">
                          <thead>
                            <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                              <th className="text-left py-2 px-3 font-semibold text-gray-700 text-sm">Video Title</th>
                              <th className="text-left py-2 px-3 font-semibold text-gray-700 text-sm">Supervisor</th>
                              <th className="text-left py-2 px-3 font-semibold text-gray-700 text-sm">Course</th>
                              <th className="text-left py-2 px-3 font-semibold text-gray-700 text-sm">Duration</th>
                              <th className="text-left py-2 px-3 font-semibold text-gray-700 text-sm">Status</th>
                              <th className="text-left py-2 px-3 font-semibold text-gray-700 text-sm">Upload Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {supervisorAnalytics.videos.recentUploads.slice(0, 8).map((video: any) => (
                              <tr key={video._id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                <td className="py-2 px-3">
                                  <div className="font-medium text-gray-900 text-sm" title={video.title}>
                                    {video.title.length > 40 ? `${video.title.substring(0, 40)}...` : video.title}
                                  </div>
                                </td>
                                <td className="py-2 px-3 text-sm text-gray-600">
                                  {video.uploaderName || 'Unknown'}
                                </td>
                                <td className="py-2 px-3 text-sm text-gray-600">
                                  {video.courseName || 'Unknown Course'}
                                </td>
                                <td className="py-2 px-3 text-sm text-gray-600">
                                  {Math.round((video.duration || 0) / 60)}min
                                </td>
                                <td className="py-2 px-3">
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    video.status === 'approved' ? 'bg-green-100 text-green-800' :
                                    video.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                  }`}>
                                    {video.status === 'approved' ? '✅' : video.status === 'pending' ? '⏳' : '❌'}
                                    {video.status.charAt(0).toUpperCase() + video.status.slice(1)}
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-sm text-gray-600">
                                  {new Date(video.createdAt).toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric',
                                    year: '2-digit'
                                  })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-16">
                        <div className="mb-6">
                          <svg className="w-20 h-20 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                          </svg>
                        </div>
                        <h4 className="text-xl font-bold text-gray-500 mb-2">No Recent Uploads</h4>
                        <p className="text-gray-400 max-w-sm mx-auto">
                          Recent supervisor video uploads will appear here once content is submitted for review
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                </React.Fragment>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Student Details Popup */}
        {showStudentPopup && selectedStudent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold">
                      {selectedStudent.firstName} {selectedStudent.lastName}
                    </h2>
                    <p className="text-blue-100">{selectedStudent.email}</p>
                  </div>
                  <button
                    onClick={() => setShowStudentPopup(false)}
                    className="text-white hover:text-gray-200 text-2xl"
                  >
                    ×
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-4">Assessment History</h3>
                {selectedStudent.tests && selectedStudent.tests.length > 0 ? (
                  <div className="space-y-4">
                    {selectedStudent.tests.map((test: any) => (
                      <div key={test.id} className="border border-gray-200 rounded-xl p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-semibold text-lg">Step {test.step} Assessment</h4>
                            <p className="text-sm text-gray-600">
                              Completed on {new Date(test.completedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className={`text-2xl font-bold ${
                              test.score >= 75 ? 'text-green-600' : 
                              test.score >= 50 ? 'text-yellow-600' : 
                              'text-red-600'
                            }`}>
                              {test.score}%
                            </div>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              test.certificationLevel === 'Failed' ? 'bg-red-100 text-red-800' :
                              test.certificationLevel === 'C2' ? 'bg-purple-100 text-purple-800' :
                              test.certificationLevel === 'C1' ? 'bg-indigo-100 text-indigo-800' :
                              test.certificationLevel === 'B2' ? 'bg-blue-100 text-blue-800' :
                              test.certificationLevel === 'B1' ? 'bg-cyan-100 text-cyan-800' :
                              test.certificationLevel === 'A2' ? 'bg-green-100 text-green-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {test.certificationLevel}
                            </span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <p className="text-sm text-gray-600">Questions</p>
                            <p className="font-semibold">{test.questionsAttempted}</p>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <p className="text-sm text-gray-600">Correct</p>
                            <p className="font-semibold text-green-600">{test.correctAnswers}</p>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <p className="text-sm text-gray-600">Accuracy</p>
                            <p className="font-semibold">
                              {Math.round((test.correctAnswers / test.questionsAttempted) * 100)}%
                            </p>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <p className="text-sm text-gray-600">Time</p>
                            <p className="font-semibold">
                              {test.totalCompletionTime ? 
                                `${Math.floor(test.totalCompletionTime / 60)}m ${test.totalCompletionTime % 60}s` : 
                                'N/A'
                              }
                            </p>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => downloadTestPDF(test.id)}
                          className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 px-4 rounded-lg font-medium shadow-md hover:shadow-lg transition-all"
                        >
                          Download Detailed PDF Report
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">No assessment data available for this student.</p>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
      
      {/* Bottom spacing for scroll */}
      <div className="pb-20"></div>
    </div>
  );
};

export default AnalyticsDashboard;