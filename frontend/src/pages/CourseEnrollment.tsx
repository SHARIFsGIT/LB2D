import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Modal from '../components/common/Modal';
import { useCurrency } from '../hooks/useCurrency';
import StripeWrapper from '../components/payment/StripeWrapper';
import StripeCheckout from '../components/payment/StripeCheckout';
import PaymentFallback from '../components/payment/PaymentFallback';
import { useNotification } from '../hooks/useNotification';

interface Course {
  _id: string;
  title: string;
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  description: string;
  duration: number;
  price: number;
  currency: string;
  instructor: string;
  maxStudents: number;
  currentStudents: number;
  startDate: string;
  endDate: string;
  schedule: {
    days: string[];
    time: string;
  };
  features: string[];
  requirements: string[];
}

interface PaymentMethod {
  id: string;
  name: string;
  type: string;
}

const CourseEnrollment: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { convertEuroToTaka, formatCurrency } = useCurrency();
  const { showSuccess, showError } = useNotification();
  
  const levelGradients = {
    A1: 'from-emerald-500 to-green-500',
    A2: 'from-blue-500 to-cyan-500',
    B1: 'from-amber-500 to-yellow-500',
    B2: 'from-orange-500 to-red-500',
    C1: 'from-red-500 to-pink-500',
    C2: 'from-purple-500 to-indigo-500'
  };

  const levelIcons = {
    A1: '🌱',
    A2: '🌿',
    B1: '🌳',
    B2: '🎯',
    C1: '🚀',
    C2: '💎'
  };
  
  const [course, setCourse] = useState<Course | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [clientSecret, setClientSecret] = useState<string>('');
  const [step, setStep] = useState(1); // 1: Course review, 2: Payment method, 3: Payment processing

  const countries = [
    { code: 'DE', name: 'Germany', flag: '🇩🇪' },
    { code: 'BD', name: 'Bangladesh', flag: '🇧🇩' },
    { code: 'IN', name: 'India', flag: '🇮🇳' },
    { code: 'US', name: 'United States', flag: '🇺🇸' },
    { code: 'EU', name: 'Other EU Countries', flag: '🇪🇺' }
  ];

  const getPaymentMethodsByCountry = (countryCode: string) => {
    const paymentMethods: { [key: string]: any[] } = {
      DE: [
        { id: 'card', name: 'Credit/Debit Card', type: 'card' },
        { id: 'sepa_debit', name: 'SEPA Direct Debit', type: 'bank_transfer' },
        { id: 'sofort', name: 'Sofort Banking', type: 'bank_transfer' },
        { id: 'giropay', name: 'Giropay', type: 'bank_transfer' },
        { id: 'eps', name: 'EPS', type: 'bank_transfer' }
      ],
      BD: [
        { id: 'card', name: 'Credit/Debit Card', type: 'card' }
      ],
      IN: [
        { id: 'card', name: 'Credit/Debit Card', type: 'card' }
      ],
      US: [
        { id: 'card', name: 'Credit/Debit Card', type: 'card' }
      ],
      FR: [
        { id: 'card', name: 'Credit/Debit Card', type: 'card' },
        { id: 'sepa_debit', name: 'SEPA Direct Debit', type: 'bank_transfer' }
      ],
      NL: [
        { id: 'card', name: 'Credit/Debit Card', type: 'card' },
        { id: 'sepa_debit', name: 'SEPA Direct Debit', type: 'bank_transfer' },
        { id: 'ideal', name: 'iDEAL', type: 'bank_transfer' }
      ],
      BE: [
        { id: 'card', name: 'Credit/Debit Card', type: 'card' },
        { id: 'sepa_debit', name: 'SEPA Direct Debit', type: 'bank_transfer' },
        { id: 'bancontact', name: 'Bancontact', type: 'bank_transfer' }
      ],
      AT: [
        { id: 'card', name: 'Credit/Debit Card', type: 'card' },
        { id: 'sepa_debit', name: 'SEPA Direct Debit', type: 'bank_transfer' },
        { id: 'eps', name: 'EPS', type: 'bank_transfer' }
      ],
      PL: [
        { id: 'card', name: 'Credit/Debit Card', type: 'card' },
        { id: 'sepa_debit', name: 'SEPA Direct Debit', type: 'bank_transfer' },
        { id: 'p24', name: 'Przelewy24', type: 'bank_transfer' }
      ],
      EU: [
        { id: 'card', name: 'Credit/Debit Card', type: 'card' },
        { id: 'sepa_debit', name: 'SEPA Direct Debit', type: 'bank_transfer' }
      ]
    };

    return paymentMethods[countryCode] || [{ id: 'card', name: 'Credit/Debit Card', type: 'card' }];
  };

  const getPaymentMethodIcon = (methodId: string) => {
    const icons: { [key: string]: string } = {
      mastercard: '💳',
      visa: '💳',
      paypal: '💳',
      sofort: '🏦',
      sepa: '🏦',
      deutsche_bank: '🏦',
      commerzbank: '🏦',
      sparkasse: '🏦',
      dkb: '🏦',
      ing: '🏦',
      postbank: '🏦',
      hypovereinsbank: '🏦',
      bkash: '📱',
      nagad: '📱',
      rocket: '📱',
      upay: '📱',
      paytm: '📱',
      razorpay: '📱',
      phonepe: '📱',
      gpay: '📱',
      upi: '📱',
      bank_transfer: '🏦'
    };
    return icons[methodId] || '💳';
  };

  useEffect(() => {
    if (courseId) {
      fetchCourse();
      fetchPaymentMethods();
    }
  }, [courseId]);

  const fetchCourse = async () => {
    try {

      const response = await fetch(`${process.env.REACT_APP_API_URL}/courses/${courseId}`);

      const data = await response.json();

      if (data.success) {
        setCourse(data.data);
      } else {
        alert(`Course not found: ${data.message || 'Unknown error'}`);
        navigate('/courses');
      }
    } catch (error) {
      console.error('Failed to fetch course:', error);
      alert('Failed to load course details');
      navigate('/courses');
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/payments/methods`);
      const data = await response.json();
      
      if (data.success) {
        setPaymentMethods(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch payment methods:', error);
    }
  };

  const handleEnrollment = async () => {
    if (!selectedPaymentMethod) {
      showError('Please select a payment method', 'Payment Method Required');
      return;
    }

    setLoading(true);
    try {
      const token = sessionStorage.getItem('accessToken');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/payments/initialize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          courseId,
          paymentMethod: selectedPaymentMethod
        })
      });

      const data = await response.json();

      if (data.success) {
        setPaymentData(data.data);
        setClientSecret(data.data.clientSecret);
        setShowPaymentModal(true);
        setStep(3);
      } else {
        showError(data.message || 'Failed to initialize payment', 'Payment Error');
      }
    } catch (error) {
      console.error('Failed to initialize payment:', error);
      showError('Failed to process enrollment', 'Network Error');
    }
    setLoading(false);
  };

  const handlePaymentSuccess = async (paymentIntentId: string) => {

    try {
      // Call backend to complete the enrollment
      const token = sessionStorage.getItem('accessToken');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/payments/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          paymentIntentId
        })
      });

      const data = await response.json();

      if (data.success) {

        setShowPaymentModal(false);
        showSuccess(
          '🎉 Enrollment successful! Welcome to your German language journey!',
          'Payment Completed',
          { 
            duration: 5000,
            actions: [
              {
                label: 'Go to My Courses',
                onClick: () => navigate('/my-courses')
              }
            ]
          }
        );
        // Navigate to courses after a delay
        setTimeout(() => {
          navigate('/my-courses');
        }, 2000);
      } else {
        console.error('Failed to complete enrollment:', data.message);
        showError('Payment successful but enrollment failed. Please contact support.', 'Enrollment Error');
      }
    } catch (error) {
      console.error('Error completing enrollment:', error);
      showError('Payment successful but enrollment failed. Please contact support.', 'Enrollment Error');
    }
  };

  const handlePaymentError = (error: string) => {
    console.error('Payment error:', error);
    setShowPaymentModal(false);
    showError(
      error || 'Payment failed. Please try again.',
      'Payment Failed'
    );
  };

  if (!course) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex justify-center items-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600 font-medium">Loading course details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Hero Header */}
      <div className="relative bg-cover bg-center bg-no-repeat text-white py-32" style={{backgroundImage: 'url(/hero-bg-without-text.png)', backgroundPosition: 'center 30%'}}>
        <div className="absolute inset-0 bg-black opacity-50"></div>
        <div className="relative max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
            {step === 1 && 'Course Enrollment'}
            {step === 2 && 'Select Payment Method'}
            {step === 3 && 'Complete Payment'}
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-blue-100 max-w-3xl mx-auto">
            {step === 1 && 'Start your journey to fluency today!'}
            {step === 2 && 'Choose your preferred payment method'}
            {step === 3 && 'Complete your enrollment process'}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
        {/* Enhanced Progress Steps */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8 border border-gray-100">
          <div className="flex justify-center">
            <div className="flex items-center space-x-8">
              <div className="flex flex-col items-center">
                <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 ${
                  step >= 1 
                    ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white border-transparent shadow-lg' 
                    : 'bg-white text-gray-400 border-gray-300'
                }`}>
                  {step > 1 ? '✓' : '1'}
                </div>
                <span className={`mt-2 text-sm font-medium ${step >= 1 ? 'text-emerald-600' : 'text-gray-400'}`}>
                  Course Details
                </span>
              </div>
              <div className={`w-24 h-1 rounded-full transition-all duration-300 ${step >= 2 ? 'bg-gradient-to-r from-emerald-500 to-green-600' : 'bg-gray-300'}`}></div>
              <div className="flex flex-col items-center">
                <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 ${
                  step >= 2 
                    ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white border-transparent shadow-lg' 
                    : 'bg-white text-gray-400 border-gray-300'
                }`}>
                  {step > 2 ? '✓' : '2'}
                </div>
                <span className={`mt-2 text-sm font-medium ${step >= 2 ? 'text-emerald-600' : 'text-gray-400'}`}>
                  Payment Method
                </span>
              </div>
              <div className={`w-24 h-1 rounded-full transition-all duration-300 ${step >= 3 ? 'bg-gradient-to-r from-emerald-500 to-green-600' : 'bg-gray-300'}`}></div>
              <div className="flex flex-col items-center">
                <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 ${
                  step >= 3 
                    ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white border-transparent shadow-lg' 
                    : 'bg-white text-gray-400 border-gray-300'
                }`}>
                  {step > 3 ? '✓' : '3'}
                </div>
                <span className={`mt-2 text-sm font-medium ${step >= 3 ? 'text-emerald-600' : 'text-gray-400'}`}>
                  Complete Payment
                </span>
              </div>
            </div>
          </div>
        </div>

        {step === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Course Details */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                {/* Course Header with Gradient */}
                <div className={`bg-gradient-to-r ${levelGradients[course.level]} p-6 text-white relative overflow-hidden`}>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div className="inline-flex items-center px-4 py-2 text-sm font-bold rounded-full bg-white/20 backdrop-blur-sm border border-white/30">
                        <span className="mr-2">{levelIcons[course.level]}</span>
                        {course.level}
                      </div>
                      <div className="text-sm opacity-90">
                        {course.duration} weeks course
                      </div>
                    </div>
                    <h2 className="text-3xl font-bold mb-2">{course.title}</h2>
                    <p className="text-white text-opacity-90">{course.instructor}</p>
                  </div>
                </div>

                <div className="p-6">
                  <p className="text-gray-700 mb-8 text-lg leading-relaxed">{course.description}</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-4">
                        Course Schedule
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-center text-gray-600">
                          <span className="font-medium text-gray-900 w-20">Days:</span>
                          <span>{course.schedule.days.join(', ')}</span>
                        </div>
                        <div className="flex items-center text-gray-600">
                          <span className="font-medium text-gray-900 w-20">Start:</span>
                          <span>{new Date(course.startDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center text-gray-600">
                          <span className="font-medium text-gray-900 w-20">End:</span>
                          <span>{new Date(course.endDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center text-gray-600">
                          <span className="font-medium text-gray-900 w-20">Duration:</span>
                          <span>{course.duration} weeks</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-4">
                        Class Information
                      </h3>
                      <div className="space-y-3">
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium text-green-800">Available Spots</span>
                            <span className="text-2xl font-bold text-green-600">
                              {course.maxStudents - course.currentStudents}
                            </span>
                          </div>
                          <div className="w-full bg-green-200 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${((course.maxStudents - course.currentStudents) / course.maxStudents) * 100}%` }}
                            />
                          </div>
                          <div className="text-sm text-green-600 mt-1">
                            {course.currentStudents} of {course.maxStudents} enrolled
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Features Section */}
                  {course.features && course.features.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-xl font-bold text-gray-900 mb-4">
                        What You'll Learn
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {course.features.map((feature, index) => (
                          <div key={index} className="flex items-start">
                            <span className="text-green-500 mr-3 mt-0.5 flex-shrink-0">✓</span>
                            <span className="text-gray-700 text-sm">{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Prerequisites Section */}
                  {course.requirements && course.requirements.length > 0 && (
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-4">
                        Prerequisites
                      </h3>
                      <div className="space-y-2">
                        {course.requirements.map((requirement, index) => (
                          <div key={index} className="flex items-start">
                            <span className="text-orange-500 mr-3 mt-0.5 flex-shrink-0">•</span>
                            <span className="text-gray-700 text-sm">{requirement}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Enhanced Enrollment Summary */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                Enrollment Summary
              </h3>
              
              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center py-4 border-b border-gray-100">
                  <span className="text-gray-600 font-medium">Course</span>
                  <span className="font-bold text-gray-900">{course.title}</span>
                </div>
                <div className="flex justify-between items-center py-4 border-b border-gray-100">
                  <span className="text-gray-600 font-medium">Level</span>
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                    {course.level}
                  </span>
                </div>
                <div className="flex justify-between items-center py-4 border-b border-gray-100">
                  <span className="text-gray-600 font-medium">Duration</span>
                  <span className="font-semibold text-gray-900">{course.duration} weeks</span>
                </div>
                
                {/* Pricing Section */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xl font-bold text-gray-900">Total Amount</span>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">
                        {formatCurrency(course.price, 'EUR')}
                      </div>
                      <div className="text-lg font-semibold text-gray-600 flex items-center justify-end">
                        <span className="mr-1">⇄</span>
                        {formatCurrency(convertEuroToTaka(course.price), 'BDT')}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">per complete course</div>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setStep(2)} 
                disabled={course.currentStudents >= course.maxStudents}
                className={`w-full py-4 rounded-2xl font-bold text-lg transition-all duration-300 ${
                  course.currentStudents >= course.maxStudents
                    ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-2 border-gray-200'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md hover:shadow-lg hover:from-emerald-600 hover:to-teal-700 border-0'
                }`}
              >
                {course.currentStudents >= course.maxStudents ? (
                  <span className="flex items-center justify-center">
                    <span className="mr-2">😔</span>
                    Course Full
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    Proceed to Payment
                  </span>
                )}
              </button>

              <div className="mt-4 text-xs text-gray-500 text-center">
                Secure payment processing with 256-bit SSL encryption
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-3">
                  Payment Method
                </h2>
                <p className="text-gray-600 text-lg">Secure and convenient payment options</p>
                <div className="w-24 h-1 bg-gradient-to-r from-emerald-500 to-teal-600 mx-auto mt-4 rounded-full"></div>
              </div>
              
              {/* Country Selection */}
              {!selectedCountry && (
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">Select Your Country</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                    {countries.map((country) => (
                      <div
                        key={country.code}
                        className="group border-2 border-gray-200 rounded-xl p-6 cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-emerald-300 hover:bg-gradient-to-br hover:from-emerald-50 hover:to-green-50"
                        onClick={() => setSelectedCountry(country.code)}
                      >
                        <div className="flex flex-col items-center text-center">
                          <div className="text-5xl mb-3 group-hover:scale-110 transition-transform duration-300">{country.flag}</div>
                          <div className="font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors duration-300">{country.name}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Payment Method Selection */}
              {selectedCountry && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold text-gray-900">Payment Methods</h3>
                    <button
                      onClick={() => {
                        setSelectedCountry('');
                        setSelectedPaymentMethod('');
                      }}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-medium transition-colors duration-300"
                    >
                      Change Country
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {getPaymentMethodsByCountry(selectedCountry).map((method) => (
                      <div
                        key={method.id}
                        className={`group relative border-2 rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:shadow-xl ${
                          selectedPaymentMethod === method.id
                            ? 'border-emerald-500 bg-gradient-to-br from-emerald-50 to-green-50 shadow-xl transform scale-105'
                            : 'border-gray-200 hover:border-emerald-300 hover:bg-gradient-to-br hover:from-emerald-50 hover:to-green-50 bg-white hover:scale-102'
                        }`}
                        onClick={() => setSelectedPaymentMethod(method.id)}
                      >
                        {selectedPaymentMethod === method.id && (
                          <div className="absolute -top-3 -right-3 w-8 h-8 bg-gradient-to-r from-emerald-500 to-green-600 rounded-full flex items-center justify-center shadow-lg">
                            <span className="text-white text-sm font-bold">✓</span>
                          </div>
                        )}
                        <div className="flex flex-col items-center text-center">
                          <div className={`font-bold text-lg mb-2 transition-colors duration-300 ${
                            selectedPaymentMethod === method.id ? 'text-emerald-700' : 'text-gray-900 group-hover:text-emerald-700'
                          }`}>
                            {method.name}
                          </div>
                          <div className={`text-sm capitalize px-3 py-1 rounded-full transition-colors duration-300 ${
                            selectedPaymentMethod === method.id 
                              ? 'bg-emerald-100 text-emerald-700' 
                              : 'bg-gray-100 text-gray-600 group-hover:bg-emerald-100 group-hover:text-emerald-700'
                          }`}>
                            {method.type}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center space-x-4">
                <button
                  onClick={() => setStep(1)}
                  className="px-8 py-4 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all duration-300 shadow-md hover:shadow-lg"
                >
                  <span className="flex items-center">
                    <span className="mr-2">←</span>
                    Back to Course
                  </span>
                </button>
                <button
                  onClick={handleEnrollment}
                  disabled={!selectedPaymentMethod || loading}
                  className={`px-8 py-4 rounded-xl font-bold shadow-lg ${
                    !selectedPaymentMethod || loading
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-sm'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white'
                  }`}
                >
                  <span className="flex items-center">
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                        Processing Payment...
                      </>
                    ) : (
                      <>
                        Continue to Payment
                        <span className="ml-2">→</span>
                      </>
                    )}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Bottom Spacing for Scrolling */}
      <div className="h-16"></div>

      {/* Payment Modal */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setStep(2);
        }}
        title="Secure Enrollment"
        size="xl"
      >
        {!process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY ? (
          <PaymentFallback message="Stripe is not configured. Please add REACT_APP_STRIPE_PUBLISHABLE_KEY to your environment variables." />
        ) : clientSecret && course ? (
          <StripeWrapper clientSecret={clientSecret}>
            <StripeCheckout
              amount={course.price}
              currency={course.currency || 'EUR'}
              courseName={course.title}
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
            />
          </StripeWrapper>
        ) : (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600">Initializing secure payment...</p>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CourseEnrollment;