import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { RootState } from '../store/store';

interface Certificate {
  _id: string;
  testId: string;
  step: number;
  score: number;
  certificationLevel: string;
  createdAt: string;
  completedAt: string;
  courseName?: string;
  certificateNumber?: string;
  validUntil?: string;
  institutionName?: string;
  instructorName?: string;
  creditsEarned?: number;
  skillsAssessed?: string[];
}

interface TestHistory {
  _id: string;
  step: number;
  score: number;
  certificationLevel: string;
  status: string;
  createdAt: string;
  completedAt: string;
}

const Certificates: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [testHistory, setTestHistory] = useState<TestHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadingCert, setDownloadingCert] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'certificates' | 'history'>('certificates');
  const [previewCert, setPreviewCert] = useState<Certificate | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = sessionStorage.getItem('accessToken');
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
        
        const response = await fetch(`${apiUrl}/tests/history`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            // All test history
            setTestHistory(data.data || []);
            
            // Filter only completed tests with certification levels for certificates
            const filteredCerts = data.data?.filter((test: any) => 
              test.certificationLevel && test.score >= 60
            ) || [];
            setCertificates(filteredCerts);
          }
        }
      } catch (error) {
        console.error('Failed to fetch test data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleDownloadCertificate = async (test: any) => {
    setDownloadingCert(test._id);
    try {
      const token = sessionStorage.getItem('accessToken');
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const response = await fetch(
        `${apiUrl}/tests/certificate/${test._id}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `certificate_${test.certificationLevel}_${test._id}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        alert('Certificate downloaded successfully!');
      } else {
        alert('Failed to download certificate');
      }
    } catch (error) {
      console.error('Failed to download certificate:', error);
      alert('Failed to download certificate. Please try again.');
    } finally {
      setDownloadingCert(null);
    }
  };

  const getLevelColor = (level: string) => {
    const colors: Record<string, string> = {
      'A1': 'from-green-500 to-emerald-500',
      'A2': 'from-blue-500 to-cyan-500',
      'B1': 'from-yellow-500 to-orange-500',
      'B2': 'from-purple-500 to-pink-500',
      'C1': 'from-red-500 to-rose-500',
      'C2': 'from-gray-700 to-gray-900'
    };
    return colors[level] || 'from-gray-500 to-gray-600';
  };

  const getLevelDescription = (level: string) => {
    const descriptions: Record<string, string> = {
      'A1': 'Breakthrough or Beginner - Can understand and use familiar everyday expressions and basic phrases',
      'A2': 'Waystage or Elementary - Can communicate in simple and routine tasks requiring direct exchange',
      'B1': 'Threshold or Intermediate - Can deal with most situations likely to arise whilst travelling',
      'B2': 'Vantage or Upper Intermediate - Can interact with native speakers with fluency and spontaneity',
      'C1': 'Effective Operational Proficiency - Can express ideas fluently and spontaneously',
      'C2': 'Mastery or Proficiency - Near-native level with nuanced expression and cultural understanding'
    };
    return descriptions[level] || 'Unknown level';
  };

  const getLevelSkills = (level: string): string[] => {
    const skills: Record<string, string[]> = {
      'A1': ['Basic vocabulary', 'Simple phrases', 'Personal information', 'Present tense'],
      'A2': ['Past and future tense', 'Shopping & dining', 'Describing experiences', 'Simple conversations'],
      'B1': ['Complex grammar', 'Travel situations', 'Expressing opinions', 'Work-related topics'],
      'B2': ['Abstract topics', 'Technical discussions', 'Detailed arguments', 'Media comprehension'],
      'C1': ['Professional communication', 'Academic writing', 'Cultural nuances', 'Implicit meanings'],
      'C2': ['Native-like fluency', 'Literary texts', 'Complex negotiations', 'Specialized terminology']
    };
    return skills[level] || [];
  };

  const getCertificateNumber = (cert: Certificate): string => {
    return cert.certificateNumber || `GER-${cert.certificationLevel}-${new Date(cert.createdAt).getFullYear()}-${cert._id.slice(-6).toUpperCase()}`;
  };

  const getValidUntil = (cert: Certificate): string => {
    const createdDate = new Date(cert.createdAt);
    const validUntil = new Date(createdDate.getTime() + (2 * 365 * 24 * 60 * 60 * 1000)); // 2 years validity
    return validUntil.toLocaleDateString();
  };

  const getVerificationUrl = (cert: Certificate): string => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/verify-certificate/${getCertificateNumber(cert)}`;
  };

  const handleShareCertificate = async (cert: Certificate) => {
    const shareData = {
      title: `German Language Certificate - Level ${cert.certificationLevel}`,
      text: `I've earned a ${cert.certificationLevel} level German language certificate with a score of ${cert.score}%!`,
      url: getVerificationUrl(cert)
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        console.log('Error sharing:', error);
        copyToClipboard(getVerificationUrl(cert));
      }
    } else {
      copyToClipboard(getVerificationUrl(cert));
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('Certificate verification link copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Certificate verification link copied to clipboard!');
    }
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Custom Animations */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes shimmer {
          0% {
            background-position: -468px 0;
          }
          100% {
            background-position: 468px 0;
          }
        }
        
        .shimmer {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
          background-size: 468px 100%;
          animation: shimmer 2s infinite linear;
        }
        
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        
        .float-animation {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
      
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-teal-700 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-white to-purple-100 bg-clip-text text-transparent">
            🏆 My Certificates
          </h1>
          <p className="text-xl md:text-2xl text-purple-100 max-w-3xl mx-auto">
            View and download your German language proficiency certificates
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
        {/* Enhanced Tab Navigation */}
        <div className="mb-8">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-2">
            <nav className="flex space-x-2">
              <button
                onClick={() => setActiveTab('certificates')}
                className={`flex-1 flex items-center justify-center space-x-3 py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-300 transform relative ${
                  activeTab === 'certificates'
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg scale-105'
                    : 'text-gray-600'
                } ${certificates.length === 0 && activeTab !== 'certificates' ? 'ring-2 ring-yellow-400 ring-opacity-50' : ''}`}
              >
                <span className="text-2xl">🏆</span>
                <div className="flex flex-col items-start">
                  <span className="font-bold">My Certificates</span>
                  <span className="text-xs opacity-80">Your achievements</span>
                </div>
                <span className={`rounded-full px-3 py-1 text-sm font-bold transition-all duration-300 ${
                  activeTab === 'certificates'
                    ? 'bg-white bg-opacity-25 text-white'
                    : certificates.length === 0 
                      ? 'bg-yellow-100 text-yellow-800 animate-pulse' 
                      : 'bg-purple-100 text-purple-600'
                } ${certificates.length > 0 ? 'animate-pulse' : ''}`}>
                  {certificates.length}
                  {certificates.length > 0 ? (
                    <span className="ml-1 text-xs">🎉</span>
                  ) : (
                    <span className="ml-1 text-xs">➕</span>
                  )}
                </span>
              </button>
              
              <button
                onClick={() => setActiveTab('history')}
                className={`flex-1 flex items-center justify-center space-x-3 py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-300 transform relative ${
                  activeTab === 'history'
                    ? 'bg-gradient-to-r from-blue-600 to-teal-600 text-white shadow-lg scale-105'
                    : 'text-gray-600'
                } ${testHistory.length === 0 && activeTab !== 'history' ? 'ring-2 ring-orange-400 ring-opacity-50' : ''}`}
              >
                <span className="text-2xl">📊</span>
                <div className="flex flex-col items-start">
                  <span className="font-bold">Test History</span>
                  <span className="text-xs opacity-80">All assessments</span>
                </div>
                <span className={`rounded-full px-3 py-1 text-sm font-bold transition-all duration-300 ${
                  activeTab === 'history'
                    ? 'bg-white bg-opacity-25 text-white'
                    : testHistory.length === 0 
                      ? 'bg-orange-100 text-orange-800 animate-pulse' 
                      : 'bg-blue-100 text-blue-600'
                } ${testHistory.length > 0 ? 'animate-pulse' : ''}`}>
                  {testHistory.length}
                  {testHistory.length > 0 ? (
                    <span className="ml-1 text-xs">📈</span>
                  ) : (
                    <span className="ml-1 text-xs">📝</span>
                  )}
                </span>
              </button>
            </nav>
          </div>
          
          {/* Tab Descriptions */}
          <div className="mt-4 text-center">
            {activeTab === 'certificates' ? (
              <div className={`rounded-lg p-4 ${
                certificates.length === 0 
                  ? 'bg-gradient-to-r from-yellow-100 to-orange-100 border-2 border-yellow-300 border-dashed' 
                  : 'bg-gradient-to-r from-purple-100 to-blue-100'
              }`}>
                <p className={`font-semibold flex items-center justify-center ${
                  certificates.length === 0 ? 'text-orange-800' : 'text-purple-800'
                }`}>
                  <span className="mr-2 text-lg">
                    {certificates.length === 0 ? '🎯' : '✨'}
                  </span>
                  {certificates.length === 0 
                    ? 'Start your journey! Take an assessment to earn your first certificate' 
                    : 'View and download your earned German language certificates'
                  }
                  <span className="ml-2 text-lg">
                    {certificates.length === 0 ? '🚀' : '✨'}
                  </span>
                </p>
                {certificates.length === 0 && (
                  <button
                    onClick={() => navigate('/assessment')}
                    className="mt-3 px-6 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-full font-bold"
                  >
                    📝 Take Your First Assessment
                  </button>
                )}
              </div>
            ) : (
              <div className={`rounded-lg p-4 ${
                testHistory.length === 0 
                  ? 'bg-gradient-to-r from-orange-100 to-red-100 border-2 border-orange-300 border-dashed' 
                  : 'bg-gradient-to-r from-blue-100 to-teal-100'
              }`}>
                <p className={`font-semibold flex items-center justify-center ${
                  testHistory.length === 0 ? 'text-red-800' : 'text-blue-800'
                }`}>
                  <span className="mr-2 text-lg">
                    {testHistory.length === 0 ? '📝' : '📈'}
                  </span>
                  {testHistory.length === 0 
                    ? 'No assessments taken yet! Start your German language journey today' 
                    : 'Track your complete assessment history and progress over time'
                  }
                  <span className="ml-2 text-lg">
                    {testHistory.length === 0 ? '💫' : '📈'}
                  </span>
                </p>
                {testHistory.length === 0 && (
                  <button
                    onClick={() => navigate('/assessment')}
                    className="mt-3 px-6 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-full font-bold"
                  >
                    🎯 Begin Assessment Now
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Stats Overview */}
        <div className="bg-gradient-to-r from-white via-blue-50 to-purple-50 rounded-3xl shadow-2xl p-8 mb-8 border border-blue-200 relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="grid grid-cols-12 gap-2 h-full">
              {Array.from({length: 144}).map((_, i) => (
                <div key={i} className="bg-gradient-to-br from-blue-500 to-purple-500 rounded-full w-2 h-2 animate-pulse" style={{animationDelay: `${i * 0.1}s`}}></div>
              ))}
            </div>
          </div>
          
          <div className="relative z-10">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
                🌟 Your Achievement Dashboard
              </h2>
              <p className="text-gray-600">Track your German language learning journey and celebrate your progress!</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 via-orange-400 to-red-500 rounded-full flex items-center justify-center text-3xl mb-4 mx-auto shadow-xl relative">
                  <div className="absolute inset-0 bg-white opacity-20 rounded-full animate-ping"></div>
                  🏆
                </div>
                <h3 className="text-3xl font-bold text-gray-800 mb-1">{certificates.length}</h3>
                <p className="text-sm text-gray-600 font-medium">Certificates Earned</p>
                <div className="w-16 h-1 bg-gradient-to-r from-yellow-400 to-red-500 rounded-full mx-auto mt-2"></div>
                {certificates.length > 0 && (
                  <p className="text-xs text-green-600 font-semibold mt-2">🎉 Well done!</p>
                )}
              </div>
              
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-green-400 via-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-3xl mb-4 mx-auto shadow-xl relative">
                  <div className="absolute inset-0 bg-white opacity-20 rounded-full animate-ping" style={{animationDelay: '0.2s'}}></div>
                  📈
                </div>
                <h3 className="text-3xl font-bold text-gray-800 mb-1">
                  {testHistory.length > 0 ? Math.max(...testHistory.map(c => c.score)) : 0}%
                </h3>
                <p className="text-sm text-gray-600 font-medium">Highest Score</p>
                <div className="w-16 h-1 bg-gradient-to-r from-green-400 to-teal-600 rounded-full mx-auto mt-2"></div>
                {testHistory.length > 0 && Math.max(...testHistory.map(c => c.score)) >= 90 && (
                  <p className="text-xs text-green-600 font-semibold mt-2">🌟 Excellent!</p>
                )}
              </div>
              
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-400 via-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-3xl mb-4 mx-auto shadow-xl relative">
                  <div className="absolute inset-0 bg-white opacity-20 rounded-full animate-ping" style={{animationDelay: '0.4s'}}></div>
                  📝
                </div>
                <h3 className="text-3xl font-bold text-gray-800 mb-1">
                  {testHistory.length}
                </h3>
                <p className="text-sm text-gray-600 font-medium">Total Assessments</p>
                <div className="w-16 h-1 bg-gradient-to-r from-blue-400 to-purple-600 rounded-full mx-auto mt-2"></div>
                {testHistory.length >= 5 && (
                  <p className="text-xs text-blue-600 font-semibold mt-2">💪 Dedicated!</p>
                )}
              </div>
              
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-400 via-pink-500 to-rose-600 rounded-full flex items-center justify-center text-3xl mb-4 mx-auto shadow-xl relative">
                  <div className="absolute inset-0 bg-white opacity-20 rounded-full animate-ping" style={{animationDelay: '0.6s'}}></div>
                  📅
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-1">
                  {testHistory.length > 0 ? new Date(testHistory[testHistory.length - 1].createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'}
                </h3>
                <p className="text-sm text-gray-600 font-medium">Latest Assessment</p>
                <div className="w-16 h-1 bg-gradient-to-r from-purple-400 to-rose-600 rounded-full mx-auto mt-2"></div>
                {testHistory.length > 0 && (
                  <p className="text-xs text-purple-600 font-semibold mt-2">📚 Keep going!</p>
                )}
              </div>
            </div>
            
            {/* Progress Motivation */}
            {certificates.length > 0 && (
              <div className="mt-8 text-center">
                <div className="inline-flex items-center bg-gradient-to-r from-green-100 to-blue-100 rounded-full px-6 py-3 shadow-lg">
                  <span className="text-2xl mr-3">🚀</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Learning Streak</p>
                    <p className="text-xs text-gray-600">
                      {certificates.length === 1 ? "First certificate earned! 🎉" :
                       certificates.length < 3 ? "Building momentum! 💪" :
                       certificates.length < 5 ? "On fire! Keep it up! 🔥" :
                       "German language master! 🏆"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Learning Progress Bar */}
        {testHistory.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800 flex items-center">
                <span className="mr-2">📊</span>
                Your Learning Journey
              </h3>
              <span className="text-sm text-gray-600">CEFR Levels</span>
            </div>
            
            <div className="relative">
              {/* Progress Track */}
              <div className="flex items-center justify-between mb-4">
                {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((level, index) => {
                  const hasLevel = certificates.some(cert => cert.certificationLevel === level);
                  const isCurrentLevel = testHistory.length > 0 && 
                    testHistory[testHistory.length - 1].certificationLevel === level;
                  
                  return (
                    <div key={level} className="flex flex-col items-center">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold transition-all duration-500 ${
                        hasLevel 
                          ? 'bg-gradient-to-br from-green-400 to-green-600 shadow-lg' 
                          : isCurrentLevel
                          ? 'bg-gradient-to-br from-blue-400 to-blue-600 shadow-md animate-pulse'
                          : 'bg-gray-300'
                      }`}>
                        {hasLevel ? '✓' : level}
                      </div>
                      <span className={`text-xs mt-2 font-medium ${
                        hasLevel ? 'text-green-600' : isCurrentLevel ? 'text-blue-600' : 'text-gray-500'
                      }`}>
                        {level}
                      </span>
                      {hasLevel && (
                        <span className="text-xs text-green-500 font-semibold">Certified</span>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {/* Connecting Line */}
              <div className="absolute top-6 left-6 right-6 h-1 bg-gray-200 -z-10"></div>
              <div 
                className="absolute top-6 left-6 h-1 bg-gradient-to-r from-green-400 to-blue-500 -z-10 transition-all duration-1000"
                style={{
                  width: `${(certificates.length / 6) * 100}%`
                }}
              ></div>
            </div>
            
            {/* Progress Stats */}
            <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-4 mt-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-blue-600">{Math.round((certificates.length / 6) * 100)}%</p>
                  <p className="text-xs text-gray-600">Journey Complete</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">{certificates.length}</p>
                  <p className="text-xs text-gray-600">Levels Mastered</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-600">{6 - certificates.length}</p>
                  <p className="text-xs text-gray-600">Levels Remaining</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        ) : (
          <>
            {/* Certificates Tab */}
            {activeTab === 'certificates' && (
              certificates.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 md:p-12 text-center" role="region" aria-labelledby="no-certificates-heading">
                  <div className="text-4xl md:text-6xl mb-4" role="img" aria-label="Graduation cap">🎓</div>
                  <h3 id="no-certificates-heading" className="text-xl md:text-2xl font-bold text-gray-800 mb-4">No Certificates Yet</h3>
                  <p className="text-gray-600 mb-8 max-w-md mx-auto">
                    Take an assessment to earn your first German language certificate!
                  </p>
                  <button
                    onClick={() => navigate('/assessment')}
                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold focus:outline-none focus:ring-4 focus:ring-blue-300"
                    aria-label="Start German language assessment"
                  >
                    <span className="mr-2" role="img" aria-label="Document">📝</span>
                    Start Assessment
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
                  {certificates.map((cert, index) => (
                    <div
                      key={cert._id}
                      className="bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden relative"
                      style={{
                        animationDelay: `${index * 0.2}s`,
                        animation: 'fadeInUp 0.8s ease-out forwards'
                      }}
                    >
                      {/* Premium Badge */}
                      <div className="absolute top-4 right-4 z-20">
                        <div className="bg-gradient-to-r from-yellow-400 via-orange-400 to-red-500 text-white px-4 py-2 rounded-full text-xs font-bold shadow-xl transform rotate-12">
                          <span className="flex items-center">
                            <span className="animate-spin mr-1">⭐</span>
                            CERTIFIED
                          </span>
                        </div>
                      </div>

                      {/* Achievement Level Indicator */}
                      <div className="absolute top-4 left-4 z-20">
                        <div className="bg-black bg-opacity-30 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-bold">
                          #{index + 1}
                        </div>
                      </div>

                      {/* Certificate Header */}
                      <div className={`bg-gradient-to-br ${getLevelColor(cert.certificationLevel)} p-8 text-white relative overflow-hidden`}>
                        {/* Animated Background Pattern */}
                        <div className="absolute inset-0 opacity-20">
                          <div className="absolute top-0 left-0 w-full h-full">
                            <div className="grid grid-cols-8 gap-2 h-full opacity-50">
                              {Array.from({length: 32}).map((_, i) => (
                                <div 
                                  key={i} 
                                  className="bg-white rounded-full w-2 h-2 animate-pulse" 
                                  style={{animationDelay: `${i * 0.1}s`}}
                                ></div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Floating Elements */}
                        <div className="absolute top-2 right-8 text-white opacity-30 animate-bounce">
                          <span className="text-2xl">✨</span>
                        </div>
                        <div className="absolute bottom-2 left-8 text-white opacity-30 animate-bounce" style={{animationDelay: '0.5s'}}>
                          <span className="text-xl">🌟</span>
                        </div>
                        
                        <div className="text-center relative z-10">
                          <div className="text-6xl mb-4">
                            <span className="animate-pulse">🏆</span>
                          </div>
                          <h3 className="text-4xl font-bold mb-3 tracking-wider">
                            LEVEL {cert.certificationLevel}
                          </h3>
                          <p className="text-xl opacity-95 font-medium mb-2">German Language Certificate</p>
                          <div className="inline-block bg-white bg-opacity-25 backdrop-blur-sm rounded-xl px-4 py-2 mt-3">
                            <p className="text-sm font-mono tracking-wide">{getCertificateNumber(cert)}</p>
                          </div>
                          
                          {/* Achievement Date */}
                          <div className="mt-4 text-sm opacity-80">
                            <span className="inline-flex items-center bg-white bg-opacity-20 rounded-full px-3 py-1">
                              <span className="mr-1">📅</span>
                              Earned on {new Date(cert.createdAt).toLocaleDateString('en-US', { 
                                month: 'long', 
                                day: 'numeric', 
                                year: 'numeric' 
                              })}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Certificate Body */}
                      <div className="p-6 space-y-6">
                        {/* Achievement Score Circle */}
                        <div className="text-center">
                          <div className="relative inline-block">
                            {/* Animated Score Circle */}
                            <div className="relative w-24 h-24">
                              <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                                {/* Background Circle */}
                                <circle
                                  cx="50"
                                  cy="50"
                                  r="40"
                                  stroke="currentColor"
                                  strokeWidth="8"
                                  fill="transparent"
                                  className="text-gray-200"
                                />
                                {/* Progress Circle */}
                                <circle
                                  cx="50"
                                  cy="50"
                                  r="40"
                                  stroke="currentColor"
                                  strokeWidth="8"
                                  fill="transparent"
                                  strokeDasharray={`${2 * Math.PI * 40}`}
                                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - cert.score / 100)}`}
                                  className={`${
                                    cert.score >= 90 ? 'text-green-500' :
                                    cert.score >= 75 ? 'text-blue-500' :
                                    cert.score >= 60 ? 'text-yellow-500' :
                                    'text-red-500'
                                  } transition-all duration-1000 ease-out`}
                                  strokeLinecap="round"
                                />
                              </svg>
                              {/* Score Text */}
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-2xl font-bold text-gray-800">{cert.score}%</span>
                              </div>
                            </div>
                            
                            {/* Score Badge */}
                            <div className={`absolute -bottom-2 -right-2 px-2 py-1 rounded-full text-xs font-bold text-white shadow-lg ${
                              cert.score >= 90 ? 'bg-green-500' :
                              cert.score >= 75 ? 'bg-blue-500' :
                              cert.score >= 60 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}>
                              {cert.score >= 90 ? '🌟 Excellent' :
                               cert.score >= 75 ? '👍 Great' :
                               cert.score >= 60 ? '✓ Good' :
                               'Pass'}
                            </div>
                          </div>
                          
                          <div className="mt-4">
                            <p className="text-sm text-gray-600 leading-relaxed italic">
                              "{getLevelDescription(cert.certificationLevel)}"
                            </p>
                          </div>
                        </div>

                        {/* Skills Demonstrated */}
                        <div className="border-t border-gray-200 pt-4">
                          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                            <span className="mr-2">🎯</span>
                            Skills Demonstrated
                          </h4>
                          <div className="space-y-2">
                            {getLevelSkills(cert.certificationLevel).slice(0, 4).map((skill, index) => (
                              <div key={index} className="flex items-center">
                                <div className="w-2 h-2 bg-green-500 rounded-full mr-3 animate-pulse" style={{animationDelay: `${index * 0.2}s`}}></div>
                                <span className="text-xs text-gray-700 font-medium">{skill}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Certificate Details */}
                        <div className="border-t border-gray-200 pt-4 space-y-3">
                          <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-3">
                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div className="space-y-2">
                                <div className="flex justify-between">
                                  <span className="text-gray-600 flex items-center">
                                    <span className="mr-1">📅</span> Issue Date:
                                  </span>
                                  <span className="font-semibold text-gray-800">{new Date(cert.createdAt).toLocaleDateString()}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600 flex items-center">
                                    <span className="mr-1">⏰</span> Valid Until:
                                  </span>
                                  <span className="font-semibold text-gray-800">{getValidUntil(cert)}</span>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <div className="flex justify-between">
                                  <span className="text-gray-600 flex items-center">
                                    <span className="mr-1">📊</span> Assessment:
                                  </span>
                                  <span className="font-semibold text-gray-800">Step {cert.step}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600 flex items-center">
                                    <span className="mr-1">🏷️</span> Cert ID:
                                  </span>
                                  <span className="font-mono text-xs text-gray-800">#{cert._id.slice(-6).toUpperCase()}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Validity Status */}
                          <div className="text-center">
                            <div className="inline-flex items-center bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-semibold">
                              <span className="mr-1">✅</span>
                              Currently Valid
                            </div>
                          </div>
                        </div>

                        {/* Achievement Celebration */}
                        <div className="border-t border-gray-200 pt-4">
                          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-3 text-center">
                            <p className="text-sm font-semibold text-orange-800 mb-1">
                              🎉 Congratulations on earning this certificate!
                            </p>
                            <p className="text-xs text-orange-600">
                              You've demonstrated {cert.certificationLevel} level German proficiency with {cert.score}% score
                            </p>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="space-y-3 pt-4">
                          <button
                            onClick={() => setPreviewCert(cert)}
                            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-xl font-semibold shimmer relative overflow-hidden"
                          >
                            <span className="flex items-center justify-center relative z-10">
                              <span className="mr-2 text-lg">👁️</span>
                              Preview Certificate
                            </span>
                          </button>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              onClick={() => handleDownloadCertificate(cert)}
                              disabled={downloadingCert === cert._id}
                              className="bg-gradient-to-r from-green-600 to-teal-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50"
                            >
                              {downloadingCert === cert._id ? (
                                <span className="flex items-center justify-center">
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                  <span className="text-sm">Downloading...</span>
                                </span>
                              ) : (
                                <span className="flex items-center justify-center">
                                  <span className="mr-2 text-lg">📥</span>
                                  <span className="text-sm font-bold">Download PDF</span>
                                </span>
                              )}
                            </button>
                            
                            <button
                              onClick={() => handleShareCertificate(cert)}
                              className="bg-gradient-to-r from-orange-500 to-pink-500 text-white py-3 rounded-xl font-semibold"
                            >
                              <span className="flex items-center justify-center">
                                <span className="mr-2 text-lg">🔗</span>
                                <span className="text-sm font-bold">Share Achievement</span>
                              </span>
                            </button>
                          </div>
                          
                          {/* Social Sharing Quick Actions */}
                          <div className="flex justify-center space-x-3 pt-2">
                            <button 
                              onClick={() => {
                                const text = `🎉 I just earned a ${cert.certificationLevel} level German Language Certificate with ${cert.score}% score! 🇩🇪✨ #GermanLanguage #LearnBanglaToTech #Achievement`;
                                if (navigator.share) {
                                  navigator.share({ text });
                                } else {
                                  navigator.clipboard.writeText(text);
                                  alert('Achievement text copied to clipboard!');
                                }
                              }}
                              className="p-2 bg-blue-100 text-blue-600 rounded-full"
                              title="Share on social media"
                            >
                              <span className="text-sm">📱</span>
                            </button>
                            <button 
                              onClick={() => {
                                const email = `mailto:?subject=Check out my German Language Certificate!&body=I just earned a ${cert.certificationLevel} level German Language Certificate with ${cert.score}% score! You can verify it at: ${getVerificationUrl(cert)}`;
                                window.open(email);
                              }}
                              className="p-2 bg-purple-100 text-purple-600 rounded-full"
                              title="Share via email"
                            >
                              <span className="text-sm">📧</span>
                            </button>
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(getVerificationUrl(cert));
                                alert('Verification link copied to clipboard!');
                              }}
                              className="p-2 bg-purple-100 text-purple-600 rounded-full"
                              title="Copy verification link"
                            >
                              <span className="text-sm">📋</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* Test History Tab */}
            {activeTab === 'history' && (
              testHistory.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 md:p-12 text-center" role="region" aria-labelledby="no-history-heading">
                  <div className="text-4xl md:text-6xl mb-4" role="img" aria-label="Chart">📈</div>
                  <h3 id="no-history-heading" className="text-xl md:text-2xl font-bold text-gray-800 mb-4">No Test History</h3>
                  <p className="text-gray-600 mb-8 max-w-md mx-auto">
                    Take your first assessment to see your progress history!
                  </p>
                  <button
                    onClick={() => navigate('/assessment')}
                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold focus:outline-none focus:ring-4 focus:ring-blue-300"
                    aria-label="Start German language assessment"
                  >
                    <span className="mr-2" role="img" aria-label="Document">📝</span>
                    Start Assessment
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                  <div className="bg-gradient-to-r from-teal-600 to-blue-600 p-4">
                    <h3 className="text-xl font-bold text-white flex items-center">
                      <span className="mr-2">📊</span>
                      Your Assessment History
                    </h3>
                    <p className="text-teal-100 text-sm mt-1">Track your German language learning progress</p>
                  </div>
                  <div className="p-6">
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Step</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Score</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Level</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Certificate</th>
                          </tr>
                        </thead>
                        <tbody>
                          {testHistory.map((test: any) => (
                            <tr key={test._id} className="border-b border-gray-100">
                              <td className="px-4 py-4 text-sm text-gray-700">
                                {new Date(test.createdAt).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-4">
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  Step {test.step}
                                </span>
                              </td>
                              <td className="px-4 py-4">
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                  test.score >= 75 ? 'bg-green-100 text-green-800' :
                                  test.score >= 50 ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {test.score}%
                                </span>
                              </td>
                              <td className="px-4 py-4">
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                  {test.certificationLevel || 'N/A'}
                                </span>
                              </td>
                              <td className="px-4 py-4">
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                  test.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {test.status}
                                </span>
                              </td>
                              <td className="px-4 py-4">
                                {test.certificationLevel && test.score >= 60 ? (
                                  <button
                                    onClick={() => handleDownloadCertificate(test)}
                                    disabled={downloadingCert === test._id}
                                    className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full text-xs font-medium disabled:opacity-50"
                                  >
                                    <span className="mr-1">📄</span>
                                    {downloadingCert === test._id ? 'Downloading...' : 'Download'}
                                  </button>
                                ) : (
                                  <span className="text-xs text-gray-400">Not available</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )
            )}
          </>
        )}

        {/* Certificate Preview Modal */}
        {previewCert && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="certificate-preview-title"
            onClick={(e) => e.target === e.currentTarget && setPreviewCert(null)}
          >
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="flex justify-between items-center p-4 md:p-6 border-b border-gray-200">
                <h3 id="certificate-preview-title" className="text-xl md:text-2xl font-bold text-gray-800">Certificate Preview</h3>
                <button
                  onClick={() => setPreviewCert(null)}
                  className="text-gray-500 text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-gray-300 rounded-lg p-1"
                  aria-label="Close certificate preview"
                >
                  ×
                </button>
              </div>

              {/* Certificate Preview */}
              <div className="p-4 md:p-8">
                <div className="bg-gradient-to-br from-white to-gray-50 border-2 border-gray-300 rounded-2xl p-6 md:p-12 shadow-2xl">
                  {/* Certificate Header */}
                  <div className="text-center mb-8">
                    <div className="mb-6">
                      <h1 className="text-2xl md:text-4xl font-bold text-gray-800 mb-2">CERTIFICATE OF ACHIEVEMENT</h1>
                      <div className="w-24 md:w-32 h-1 bg-gradient-to-r from-blue-600 to-purple-600 mx-auto rounded-full"></div>
                    </div>
                    
                    <div className="mb-6">
                      <p className="text-lg text-gray-600 mb-4">This is to certify that</p>
                      <h2 className="text-xl md:text-3xl font-bold text-gray-800 border-b-2 border-gray-300 pb-2 inline-block">
                        {user?.firstName} {user?.lastName}
                      </h2>
                    </div>
                  </div>

                  {/* Certificate Body */}
                  <div className="text-center mb-8">
                    <p className="text-lg text-gray-700 mb-6 leading-relaxed">
                      has successfully completed the German Language Proficiency Assessment
                      and demonstrated competency at the
                    </p>
                    
                    <div className={`inline-block bg-gradient-to-r ${getLevelColor(previewCert.certificationLevel)} text-white px-4 md:px-8 py-3 md:py-4 rounded-2xl mb-6`}>
                      <h3 className="text-xl md:text-3xl font-bold">{previewCert.certificationLevel} LEVEL</h3>
                      <p className="text-sm md:text-lg opacity-90">Common European Framework of Reference</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 mb-6 md:mb-8">
                      <div className="text-left">
                        <h4 className="font-semibold text-gray-800 mb-3 text-sm md:text-base">Assessment Details:</h4>
                        <div className="space-y-2 text-xs md:text-sm">
                          <div className="flex justify-between">
                            <span>Score Achieved:</span>
                            <span className="font-semibold">{previewCert.score}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Assessment Step:</span>
                            <span className="font-semibold">Step {previewCert.step}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Certificate Number:</span>
                            <span className="font-semibold font-mono text-xs break-all">{getCertificateNumber(previewCert)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-left">
                        <h4 className="font-semibold text-gray-800 mb-3 text-sm md:text-base">Skills Assessed:</h4>
                        <div className="space-y-1">
                          {getLevelSkills(previewCert.certificationLevel).map((skill, index) => (
                            <div key={index} className="text-xs md:text-sm text-gray-600 flex items-center">
                              <span className="mr-2 text-green-500" aria-hidden="true">✓</span>
                              {skill}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Certificate Footer */}
                  <div className="border-t border-gray-300 pt-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                      <div>
                        <div className="border-t-2 border-gray-400 pt-2 mt-8">
                          <p className="text-sm font-semibold text-gray-800">Date of Issue</p>
                          <p className="text-sm text-gray-600">{new Date(previewCert.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      
                      <div>
                        <div className="border-t-2 border-gray-400 pt-2 mt-8">
                          <p className="text-sm font-semibold text-gray-800">Authorized Signature</p>
                          <p className="text-sm text-gray-600">Learn Bangla to Deutsch</p>
                        </div>
                      </div>
                      
                      <div>
                        <div className="border-t-2 border-gray-400 pt-2 mt-8">
                          <p className="text-sm font-semibold text-gray-800">Valid Until</p>
                          <p className="text-sm text-gray-600">{getValidUntil(previewCert)}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-center mt-8">
                      <div className="flex items-center justify-center space-x-8 mb-6">
                        {/* QR Code for Verification */}
                        <div className="text-center">
                          <div className="w-20 h-20 bg-gray-200 border-2 border-gray-400 rounded-lg flex items-center justify-center mb-2">
                            <div className="grid grid-cols-4 gap-1">
                              {Array.from({length: 16}).map((_, i) => (
                                <div key={i} className={`w-1 h-1 ${Math.random() > 0.5 ? 'bg-black' : 'bg-white'} rounded-sm`}></div>
                              ))}
                            </div>
                          </div>
                          <p className="text-xs text-gray-500">Scan to Verify</p>
                        </div>
                        
                        {/* Institution Seal */}
                        <div className="text-center">
                          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full border-4 border-gray-300 shadow-lg">
                            <span className="text-white font-bold text-lg">LB2D</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-2">Official Seal</p>
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <p className="text-sm font-semibold text-gray-800">Learn Bangla to Deutsch</p>
                        <p className="text-xs text-gray-500">German Language Institute</p>
                        <p className="text-xs text-gray-400 mt-2 font-mono">Verification: {getVerificationUrl(previewCert).split('/').pop()}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="border-t border-gray-200 p-4 md:p-6 bg-gray-50 rounded-b-2xl">
                <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
                  <button
                    onClick={() => handleDownloadCertificate(previewCert)}
                    disabled={downloadingCert === previewCert._id}
                    className="px-4 md:px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold disabled:opacity-50 focus:outline-none focus:ring-4 focus:ring-blue-300"
                  >
                    {downloadingCert === previewCert._id ? (
                      <span className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Downloading...
                      </span>
                    ) : (
                      <span className="flex items-center">
                        <span className="mr-2">📥</span>
                        Download PDF
                      </span>
                    )}
                  </button>
                  
                  <button
                    onClick={() => handleShareCertificate(previewCert)}
                    className="px-4 md:px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold focus:outline-none focus:ring-4 focus:ring-blue-300"
                  >
                    <span className="flex items-center">
                      <span className="mr-2">🔗</span>
                      Share Certificate
                    </span>
                  </button>
                  
                  <button
                    onClick={() => setPreviewCert(null)}
                    className="px-4 md:px-6 py-3 bg-gray-600 text-white rounded-xl font-semibold focus:outline-none focus:ring-4 focus:ring-gray-300"
                  >
                    Close Preview
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Certificates;