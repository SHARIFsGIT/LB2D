# SUPERVISOR DASHBOARD - COMPLETE 4-TAB IMPLEMENTATION

## File Location
`apps/web/src/app/supervisor/page.tsx`

## CRITICAL ISSUE
The current file at P:/LB2D/LB2D-v2/apps/web/src/app/supervisor/page.tsx is **INCOMPLETE** and ends abruptly at line 942 with the comment `/* TO BE CONTINUED IN NEXT MESSAGE DUE TO LENGTH... */`.

This file MUST be completed with the full 4-tab implementation.

## REQUIRED STRUCTURE

### 1. TAB NAVIGATION (ALREADY MISSING)
The file needs to be completely rewritten to include:

```tsx
// Tab State
const [activeTab, setActiveTab] = useState<TabType>('courses');

// NEW States for Students Tab
const [students, setStudents] = useState<Student[]>([]);
const [studentSearch, setStudentSearch] = useState('');
const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
const [showStudentProfile, setShowStudentProfile] = useState(false);

// NEW States for Videos Tab
const [allVideos, setAllVideos] = useState<Video[]>([]);
const [videoFilter, setVideoFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

// NEW States for Salary Tab
const [salaryData, setSalaryData] = useState<SalaryData | null>(null);
const [salaryLoading, setSalaryLoading] = useState(false);
```

### 2. MISSING IMPORTS
```tsx
import StudentProfileModal from './components/StudentProfileModal';
import SalaryOverview from './components/SalaryOverview';
import VideoCard from './components/VideoCard';
```

### 3. MISSING TYPES
```tsx
type TabType = 'courses' | 'students' | 'videos' | 'salary';

interface Student {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  profilePhoto?: string;
  role: string;
  createdAt: string;
  lastLogin?: string;
}

interface SalaryData {
  currentMonth: number;
  yearToDate: number;
  monthlyBreakdown: Array<{
    month: string;
    year: number;
    amount: number;
    status: 'paid' | 'pending' | 'unpaid';
    paymentDate?: string;
    paymentMethod?: string;
    transactionId?: string;
  }>;
  assignedCourses: Array<{
    courseId: string;
    title: string;
    students: number;
    revenue: number;
    commission: number;
    earning: number;
  }>;
}
```

### 4. MISSING DATA FETCHING FUNCTIONS
```tsx
// Fetch Students
const fetchStudents = async () => {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/users?role=STUDENT`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (data.success) {
      setStudents(data.data || []);
    }
  } catch (error) {
    console.error('Error fetching students:', error);
    showAlert('error', 'Failed to load students');
  }
};

// Fetch All Videos
const fetchAllVideos = async () => {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/videos/my-videos`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (data.success) {
      setAllVideos(data.data || []);
    }
  } catch (error) {
    console.error('Error fetching all videos:', error);
    showAlert('error', 'Failed to load videos');
  }
};

// Fetch Salary Data
const fetchSalaryData = async () => {
  setSalaryLoading(true);
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/analytics/supervisor/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (data.success) {
      setSalaryData(data.data);
    }
  } catch (error) {
    console.error('Error fetching salary data:', error);
    showAlert('error', 'Failed to load salary data');
  } finally {
    setSalaryLoading(false);
  }
};
```

### 5. MISSING USEEFFECTS
```tsx
// Auto-refresh salary every 30 seconds when on salary tab
useEffect(() => {
  if (activeTab === 'salary') {
    fetchSalaryData();
    const interval = setInterval(fetchSalaryData, 30000);
    return () => clearInterval(interval);
  }
}, [activeTab]);

// Fetch data when switching tabs
useEffect(() => {
  if (activeTab === 'students' && students.length === 0) {
    fetchStudents();
  } else if (activeTab === 'videos' && allVideos.length === 0) {
    fetchAllVideos();
  } else if (activeTab === 'salary' && !salaryData) {
    fetchSalaryData();
  }
}, [activeTab]);
```

### 6. MISSING TAB NAVIGATION UI
After the stats grid (around line 848), add:

```tsx
{/* TAB NAVIGATION */}
<div className="flex gap-2 mb-8 p-2 bg-white rounded-2xl shadow-xl overflow-x-auto">
  <button
    onClick={() => setActiveTab('courses')}
    className={`px-6 py-3 rounded-xl font-semibold transition-all whitespace-nowrap ${
      activeTab === 'courses'
        ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg'
        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
    }`}
  >
    📚 Courses
  </button>
  <button
    onClick={() => setActiveTab('students')}
    className={`px-6 py-3 rounded-xl font-semibold transition-all whitespace-nowrap ${
      activeTab === 'students'
        ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg'
        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
    }`}
  >
    👥 Students
  </button>
  <button
    onClick={() => setActiveTab('videos')}
    className={`px-6 py-3 rounded-xl font-semibold transition-all whitespace-nowrap ${
      activeTab === 'videos'
        ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg'
        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
    }`}
  >
    🎥 Videos
  </button>
  <button
    onClick={() => setActiveTab('salary')}
    className={`px-6 py-3 rounded-xl font-semibold transition-all whitespace-nowrap ${
      activeTab === 'salary'
        ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg'
        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
    }`}
  >
    💰 Salary
  </button>
</div>
```

### 7. TAB CONTENT SECTIONS

#### COURSES TAB (wrap existing courses grid):
```tsx
{activeTab === 'courses' && (
  <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
    {/* Existing courses grid code */}
  </div>
)}
```

#### STUDENTS TAB (NEW):
```tsx
{activeTab === 'students' && (
  <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
    <div className="flex justify-between items-center mb-6">
      <h2 className="text-2xl font-bold text-gray-900">Students</h2>
      <div className="w-64">
        <Input
          type="text"
          placeholder="Search students..."
          value={studentSearch}
          onChange={(e) => setStudentSearch(e.target.value)}
          className="w-full"
        />
      </div>
    </div>

    {filteredStudents.length === 0 ? (
      <div className="text-center py-12 bg-gray-50 rounded-xl">
        <h4 className="text-lg font-medium text-gray-800 mb-2">No Students Found</h4>
        <p className="text-gray-600">
          {studentSearch ? 'Try a different search term' : 'No students enrolled yet'}
        </p>
      </div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStudents.map((student) => (
          <div
            key={student._id}
            onClick={() => handleStudentClick(student)}
            className="bg-gradient-to-br from-white to-blue-50 border-2 border-blue-200 rounded-xl p-6 hover:shadow-2xl transition-all hover:-translate-y-1 cursor-pointer"
          >
            {/* Student card content */}
          </div>
        ))}
      </div>
    )}
  </div>
)}
```

#### VIDEOS TAB (NEW):
```tsx
{activeTab === 'videos' && (
  <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
    <div className="flex justify-between items-center mb-6">
      <h2 className="text-2xl font-bold text-gray-900">All Videos</h2>
      <div className="flex gap-2">
        <button onClick={() => setVideoFilter('all')} className={...}>All</button>
        <button onClick={() => setVideoFilter('pending')} className={...}>Pending</button>
        <button onClick={() => setVideoFilter('approved')} className={...}>Approved</button>
        <button onClick={() => setVideoFilter('rejected')} className={...}>Rejected</button>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredVideos.map((video) => (
        <VideoCard
          key={video._id}
          video={video}
          onResubmit={handleResubmitVideo}
          onDelete={handleDeleteVideo}
        />
      ))}
    </div>
  </div>
)}
```

#### SALARY TAB (NEW):
```tsx
{activeTab === 'salary' && (
  <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
    <SalaryOverview salaryData={salaryData} loading={salaryLoading} />
  </div>
)}
```

### 8. MISSING HANDLERS
```tsx
// NEW: Student Handlers
const handleStudentClick = (student: Student) => {
  setSelectedStudent(student);
  setShowStudentProfile(true);
};

// Filter functions
const filteredStudents = students.filter((student) =>
  `${student.firstName} ${student.lastName} ${student.email}`
    .toLowerCase()
    .includes(studentSearch.toLowerCase())
);

const filteredVideos = allVideos.filter((video) => {
  if (videoFilter === 'all') return true;
  return video.status === videoFilter;
});
```

### 9. MISSING MODALS
```tsx
{/* Student Profile Modal */}
{selectedStudent && (
  <StudentProfileModal
    isOpen={showStudentProfile}
    onClose={() => {
      setShowStudentProfile(false);
      setSelectedStudent(null);
    }}
    student={selectedStudent}
  />
)}
```

### 10. UPDATE VIDEO HANDLERS
Make sure handleResubmitVideo and handleUploadVideo refresh allVideos when on videos tab:

```tsx
// In handleUploadVideo, add after success:
if (activeTab === 'videos') {
  fetchAllVideos();
}

// In handleResubmitVideo, add after success:
if (activeTab === 'videos') {
  fetchAllVideos();
}

// In confirmDelete for videos, add after success:
if (activeTab === 'videos' && deleteTarget.type === 'video') {
  fetchAllVideos();
}
```

## ACTION REQUIRED

The file needs to be COMPLETELY REWRITTEN because:
1. It's currently incomplete (ends at line 942 with "TO BE CONTINUED")
2. It's missing all 4 tab functionality
3. It only shows the courses grid without tab navigation
4. The upload modal is likely incomplete as well

## COMPONENTS STATUS
All required component files exist and are correctly implemented:
- ✅ StudentProfileModal.tsx
- ✅ SalaryOverview.tsx
- ✅ VideoCard.tsx

## NEXT STEPS
1. Delete the current incomplete page.tsx file
2. Create a new complete file with all 4 tabs
3. Import all required components
4. Implement all data fetching functions
5. Add tab navigation UI
6. Implement all 4 tab content sections
7. Add missing handlers and filters
8. Keep ALL existing upload modal functionality intact
