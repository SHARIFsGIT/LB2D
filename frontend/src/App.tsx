import { Provider, useSelector } from 'react-redux';
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { PersistGate } from 'redux-persist/integration/react';
import './App.css';
import AuthWrapper from './components/AuthWrapper';
import PrivateRoute from './components/PrivateRoute';
import AdminDashboard from './pages/AdminDashboard';
import SupervisorDashboard from './pages/SupervisorDashboard';
import Assessment from './pages/Assessment';
import EmailVerification from './pages/EmailVerification';
import Login from './pages/Login';
import Register from './pages/Register';
import RegistrationSuccess from './pages/RegistrationSuccess';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import CourseCatalog from './pages/CourseCatalog';
import CourseEnrollment from './pages/CourseEnrollment';
import CourseManagement from './pages/CourseManagement';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import MyCourses from './pages/MyCourses';
import CourseVideos from './pages/CourseVideos';
import Certificates from './pages/Certificates';
import About from './pages/About';
import Contact from './pages/Contact';
import Profile from './pages/Profile';
import Navbar from './components/Navbar';
import NotificationContainer from './components/NotificationContainer';
import { NotificationProvider } from './contexts/NotificationContext';
import { persistor, RootState, store } from './store/store';

function AppRoutes() {
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const user = useSelector((state: RootState) => state.auth.user);
  
  // Helper function to get role-based default route
  const getDefaultRoute = () => {
    if (!user) return '/login';
    if (user.role === 'Admin') return '/admin';
    if (user.role === 'Supervisor') return '/supervisor';
    return '/dashboard';
  };
  
  return (
    <Routes>
      <Route path="/login" element={
        isAuthenticated ? <Navigate to={getDefaultRoute()} /> : <Login />
      } />
      <Route path="/register" element={
        isAuthenticated ? <Navigate to={getDefaultRoute()} /> : <Register />
      } />
      <Route path="/registration-success" element={<RegistrationSuccess />} />
      <Route path="/forgot-password" element={
        isAuthenticated ? <Navigate to={getDefaultRoute()} /> : <ForgotPassword />
      } />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/verify-email" element={<EmailVerification />} />
      <Route path="/dashboard" element={
        <PrivateRoute>
          <Dashboard />
        </PrivateRoute>
      } />
      <Route path="/my-courses" element={
        <PrivateRoute>
          <MyCourses />
        </PrivateRoute>
      } />
      <Route path="/course/:courseId/videos" element={
        <PrivateRoute>
          <CourseVideos />
        </PrivateRoute>
      } />
      <Route path="/certificates" element={
        <PrivateRoute>
          <Certificates />
        </PrivateRoute>
      } />
      <Route path="/profile" element={
        <PrivateRoute>
          <Profile />
        </PrivateRoute>
      } />
      <Route path="/assessment" element={
        <PrivateRoute>
          <Assessment />
        </PrivateRoute>
      } />
      <Route path="/quiz/:quizId" element={
        <PrivateRoute>
          <Assessment />
        </PrivateRoute>
      } />
      <Route path="/admin" element={
        <PrivateRoute adminOnly>
          <AdminDashboard />
        </PrivateRoute>
      } />
      <Route path="/admin/analytics" element={
        <PrivateRoute adminOnly>
          <AnalyticsDashboard />
        </PrivateRoute>
      } />
      <Route path="/admin/courses" element={
        <PrivateRoute adminOnly>
          <CourseManagement />
        </PrivateRoute>
      } />
      <Route path="/supervisor" element={
        <PrivateRoute supervisorOnly>
          <SupervisorDashboard />
        </PrivateRoute>
      } />
      <Route path="/courses" element={<CourseCatalog />} />
      <Route path="/about" element={<About />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/enroll/:courseId" element={
        <PrivateRoute>
          <CourseEnrollment />
        </PrivateRoute>
      } />
      <Route path="/" element={<LandingPage />} />
      <Route path="*" element={
        isAuthenticated ? <Navigate to={getDefaultRoute()} /> : <Navigate to="/login" />
      } />
    </Routes>
  );
}

function App() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <NotificationProvider>
          <AuthWrapper>
            <Router>
              <div className="App">
                <Navbar />
                <AppRoutes />
                <NotificationContainer />
              </div>
            </Router>
          </AuthWrapper>
        </NotificationProvider>
      </PersistGate>
    </Provider>
  );
}

export default App;