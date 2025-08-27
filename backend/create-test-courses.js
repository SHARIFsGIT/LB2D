const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Course schema
const courseSchema = new mongoose.Schema({
  title: String,
  level: String,
  description: String,
  duration: Number,
  price: Number,
  currency: String,
  instructor: String,
  maxStudents: Number,
  currentStudents: { type: Number, default: 0 },
  startDate: Date,
  endDate: Date,
  schedule: {
    days: [String],
    time: String
  },
  status: { type: String, default: 'upcoming' },
  features: [String],
  requirements: [String]
}, { timestamps: true });

const Course = mongoose.model('Course', courseSchema);

const sampleCourses = [
  {
    title: "German for Beginners - First Steps",
    level: "A1",
    description: "Perfect for complete beginners. Learn basic German vocabulary, simple sentences, and essential phrases for everyday situations. This course covers greetings, introductions, numbers, and basic conversation skills.",
    duration: 8,
    price: 120,
    currency: "USD",
    instructor: "Maria Schmidt",
    maxStudents: 20,
    startDate: new Date('2024-09-15'),
    endDate: new Date('2024-11-10'),
    schedule: {
      days: ['Monday', 'Wednesday', 'Friday'],
      time: '10:00 AM - 11:30 AM'
    },
    features: [
      "Basic German alphabet and pronunciation",
      "Essential vocabulary (500+ words)",
      "Simple sentence construction",
      "Greetings and introductions",
      "Numbers and time expressions",
      "Basic conversation practice",
      "Cultural insights about Germany"
    ],
    requirements: [
      "No prior German knowledge required",
      "Reliable internet connection",
      "Enthusiasm to learn!"
    ]
  },
  {
    title: "Elementary German - Building Foundations",
    level: "A2",
    description: "Build upon your basic German skills. Learn to express yourself in familiar situations, discuss personal information, and handle simple everyday tasks with confidence.",
    duration: 10,
    price: 180,
    currency: "USD",
    instructor: "Hans Mueller",
    maxStudents: 18,
    startDate: new Date('2024-09-20'),
    endDate: new Date('2024-11-29'),
    schedule: {
      days: ['Tuesday', 'Thursday'],
      time: '2:00 PM - 4:00 PM'
    },
    features: [
      "Extended vocabulary (1000+ words)",
      "Past and future tenses",
      "Describing people and places",
      "Shopping and dining conversations",
      "Travel-related German",
      "Simple email writing",
      "German culture and traditions"
    ],
    requirements: [
      "Completed A1 level or equivalent",
      "Basic understanding of German grammar",
      "Commitment to practice regularly"
    ]
  },
  {
    title: "Intermediate German - Real Communication",
    level: "B1",
    description: "Achieve intermediate proficiency in German. Handle complex conversations, express opinions, and navigate real-life situations in German-speaking countries with confidence.",
    duration: 12,
    price: 250,
    currency: "USD",
    instructor: "Dr. Anna Weber",
    maxStudents: 15,
    startDate: new Date('2024-10-01'),
    endDate: new Date('2024-12-24'),
    schedule: {
      days: ['Monday', 'Wednesday', 'Friday'],
      time: '6:00 PM - 7:30 PM'
    },
    features: [
      "Complex grammar structures",
      "Advanced vocabulary (2000+ words)",
      "Opinion expression and argumentation",
      "Business German basics",
      "German media comprehension",
      "Creative writing exercises",
      "Regional dialects introduction"
    ],
    requirements: [
      "Completed A2 level or equivalent",
      "Good foundation in German grammar",
      "Ability to hold basic conversations"
    ]
  },
  {
    title: "Upper Intermediate German - Professional Skills",
    level: "B2",
    description: "Master advanced German for professional and academic contexts. Develop fluency in complex topics, business communication, and prepare for university or career opportunities.",
    duration: 14,
    price: 320,
    currency: "USD",
    instructor: "Prof. Michael Klein",
    maxStudents: 12,
    startDate: new Date('2024-10-15'),
    endDate: new Date('2025-01-15'),
    schedule: {
      days: ['Tuesday', 'Thursday', 'Saturday'],
      time: '7:00 PM - 8:30 PM'
    },
    features: [
      "Professional German vocabulary",
      "Advanced grammar mastery",
      "Presentation skills in German",
      "Academic writing techniques",
      "Business correspondence",
      "TestDaF preparation",
      "German literature introduction"
    ],
    requirements: [
      "Completed B1 level or equivalent",
      "Strong intermediate German skills",
      "Specific goals for German proficiency"
    ]
  },
  {
    title: "Advanced German - Native-like Fluency",
    level: "C1",
    description: "Achieve near-native German proficiency. Master nuanced expressions, academic discourse, and sophisticated communication for professional and personal excellence.",
    duration: 16,
    price: 400,
    currency: "USD",
    instructor: "Dr. Elisabeth Hoffmann",
    maxStudents: 10,
    startDate: new Date('2024-11-01'),
    endDate: new Date('2025-02-28'),
    schedule: {
      days: ['Monday', 'Wednesday', 'Friday'],
      time: '8:00 PM - 9:30 PM'
    },
    features: [
      "Sophisticated vocabulary mastery",
      "Complex text analysis",
      "Academic and professional writing",
      "Advanced presentation skills",
      "Cultural and historical contexts",
      "German philosophy and literature",
      "Exam preparation (Goethe C1)"
    ],
    requirements: [
      "Completed B2 level or equivalent",
      "Advanced German proficiency",
      "Serious commitment to excellence"
    ]
  }
];

async function createTestCourses() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing courses (optional)
    console.log('Clearing existing courses...');
    await Course.deleteMany({});

    // Create sample courses
    console.log('Creating test courses...');
    const createdCourses = await Course.insertMany(sampleCourses);

    console.log(`\n🎉 Successfully created ${createdCourses.length} test courses!`);
    console.log('\nCourses created:');
    createdCourses.forEach((course, index) => {
      console.log(`${index + 1}. ${course.title} (${course.level}) - $${course.price}`);
    });

    console.log('\n✅ Test courses are ready!');
    console.log('👉 Now you can:');
    console.log('   1. Login as admin (admin@example.com / Admin@1234)');
    console.log('   2. View courses at http://localhost:3000/admin');
    console.log('   3. Browse courses at http://localhost:3000/courses');
    console.log('   4. Test enrollment flow');

    process.exit(0);
  } catch (error) {
    console.error('Error creating test courses:', error);
    process.exit(1);
  }
}

createTestCourses();