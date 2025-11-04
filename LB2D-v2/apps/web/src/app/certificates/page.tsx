'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useNotification } from '@/hooks/useNotification';
import { appConfig } from '@/config/app.config';

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

const CertificatesPage = () => {
  const router = useRouter();
  const { user } = useAuthStore();
  const { showSuccess, showError } = useNotification();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [testHistory, setTestHistory] = useState<TestHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadingCert, setDownloadingCert] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'certificates' | 'history'>('certificates');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = typeof window !== 'undefined' ? sessionStorage.getItem('accessToken') : null;

        const response = await fetch(`${appConfig.api.baseUrl}/tests/history`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setTestHistory(data.data || []);
            const filteredCerts =
              data.data?.filter(
                (test: any) => test.certificationLevel && test.score >= 60
              ) || [];
            setCertificates(filteredCerts);
          }
        }
      } catch (error) {
        // Error fetching test data
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleDownloadCertificate = async (test: any) => {
    setDownloadingCert(test._id);
    try {
      const token = typeof window !== 'undefined' ? sessionStorage.getItem('accessToken') : null;
      const response = await fetch(`${appConfig.api.baseUrl}/tests/certificate/${test._id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

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
        showSuccess('Certificate downloaded successfully!');
      } else {
        showError('Failed to download certificate. Please try again.');
      }
    } catch (error) {
      showError('Failed to download certificate. Please try again.');
    } finally {
      setDownloadingCert(null);
    }
  };

  const getLevelColor = (level: string) => {
    const colors: Record<string, string> = {
      A1: 'bg-green-600',
      A2: 'bg-blue-600',
      B1: 'bg-yellow-600',
      B2: 'bg-purple-600',
      C1: 'bg-red-600',
      C2: 'bg-gray-800',
    };
    return colors[level] || 'bg-gray-600';
  };

  const getLevelDescription = (level: string) => {
    const descriptions: Record<string, string> = {
      A1: 'Breakthrough or Beginner - Can understand and use familiar everyday expressions and basic phrases',
      A2: 'Waystage or Elementary - Can communicate in simple and routine tasks requiring direct exchange',
      B1: 'Threshold or Intermediate - Can deal with most situations likely to arise whilst travelling',
      B2: 'Vantage or Upper Intermediate - Can interact with native speakers with fluency and spontaneity',
      C1: 'Effective Operational Proficiency - Can express ideas fluently and spontaneously',
      C2: 'Mastery or Proficiency - Near-native level with nuanced expression and cultural understanding',
    };
    return descriptions[level] || 'Unknown level';
  };

  const getCertificateNumber = (cert: Certificate): string => {
    return (
      cert.certificateNumber ||
      `GER-${cert.certificationLevel}-${new Date(cert.createdAt).getFullYear()}-${cert._id
        .slice(-6)
        .toUpperCase()}`
    );
  };

  const getValidUntil = (cert: Certificate): string => {
    const createdDate = new Date(cert.createdAt);
    const validUntil = new Date(createdDate.getTime() + 2 * 365 * 24 * 60 * 60 * 1000);
    return validUntil.toLocaleDateString();
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-8 sm:py-10 md:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">My Certificates</h1>
          <p className="text-sm sm:text-base text-blue-100">
            View and download your German language proficiency certificates
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4 relative z-10 py-6">
        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-1">
            <nav className="flex gap-1">
              <button
                onClick={() => setActiveTab('certificates')}
                className={`flex-1 flex items-center justify-center gap-3 py-3 px-4 rounded-lg font-semibold text-sm transition-colors ${
                  activeTab === 'certificates'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span>My Certificates</span>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-bold ${
                    activeTab === 'certificates'
                      ? 'bg-white bg-opacity-25 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {certificates.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('history')}
                className={`flex-1 flex items-center justify-center gap-3 py-3 px-4 rounded-lg font-semibold text-sm transition-colors ${
                  activeTab === 'history'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span>Test History</span>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-bold ${
                    activeTab === 'history'
                      ? 'bg-white bg-opacity-25 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {testHistory.length}
                </span>
              </button>
            </nav>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-6 border border-gray-200">
          <h2 className="text-base sm:text-lg font-bold bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 bg-clip-text text-transparent mb-4">
            Overview
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Certificates Earned</p>
              <p className="text-2xl font-bold text-gray-900">{certificates.length}</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Highest Score</p>
              <p className="text-2xl font-bold text-gray-900">
                {testHistory.length > 0 ? Math.max(...testHistory.map((c) => c.score)) : 0}%
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Total Assessments</p>
              <p className="text-2xl font-bold text-gray-900">{testHistory.length}</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Latest Assessment</p>
              <p className="text-lg font-bold text-gray-900">
                {testHistory.length > 0
                  ? new Date(testHistory[testHistory.length - 1].createdAt).toLocaleDateString(
                      'en-US',
                      { month: 'short', day: 'numeric', year: 'numeric' }
                    )
                  : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Learning Progress */}
        {testHistory.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Learning Progress</h3>
              <span className="text-sm text-gray-600">CEFR Levels</span>
            </div>

            <div className="flex items-center justify-between mb-6">
              {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((level) => {
                const hasLevel = certificates.some(
                  (cert) => cert.certificationLevel === level
                );

                return (
                  <div key={level} className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                        hasLevel ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {level}
                    </div>
                    <span
                      className={`text-xs mt-2 font-medium ${
                        hasLevel ? 'text-green-600' : 'text-gray-500'
                      }`}
                    >
                      {hasLevel ? 'Certified' : ''}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xl font-bold text-gray-900">
                    {Math.round((certificates.length / 6) * 100)}%
                  </p>
                  <p className="text-xs text-gray-600">Complete</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900">{certificates.length}</p>
                  <p className="text-xs text-gray-600">Mastered</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900">{6 - certificates.length}</p>
                  <p className="text-xs text-gray-600">Remaining</p>
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
            {activeTab === 'certificates' &&
              (certificates.length === 0 ? (
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 sm:p-8 md:p-12 text-center">
                  <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">
                    No Certificates Yet
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600 mb-6 px-2">
                    Take an assessment to earn your first German language certificate
                  </p>
                  <button
                    onClick={() => router.push('/assessment')}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors min-h-[44px] text-sm sm:text-base"
                  >
                    Start Assessment
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {certificates.map((cert) => (
                    <div
                      key={cert._id}
                      className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden"
                    >
                      {/* Certificate Header */}
                      <div
                        className={`${getLevelColor(cert.certificationLevel)} p-6 text-white`}
                      >
                        <div className="text-center">
                          <h3 className="text-3xl font-bold mb-2">
                            LEVEL {cert.certificationLevel}
                          </h3>
                          <p className="text-sm opacity-90 mb-3">German Language Certificate</p>
                          <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg px-3 py-2 inline-block">
                            <p className="text-xs font-mono">{getCertificateNumber(cert)}</p>
                          </div>
                        </div>
                      </div>

                      {/* Certificate Body */}
                      <div className="p-6">
                        <div className="text-center mb-4">
                          <div className="text-4xl font-bold text-gray-900 mb-2">
                            {cert.score}%
                          </div>
                          <p className="text-sm text-gray-600 italic">
                            {getLevelDescription(cert.certificationLevel)}
                          </p>
                        </div>

                        <div className="border-t border-gray-200 pt-4 space-y-3">
                          <div className="bg-gray-50 rounded-lg p-3">
                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div>
                                <p className="text-gray-600">Issue Date</p>
                                <p className="font-semibold text-gray-900">
                                  {new Date(cert.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-600">Valid Until</p>
                                <p className="font-semibold text-gray-900">{getValidUntil(cert)}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Assessment</p>
                                <p className="font-semibold text-gray-900">Step {cert.step}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Status</p>
                                <p className="font-semibold text-green-600">Valid</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Action Button */}
                        <div className="mt-4">
                          <button
                            onClick={() => handleDownloadCertificate(cert)}
                            disabled={downloadingCert === cert._id}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
                          >
                            {downloadingCert === cert._id
                              ? 'Downloading...'
                              : 'Download Certificate'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}

            {/* Test History Tab */}
            {activeTab === 'history' &&
              (testHistory.length === 0 ? (
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 sm:p-8 md:p-12 text-center">
                  <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">
                    No Test History
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600 mb-6 px-2">
                    Take your first assessment to see your progress history
                  </p>
                  <button
                    onClick={() => router.push('/assessment')}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors min-h-[44px] text-sm sm:text-base"
                  >
                    Start Assessment
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                  <div className="bg-blue-600 p-3 sm:p-4">
                    <h3 className="text-base sm:text-lg font-bold text-white">
                      Assessment History
                    </h3>
                    <p className="text-blue-100 text-xs sm:text-sm mt-1">
                      Track your progress over time
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm sm:text-base">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">
                            Date
                          </th>
                          <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">
                            Step
                          </th>
                          <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">
                            Score
                          </th>
                          <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">
                            Level
                          </th>
                          <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700 hidden md:table-cell">
                            Status
                          </th>
                          <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {testHistory.map((test: any) => (
                          <tr key={test._id}>
                            <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-700 whitespace-nowrap">
                              {new Date(test.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-3 sm:px-6 py-3 sm:py-4">
                              <span className="px-2 sm:px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium whitespace-nowrap">
                                Step {test.step}
                              </span>
                            </td>
                            <td className="px-3 sm:px-6 py-3 sm:py-4">
                              <span
                                className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                                  test.score >= 75
                                    ? 'bg-green-100 text-green-800'
                                    : test.score >= 50
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {test.score}%
                              </span>
                            </td>
                            <td className="px-3 sm:px-6 py-3 sm:py-4">
                              <span className="px-2 sm:px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium whitespace-nowrap">
                                {test.certificationLevel || 'N/A'}
                              </span>
                            </td>
                            <td className="px-3 sm:px-6 py-3 sm:py-4 hidden md:table-cell">
                              <span
                                className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                                  test.status === 'completed'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {test.status}
                              </span>
                            </td>
                            <td className="px-3 sm:px-6 py-3 sm:py-4">
                              {test.certificationLevel && test.score >= 60 ? (
                                <button
                                  onClick={() => handleDownloadCertificate(test)}
                                  disabled={downloadingCert === test._id}
                                  className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 whitespace-nowrap min-h-[44px] sm:min-h-0"
                                >
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
              ))}
          </>
        )}
      </div>
    </div>
  );
};

export default CertificatesPage;
