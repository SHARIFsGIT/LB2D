import jsPDF from "jspdf";
import React, { useCallback, useEffect, useState } from "react";
import { useCurrency } from "../hooks/useCurrency";
import { NotificationData, useWebSocket } from "../hooks/useWebSocket";

const AnalyticsDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"students" | "supervisors">(
    "students"
  );
  const [studentAnalytics, setStudentAnalytics] = useState<any>(null);
  const [supervisorAnalytics, setSupervisorAnalytics] = useState<any>(null);
  const [assessmentReports, setAssessmentReports] = useState<any>(null);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [showStudentPopup, setShowStudentPopup] = useState(false);
  const [realTimeUpdates, setRealTimeUpdates] = useState<NotificationData[]>(
    []
  );
  const [lastUpdate, setLastUpdate] = useState<string>("");

  // Currency conversion hook
  const { convertEuroToTaka } = useCurrency();

  // Combine assessment and quiz data for display
  const getCombinedStudentResults = () => {
    if (!assessmentReports) return [];

    const studentResults: { [key: string]: any } = {};

    // Create a map of student enrollments for quick lookup
    const studentEnrollmentMap: { [key: string]: any } = {};
    if (assessmentReports.enrollments) {
      assessmentReports.enrollments.forEach((enrollment: any) => {
        const studentId = enrollment.userId?._id || enrollment.userId;
        if (!studentEnrollmentMap[studentId]) {
          studentEnrollmentMap[studentId] = [];
        }
        studentEnrollmentMap[studentId].push(enrollment);
      });
    }

    // Process assessment test results
    assessmentReports.tests?.forEach((test: any) => {
      const studentId = test.userId?._id;
      const studentKey = `${studentId}`;

      if (!studentResults[studentKey]) {
        studentResults[studentKey] = {
          student: test.userId,
          testScores: [],
          quizScores: [],
          assessments: [],
          quizzes: [],
          latestDate: test.completedAt,
          courses: new Set(), // Track unique courses
          enrollments: studentEnrollmentMap[studentId] || []
        };
      }

      studentResults[studentKey].testScores.push(test.score);
      studentResults[studentKey].assessments.push(test);

      if (new Date(test.completedAt) > new Date(studentResults[studentKey].latestDate)) {
        studentResults[studentKey].latestDate = test.completedAt;
      }
    });

    // Process quiz results
    assessmentReports.quizzes?.forEach((quiz: any) => {
      const studentId = quiz.studentId?._id;
      const studentKey = `${studentId}`;

      if (!studentResults[studentKey]) {
        studentResults[studentKey] = {
          student: quiz.studentId,
          testScores: [],
          quizScores: [],
          assessments: [],
          quizzes: [],
          latestDate: quiz.submittedAt,
          courses: new Set(),
          enrollments: studentEnrollmentMap[studentId] || []
        };
      }

      studentResults[studentKey].quizScores.push(quiz.percentage);
      studentResults[studentKey].quizzes.push(quiz);

      // Extract course information from quiz data - check multiple possible paths
      let courseData = null;

      // Check if courseId is populated
      if (quiz.quizId?.courseId) {
        if (typeof quiz.quizId.courseId === 'object') {
          courseData = {
            id: quiz.quizId.courseId._id,
            title: quiz.quizId.courseId.title || 'Course',
            level: quiz.quizId.courseId.level || 'N/A'
          };
        }
      }

      // Check if course info is directly on the quiz
      if (!courseData && quiz.courseId) {
        if (typeof quiz.courseId === 'object') {
          courseData = {
            id: quiz.courseId._id,
            title: quiz.courseId.title || 'Course',
            level: quiz.courseId.level || 'N/A'
          };
        }
      }

      if (courseData) {
        studentResults[studentKey].courses.add(JSON.stringify(courseData));
      }

      if (new Date(quiz.submittedAt) > new Date(studentResults[studentKey].latestDate)) {
        studentResults[studentKey].latestDate = quiz.submittedAt;
      }
    });

    // Convert to array and calculate averages
    return Object.values(studentResults).map((result: any) => {
      const studentId = result.student?._id;
      
      // Find course progress for this student from studentAnalytics.progress
      const studentProgress = Array.isArray(studentAnalytics?.progress) 
        ? studentAnalytics.progress.find(
            (progress: any) => progress.student?._id === studentId || progress.studentId === studentId
          )
        : null;

      // Find student enrollment information
      const studentEnrollmentInfo = studentAnalytics?.results?.recentStudents?.find(
        (s: any) => s._id === studentId || s.id === studentId
      );
      
      // Get course information from multiple sources
      let courseInfo = null;

      // Priority 1: Check enrollments from studentEnrollmentInfo
      if (studentEnrollmentInfo?.enrollments?.length > 0) {
        const enrollment = studentEnrollmentInfo.enrollments[0];
        courseInfo = {
          title: enrollment.courseId?.title || enrollment.courseName || 'Course',
          level: enrollment.courseId?.level || enrollment.courseLevel || 'N/A'
        };
      }
      // Priority 2: Check stored enrollments in result
      else if (result.enrollments?.length > 0) {
        const enrollment = result.enrollments[0];
        courseInfo = {
          title: enrollment.courseName || enrollment.courseId?.title || 'Course',
          level: enrollment.courseLevel || enrollment.courseId?.level || 'N/A'
        };
      }
      // Priority 3: Use course info from quiz data
      else if (result.courses.size > 0) {
        const courseSet = Array.from(result.courses);
        if (courseSet.length > 0 && typeof courseSet[0] === 'string') {
          try {
            const firstCourse = JSON.parse(courseSet[0]);
            courseInfo = {
              title: firstCourse.title,
              level: firstCourse.level
            };
          } catch (error) {
            console.warn('Error parsing course info from quiz data:', error);
          }
        }
      }

      // Priority 4: Check if student object has enrollments directly
      if (!courseInfo && result.student?.enrollments?.length > 0) {
        const enrollment = result.student.enrollments[0];
        courseInfo = {
          title: enrollment.courseName || enrollment.courseId?.title || 'Course',
          level: enrollment.courseLevel || enrollment.courseId?.level || 'N/A'
        };
      }

      // Priority 5: Fetch from API if we have student ID but no enrollment info
      // For now, we'll show "Not Enrolled" if no course info found
      if (!courseInfo) {
        // Course info not found for this student
      }
      
      return {
        ...result,
        // Use enrollment info if available (same data as "Recently Registered Students")
        student: studentEnrollmentInfo || result.student,
        courseInfo,
        avgTestScore: result.testScores.length > 0 
          ? Math.round(result.testScores.reduce((a: number, b: number) => a + b, 0) / result.testScores.length)
          : null,
        avgQuizScore: result.quizScores.length > 0
          ? Math.round(result.quizScores.reduce((a: number, b: number) => a + b, 0) / result.quizScores.length)
          : null,
        totalAssessments: result.testScores.length + result.quizScores.length,
        courseProgress: studentProgress?.progress || studentProgress?.completionPercentage || 0,
        coursesCount: result.courses.size
      };
    }).sort((a, b) => {
      // Sort by combined average score
      const aTotal = (a.avgTestScore || 0) + (a.avgQuizScore || 0);
      const bTotal = (b.avgTestScore || 0) + (b.avgQuizScore || 0);
      return bTotal - aTotal;
    });
  };

  // Format currency with both EUR and BDT
  const formatDualCurrencyDisplay = (
    euroAmount: number,
    singleLine: boolean = false
  ) => {
    const takaAmount = convertEuroToTaka(euroAmount);

    if (singleLine) {
      return (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1">
            <span className="text-2xl">€</span>
            <span className="text-2xl font-bold">{euroAmount.toFixed(2)}</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="text-xl">৳</span>
            <span className="text-xl font-semibold">
              {takaAmount.toLocaleString()}
            </span>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-1">
        <div className="flex items-center space-x-1">
          <span className="text-lg">€</span>
          <span className="font-semibold">{euroAmount.toFixed(2)}</span>
        </div>
        <div className="flex items-center space-x-1 text-sm opacity-75">
          <span className="text-base">৳</span>
          <span>{takaAmount.toLocaleString()}</span>
        </div>
      </div>
    );
  };

  const fetchStudentAnalytics = useCallback(async () => {
    try {
      const token = sessionStorage.getItem("accessToken");

      const [testsRes, certificatesRes, paymentsRes, progressRes, studentsRes] =
        await Promise.all([
          fetch(
            `${process.env.REACT_APP_API_URL}/analytics/student-results`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          ),
          fetch(
            `${process.env.REACT_APP_API_URL}/analytics/student-certificates`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          ),
          fetch(
            `${process.env.REACT_APP_API_URL}/analytics/student-payments`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          ),
          fetch(
            `${process.env.REACT_APP_API_URL}/analytics/student-progress`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          ),
          fetch(
            `${process.env.REACT_APP_API_URL}/analytics/recent-students?limit=20&showAllEnrolled=true`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          ),
        ]);

      const [tests, certificates, payments, progress, students] =
        await Promise.all([
          testsRes.ok ? testsRes.json() : { data: null },
          certificatesRes.ok ? certificatesRes.json() : { data: null },
          paymentsRes.ok ? paymentsRes.json() : { data: null },
          progressRes.ok ? progressRes.json() : { data: null },
          studentsRes.ok ? studentsRes.json() : { data: null },
        ]);

      // Merge the results data with student analytics
      const mergedResults = {
        ...tests.data,
        recentStudents: students.data?.students || [],
        totalStudents: students.data?.totalStudents || 0,
        activeStudents: students.data?.activeStudents || 0,
        newStudentsThisMonth: students.data?.newStudentsThisMonth || 0,
      };

      setStudentAnalytics({
        results: mergedResults,
        certificates: certificates.data,
        payments: payments.data,
        progress: progress.data,
      });
    } catch (error) {
      console.error("Failed to fetch student analytics:", error);
      setStudentAnalytics({
        results: null,
        certificates: null,
        payments: null,
        progress: null,
      });
    }
  }, []);

  const fetchSupervisorAnalytics = useCallback(async () => {
    try {
      const token = sessionStorage.getItem("accessToken");

      const [salaryRes, videosRes] = await Promise.all([
        fetch(
          `${process.env.REACT_APP_API_URL}/analytics/supervisor-salary`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        ),
        fetch(
          `${process.env.REACT_APP_API_URL}/analytics/supervisor-videos`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        ),
      ]);

      const [salary, videos] = await Promise.all([
        salaryRes.ok ? salaryRes.json() : { data: null },
        videosRes.ok ? videosRes.json() : { data: null },
      ]);

      setSupervisorAnalytics({
        salary: salary.data,
        videos: videos.data,
      });
    } catch (error) {
      console.error("Failed to fetch supervisor analytics:", error);
      setSupervisorAnalytics({
        salary: null,
        videos: null,
      });
    }
  }, []);

  const fetchAssessmentReports = useCallback(async () => {
    try {
      const token = sessionStorage.getItem("accessToken");

      // Fetch assessment tests, quiz attempts, and enrollments
      const [testsResponse, quizAttemptsResponse, enrollmentsResponse] = await Promise.all([
        fetch(
          `${process.env.REACT_APP_API_URL}/tests/admin/reports?limit=200`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        ),
        fetch(
          `${process.env.REACT_APP_API_URL}/quizzes/admin/all-attempts`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        ),
        fetch(
          `${process.env.REACT_APP_API_URL}/enrollments`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        )
      ]);

      let combinedData: any = { tests: [], quizzes: [], enrollments: [] };

      // Process assessment test data
      if (testsResponse.ok) {
        const testData = await testsResponse.json();
        combinedData.tests = testData.data?.tests || [];
      } else {
        console.error('❌ Failed to fetch tests:', testsResponse.statusText);
      }

      // Process quiz attempts data
      if (quizAttemptsResponse.ok) {
        const quizData = await quizAttemptsResponse.json();
        combinedData.quizzes = quizData.data || [];
      } else {
        console.error('❌ Failed to fetch quiz attempts:', quizAttemptsResponse.statusText);
      }

      // Process enrollments data
      if (enrollmentsResponse.ok) {
        const enrollmentsData = await enrollmentsResponse.json();
        combinedData.enrollments = enrollmentsData.data || [];
      } else {
        console.error('❌ Failed to fetch enrollments:', enrollmentsResponse.statusText);
      }

      setAssessmentReports(combinedData);
    } catch (error) {
      console.error("❌ Failed to fetch assessment and quiz reports:", error);
      setAssessmentReports({ tests: [], quizzes: [], enrollments: [] });
    }
  }, []);

  // Handle real-time notifications
  const handleNotification = useCallback(
    (notification: NotificationData) => {
      // Check if it's a user registration, enrollment, assessment, or video comment notification
      if (
        (notification.type === "admin" &&
          notification.title.includes("Registration")) ||
        notification.type === "user_registration" ||
        notification.type === "enrollment" ||
        notification.type === "student_action" ||
        notification.type === "assessment" ||
        notification.type === "video_comment"
      ) {
        // Add to real-time updates
        setRealTimeUpdates((prev) => [notification, ...prev.slice(0, 9)]); // Keep last 10
        setLastUpdate(new Date().toLocaleTimeString());

        // Refresh analytics data for registration, enrollment, and assessment notifications
        if (notification.type !== "video_comment") {
          if (activeTab === "students") {
            fetchStudentAnalytics();
            // Also refresh assessment reports when a student completes an assessment
            if (notification.type === "assessment") {
              fetchAssessmentReports();
            }
          } else if (activeTab === "supervisors") {
            fetchSupervisorAnalytics();
          }
        }
      }
    },
    [activeTab, fetchStudentAnalytics, fetchAssessmentReports, fetchSupervisorAnalytics]
  );

  // WebSocket connection
  const { isConnected, subscribe } = useWebSocket({
    onNotification: handleNotification,
    onConnect: () => {
      // Subscribe to admin notifications
      subscribe(["admin", "user-management", "general"]);
    },
  });

  // Effect to fetch data when timeRange or activeTab changes
  useEffect(() => {
    if (activeTab === "students") {
      fetchStudentAnalytics();
      fetchAssessmentReports();
    } else if (activeTab === "supervisors") {
      fetchSupervisorAnalytics();
    }
  }, [activeTab, fetchStudentAnalytics, fetchAssessmentReports, fetchSupervisorAnalytics]);

  const downloadTestPDF = async (testId: string) => {
    try {
      const token = sessionStorage.getItem("accessToken");
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/tests/admin/details/${testId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        // Create PDF content
        const testData = data.data;
        const pdfContent = generateTestReportPDF(testData);

        // Create and download PDF
        const blob = new Blob([pdfContent], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `test-report-${testData.user.firstName}-${testData.user.lastName}-${testData.step}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Failed to download test report:", error);
      alert("Failed to download test report");
    }
  };

  const downloadCompleteStudentReport = (student: any) => {
    const studentName = student.student?.firstName && student.student?.lastName
      ? `${student.student.firstName} ${student.student.lastName}`
      : student.student?.name || 'Student';

    const email = student.student?.email || 'N/A';
    const phone = student.student?.phone || 'N/A';

    const avgTestScore = student.avgTestScore || 0;
    const avgQuizScore = student.avgQuizScore || 0;
    const courseProgress = student.courseProgress || 0;

    const totalAssessments = student.testScores?.length || 0;
    const totalQuizzes = student.quizScores?.length || 0;

    const latestActivity = student.latestDate
      ? new Date(student.latestDate).toLocaleString("en-US", {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        })
      : 'N/A';

    // Create PDF
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - (2 * margin);
    let yPosition = 20;

    // Helper function to add text with automatic page breaks
    const addText = (text: string, x: number, fontSize: number = 10, isBold: boolean = false) => {
      if (yPosition > pageHeight - 20) {
        pdf.addPage();
        yPosition = 20;
      }
      pdf.setFontSize(fontSize);
      if (isBold) {
        pdf.setFont("helvetica", "bold");
      } else {
        pdf.setFont("helvetica", "normal");
      }

      const lines = pdf.splitTextToSize(text, contentWidth);
      lines.forEach((line: string) => {
        if (yPosition > pageHeight - 20) {
          pdf.addPage();
          yPosition = 20;
        }
        pdf.text(line, x, yPosition);
        yPosition += fontSize * 0.5;
      });
    };

    // Helper function to add a section header
    const addSectionHeader = (text: string) => {
      yPosition += 5;
      if (yPosition > pageHeight - 30) {
        pdf.addPage();
        yPosition = 20;
      }
      pdf.setFillColor(59, 130, 246); // Blue background
      pdf.rect(margin, yPosition - 5, contentWidth, 8, 'F');
      pdf.setTextColor(255, 255, 255); // White text
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.text(text, margin + 2, yPosition);
      pdf.setTextColor(0, 0, 0); // Reset to black
      yPosition += 10;
    };

    // Title
    pdf.setFillColor(30, 58, 138); // Dark blue
    pdf.rect(0, 0, pageWidth, 30, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(18);
    pdf.setFont("helvetica", "bold");
    pdf.text("STUDENT PERFORMANCE REPORT", pageWidth / 2, 15, { align: 'center' });
    pdf.setFontSize(10);
    pdf.text("Learn Bangla to Deutsch", pageWidth / 2, 22, { align: 'center' });
    pdf.setTextColor(0, 0, 0);
    yPosition = 40;

    // Student Information Section
    addSectionHeader("STUDENT INFORMATION");
    addText(`Name: ${studentName}`, margin, 10, true);
    addText(`Email: ${email}`, margin);
    addText(`Phone: ${phone}`, margin);
    addText(`Report Generated: ${new Date().toLocaleString("en-US")}`, margin);
    addText(`Last Active: ${latestActivity}`, margin);

    // Performance Summary Section
    addSectionHeader("PERFORMANCE SUMMARY");
    addText(`Course Progress: ${courseProgress}%`, margin);
    addText(`Total Assessments: ${totalAssessments}`, margin);
    addText(`Total Quizzes: ${totalQuizzes}`, margin);
    addText(`Average Assessment Score: ${avgTestScore}%`, margin);
    addText(`Average Quiz Score: ${avgQuizScore}%`, margin);

    // Assessment History
    if (student.assessments && student.assessments.length > 0) {
      addSectionHeader(`ASSESSMENT HISTORY (${student.assessments.length} total)`);
      student.assessments.forEach((assessment: any, index: number) => {
        const completedDate = assessment.completedAt
          ? new Date(assessment.completedAt).toLocaleString("en-US")
          : 'In Progress';

        yPosition += 3;
        addText(`Assessment #${index + 1}`, margin, 11, true);
        addText(`  Step: ${assessment.step || 'N/A'}`, margin + 5);
        addText(`  Score: ${assessment.score || 0}%`, margin + 5);
        addText(`  Certification Level: ${assessment.certificationLevel || 'N/A'}`, margin + 5);
        addText(`  Status: ${assessment.status || 'N/A'}`, margin + 5);
        addText(`  Completed: ${completedDate}`, margin + 5);
        addText(`  Total Time: ${assessment.totalCompletionTime ? Math.floor(assessment.totalCompletionTime / 60) + ' minutes' : 'N/A'}`, margin + 5);
        addText(`  Questions Attempted: ${assessment.questions?.length || 0}`, margin + 5);
        addText(`  Correct Answers: ${assessment.questions?.filter((q: any) => q.isCorrect).length || 0}`, margin + 5);
      });
    }

    // Quiz History
    if (student.quizzes && student.quizzes.length > 0) {
      addSectionHeader(`QUIZ HISTORY (${student.quizzes.length} total)`);
      student.quizzes.forEach((quiz: any, index: number) => {
        const submittedDate = quiz.submittedAt
          ? new Date(quiz.submittedAt).toLocaleString("en-US")
          : 'N/A';

        const quizTitle = quiz.quizId?.title || 'Quiz';
        const quizType = quiz.quizId?.type || 'N/A';

        yPosition += 3;
        addText(`Quiz #${index + 1}: ${quizTitle}`, margin, 11, true);
        addText(`  Type: ${quizType}`, margin + 5);
        addText(`  Score: ${quiz.percentage || 0}%`, margin + 5);
        addText(`  Status: ${quiz.status || 'N/A'}`, margin + 5);
        addText(`  Submitted: ${submittedDate}`, margin + 5);
        addText(`  Correct Answers: ${quiz.correctAnswers || 0}`, margin + 5);
        addText(`  Total Questions: ${quiz.totalQuestions || 0}`, margin + 5);
      });
    }

    // Score Breakdown
    if (student.testScores && student.testScores.length > 0) {
      addSectionHeader("ASSESSMENT SCORES BREAKDOWN");
      student.testScores.forEach((score: number, index: number) => {
        addText(`Assessment ${index + 1}: ${score}%`, margin);
      });
      addText(`Average: ${avgTestScore}%`, margin, 10, true);
    }

    if (student.quizScores && student.quizScores.length > 0) {
      addSectionHeader("QUIZ SCORES BREAKDOWN");
      student.quizScores.forEach((score: number, index: number) => {
        addText(`Quiz ${index + 1}: ${score}%`, margin);
      });
      addText(`Average: ${avgQuizScore}%`, margin, 10, true);
    }

    // Performance Analysis
    addSectionHeader("PERFORMANCE ANALYSIS");

    const overallAvg = totalAssessments > 0 && totalQuizzes > 0
      ? (avgTestScore + avgQuizScore) / 2
      : totalAssessments > 0
        ? avgTestScore
        : avgQuizScore;

    let standingText = "";
    if (overallAvg >= 90) {
      standingText = "Status: EXCELLENT\nThe student demonstrates exceptional understanding and mastery.";
    } else if (overallAvg >= 75) {
      standingText = "Status: VERY GOOD\nThe student shows strong performance and good comprehension.";
    } else if (overallAvg >= 60) {
      standingText = "Status: GOOD\nThe student is performing adequately with room for improvement.";
    } else if (overallAvg >= 50) {
      standingText = "Status: SATISFACTORY\nThe student needs additional support to improve performance.";
    } else {
      standingText = "Status: NEEDS IMPROVEMENT\nThe student requires significant additional support and attention.";
    }

    addText("Academic Standing:", margin, 10, true);
    addText(standingText, margin + 5);

    let progressText = "";
    if (courseProgress >= 80) {
      progressText = `The student is making excellent progress (${courseProgress}% complete).`;
    } else if (courseProgress >= 50) {
      progressText = `The student is making good progress (${courseProgress}% complete).`;
    } else if (courseProgress >= 25) {
      progressText = `The student is in early stages (${courseProgress}% complete).`;
    } else {
      progressText = `The student has just started (${courseProgress}% complete).`;
    }

    addText("Progress Status:", margin, 10, true);
    addText(progressText, margin + 5);

    const totalActivities = totalAssessments + totalQuizzes;
    let engagementText = "";
    if (totalActivities >= 10) {
      engagementText = `HIGH - ${totalActivities} completed activities`;
    } else if (totalActivities >= 5) {
      engagementText = `MODERATE - ${totalActivities} completed activities`;
    } else if (totalActivities >= 1) {
      engagementText = `LOW - ${totalActivities} completed activities`;
    } else {
      engagementText = `INACTIVE - No completed activities`;
    }

    addText("Engagement Level:", margin, 10, true);
    addText(engagementText, margin + 5);

    // Footer
    yPosition = pageHeight - 20;
    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 100);
    pdf.text("This report was automatically generated by Learn Bangla to Deutsch Admin Analytics Dashboard.", pageWidth / 2, yPosition, { align: 'center' });
    pdf.text("For questions or concerns, please contact: admin@learnbangla2deutsch.com", pageWidth / 2, yPosition + 5, { align: 'center' });

    // Save PDF
    const fileName = `student-report-${studentName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);
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
${testData.questions
  .map(
    (q: any) => `
${q.questionNumber}. ${q.questionText}
   Selected Answer: ${q.selectedOption}
   Correct Answer: ${q.correctOption}
   Result: ${q.isCorrect ? "✓ CORRECT" : "✗ INCORRECT"}
   Time Spent: ${q.timeSpent}s
`
  )
  .join("")}

Summary:
- Total Questions: ${testData.questions.length}
- Correct Answers: ${testData.questions.filter((q: any) => q.isCorrect).length}
- Accuracy: ${Math.round(
      (testData.questions.filter((q: any) => q.isCorrect).length /
        testData.questions.length) *
        100
    )}%

Generated on: ${new Date().toLocaleString()}
    `.trim();
  };

  const handleStudentClick = async (student: any) => {
    try {
      const token = sessionStorage.getItem("accessToken");
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/tests/admin/reports?userId=${student.id}&limit=100`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSelectedStudent({
          ...student,
          tests: data.data.tests,
        });
        setShowStudentPopup(true);
      }
    } catch (error) {
      console.error("Failed to fetch student details:", error);
    }
  };

  const clearPaymentData = async () => {
    const isConfirmed = window.confirm(
      "⚠️ WARNING: This will permanently delete ALL payment and revenue data.\n\n" +
        "This action cannot be undone. Are you absolutely sure you want to proceed?"
    );

    if (!isConfirmed) return;

    const doubleConfirm = window.confirm(
      "🚨 FINAL CONFIRMATION: You are about to delete all payment records.\n\n" +
        "This will remove all revenue analytics, payment history, and transaction data.\n\n" +
        "Type YES to confirm or Cancel to abort."
    );

    if (!doubleConfirm) return;

    try {
      const token = sessionStorage.getItem("accessToken");
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/analytics/clear-payment-data`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ confirmClear: true }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        alert(
          `✅ Success! Cleared ${data.data.deletedPayments} payment records.`
        );

        // Refresh the analytics data
        if (activeTab === "students") {
          fetchStudentAnalytics();
        }
      } else {
        const errorData = await response.json();
        alert(
          `❌ Error: ${errorData.message || "Failed to clear payment data"}`
        );
      }
    } catch (error) {
      console.error("Error clearing payment data:", error);
      alert("❌ Network error occurred while clearing data. Please try again.");
    }
  };

  const clearTestData = async () => {
    const isConfirmed = window.confirm(
      "⚠️ WARNING: This will permanently delete ALL test and assessment data.\n\n" +
        "This includes all student exam results, scores, and certificates.\n\n" +
        "This action cannot be undone. Are you absolutely sure you want to proceed?"
    );

    if (!isConfirmed) return;

    const doubleConfirm = window.confirm(
      "🚨 FINAL CONFIRMATION: You are about to delete all test records.\n\n" +
        "This will remove all student results, assessment analytics, and examination data.\n\n" +
        "This action is IRREVERSIBLE. Confirm to proceed."
    );

    if (!doubleConfirm) return;

    try {
      const token = sessionStorage.getItem("accessToken");
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/analytics/clear-test-data`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ confirmClear: true }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        alert(`✅ Success! Cleared ${data.data.deletedTests} test records.`);

        // Refresh the analytics data
        fetchAssessmentReports();
        if (activeTab === "students") {
          fetchStudentAnalytics();
        }
      } else {
        const errorData = await response.json();
        alert(`❌ Error: ${errorData.message || "Failed to clear test data"}`);
      }
    } catch (error) {
      console.error("Error clearing test data:", error);
      alert("❌ Network error occurred while clearing data. Please try again.");
    }
  };

  const initializeSupervisorSalaries = async () => {
    const isConfirmed = window.confirm(
      "📋 Initialize supervisor salary records for all existing supervisors?\n\n" +
        "This will create salary tracking records for supervisors who don't have them yet.\n\n" +
        "Existing salary records will not be modified."
    );

    if (!isConfirmed) return;

    try {
      const token = sessionStorage.getItem("accessToken");
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/analytics/initialize-supervisor-salaries`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        alert(
          `✅ Success! Initialized salary records.\n\nCreated: ${data.data.created} new records\nExisting: ${data.data.existing} records\nTotal: ${data.data.totalProcessed} supervisors processed`
        );

        // Refresh the analytics data
        if (activeTab === "supervisors") {
          fetchSupervisorAnalytics();
        }
      } else {
        let errorMessage = "Failed to initialize supervisor salaries";
        try {
          const errorData = await response.json();
          errorMessage =
            errorData.message ||
            `Server responded with status ${response.status}`;
        } catch (parseError) {
          errorMessage = `Server responded with status ${response.status}`;
        }
        console.error("Initialize error:", response.status, errorMessage);
        alert(`❌ ${errorMessage}`);
      }
    } catch (error) {
      console.error("Error initializing supervisor salaries:", error);
      alert(
        "❌ Network error occurred while initializing salary records. Please try again."
      );
    }
  };

  const clearSupervisorSalaryData = async () => {
    const isConfirmed = window.confirm(
      "⚠️ WARNING: This will permanently delete ALL supervisor salary and compensation data.\n\n" +
        "This action cannot be undone. Are you absolutely sure you want to proceed?"
    );

    if (!isConfirmed) return;

    try {
      const token = sessionStorage.getItem("accessToken");
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/analytics/clear-supervisor-salary`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        alert(`✅ Success! Cleared supervisor salary data.`);

        // Refresh the analytics data
        if (activeTab === "supervisors") {
          fetchSupervisorAnalytics();
        }
      } else {
        const error = await response.json();
        alert(`❌ Failed to clear supervisor salary data: ${error.message}`);
      }
    } catch (error) {
      console.error("Error clearing supervisor salary data:", error);
      alert("❌ Network error occurred while clearing data. Please try again.");
    }
  };

  const handleEditSupervisor = (supervisor: any) => {
    const newSalary = prompt(
      `💼 Edit Monthly Salary\n\nSupervisor: ${
        supervisor.name
      }\nCurrent Salary: €${
        supervisor.monthlySalary?.toLocaleString() || 0
      }\n\nEnter new monthly salary amount:`,
      supervisor.monthlySalary?.toString() || "0"
    );

    if (newSalary && !isNaN(Number(newSalary)) && Number(newSalary) >= 0) {
      const amount = Number(newSalary);
      const confirmed = window.confirm(
        `✅ Confirm Salary Update\n\nSupervisor: ${
          supervisor.name
        }\nOld Salary: €${
          supervisor.monthlySalary?.toLocaleString() || 0
        }\nNew Salary: €${amount.toLocaleString()}\n\nProceed with update?`
      );

      if (confirmed) {
        updateSupervisorSalary(supervisor.supervisorId, amount);
      }
    } else if (newSalary !== null && newSalary !== "") {
      alert("❌ Please enter a valid positive number for the salary amount.");
    }
  };

  const updateSupervisorSalary = async (
    supervisorId: string,
    newSalary: number
  ) => {
    try {
      const token = sessionStorage.getItem("accessToken");
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/analytics/supervisor-salary`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            supervisorId,
            monthlySalary: newSalary,
          }),
        }
      );

      if (response.ok) {
        alert(
          "✅ Salary Updated Successfully!\n\nThe supervisor salary has been updated and will be reflected in future payments."
        );
        fetchSupervisorAnalytics();
      } else {
        let errorMessage = "Failed to update salary";
        try {
          const errorData = await response.json();
          errorMessage =
            errorData.message ||
            `Server responded with status ${response.status}`;
        } catch (parseError) {
          errorMessage = `Server responded with status ${response.status}`;
        }
        console.error("Salary update error:", response.status, errorMessage);
        alert(`❌ ${errorMessage}`);
      }
    } catch (error) {
      console.error("Error updating salary:", error);
      alert(
        "❌ Network error occurred while updating salary. Please try again."
      );
    }
  };

  const handlePaySupervisor = async (supervisor: any) => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1; // 1-based month
    const currentYear = currentDate.getFullYear();

    // Validate required data
    if (!supervisor.supervisorId) {
      alert(
        "❌ Error: Supervisor ID is missing. Please refresh the page and try again."
      );
      return;
    }
    // Payment method selection
    const paymentMethods = [
      "bank_transfer",
      "paypal",
      "stripe",
      "cash",
      "check",
    ];
    const paymentMethodLabels = {
      bank_transfer: "Bank Transfer",
      paypal: "PayPal",
      stripe: "Stripe",
      cash: "Cash",
      check: "Check",
    };

    const methodChoice = prompt(
      `💰 Select Payment Method\n\n` +
        `Supervisor: ${supervisor.name}\n` +
        `Month: ${currentDate.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        })}\n` +
        `Amount: €${supervisor.monthlySalary?.toLocaleString() || 0}\n\n` +
        `Available payment methods:\n` +
        `1 - Bank Transfer\n` +
        `2 - PayPal\n` +
        `3 - Stripe\n` +
        `4 - Cash\n` +
        `5 - Check\n\n` +
        `Enter number (1-5):`,
      "1"
    );

    if (
      !methodChoice ||
      isNaN(Number(methodChoice)) ||
      Number(methodChoice) < 1 ||
      Number(methodChoice) > 5
    ) {
      if (methodChoice !== null) {
        alert("❌ Please enter a valid number between 1-5.");
      }
      return;
    }

    const selectedMethod = paymentMethods[Number(methodChoice) - 1];
    const methodLabel =
      paymentMethodLabels[selectedMethod as keyof typeof paymentMethodLabels];

    const confirmed = window.confirm(
      `✅ Confirm Payment\n\n` +
        `Supervisor: ${supervisor.name}\n` +
        `Email: ${supervisor.email}\n` +
        `Month: ${currentDate.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        })}\n` +
        `Amount: €${supervisor.monthlySalary?.toLocaleString() || 0}\n` +
        `Payment Method: ${methodLabel}\n\n` +
        `Mark this payment as completed?`
    );

    if (confirmed) {
      try {
        const token = sessionStorage.getItem("accessToken");
        const requestBody = {
          supervisorId: String(supervisor.supervisorId), // Ensure it's a string
          month: currentMonth,
          year: currentYear,
          paymentMethod: selectedMethod,
        };
        const response = await fetch(
          `${process.env.REACT_APP_API_URL}/analytics/supervisor-payment`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
          }
        );
        if (response.ok) {
          const data = await response.json();
          alert(
            "✅ Payment Processed Successfully!\n\nThe salary payment has been marked as completed for the current month."
          );
          fetchSupervisorAnalytics();
        } else {
          let errorMessage = "Failed to mark payment";
          let fullResponseText = "";

          try {
            const responseText = await response.text();
            fullResponseText = responseText;
            const errorData = JSON.parse(responseText);
            errorMessage =
              errorData.message ||
              `Server responded with status ${response.status}`;

            // Provide helpful suggestions for common errors
            if (response.status === 400) {
              if (errorMessage.includes("required")) {
                errorMessage +=
                  "\n\n🔧 Debug: Some required fields may be missing from the request.";
              } else {
                errorMessage +=
                  "\n\n🔧 Debug: Invalid request data. Check console for details.";
              }
            } else if (
              errorMessage.includes("Supervisor salary record not found")
            ) {
              errorMessage +=
                '\n\n💡 Tip: Click the "Initialize" button first to create salary records for all supervisors.';
            }
          } catch (parseError) {
            errorMessage = `Server responded with status ${response.status}. Check console for details.`;
          }

          console.error(
            "Payment marking error:",
            response.status,
            errorMessage
          );
          alert(`❌ ${errorMessage}`);
        }
      } catch (error) {
        console.error("Error marking payment:", error);
        alert(
          "❌ Network error occurred while marking payment. Please try again."
        );
      }
    }
  };

  const handleSalaryPaymentToggle = async (
    supervisorId: string,
    monthIndex: number,
    currentStatus: boolean
  ) => {
    try {
      const token = sessionStorage.getItem("accessToken");
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/analytics/supervisor-salary-payment`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            supervisorId,
            monthIndex,
            paid: !currentStatus,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        fetchSupervisorAnalytics();
      } else {
        let errorMessage = "Failed to update payment status";
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (parseError) {
          errorMessage = `Server responded with status ${response.status}`;
        }
        console.error("Payment toggle error:", response.status, errorMessage);
        alert(`❌ ${errorMessage}`);
      }
    } catch (error) {
      console.error("Error updating salary payment:", error);
      alert(
        "❌ Network error occurred while updating payment status. Please try again."
      );
    }
  };

  const clearVideoAnalyticsData = async () => {
    const isConfirmed = window.confirm(
      "⚠️ WARNING: This will permanently delete ALL course video analytics data.\n\n" +
        "This includes video views, completion rates, and engagement metrics.\n\n" +
        "This action cannot be undone. Are you absolutely sure you want to proceed?"
    );

    if (!isConfirmed) return;

    try {
      const token = sessionStorage.getItem("accessToken");
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/analytics/clear-video-analytics`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        alert(`✅ Success! Cleared video analytics data.`);

        // Refresh the analytics data
        if (activeTab === "supervisors") {
          fetchSupervisorAnalytics();
        }
      } else {
        const error = await response.json();
        alert(`❌ Failed to clear video analytics data: ${error.message}`);
      }
    } catch (error) {
      console.error("Error clearing video analytics data:", error);
      alert("❌ Network error occurred while clearing data. Please try again.");
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

        {/* Gorgeous Tab Navigation */}
        <div className="mb-8 flex justify-center">
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-1 backdrop-blur-sm w-fit">
            <nav className="flex space-x-1">
              <button
                onClick={() => setActiveTab("students")}
                className={`flex items-center space-x-2 py-3 px-6 rounded-lg font-semibold text-sm ${
                  activeTab === "students"
                    ? "bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 text-white shadow-lg shadow-purple-500/20"
                    : "bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 border border-gray-200"
                }`}
              >
                <span className="text-lg">🎓</span>
                <span className="font-bold">Student Analysis</span>
              </button>
              <button
                onClick={() => setActiveTab("supervisors")}
                className={`flex items-center space-x-2 py-3 px-6 rounded-lg font-semibold text-sm ${
                  activeTab === "supervisors"
                    ? "bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 text-white shadow-lg shadow-emerald-500/20"
                    : "bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 border border-gray-200"
                }`}
              >
                <span className="text-lg">👨‍🏫</span>
                <span className="font-bold">Supervisor Analysis</span>
              </button>
            </nav>
          </div>
        </div>

        {/* Content based on active tab */}

        {/* Student Analysis Tab */}
        {activeTab === "students" && (
          <div className="space-y-8">
            {/* Student Result & Analysis Section */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-tr from-cyan-900 via-sky-800 to-gray-400 p-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-3xl font-bold text-white flex items-center">
                    Student Result & Analysis
                  </h2>
                  <button
                    onClick={clearTestData}
                    className="bg-transparent hover:bg-white hover:bg-opacity-20 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center space-x-1.5 border border-white border-opacity-30 hover:border-opacity-50"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      ></path>
                    </svg>
                    <span>Clear Data</span>
                  </button>
                </div>
              </div>
              <div className="p-6">
                {/* Summary Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                  <div className="bg-blue-50 p-4 rounded-xl">
                    <h3 className="text-lg font-semibold text-blue-800 mb-2">
                      Total Students
                    </h3>
                    <p className="text-3xl font-bold text-blue-600">
                      {studentAnalytics?.results?.totalStudents || 0}
                    </p>
                    <p className="text-sm text-blue-600 mt-1">
                      +{studentAnalytics?.results?.newStudentsThisMonth || 0}{" "}
                      this month
                    </p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-xl">
                    <h3 className="text-lg font-semibold text-green-800 mb-2">
                      Active Students
                    </h3>
                    <p className="text-3xl font-bold text-green-600">
                      {studentAnalytics?.results?.activeStudents || 0}
                    </p>
                    <p className="text-sm text-green-600 mt-1">
                      {studentAnalytics?.results?.totalStudents
                        ? Math.round(
                            (studentAnalytics.results.activeStudents /
                              studentAnalytics.results.totalStudents) *
                              100
                          )
                        : 0}
                      % of total
                    </p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-xl">
                    <h3 className="text-lg font-semibold text-purple-800 mb-2">
                      Completed Tests
                    </h3>
                    <p className="text-3xl font-bold text-purple-600">
                      {assessmentReports?.tests?.length || 0}
                    </p>
                    <p className="text-sm text-purple-600 mt-1">
                      Assessment results
                    </p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-xl">
                    <h3 className="text-lg font-semibold text-orange-800 mb-2">
                      Average Score
                    </h3>
                    <p className="text-3xl font-bold text-orange-600">
                      {assessmentReports?.tests?.length
                        ? Math.round(
                            assessmentReports.tests.reduce(
                              (acc: number, test: any) => acc + test.score,
                              0
                            ) / assessmentReports.tests.length
                          )
                        : 0}
                      %
                    </p>
                    <p className="text-sm text-orange-600 mt-1">
                      Overall performance
                    </p>
                  </div>
                </div>

                {/* Recently Registered Students */}
                <div className="bg-white rounded-xl shadow-lg p-8 mb-8 border border-gray-200">
                  <div className="mb-6">
                    <h3 className="text-2xl font-bold text-gray-900">
                      Recently Registered Students
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full bg-white rounded-lg overflow-hidden shadow-sm">
                      <thead>
                        <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                          <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">
                            Student
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">
                            Contact
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">
                            Registered
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">
                            Status
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">
                            Course
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">
                            Supervisor
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {studentAnalytics?.results?.recentStudents &&
                        studentAnalytics.results.recentStudents.length > 0 ? (
                          (() => {
                            // Create enrollment-based entries (students can appear multiple times for different courses)
                            const enrollmentEntries: any[] = [];
                            studentAnalytics.results.recentStudents.forEach(
                              (student: any, studentIndex: number) => {
                                if (
                                  student.enrollments &&
                                  student.enrollments.length > 0
                                ) {
                                  // If student has enrollments, create an entry for each enrollment
                                  student.enrollments.forEach(
                                    (enrollment: any) => {
                                      enrollmentEntries.push({
                                        ...student,
                                        course: enrollment.course,
                                        enrollmentDate:
                                          enrollment.enrollmentDate,
                                        uniqueKey: `${
                                          student.id || student._id
                                        }-${
                                          enrollment.course?._id ||
                                          enrollment.courseId
                                        }`,
                                      });
                                    }
                                  );
                                } else if (student.course) {
                                  // Fallback for students with single course data
                                  enrollmentEntries.push({
                                    ...student,
                                    uniqueKey: `${student.id || student._id}-${
                                      student.course._id || "single"
                                    }`,
                                  });
                                } else {
                                  // Students with no course enrollment
                                  enrollmentEntries.push({
                                    ...student,
                                    uniqueKey:
                                      student.id ||
                                      student._id ||
                                      `no-course-${studentIndex}`,
                                  });
                                }
                              }
                            );

                            return enrollmentEntries.map(
                              (student: any, index: number) => (
                                <tr
                                  key={student.uniqueKey || index}
                                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                                >
                                  <td className="py-3 px-4">
                                    <div className="flex items-center">
                                      <div className="w-10 h-10 rounded-full overflow-hidden mr-3">
                                        {(student.profilePhoto || student.profilePicture || student.avatar) ? (
                                          <img
                                            src={student.profilePhoto || student.profilePicture || student.avatar}
                                            alt={student.name}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                              const target =
                                                e.target as HTMLImageElement;
                                              target.style.display = "none";
                                              target.nextElementSibling?.setAttribute(
                                                "style",
                                                "display: flex"
                                              );
                                            }}
                                          />
                                        ) : null}
                                        <div
                                          className="w-full h-full bg-blue-100 flex items-center justify-center"
                                          style={
                                            (student.profilePhoto || student.profilePicture || student.avatar)
                                              ? { display: "none" }
                                              : {}
                                          }
                                        >
                                          <span className="text-sm font-semibold text-blue-600">
                                            {student.firstName
                                              ? student.firstName.charAt(0)
                                              : student.name?.charAt(0) || "S"}
                                          </span>
                                        </div>
                                      </div>
                                      <div>
                                        <div className="font-medium text-gray-900">
                                          {student.firstName
                                            ? `${student.firstName} ${student.lastName}`
                                            : student.name || "Unknown"}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4">
                                    <div className="text-sm">
                                      <div className="font-medium text-gray-900">
                                        {student.email || "No email"}
                                      </div>
                                      <div className="text-gray-500">
                                        {student.phone || "No phone"}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4">
                                    <div className="text-sm">
                                      <div className="font-medium text-gray-900">
                                        {student.createdAt
                                          ? new Date(
                                              student.createdAt
                                            ).toLocaleDateString()
                                          : "Unknown"}
                                      </div>
                                      <div className="text-gray-500">
                                        {student.createdAt
                                          ? new Date(
                                              student.createdAt
                                            ).toLocaleTimeString()
                                          : ""}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4">
                                    <span
                                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                        student.isActive
                                          ? "bg-green-100 text-green-800"
                                          : student.emailVerified
                                          ? "bg-yellow-100 text-yellow-800"
                                          : "bg-red-100 text-red-800"
                                      }`}
                                    >
                                      {student.isActive
                                        ? "Active"
                                        : student.emailVerified
                                        ? "Pending"
                                        : "Inactive"}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4">
                                    <div className="text-sm">
                                      {student.course ? (
                                        <div>
                                          <div className="font-medium text-gray-900">
                                            {student.course.title}
                                          </div>
                                          <div className="text-gray-500">
                                            {student.course.level}
                                          </div>
                                        </div>
                                      ) : (
                                        <span className="text-gray-400 italic">
                                          No course
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-3 px-4">
                                    <div className="text-sm">
                                      {student.supervisor ? (
                                        <span className="font-medium text-gray-700">
                                          {student.supervisor.name}
                                        </span>
                                      ) : (
                                        <span className="text-gray-400 italic">
                                          Not assigned
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )
                            );
                          })()
                        ) : (
                          <tr>
                            <td colSpan={6} className="py-12 text-center">
                              <div className="flex flex-col items-center">
                                <svg
                                  className="w-12 h-12 text-gray-400 mb-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                                  />
                                </svg>
                                <p className="text-gray-500 font-medium">
                                  No recent student registrations
                                </p>
                                <p className="text-gray-400 text-sm mt-1">
                                  New student registrations will appear here
                                </p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Student Performance Overview */}
                <div className="bg-white rounded-xl shadow-lg p-8 mb-8 border border-gray-200">
                  <div className="mb-6">
                    <h3 className="text-2xl font-bold text-gray-900">
                      Student Performance Analytics
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                          <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">
                            Student
                          </th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700 text-sm">
                            Assessment
                          </th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700 text-sm">
                            Quiz
                          </th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700 text-sm">
                            Exam
                          </th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700 text-sm">
                            Course Progress
                          </th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700 text-sm">
                            Last Active
                          </th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700 text-sm">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const studentPerformance = getCombinedStudentResults();
                          return studentPerformance.length > 0 ? (
                            studentPerformance.map((student: any, index: number) => {
                              const testScore = student.avgTestScore || 0;
                              const quizScore = student.avgQuizScore || 0;
                              const examScore = 0; // Placeholder for exam scores
                              
                              return (
                                <tr key={index} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                                  index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                }`}>
                                  <td className="py-3 px-4">
                                    <div className="flex items-center">
                                      <div className="w-10 h-10 rounded-full overflow-hidden mr-3">
                                        <img
                                          src={student.student?.profilePhoto || student.student?.profilePicture || student.student?.avatar || ''}
                                          alt={student.student?.firstName && student.student?.lastName 
                                            ? `${student.student.firstName} ${student.student.lastName}`
                                            : student.student?.name || 'Student'
                                          }
                                          className="w-full h-full object-cover"
                                          onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.style.display = "none";
                                            const parent = target.parentElement;
                                            if (parent) {
                                              const fallback = parent.querySelector('.profile-fallback');
                                              if (fallback) {
                                                (fallback as HTMLElement).style.display = 'flex';
                                              }
                                            }
                                          }}
                                          style={
                                            (student.student?.profilePhoto || student.student?.profilePicture || student.student?.avatar)
                                              ? { display: 'block' }
                                              : { display: 'none' }
                                          }
                                        />
                                        <div
                                          className="profile-fallback w-full h-full bg-blue-100 flex items-center justify-center"
                                          style={
                                            (student.student?.profilePhoto || student.student?.profilePicture || student.student?.avatar)
                                              ? { display: "none" }
                                              : { display: "flex" }
                                          }
                                        >
                                          <span className="text-sm font-semibold text-blue-600">
                                            {student.student?.firstName 
                                              ? student.student.firstName.charAt(0)
                                              : student.student?.name?.charAt(0) || "S"}
                                          </span>
                                        </div>
                                      </div>
                                      <div>
                                        <div className="font-medium text-gray-900">
                                          {student.student?.firstName
                                            ? `${student.student.firstName} ${student.student.lastName}`
                                            : student.student?.name || "Unknown"}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                          {student.student?.email || 'Email not available'}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    <div className="text-sm font-medium text-gray-900">
                                      {student.testScores?.length || 0}
                                    </div>
                                    {testScore > 0 && (
                                      <div className="text-xs text-gray-500">
                                        {Math.round(testScore)}%
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    <div className="text-sm font-medium text-gray-900">
                                      {student.quizScores?.length || 0}
                                    </div>
                                    {quizScore > 0 && (
                                      <div className="text-xs text-gray-500">
                                        {Math.round(quizScore)}%
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    <div className="text-sm font-medium text-gray-900">
                                      {examScore || 0}
                                    </div>
                                    {examScore > 0 && (
                                      <div className="text-xs text-gray-500">
                                        {Math.round(examScore)}%
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    <div className="text-sm font-medium text-gray-900">
                                      {Math.round(student.courseProgress || 0)}%
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    <div className="text-sm font-medium text-gray-900">
                                      {new Date(student.latestDate).toLocaleTimeString("en-US", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                        hour12: true
                                      })}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {new Date(student.latestDate).toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric"
                                      })}
                                    </div>
                                  </td>
                                  <td className="py-3 px-4">
                                    <div className="flex items-center justify-center gap-2">
                                      {/* Email Button */}
                                      <button
                                        onClick={() => {
                                          const email = student.student?.email;
                                          if (email) {
                                            window.location.href = `mailto:${email}`;
                                          }
                                        }}
                                        className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                                        title={`Send email to ${student.student?.email}`}
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                      </button>

                                      {/* View Details Button */}
                                      <button
                                        onClick={() => {
                                          setSelectedStudent(student);
                                          setShowStudentPopup(true);
                                        }}
                                        className="bg-indigo-500 hover:bg-indigo-600 text-white p-2 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                                        title="View detailed analytics"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                        </svg>
                                      </button>

                                      {/* Download Complete Report Button */}
                                      <button
                                        onClick={() => downloadCompleteStudentReport(student)}
                                        className="bg-green-500 hover:bg-green-600 text-white p-2 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                                        title="Download complete student report"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={7} className="py-16 text-center">
                                <div className="text-gray-500">
                                  <p className="text-lg font-medium mb-2">No Performance Data Available</p>
                                  <p className="text-sm">Student performance metrics will be displayed once assessments and quizzes are completed.</p>
                                </div>
                              </td>
                            </tr>
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* Student Payment Analysis */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-tr from-cyan-900 via-sky-800 to-gray-400 p-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-3xl font-bold text-white flex items-center">
                    Payment & Revenue Analysis
                  </h2>
                  <button
                    onClick={clearPaymentData}
                    className="bg-transparent hover:bg-white hover:bg-opacity-20 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center space-x-1.5 border border-white border-opacity-30 hover:border-opacity-50"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      ></path>
                    </svg>
                    <span>Clear Data</span>
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-green-50 p-4 rounded-xl">
                    <h3 className="text-lg font-semibold text-green-800 mb-2">
                      Total Revenue
                    </h3>
                    <div className="text-green-600">
                      {formatDualCurrencyDisplay(
                        studentAnalytics?.payments?.totalRevenue || 0,
                        true
                      )}
                    </div>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-xl">
                    <h3 className="text-lg font-semibold text-blue-800 mb-2">
                      Total Payments
                    </h3>
                    <p className="text-3xl font-bold text-blue-600">
                      {studentAnalytics?.payments?.totalPayments || 0}
                    </p>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-xl">
                    <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                      Pending Payments
                    </h3>
                    <p className="text-3xl font-bold text-yellow-600">
                      {studentAnalytics?.payments?.pendingPayments || 0}
                    </p>
                  </div>
                </div>

                {/* Recent Payment Receipts */}
                <div className="bg-white rounded-xl shadow-lg p-8 mb-8 border border-gray-200">
                  <h3 className="text-xl font-bold mb-4">
                    Recent Payment Receipts
                  </h3>
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
                        {studentAnalytics?.payments?.recentPayments &&
                        studentAnalytics.payments.recentPayments.length > 0 ? (
                          studentAnalytics.payments.recentPayments.map(
                            (payment: any) => (
                              <tr
                                key={payment._id}
                                className="border-b hover:bg-gray-50"
                              >
                                <td className="py-2 font-medium">
                                  {payment.studentName}
                                </td>
                                <td className="py-2 text-gray-600">
                                  {payment.email}
                                </td>
                                <td className="py-2">
                                  <div>
                                    <div className="font-medium">
                                      {payment.courseName}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      {payment.courseLevel}
                                    </div>
                                  </div>
                                </td>
                                <td className="py-2 font-mono text-sm">
                                  {payment.transactionId}
                                </td>
                                <td className="py-2">
                                  {formatDualCurrencyDisplay(payment.amount)}
                                </td>
                                <td className="py-2">
                                  <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium capitalize">
                                    {payment.paymentMethod === "card"
                                      ? "Credit/Debit Card"
                                      : payment.paymentMethod === "sepa_debit"
                                      ? "SEPA Direct Debit"
                                      : payment.paymentMethod === "sofort"
                                      ? "Sofort Banking"
                                      : payment.paymentMethod === "giropay"
                                      ? "Giropay"
                                      : payment.paymentMethod === "ideal"
                                      ? "iDEAL"
                                      : payment.paymentMethod === "bancontact"
                                      ? "Bancontact"
                                      : payment.paymentMethod === "eps"
                                      ? "EPS"
                                      : payment.paymentMethod === "p24"
                                      ? "Przelewy24"
                                      : payment.paymentMethod === "paypal"
                                      ? "PayPal"
                                      : payment.paymentMethod === "bkash"
                                      ? "bKash"
                                      : payment.paymentMethod === "nagad"
                                      ? "Nagad"
                                      : payment.paymentMethod === "rocket"
                                      ? "Rocket"
                                      : payment.paymentMethod === "upay"
                                      ? "Upay"
                                      : payment.paymentMethod}
                                  </span>
                                </td>
                                <td className="py-2">
                                  <span
                                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                                      payment.status === "completed"
                                        ? "bg-green-100 text-green-800"
                                        : payment.status === "pending"
                                        ? "bg-yellow-100 text-yellow-800"
                                        : payment.status === "failed"
                                        ? "bg-red-100 text-red-800"
                                        : "bg-gray-100 text-gray-800"
                                    }`}
                                  >
                                    {payment.status}
                                  </span>
                                </td>
                                <td className="py-2 text-sm">
                                  {payment.paymentDate
                                    ? new Date(
                                        payment.paymentDate
                                      ).toLocaleDateString()
                                    : "N/A"}
                                </td>
                              </tr>
                            )
                          )
                        ) : (
                          <tr>
                            <td
                              colSpan={8}
                              className="py-4 text-center text-gray-500"
                            >
                              No recent payment data available
                            </td>
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
        {activeTab === "supervisors" && (
          <div className="space-y-8">
            {/* Supervisor Salary Information */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-tr from-cyan-900 via-sky-800 to-gray-400 p-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-3xl font-bold text-white flex items-center">
                    Supervisor Salary & Compensation
                  </h2>
                  <div className="flex space-x-3">
                    <button
                      onClick={initializeSupervisorSalaries}
                      className="bg-transparent hover:bg-white hover:bg-opacity-20 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center space-x-1.5 border border-white border-opacity-30 hover:border-opacity-50"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                        ></path>
                      </svg>
                      <span>Initialize</span>
                    </button>
                    <button
                      onClick={clearSupervisorSalaryData}
                      className="bg-transparent hover:bg-white hover:bg-opacity-20 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center space-x-1.5 border border-white border-opacity-30 hover:border-opacity-50"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        ></path>
                      </svg>
                      <span>Clear Data</span>
                    </button>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                  <div className="bg-purple-50 p-4 rounded-xl">
                    <h3 className="text-lg font-semibold text-purple-800 mb-2">
                      Total Supervisors
                    </h3>
                    <p className="text-3xl font-bold text-purple-600">
                      {supervisorAnalytics?.salary?.totalSupervisors || 0}
                    </p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-xl">
                    <h3 className="text-lg font-semibold text-green-800 mb-2">
                      Total Salary Paid
                    </h3>
                    <p className="text-3xl font-bold text-green-600">
                      €
                      {supervisorAnalytics?.salary?.totalSalaryPaid?.toFixed(
                        2
                      ) || "0.00"}
                    </p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-xl">
                    <h3 className="text-lg font-semibold text-blue-800 mb-2">
                      Average Salary
                    </h3>
                    <p className="text-3xl font-bold text-blue-600">
                      €
                      {supervisorAnalytics?.salary?.averageSalary?.toFixed(2) ||
                        "0.00"}
                    </p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-xl">
                    <h3 className="text-lg font-semibold text-orange-800 mb-2">
                      Active Supervisors
                    </h3>
                    <p className="text-3xl font-bold text-orange-600">
                      {supervisorAnalytics?.salary?.activeSupervisors || 0}
                    </p>
                  </div>
                </div>

                {/* Supervisor Salary Details */}
                <div className="bg-white rounded-xl shadow-lg p-8 mb-8 border border-gray-200">
                  <h3 className="text-xl font-bold mb-4">
                    Supervisor Salary Breakdown
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full bg-white rounded-lg overflow-hidden shadow-sm">
                      <thead>
                        <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                          <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">
                            Name
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">
                            Email
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">
                            Course
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">
                            Salary
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">
                            Joined
                          </th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700 text-sm">
                            Jan
                          </th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700 text-sm">
                            Feb
                          </th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700 text-sm">
                            Mar
                          </th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700 text-sm">
                            Apr
                          </th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700 text-sm">
                            May
                          </th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700 text-sm">
                            Jun
                          </th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700 text-sm">
                            Jul
                          </th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700 text-sm">
                            Aug
                          </th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700 text-sm">
                            Sep
                          </th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700 text-sm">
                            Oct
                          </th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700 text-sm">
                            Nov
                          </th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700 text-sm">
                            Dec
                          </th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700 text-sm">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {supervisorAnalytics?.salary?.supervisorDetails &&
                        supervisorAnalytics.salary.supervisorDetails.length >
                          0 ? (
                          supervisorAnalytics.salary.supervisorDetails.map(
                            (supervisor: any, index: number) => (
                              <tr
                                key={supervisor.supervisorId || index}
                                className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                              >
                                <td className="py-3 px-4">
                                  <div className="font-medium text-gray-900">
                                    {supervisor.name || "Unknown"}
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-gray-600">
                                  {supervisor.email || "No email"}
                                </td>
                                <td className="py-3 px-4">
                                  <div className="text-sm">
                                    {supervisor.assignedCourses &&
                                    supervisor.assignedCourses.length > 0 ? (
                                      <div className="flex flex-wrap gap-1">
                                        {supervisor.assignedCourses.map(
                                          (
                                            course: any,
                                            courseIndex: number
                                          ) => (
                                            <span
                                              key={courseIndex}
                                              className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800"
                                            >
                                              {course.title}
                                            </span>
                                          )
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-gray-400 italic">
                                        No course assigned
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  <span className="font-semibold text-green-600">
                                    €{supervisor.monthlySalary || 0}
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  <div className="text-sm">
                                    <div className="font-medium text-gray-900">
                                      {supervisor.joinedAt
                                        ? new Date(
                                            supervisor.joinedAt
                                          ).toLocaleDateString()
                                        : "Not available"}
                                    </div>
                                    <div className="text-gray-500">
                                      {supervisor.joinedAt
                                        ? new Date(
                                            supervisor.joinedAt
                                          ).toLocaleTimeString([], {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          })
                                        : ""}
                                    </div>
                                  </div>
                                </td>
                                {/* Monthly payment status columns */}
                                {Array.from({ length: 12 }, (_, monthIndex) => {
                                  const monthPayment =
                                    supervisor.monthlyPayments?.[monthIndex];
                                  const isPaid = monthPayment?.paid;
                                  return (
                                    <td
                                      key={monthIndex}
                                      className="py-3 px-4 text-center"
                                    >
                                      <button
                                        onClick={() =>
                                          handleSalaryPaymentToggle(
                                            supervisor.supervisorId,
                                            monthIndex,
                                            isPaid
                                          )
                                        }
                                        className={`w-6 h-6 rounded-md border-2 transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                          isPaid
                                            ? "bg-green-500 border-green-500 text-white hover:bg-green-600"
                                            : "bg-white border-gray-300 text-gray-400 hover:border-gray-400"
                                        }`}
                                        title={`${
                                          isPaid ? "✅ Paid" : "⏳ Pending"
                                        } - ${new Date(
                                          2024,
                                          monthIndex
                                        ).toLocaleDateString("en-US", {
                                          month: "long",
                                        })} ${new Date().getFullYear()}\n${
                                          isPaid
                                            ? "Click to mark as unpaid"
                                            : "Click to mark as paid"
                                        }\nAmount: €${
                                          supervisor.monthlySalary?.toLocaleString() ||
                                          0
                                        }`}
                                      >
                                        {isPaid ? "✓" : ""}
                                      </button>
                                    </td>
                                  );
                                })}
                                <td className="py-3 px-4 text-center">
                                  <div className="flex space-x-1 justify-center">
                                    <button
                                      onClick={() =>
                                        handlePaySupervisor(supervisor)
                                      }
                                      className="text-green-600 hover:text-green-800 bg-green-50 px-2 py-1 rounded text-xs font-medium transition-colors"
                                      title="Mark current month as paid"
                                    >
                                      Pay
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleEditSupervisor(supervisor)
                                      }
                                      className="text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded text-xs font-medium transition-colors"
                                      title="Edit salary amount"
                                    >
                                      Edit
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )
                          )
                        ) : (
                          <tr>
                            <td colSpan={18} className="py-12 text-center">
                              <div className="flex flex-col items-center">
                                <svg
                                  className="w-12 h-12 text-gray-400 mb-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                                  />
                                </svg>
                                <p className="text-gray-500 font-medium">
                                  No supervisor salary data available
                                </p>
                                <p className="text-gray-400 text-sm mt-1">
                                  Supervisor compensation information will
                                  appear here once available
                                </p>
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
              <div className="bg-gradient-to-tr from-cyan-900 via-sky-800 to-gray-400 p-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-3xl font-bold text-white flex items-center">
                    Course Video Analytics
                  </h2>
                  <button
                    onClick={clearVideoAnalyticsData}
                    className="bg-transparent hover:bg-white hover:bg-opacity-20 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center space-x-1.5 border border-white border-opacity-30 hover:border-opacity-50"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      ></path>
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
                      <p className="text-gray-500 font-medium">
                        Loading video analytics...
                      </p>
                      <p className="text-gray-400 text-sm mt-1">
                        Please wait while we gather the data
                      </p>
                    </div>
                  </div>
                ) : (
                  <React.Fragment>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                      <div className="bg-orange-50 p-4 rounded-xl">
                        <h3 className="text-lg font-semibold text-orange-800 mb-2">
                          Total Videos
                        </h3>
                        <p className="text-3xl font-bold text-orange-600">
                          {supervisorAnalytics?.videos?.totalVideos || 0}
                        </p>
                      </div>
                      <div className="bg-green-50 p-4 rounded-xl">
                        <h3 className="text-lg font-semibold text-green-800 mb-2">
                          Approved Videos
                        </h3>
                        <p className="text-3xl font-bold text-green-600">
                          {supervisorAnalytics?.videos?.approvedVideos || 0}
                        </p>
                      </div>
                      <div className="bg-yellow-50 p-4 rounded-xl">
                        <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                          Pending Review
                        </h3>
                        <p className="text-3xl font-bold text-yellow-600">
                          {supervisorAnalytics?.videos?.pendingVideos || 0}
                        </p>
                      </div>
                      <div className="bg-blue-50 p-4 rounded-xl">
                        <h3 className="text-lg font-semibold text-blue-800 mb-2">
                          Total Duration
                        </h3>
                        <p className="text-3xl font-bold text-blue-600">
                          {supervisorAnalytics?.videos?.totalDuration || 0}h
                        </p>
                      </div>
                    </div>

                    {/* Top Contributing Supervisors */}
                    <div className="bg-white rounded-xl shadow-lg p-8 mb-8 border border-gray-200">
                      <div className="mb-6">
                        <h3 className="text-2xl font-bold text-gray-900">
                          Top Contributing Supervisors
                        </h3>
                      </div>
                      <div>
                        <div className="overflow-x-auto">
                          <table className="min-w-full bg-white rounded-lg overflow-hidden shadow-sm">
                            <thead>
                              <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                                <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">
                                  Rank
                                </th>
                                <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">
                                  Supervisor
                                </th>
                                <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">
                                  Contact
                                </th>
                                <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">
                                  Joined
                                </th>
                                <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">
                                  Courses
                                </th>
                                <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">
                                  Videos
                                </th>
                                <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">
                                  Approved
                                </th>
                                <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">
                                  Duration
                                </th>
                                <th className="text-center py-3 px-4 font-semibold text-gray-700 text-sm">
                                  Approval Rate
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {supervisorAnalytics?.videos?.topSupervisors &&
                              supervisorAnalytics.videos.topSupervisors.length >
                                0 ? (
                                supervisorAnalytics.videos.topSupervisors.map(
                                  (supervisor: any, index: number) => (
                                    <tr
                                      key={supervisor._id}
                                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                                    >
                                      <td className="py-3 px-4">
                                        <div className="flex items-center justify-center text-2xl">
                                          {index === 0
                                            ? "🥇"
                                            : index === 1
                                            ? "🥈"
                                            : index === 2
                                            ? "🥉"
                                            : `${index + 1}`}
                                        </div>
                                      </td>
                                      <td className="py-3 px-4">
                                        <div className="font-medium text-gray-900">
                                          {supervisor.firstName &&
                                          supervisor.lastName
                                            ? `${supervisor.firstName} ${supervisor.lastName}`
                                            : supervisor.name ||
                                              "Unknown Supervisor"}
                                        </div>
                                      </td>
                                      <td className="py-3 px-4">
                                        <div className="text-sm">
                                          <div className="font-medium text-gray-900">
                                            {supervisor.email}
                                          </div>
                                          <div className="text-gray-500">
                                            {supervisor.phone ||
                                              supervisor.phoneNumber ||
                                              "No phone"}
                                          </div>
                                        </div>
                                      </td>
                                      <td className="py-3 px-4">
                                        <div className="text-sm">
                                          <div className="font-medium text-gray-900">
                                            {supervisor.joinedAt ||
                                            supervisor.createdAt
                                              ? new Date(
                                                  supervisor.joinedAt ||
                                                    supervisor.createdAt
                                                ).toLocaleDateString()
                                              : "Not available"}
                                          </div>
                                          <div className="text-gray-500">
                                            {supervisor.joinedAt ||
                                            supervisor.createdAt
                                              ? new Date(
                                                  supervisor.joinedAt ||
                                                    supervisor.createdAt
                                                ).toLocaleTimeString([], {
                                                  hour: "2-digit",
                                                  minute: "2-digit",
                                                })
                                              : ""}
                                          </div>
                                        </div>
                                      </td>
                                      <td className="py-3 px-4">
                                        <div className="text-sm">
                                          {supervisor.assignedCourses &&
                                          supervisor.assignedCourses.length >
                                            0 ? (
                                            <div>
                                              <div className="font-medium text-gray-900">
                                                {supervisor.assignedCourses[0]
                                                  .title ||
                                                  supervisor.assignedCourses[0]
                                                    .name}
                                              </div>
                                              {supervisor.assignedCourses
                                                .length > 1 && (
                                                <div className="text-gray-500">
                                                  +
                                                  {supervisor.assignedCourses
                                                    .length - 1}{" "}
                                                  more
                                                </div>
                                              )}
                                            </div>
                                          ) : (
                                            <div className="font-medium text-gray-900">
                                              {supervisor.totalCourses || 0}{" "}
                                              courses
                                            </div>
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
                                          {Math.round(
                                            (supervisor.totalDuration || 0) / 60
                                          )}
                                          m
                                        </div>
                                      </td>
                                      <td className="py-4 px-4">
                                        <div className="flex items-center justify-center">
                                          <div
                                            className={`px-4 py-2 rounded text-sm font-bold shadow-md ${
                                              (supervisor.approvalRate || 0) >=
                                              80
                                                ? "bg-green-100 text-green-800"
                                                : (supervisor.approvalRate ||
                                                    0) >= 60
                                                ? "bg-yellow-100 text-yellow-800"
                                                : "bg-red-100 text-red-800"
                                            }`}
                                          >
                                            {(
                                              supervisor.approvalRate || 0
                                            ).toFixed(1)}
                                            %
                                            {(supervisor.approvalRate || 0) >=
                                            80
                                              ? "🏆"
                                              : (supervisor.approvalRate ||
                                                  0) >= 60
                                              ? "👍"
                                              : "⚠️"}
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  )
                                )
                              ) : (
                                <tr>
                                  <td colSpan={9} className="py-12 text-center">
                                    <div className="flex flex-col items-center justify-center space-y-3">
                                      <svg
                                        className="w-12 h-12 text-gray-400 mx-auto"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth="2"
                                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                        />
                                      </svg>
                                      <div className="text-center">
                                        <p className="text-gray-500 font-medium">
                                          No supervisor data available
                                        </p>
                                        <p className="text-gray-400 text-sm mt-1">
                                          Data will appear here once supervisors
                                          upload videos
                                        </p>
                                      </div>
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
                    <div className="bg-white rounded-xl shadow-lg p-8 mb-8 border border-gray-200">
                      <div className="mb-6">
                        <h3 className="text-2xl font-bold text-gray-900">
                          Recent Video Uploads
                        </h3>
                      </div>
                      <div>
                        {supervisorAnalytics?.videos?.recentUploads &&
                        supervisorAnalytics.videos.recentUploads.length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="min-w-full bg-white rounded-lg overflow-hidden shadow-sm">
                              <thead>
                                <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                                  <th className="text-left py-2 px-3 font-semibold text-gray-700 text-sm">
                                    Video Title
                                  </th>
                                  <th className="text-left py-2 px-3 font-semibold text-gray-700 text-sm">
                                    Supervisor
                                  </th>
                                  <th className="text-left py-2 px-3 font-semibold text-gray-700 text-sm">
                                    Course
                                  </th>
                                  <th className="text-left py-2 px-3 font-semibold text-gray-700 text-sm">
                                    Duration
                                  </th>
                                  <th className="text-left py-2 px-3 font-semibold text-gray-700 text-sm">
                                    Status
                                  </th>
                                  <th className="text-left py-2 px-3 font-semibold text-gray-700 text-sm">
                                    Upload Date
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {supervisorAnalytics.videos.recentUploads
                                  .slice(0, 8)
                                  .map((video: any) => (
                                    <tr
                                      key={video._id}
                                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                                    >
                                      <td className="py-2 px-3">
                                        <div
                                          className="font-medium text-gray-900 text-sm"
                                          title={video.title}
                                        >
                                          {video.title.length > 40
                                            ? `${video.title.substring(
                                                0,
                                                40
                                              )}...`
                                            : video.title}
                                        </div>
                                      </td>
                                      <td className="py-2 px-3 text-sm text-gray-600">
                                        {video.uploaderName || "Unknown"}
                                      </td>
                                      <td className="py-2 px-3 text-sm text-gray-600">
                                        {video.courseName || "Unknown Course"}
                                      </td>
                                      <td className="py-2 px-3 text-sm text-gray-600">
                                        {Math.round((video.duration || 0) / 60)}
                                        min
                                      </td>
                                      <td className="py-2 px-3">
                                        <span
                                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                            video.status === "approved"
                                              ? "bg-green-100 text-green-800"
                                              : video.status === "pending"
                                              ? "bg-yellow-100 text-yellow-800"
                                              : "bg-red-100 text-red-800"
                                          }`}
                                        >
                                          {video.status === "approved"
                                            ? "✅"
                                            : video.status === "pending"
                                            ? "⏳"
                                            : "❌"}
                                          {video.status
                                            .charAt(0)
                                            .toUpperCase() +
                                            video.status.slice(1)}
                                        </span>
                                      </td>
                                      <td className="py-2 px-3 text-sm text-gray-600">
                                        {new Date(
                                          video.createdAt
                                        ).toLocaleDateString("en-US", {
                                          month: "short",
                                          day: "numeric",
                                          year: "2-digit",
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
                              <svg
                                className="w-16 h-16 text-gray-300 mx-auto mb-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="1.5"
                                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                                />
                              </svg>
                            </div>
                            <p className="text-xl font-bold text-gray-500 mb-2">
                              No Recent Uploads
                            </p>
                            <p className="text-gray-400 max-w-sm mx-auto">
                              Recent videos will appear here once content is submitted for review
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

        {/* Enhanced Student Details Popup */}
        {showStudentPopup && selectedStudent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[85vh] overflow-y-auto">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 text-white">
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-white bg-opacity-20 flex items-center justify-center border-2 border-white border-opacity-30">
                      {selectedStudent.student?.profilePhoto || selectedStudent.student?.profilePicture || selectedStudent.student?.avatar ? (
                        <img
                          src={selectedStudent.student?.profilePhoto || selectedStudent.student?.profilePicture || selectedStudent.student?.avatar}
                          alt={`${selectedStudent.student?.firstName || ''} ${selectedStudent.student?.lastName || ''}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              parent.innerHTML = `<span class="text-2xl font-bold">${selectedStudent.student?.firstName?.charAt(0) || 'S'}${selectedStudent.student?.lastName?.charAt(0) || 'T'}</span>`;
                            }
                          }}
                        />
                      ) : (
                        <span className="text-2xl font-bold">
                          {selectedStudent.student?.firstName?.charAt(0) || 'S'}
                          {selectedStudent.student?.lastName?.charAt(0) || 'T'}
                        </span>
                      )}
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold">
                        {selectedStudent.student?.firstName || ''} {selectedStudent.student?.lastName || ''}
                      </h2>
                      <p className="text-blue-100">{selectedStudent.student?.email || 'No email'}</p>
                      <p className="text-blue-100 text-sm">{selectedStudent.student?.phone || 'No phone'}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowStudentPopup(false)}
                    className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-all duration-200"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Performance Summary Cards */}
              <div className="p-6 bg-gray-50 border-b">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 shadow-sm text-white">
                    <p className="text-xs font-medium mb-1 opacity-90">Course Progress</p>
                    <p className="text-3xl font-bold">{Math.round(selectedStudent.courseProgress || 0)}%</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 shadow-sm text-white">
                    <p className="text-xs font-medium mb-1 opacity-90">Avg Assessment</p>
                    <p className="text-3xl font-bold">{Math.round(selectedStudent.avgTestScore || 0)}%</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-4 shadow-sm text-white">
                    <p className="text-xs font-medium mb-1 opacity-90">Avg Quiz</p>
                    <p className="text-3xl font-bold">{Math.round(selectedStudent.avgQuizScore || 0)}%</p>
                  </div>
                  <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-4 shadow-sm text-white">
                    <p className="text-xs font-medium mb-1 opacity-90">Total Activities</p>
                    <p className="text-3xl font-bold">
                      {(selectedStudent.assessments?.length || 0) + (selectedStudent.quizzes?.length || 0)}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg p-4 shadow-sm text-white">
                    <p className="text-xs font-medium mb-1 opacity-90">Overall Score</p>
                    <p className="text-3xl font-bold">
                      {(() => {
                        const avgTest = selectedStudent.avgTestScore || 0;
                        const avgQuiz = selectedStudent.avgQuizScore || 0;
                        const hasTest = (selectedStudent.assessments?.length || 0) > 0;
                        const hasQuiz = (selectedStudent.quizzes?.length || 0) > 0;
                        if (hasTest && hasQuiz) return Math.round((avgTest + avgQuiz) / 2);
                        if (hasTest) return Math.round(avgTest);
                        if (hasQuiz) return Math.round(avgQuiz);
                        return 0;
                      })()}%
                    </p>
                  </div>
                </div>

                {/* Additional Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-600 font-medium">Engagement</p>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                        ((selectedStudent.assessments?.length || 0) + (selectedStudent.quizzes?.length || 0)) >= 10
                          ? 'bg-green-100 text-green-800'
                          : ((selectedStudent.assessments?.length || 0) + (selectedStudent.quizzes?.length || 0)) >= 5
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {((selectedStudent.assessments?.length || 0) + (selectedStudent.quizzes?.length || 0)) >= 10
                          ? 'High'
                          : ((selectedStudent.assessments?.length || 0) + (selectedStudent.quizzes?.length || 0)) >= 5
                          ? 'Medium'
                          : 'Low'}
                      </span>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
                    <p className="text-xs text-gray-600 font-medium mb-1">Success Rate</p>
                    <p className="text-lg font-bold text-gray-900">
                      {(() => {
                        const assessments = selectedStudent.assessments || [];
                        const passed = assessments.filter((a: any) => (a.score || 0) >= 50).length;
                        const total = assessments.length;
                        return total > 0 ? `${passed}/${total}` : '0/0';
                      })()}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
                    <p className="text-xs text-gray-600 font-medium mb-1">Last Activity</p>
                    <p className="text-xs font-bold text-gray-900">
                      {selectedStudent.latestDate
                        ? new Date(selectedStudent.latestDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        : 'N/A'}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-600 font-medium">Performance</p>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                        (() => {
                          const avgTest = selectedStudent.avgTestScore || 0;
                          const avgQuiz = selectedStudent.avgQuizScore || 0;
                          const overall = (avgTest + avgQuiz) / 2;
                          return overall >= 90 ? 'bg-green-100 text-green-800'
                            : overall >= 75 ? 'bg-blue-100 text-blue-800'
                            : overall >= 60 ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800';
                        })()
                      }`}>
                        {(() => {
                          const avgTest = selectedStudent.avgTestScore || 0;
                          const avgQuiz = selectedStudent.avgQuizScore || 0;
                          const overall = (avgTest + avgQuiz) / 2;
                          return overall >= 90 ? 'Excellent'
                            : overall >= 75 ? 'Good'
                            : overall >= 60 ? 'Fair'
                            : 'Poor';
                        })()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {/* Assessment History Section */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl font-bold text-gray-900 flex items-center">
                      <svg className="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Assessment History
                    </h3>
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                      {selectedStudent.assessments?.length || 0} Assessments
                    </span>
                  </div>
                  {selectedStudent.assessments && selectedStudent.assessments.length > 0 ? (
                    <div className="space-y-4">
                      {selectedStudent.assessments.map((assessment: any, index: number) => (
                        <div
                          key={index}
                          className="border border-gray-200 rounded-xl p-5 hover:shadow-lg transition-all duration-200 bg-gradient-to-r from-white to-gray-50"
                        >
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h4 className="font-bold text-lg text-gray-900">
                                Assessment #{index + 1} - Step {assessment.step || 'N/A'}
                              </h4>
                              <p className="text-sm text-gray-600">
                                Completed: {assessment.completedAt ? new Date(assessment.completedAt).toLocaleString() : 'In Progress'}
                              </p>
                            </div>
                            <div className="text-right">
                              <div className={`text-3xl font-bold ${
                                assessment.score >= 90 ? "text-green-600" :
                                assessment.score >= 75 ? "text-blue-600" :
                                assessment.score >= 50 ? "text-yellow-600" : "text-red-600"
                              }`}>
                                {assessment.score || 0}%
                              </div>
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                assessment.certificationLevel === "Failed" ? "bg-red-100 text-red-800" :
                                assessment.certificationLevel === "C2" ? "bg-purple-100 text-purple-800" :
                                assessment.certificationLevel === "C1" ? "bg-indigo-100 text-indigo-800" :
                                assessment.certificationLevel === "B2" ? "bg-blue-100 text-blue-800" :
                                assessment.certificationLevel === "B1" ? "bg-cyan-100 text-cyan-800" :
                                assessment.certificationLevel === "A2" ? "bg-green-100 text-green-800" :
                                "bg-yellow-100 text-yellow-800"
                              }`}>
                                {assessment.certificationLevel || 'N/A'}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4">
                            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                              <p className="text-xs text-blue-700 font-medium">Questions</p>
                              <p className="text-lg font-bold text-blue-900">{assessment.questions?.length || 0}</p>
                            </div>
                            <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                              <p className="text-xs text-green-700 font-medium">Correct</p>
                              <p className="text-lg font-bold text-green-900">
                                {assessment.questions?.filter((q: any) => q.isCorrect).length || 0}
                              </p>
                            </div>
                            <div className="bg-red-50 p-3 rounded-lg border border-red-100">
                              <p className="text-xs text-red-700 font-medium">Wrong</p>
                              <p className="text-lg font-bold text-red-900">
                                {assessment.questions?.filter((q: any) => !q.isCorrect).length || 0}
                              </p>
                            </div>
                            <div className="bg-purple-50 p-3 rounded-lg border border-purple-100">
                              <p className="text-xs text-purple-700 font-medium">Accuracy</p>
                              <p className="text-lg font-bold text-purple-900">
                                {assessment.questions?.length ? Math.round((assessment.questions.filter((q: any) => q.isCorrect).length / assessment.questions.length) * 100) : 0}%
                              </p>
                            </div>
                            <div className="bg-orange-50 p-3 rounded-lg border border-orange-100">
                              <p className="text-xs text-orange-700 font-medium">Time</p>
                              <p className="text-lg font-bold text-orange-900">
                                {assessment.totalCompletionTime ? `${Math.floor(assessment.totalCompletionTime / 60)}m ${assessment.totalCompletionTime % 60}s` : 'N/A'}
                              </p>
                            </div>
                            <div className={`p-3 rounded-lg border ${
                              assessment.status === 'completed' ? 'bg-green-50 border-green-100' : 'bg-yellow-50 border-yellow-100'
                            }`}>
                              <p className={`text-xs font-medium ${
                                assessment.status === 'completed' ? 'text-green-700' : 'text-yellow-700'
                              }`}>Status</p>
                              <p className={`text-lg font-bold ${
                                assessment.status === 'completed' ? 'text-green-900' : 'text-yellow-900'
                              }`}>{assessment.status || 'N/A'}</p>
                            </div>
                          </div>

                          {/* Detailed Breakdown */}
                          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <p className="text-sm font-semibold text-gray-700 mb-2">Performance Breakdown:</p>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                              <div>
                                <p className="text-xs text-gray-600">Reading Skills</p>
                                <p className="text-sm font-bold text-gray-900">
                                  {(() => {
                                    const readingQuestions = assessment.questions?.filter((q: any) =>
                                      q.questionType?.toLowerCase().includes('reading') || q.category?.toLowerCase().includes('reading')
                                    ) || [];
                                    const correct = readingQuestions.filter((q: any) => q.isCorrect).length;
                                    return readingQuestions.length > 0 ? `${correct}/${readingQuestions.length}` : 'N/A';
                                  })()}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-600">Writing Skills</p>
                                <p className="text-sm font-bold text-gray-900">
                                  {(() => {
                                    const writingQuestions = assessment.questions?.filter((q: any) =>
                                      q.questionType?.toLowerCase().includes('writing') || q.category?.toLowerCase().includes('writing')
                                    ) || [];
                                    const correct = writingQuestions.filter((q: any) => q.isCorrect).length;
                                    return writingQuestions.length > 0 ? `${correct}/${writingQuestions.length}` : 'N/A';
                                  })()}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-600">Average Time/Question</p>
                                <p className="text-sm font-bold text-gray-900">
                                  {assessment.totalCompletionTime && assessment.questions?.length
                                    ? `${Math.round(assessment.totalCompletionTime / assessment.questions.length)}s`
                                    : 'N/A'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-gray-500 font-medium">No assessment data available</p>
                    </div>
                  )}
                </div>

                {/* Quiz History Section */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl font-bold text-gray-900 flex items-center">
                      <svg className="w-6 h-6 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Quiz History
                    </h3>
                    <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                      {selectedStudent.quizzes?.length || 0} Quizzes
                    </span>
                  </div>
                  {selectedStudent.quizzes && selectedStudent.quizzes.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedStudent.quizzes.map((quiz: any, index: number) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all bg-white">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="font-semibold text-gray-900">{quiz.quizId?.title || `Quiz #${index + 1}`}</h4>
                              <p className="text-xs text-gray-600">{quiz.quizId?.type || 'N/A'}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {quiz.submittedAt ? new Date(quiz.submittedAt).toLocaleDateString() : 'N/A'}
                              </p>
                            </div>
                            <div className={`text-2xl font-bold ${
                              quiz.percentage >= 90 ? "text-green-600" :
                              quiz.percentage >= 75 ? "text-blue-600" :
                              quiz.percentage >= 50 ? "text-yellow-600" : "text-red-600"
                            }`}>
                              {quiz.percentage || 0}%
                            </div>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Correct: <span className="font-semibold text-green-600">{quiz.correctAnswers || 0}</span></span>
                            <span className="text-gray-600">Total: <span className="font-semibold">{quiz.totalQuestions || 0}</span></span>
                            <span className={`font-semibold ${quiz.status === 'completed' ? 'text-green-600' : 'text-yellow-600'}`}>
                              {quiz.status || 'N/A'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <p className="text-gray-500">No quiz data available</p>
                    </div>
                  )}
                </div>
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
