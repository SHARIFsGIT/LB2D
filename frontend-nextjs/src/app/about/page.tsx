'use client';

import React, { useEffect, useState } from 'react';
import Card from '@/components/ui/card';

export default function AboutPage() {
  const [currentSlide, setCurrentSlide] = useState(0);

  const images = [
    {
      src: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=500&h=350&fit=crop&crop=face&auto=format&q=80",
      alt: "Asian students learning German online"
    },
    {
      src: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=500&h=350&fit=crop&crop=center&auto=format&q=80",
      alt: "Student studying German with laptop"
    },
    {
      src: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500&h=350&fit=crop&crop=center&auto=format&q=80",
      alt: "Diverse students in virtual classroom"
    }
  ];

  // Auto-slide functionality
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % images.length);
    }, 4000); // Change slide every 4 seconds

    return () => clearInterval(interval);
  }, [images.length]);

  const goToSlide = (slideIndex: number) => {
    setCurrentSlide(slideIndex);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 via-white to-green-50">
      {/* Hero Section */}
      <section className="relative bg-cover bg-no-repeat text-white min-h-[580px] flex items-center" style={{backgroundImage: 'url(/hero-bg-without-text.png)', backgroundPosition: 'center 20%'}}>
        <div className="absolute inset-0 bg-black opacity-50"></div>
        <div className="relative max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
            About Learn Bangla to Deutsch
          </h1>
          <p className="text-xl md:text-2xl text-blue-100 max-w-3xl mx-auto">
            Connecting Bengali and German languages for European opportunities.
          </p>
        </div>
      </section>

      {/* Our Story */}
      <section className="pt-8 pb-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 bg-clip-text text-transparent mb-6">Our Story</h2>
              <p className="text-lg text-gray-600 mb-4 text-justify">
                Founded by Bengali speakers who successfully made Germany their new home, Learn Bangla to Deutsch
                was born from the understanding that learning German can be challenging when traditional methods
                don&apos;t consider your native language background.
              </p>
              <p className="text-lg text-gray-600 mb-4 text-justify">
                We recognized that Bengali speakers have unique learning patterns and challenges when acquiring
                German. Our platform addresses these specific needs by providing explanations, grammar comparisons,
                and cultural context that resonates with Bengali-speaking learners.
              </p>
              <p className="text-lg text-gray-600 text-justify">
                Today, we&apos;ve helped over 2,500 Bengali speakers achieve their German language goals, from basic
                communication to advanced proficiency required for university studies and professional careers in Germany.
              </p>
            </div>
            <div className="text-center">
              <div className="relative w-full mt-20">
                <div className="overflow-hidden rounded-xl shadow-xl">
                  <div
                    className="flex transition-transform duration-500 ease-in-out"
                    style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                  >
                    {images.map((image, index) => (
                      <div key={index} className="w-full flex-shrink-0">
                        <img
                          src={image.src}
                          alt={image.alt}
                          className="w-full h-80 object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Navigation dots */}
                <div className="flex justify-center space-x-3 mt-6">
                  {images.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => goToSlide(index)}
                      className={`w-3 h-3 rounded-full transition-all duration-300 ${
                        currentSlide === index
                          ? 'bg-blue-600 scale-125'
                          : 'bg-gray-300 hover:bg-gray-400'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Key Features */}
      <section className="pt-8 pb-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 bg-clip-text text-transparent mb-4">What Makes Us Different</h2>
            <p className="text-xl text-gray-600">
              Specialized approach designed for Bengali speakers
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-6 text-center">
              <h3 className="text-xl font-bold bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 bg-clip-text text-transparent mb-3">Structured CEFR Curriculum</h3>
              <p className="text-gray-600">
                Complete A1 to C1 courses following European standards with Bengali explanations
              </p>
            </Card>

            <Card className="p-6 text-center">
              <h3 className="text-xl font-bold bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 bg-clip-text text-transparent mb-3">Global Community</h3>
              <p className="text-gray-600">
                Join thousands of Bengali speakers learning German and connect with students worldwide
              </p>
            </Card>

            <Card className="p-6 text-center">
              <h3 className="text-xl font-bold bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 bg-clip-text text-transparent mb-3">Weekly Exam</h3>
              <p className="text-gray-600">
                Regular assessments to track your progress and prepare you for official German proficiency tests
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Statistics */}
      <section className="py-20 bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 text-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Our Impact</h2>
            <p className="text-xl">
              Numbers that show our commitment to student success
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-black bg-opacity-20 backdrop-blur-sm rounded-xl p-4 border border-white border-opacity-30 flex flex-col items-center justify-center">
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-green-400 text-left">250+</div>
                <div className="text-sm md:text-base text-white text-left">Happy Students</div>
              </div>
            </div>
            <div className="bg-black bg-opacity-20 backdrop-blur-sm rounded-xl p-4 border border-white border-opacity-30 flex flex-col items-center justify-center">
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-yellow-400 text-left">90%</div>
                <div className="text-sm md:text-base text-white text-left">Success Rate</div>
              </div>
            </div>
            <div className="bg-black bg-opacity-20 backdrop-blur-sm rounded-xl p-4 border border-white border-opacity-30 flex flex-col items-center justify-center">
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-red-400 text-left">3+</div>
                <div className="text-sm md:text-base text-white text-left">Countries</div>
              </div>
            </div>
            <div className="bg-black bg-opacity-20 backdrop-blur-sm rounded-xl p-4 border border-white border-opacity-30 flex flex-col items-center justify-center">
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-cyan-400 text-left">120+</div>
                <div className="text-sm md:text-base text-white text-left">Certificates Issued</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
