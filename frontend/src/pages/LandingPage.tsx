import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import { RootState } from '../store/store';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const [stats, setStats] = useState({
    totalStudents: 0,
    coursesCompleted: 0,
    countries: 0,
    successRate: 0
  });

  const [hasAnimated, setHasAnimated] = useState(false);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  const levels = [
    {
      level: 'A1',
      title: 'Beginner',
      description: 'Perfect for complete beginners. Learn basic vocabulary and essential phrases.',
      color: 'from-green-400 to-green-600',
      features: ['Basic vocabulary', 'Simple sentences', 'Everyday phrases', 'Cultural basics']
    },
    {
      level: 'A2', 
      title: 'Elementary',
      description: 'Build foundations with familiar situations and personal information.',
      color: 'from-blue-400 to-blue-600',
      features: ['Extended vocabulary', 'Past/future tenses', 'Travel German', 'Simple writing']
    },
    {
      level: 'B1',
      title: 'Intermediate', 
      description: 'Handle complex conversations and express opinions confidently.',
      color: 'from-yellow-400 to-orange-500',
      features: ['Complex grammar', 'Opinion expression', 'Business basics', 'Media comprehension']
    },
    {
      level: 'B2',
      title: 'Upper Intermediate',
      description: 'Master advanced German for professional and academic contexts.',
      color: 'from-orange-400 to-red-500',
      features: ['Professional vocabulary', 'Academic writing', 'Presentations', 'TestDaF prep']
    },
    {
      level: 'C1',
      title: 'Advanced',
      description: 'Achieve near-native fluency with sophisticated communication.',
      color: 'from-purple-400 to-purple-600',
      features: ['Native-like fluency', 'Academic discourse', 'Literature', 'Goethe C1 prep']
    }
  ];

  // This will be replaced with dynamic data from database
  const testimonials = [
    {
      id: 1,
      name: 'Sarah Ahmed',
      location: 'Dhaka, Bangladesh',
      finishedClass: 'B2 German Course',
      reviewText: 'The Bengali explanations made complex German grammar so easy.',
      profilePhoto: 'https://images.unsplash.com/photo-1494790108755-2616b612b2a5?w=150&h=150&fit=crop&crop=face&auto=format&q=80',
      rating: 5,
      createdAt: '2024-01-15'
    },
    {
      id: 2,
      name: 'Mahmud Rahman',
      location: 'Chittagong, Bangladesh', 
      finishedClass: 'C1 German Course',
      reviewText: 'Excellent teaching methods. Now I work in Germany thanks to this platform!',
      profilePhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face&auto=format&q=80',
      rating: 5,
      createdAt: '2024-02-08'
    },
    {
      id: 3,
      name: 'Fatima Khatun',
      location: 'Sylhet, Bangladesh',
      finishedClass: 'A2 German Course',
      reviewText: 'Perfect course structure and supportive teachers. Highly recommended!',
      profilePhoto: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face&auto=format&q=80',
      rating: 5,
      createdAt: '2024-02-20'
    },
    {
      id: 4,
      name: 'Rashid Khan',
      location: 'Rajshahi, Bangladesh',
      finishedClass: 'B1 German Course',
      reviewText: 'Great platform with excellent Bengali-German teaching approach.',
      profilePhoto: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face&auto=format&q=80',
      rating: 4,
      createdAt: '2024-03-01'
    }
  ];

  useEffect(() => {
    if (!hasAnimated) {
      // Count up animation for each stat
      const animateStats = () => {
        const duration = 2000; // 2 seconds
        const steps = 60; // 60 steps for smooth animation
        const stepDuration = duration / steps;

        const targets = {
          totalStudents: 250,
          coursesCompleted: 120,
          countries: 3,
          successRate: 90
        };

        let currentStep = 0;

        const interval = setInterval(() => {
          currentStep++;
          const progress = currentStep / steps;

          setStats({
            totalStudents: Math.floor(targets.totalStudents * progress),
            coursesCompleted: Math.floor(targets.coursesCompleted * progress),
            countries: Math.floor(targets.countries * progress),
            successRate: Math.floor(targets.successRate * progress)
          });

          if (currentStep >= steps) {
            setStats(targets); // Ensure final values are exact
            clearInterval(interval);
            setHasAnimated(true);
          }
        }, stepDuration);

        return interval;
      };

      const timeoutId = setTimeout(animateStats, 500); // Start after 500ms
      return () => clearTimeout(timeoutId);
    }
  }, [hasAnimated]);

  // Auto-scroll testimonials (showing 1 at a time)
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000); // Change every 5 seconds

    return () => clearInterval(interval);
  }, [testimonials.length]);

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate(user?.role === 'Admin' ? '/admin' : '/courses');
    } else {
      navigate('/courses');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-green-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-r from-blue-900 via-indigo-800 to-blue-900 bg-cover bg-top bg-no-repeat text-white" style={{backgroundImage: 'url(/hero-bg.jpg)'}}>
        <div className="absolute inset-0 bg-black opacity-50"></div>
        <div className="relative max-w-7xl mx-auto px-4 py-32 lg:py-40">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight invisible">
              Learn German with Bengali Teachers
            </h1>
            <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto leading-relaxed invisible">
              Master German from A1 to C1 with expert Bengali teachers.
              <br />
              Join 250+ Bangladeshi students who achieved their German dreams!
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-green-600 via-yellow-500 to-red-600 rounded-full opacity-60 blur-lg animate-pulse"></div>
                <div className="absolute -inset-0.5 bg-gradient-to-r from-green-600 via-yellow-500 to-red-600 rounded-full opacity-80 blur-md"></div>
                <Button 
                  onClick={handleGetStarted}
                  className="relative bg-white bg-opacity-20 backdrop-blur-md border border-white border-opacity-30 text-white font-bold px-8 py-4 text-lg rounded-full transition-all duration-1200 ease-out shadow-xl hover:bg-opacity-40 hover:border-opacity-50 hover:shadow-2xl"
                >Start Learning Now
                </Button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-xl p-4 border border-white border-opacity-30 flex flex-col items-center justify-center">
                <div className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-green-400 text-left">{stats.totalStudents.toLocaleString()}+</div>
                  <div className="text-sm md:text-base text-white text-left">Happy Students</div>
                </div>
              </div>
              <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-xl p-4 border border-white border-opacity-30 flex flex-col items-center justify-center">
                <div className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-yellow-400 text-left">{stats.coursesCompleted.toLocaleString()}+</div>
                  <div className="text-sm md:text-base text-white text-left">Courses Completed</div>
                </div>
              </div>
              <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-xl p-4 border border-white border-opacity-30 flex flex-col items-center justify-center">
                <div className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-red-400 text-left">{stats.countries}+</div>
                  <div className="text-sm md:text-base text-white text-left">Countries</div>
                </div>
              </div>
              <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-xl p-4 border border-white border-opacity-30 flex flex-col items-center justify-center">
                <div className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-cyan-400 text-left">{stats.successRate}%</div>
                  <div className="text-sm md:text-base text-white text-left">Success Rate</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
      </section>

      {/* CEFR Levels Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              🎯 Choose Your German Level
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              From complete beginner to advanced proficiency - we have the perfect course for your German learning journey
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {levels.map((level, index) => (
              <Card key={level.level} className="hover:shadow-2xl transition-all duration-300 overflow-hidden">
                <div className={`h-3 bg-gradient-to-r ${level.color}`}></div>
                <div className={`p-6 bg-gradient-to-br from-white via-gray-50 to-gray-100`}>
                  <div className="flex items-center mb-4">
                    <div className={`text-2xl font-bold px-4 py-2 bg-gradient-to-r ${level.color} text-white rounded-xl mr-4 shadow-lg`}>
                      {level.level}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">{level.title}</h3>
                    </div>
                  </div>
                  
                  <p className="text-gray-700 mb-4 leading-relaxed">{level.description}</p>
                  
                  <div className="space-y-3">
                    {level.features.map((feature, i) => (
                      <div key={i} className="flex items-center text-sm text-gray-700 bg-white bg-opacity-60 rounded-lg p-2">
                        <span className="text-green-600 mr-3 text-lg">✓</span>
                        <span className="font-medium">{feature}</span>
                      </div>
                    ))}
                  </div>
                  
                  <Button 
                    onClick={() => navigate('/courses')}
                    className={`w-full mt-6 bg-gradient-to-r ${level.color} text-white transition-all shadow-lg hover:shadow-xl rounded-xl py-3 font-semibold`}
                  >
                    View {level.level} Courses
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              🌟 Why Learn Bangla to Deutsch?
            </h2>
            <p className="text-xl text-gray-600">
              The only platform designed specifically for Bengali speakers learning German
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="text-center p-8 hover:shadow-xl transition-all bg-gradient-to-br from-blue-25 to-blue-50">
              <div className="text-6xl mb-4">👥</div>
              <h3 className="text-2xl font-bold text-blue-700 mb-4">Bengali Teachers</h3>
              <p className="text-blue-600">
                Learn from native Bengali speakers who mastered German. They understand your challenges!
              </p>
            </Card>

            <Card className="text-center p-8 hover:shadow-xl transition-all bg-gradient-to-br from-green-25 to-green-50">
              <div className="text-6xl mb-4">🏆</div>
              <h3 className="text-2xl font-bold text-green-700 mb-4">Proven Method</h3>
              <p className="text-green-600">
                Our unique teaching method combines German grammar with Bengali explanations for faster learning.
              </p>
            </Card>

            <Card className="text-center p-8 hover:shadow-xl transition-all bg-gradient-to-br from-purple-25 to-purple-50">
              <div className="text-6xl mb-4">📜</div>
              <h3 className="text-2xl font-bold text-purple-700 mb-4">Official Certificates</h3>
              <p className="text-purple-600">
                Get internationally recognized CEFR certificates for your German proficiency level.
              </p>
            </Card>

            <Card className="text-center p-8 hover:shadow-xl transition-all bg-gradient-to-br from-orange-25 to-orange-50">
              <div className="text-6xl mb-4">💼</div>
              <h3 className="text-2xl font-bold text-orange-700 mb-4">Career Support</h3>
              <p className="text-orange-600">
                Get guidance on German job applications, visa processes, and university admissions.
              </p>
            </Card>

            <Card className="text-center p-8 hover:shadow-xl transition-all bg-gradient-to-br from-teal-25 to-teal-50">
              <div className="text-6xl mb-4">🔄</div>
              <h3 className="text-2xl font-bold text-teal-700 mb-4">Flexible Schedule</h3>
              <p className="text-teal-600">
                Morning, evening, and weekend classes to fit your busy schedule in Bangladesh.
              </p>
            </Card>

            <Card className="text-center p-8 hover:shadow-xl transition-all bg-gradient-to-br from-red-25 to-red-50">
              <div className="text-6xl mb-4">🌍</div>
              <h3 className="text-2xl font-bold text-red-700 mb-4">Global Community</h3>
              <p className="text-red-600">
                Join thousands of Bangladeshi students who are now living and working in Germany.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-12 bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 text-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-3">💬 Student Success Stories</h2>
            <p className="text-lg">Real stories from Bangladeshi students who achieved their German dreams</p>
          </div>

          {/* Single Review Display */}
          <div className="max-w-2xl mx-auto mb-6">
            <div className="flex justify-center">
              {(() => {
                const testimonial = testimonials[currentTestimonial];
                
                return (
                  <div key={testimonial.id} className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-6 border border-white border-opacity-20 shadow-lg transition-all duration-500 w-full">
                    {/* Student Header */}
                    <div className="flex items-center mb-4">
                      <img 
                        src={testimonial.profilePhoto}
                        alt={testimonial.name}
                        className="w-16 h-16 rounded-full object-cover border-2 border-white border-opacity-50 mr-4"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-lg font-bold text-white">{testimonial.name}</h4>
                          <span className="bg-green-500 text-white px-2 py-1 rounded text-xs font-medium">
                            {testimonial.finishedClass}
                          </span>
                        </div>
                        <p className="text-yellow-200 text-sm">{testimonial.location}</p>
                      </div>
                    </div>

                    {/* Review Text */}
                    <p className="text-white text-base leading-relaxed italic text-center">
                      "{testimonial.reviewText}"
                    </p>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Navigation Dots */}
          <div className="flex justify-center space-x-2">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentTestimonial(index)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  currentTestimonial === index
                    ? 'bg-yellow-400 w-6'
                    : 'bg-white bg-opacity-50 hover:bg-opacity-75'
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-2xl font-bold mb-4 text-blue-400">Learn Bangla to Deutsch</h3>
              <p className="text-gray-400">
                Making German accessible for Bengali speakers worldwide.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Courses</h4>
              <ul className="space-y-2 text-gray-400">
                <li>A1 Beginner German</li>
                <li>A2 Elementary German</li>
                <li>B1 Intermediate German</li>
                <li>B2 Upper Intermediate</li>
                <li>C1 Advanced German</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li>📧 learnbangla2deutsch@gmail.com</li>
                <li>📱 +49-176-31397772</li>
                <li>🌐 www.learnbangla2deutsch.com</li>
                <li>💬 Join our WhatsApp Group</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Follow Us</h4>
              <div className="flex space-x-4">
                <div className="text-2xl cursor-pointer text-gray-400">📘</div>
                <div className="text-2xl cursor-pointer text-gray-400">📷</div>
                <div className="text-2xl cursor-pointer text-gray-400">🐦</div>
                <div className="text-2xl cursor-pointer text-gray-400">💼</div>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8 mt-8 text-center text-gray-400">
            <p>&copy; 2024 Learn Bangla to Deutsch. All rights reserved. Made with ❤️ for Bengali German learners.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;