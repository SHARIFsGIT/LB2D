import React, { useState } from 'react';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import { useNotification } from '../hooks/useNotification';

const Contact: React.FC = () => {
  const { showSuccess, showError, showInfo } = useNotification();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [faqSearchTerm, setFaqSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const faqData = [
    {
      id: 1,
      category: 'enrollment',
      icon: '📚',
      question: 'How do I enroll in a course?',
      answer: 'Simply browse our courses, select your level, and click "Enroll". You\'ll need to create an account and complete the payment process. Our enrollment is available 24/7 and you can start immediately after payment.'
    },
    {
      id: 2,
      category: 'certificates',
      icon: '🏆',
      question: 'Are the certificates internationally recognized?',
      answer: 'Yes, our certificates follow CEFR standards and are recognized by German institutions, universities, and employers worldwide. They comply with Common European Framework of Reference for Languages.'
    },
    {
      id: 3,
      category: 'payment',
      icon: '💰',
      question: 'Can I get a refund if I\'m not satisfied?',
      answer: 'We offer a 30-day money-back guarantee. If you\'re not satisfied with your course, contact us within 30 days for a full refund. No questions asked!'
    },
    {
      id: 4,
      category: 'assessment',
      icon: '📝',
      question: 'Do you offer placement tests?',
      answer: 'Yes, we provide free placement tests to help you determine your current German level and choose the right course. The test takes about 15 minutes and covers all skills.'
    },
    {
      id: 5,
      category: 'classes',
      icon: '🎥',
      question: 'Are classes live or recorded?',
      answer: 'We offer both live interactive classes and recorded sessions, allowing you to learn at your own pace while still getting live instruction. Live classes include Q&A sessions with native speakers.'
    },
    {
      id: 6,
      category: 'technical',
      icon: '💻',
      question: 'What technical requirements do I need?',
      answer: 'You need a stable internet connection, a computer or mobile device, and a modern web browser. For live classes, we recommend having a microphone and camera for better interaction.'
    },
    {
      id: 7,
      category: 'classes',
      icon: '👥',
      question: 'What is the class size?',
      answer: 'Our live classes are limited to 8-12 students to ensure personalized attention. This allows our instructors to focus on each student\'s progress and provide individual feedback.'
    },
    {
      id: 8,
      category: 'support',
      icon: '🤝',
      question: 'Do you provide career counseling?',
      answer: 'Yes, we offer career guidance sessions to help you understand how German language skills can advance your career. We also provide guidance on studying and working in Germany.'
    },
    {
      id: 9,
      category: 'materials',
      icon: '📖',
      question: 'Are course materials included?',
      answer: 'Yes, all digital course materials, exercises, and resources are included in your enrollment. You\'ll also receive downloadable PDFs and audio files for offline study.'
    },
    {
      id: 10,
      category: 'assessment',
      icon: '⭐',
      question: 'How is progress assessed?',
      answer: 'We use continuous assessment through quizzes, assignments, speaking exercises, and regular feedback. You\'ll receive detailed progress reports and personalized recommendations.'
    }
  ];

  const categories = [
    { value: 'all', label: 'All Questions', icon: '❓' },
    { value: 'enrollment', label: 'Enrollment', icon: '📚' },
    { value: 'classes', label: 'Classes', icon: '🎥' },
    { value: 'certificates', label: 'Certificates', icon: '🏆' },
    { value: 'payment', label: 'Payment', icon: '💰' },
    { value: 'assessment', label: 'Assessment', icon: '📝' },
    { value: 'technical', label: 'Technical', icon: '💻' },
    { value: 'support', label: 'Support', icon: '🤝' },
    { value: 'materials', label: 'Materials', icon: '📖' }
  ];

  const filteredFaqs = faqData.filter(faq => {
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    const matchesSearch = faq.question.toLowerCase().includes(faqSearchTerm.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(faqSearchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const toggleFaq = (id: number) => {
    setExpandedFaq(expandedFaq === id ? null : id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Client-side validation
    if (formData.message.trim().length < 10) {
      showError(
        'Your message needs to be at least 10 characters long.',
        'Message Too Short',
        {
          duration: 5000,
          actions: [
            {
              label: 'OK',
              onClick: () => {} // Just dismiss the notification
            }
          ]
        }
      );
      return;
    }

    setIsSubmitting(true);

    // Show info notification that message is being sent
    showInfo('Sending your message...', 'Please wait');

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/contact/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        showSuccess(
          data.message || 'Your message has been sent successfully! We will get back to you soon.',
          'Message Sent!',
          {
            duration: 6000,
            actions: [
              {
                label: 'Send Another',
                onClick: () => setFormData({ name: '', email: '', subject: '', message: '' })
              }
            ]
          }
        );
        setFormData({ name: '', email: '', subject: '', message: '' });
      } else {
        showError(
          data.message || 'Failed to send message. Please try again.',
          'Failed to Send Message',
          {
            duration: 8000,
            actions: [
              {
                label: 'Retry',
                onClick: () => handleSubmit(e)
              },
              {
                label: 'Email Us',
                onClick: () => window.open('mailto:learnbangla2deutsch@gmail.com', '_blank'),
                variant: 'secondary'
              }
            ]
          }
        );
      }
    } catch (error) {
      showError(
        'Network error. Please check your connection and try again.',
        'Connection Error',
        {
          duration: 10000,
          actions: [
            {
              label: 'Retry',
              onClick: () => handleSubmit(e)
            },
            {
              label: 'Email Directly',
              onClick: () => window.open('mailto:learnbangla2deutsch@gmail.com', '_blank'),
              variant: 'secondary'
            }
          ]
        }
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 via-white to-green-50">
      {/* Hero Section */}
      <section className="relative bg-cover bg-center bg-no-repeat text-white py-32" style={{backgroundImage: 'url(/hero-bg-without-text.png)', backgroundPosition: 'center 30%'}}>
        <div className="absolute inset-0 bg-black opacity-50"></div>
        <div className="relative max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
            Contact Us
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-blue-100 max-w-3xl mx-auto">
            Get in touch with our team for any questions about German learning. <br />We're here to support your language journey every step of the way.
          </p>
          <div className="mt-8 flex justify-center space-x-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-full px-6 py-3 border border-white/20">
              <span className="text-white font-semibold">Get Support Now</span>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Information */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <Card className="text-center p-8">
              <div className="text-5xl mb-4">📧</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Email Us</h3>
              <p className="text-gray-600 mb-3">
                Send us an email and we'll respond within 24 hours
              </p>
              <a href="mailto:learnbangla2deutsch@gmail.com" className="text-red-600 hover:underline">
                learnbangla2deutsch@gmail.com
              </a>
            </Card>

            <Card className="text-center p-8">
              <div className="text-5xl mb-4">📱</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Call Us</h3>
              <p className="text-gray-600 mb-3">
                Speak with our advisors during business hours
              </p>
              <p className="text-red-600 font-semibold">+880-XXX-XXXXXX</p>
              <p className="text-sm text-gray-500">9 AM - 9 PM (Bangladesh Time)</p>
            </Card>

            <Card className="text-center p-8">
              <div className="text-5xl mb-4">💬</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">WhatsApp</h3>
              <p className="text-gray-600 mb-3">
                Join our community group for instant support
              </p>
              <Button className="bg-gradient-to-r from-emerald-500 to-green-600 text-white font-semibold shadow-lg hover:shadow-xl hover:from-emerald-600 hover:to-green-700 transition-all duration-1200 ease-out">
                Join WhatsApp Group
              </Button>
            </Card>
          </div>

          {/* Contact Form */}
          <div className="grid md:grid-cols-2 gap-12 items-start">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Send us a Message</h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Enter your email address"
                  />
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                    Subject *
                  </label>
                  <select
                    id="subject"
                    name="subject"
                    required
                    value={formData.subject}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="">Select a subject</option>
                    <option value="course-inquiry">Course Inquiry</option>
                    <option value="enrollment">Enrollment Process</option>
                    <option value="technical-support">Technical Support</option>
                    <option value="payment">Payment Issues</option>
                    <option value="certificates">Certificate Questions</option>
                    <option value="career-guidance">Career Guidance</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                    Message *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={24}
                    value={formData.message}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Tell us how we can help you..."
                  />
                </div>

                <Button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold shadow-lg hover:shadow-xl hover:from-emerald-700 hover:to-teal-800 transition-all duration-1200 ease-out disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Sending...' : 'Send Message'}
                </Button>
              </form>
            </div>

            {/* Enhanced FAQ Section */}
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>
              
              {/* Search and Filter */}
              <div className="mb-6 space-y-4">
                {/* Search Bar */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-400">🔍</span>
                  </div>
                  <input
                    type="text"
                    placeholder="Search questions..."
                    value={faqSearchTerm}
                    onChange={(e) => setFaqSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>

                {/* Category Filter */}
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => (
                    <button
                      key={category.value}
                      onClick={() => setSelectedCategory(category.value)}
                      className={`px-3 py-2 rounded text-sm font-medium ${
                        selectedCategory === category.value
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg'
                          : 'bg-gray-500 bg-opacity-10 backdrop-blur-xl border border-gray-400 border-opacity-20 text-gray-700 shadow-sm'
                      }`}
                    >
                      {category.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* FAQ Items */}
              <div className="space-y-2">
                {filteredFaqs.length === 0 ? (
                  <Card className="p-6 text-center">
                    <div className="text-4xl mb-3">🤔</div>
                    <p className="text-gray-600">No questions found matching your search.</p>
                    <Button 
                      onClick={() => {
                        setFaqSearchTerm('');
                        setSelectedCategory('all');
                      }}
                      className="mt-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg hover:shadow-xl hover:from-emerald-700 hover:to-teal-800 transition-all duration-1200 ease-out"
                    >
                      Clear Filters
                    </Button>
                  </Card>
                ) : (
                  filteredFaqs.map((faq) => (
                    <Card 
                      key={faq.id} 
                      className={`transition-all duration-300 hover:shadow-lg border-l-4 ${
                        expandedFaq === faq.id 
                          ? 'border-l-red-500 shadow-md' 
                          : 'border-l-gray-200 hover:border-l-red-300'
                      }`}
                    >
                      <div 
                        className="p-1 cursor-pointer"
                        onClick={() => toggleFaq(faq.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 text-sm pr-3">
                              {faq.question}
                            </h4>
                            <div 
                              className={`overflow-hidden transition-all duration-300 ${
                                expandedFaq === faq.id 
                                  ? 'max-h-64 opacity-100 mt-1' 
                                  : 'max-h-0 opacity-0'
                              }`}
                            >
                              <p className="text-gray-600 text-xs leading-relaxed">
                                {faq.answer}
                              </p>
                            </div>
                          </div>
                          <div className={`ml-2 transition-transform duration-300 ${
                            expandedFaq === faq.id ? 'rotate-180' : ''
                          }`}>
                            <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Office Hours */}
      <section className="py-20 bg-white bg-opacity-10 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Office Hours</h2>
            <p className="text-lg text-gray-600">
              Our support team is available during the following hours
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <Card className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                Bangladesh Time
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Monday - Friday:</span>
                  <span className="font-semibold">9:00 AM - 9:00 PM</span>
                </div>
                <div className="flex justify-between">
                  <span>Saturday:</span>
                  <span className="font-semibold">10:00 AM - 6:00 PM</span>
                </div>
                <div className="flex justify-between">
                  <span>Sunday:</span>
                  <span className="font-semibold">2:00 PM - 8:00 PM</span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                Germany Time
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Monday - Friday:</span>
                  <span className="font-semibold">5:00 AM - 5:00 PM</span>
                </div>
                <div className="flex justify-between">
                  <span>Saturday:</span>
                  <span className="font-semibold">6:00 AM - 2:00 PM</span>
                </div>
                <div className="flex justify-between">
                  <span>Sunday:</span>
                  <span className="font-semibold">10:00 AM - 4:00 PM</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contact;