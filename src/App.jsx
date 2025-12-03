import React, { useEffect, useContext } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { DBStatusContext } from "./utils/DBStatusContext.jsx";

// Pages
import LandingPage from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ProtectedRoute from "./components/ProtectedRoute";

import AnalyzePage from "./components/AnalyzePage";
import ResultPage from "./pages/ResultPage";
import HealthProfile from "./pages/HealthProfile";
import PersonalDash from "./pages/PersonalDash";
import EditProfile from "./pages/EditProfile";
import NutritionProtocol from "./components/NutritionProtocol.jsx";
import Profile from "./pages/Profile.jsx";
import Navbar from "./components/NavBar.jsx";
import Journal from "./pages/Journal.jsx";
import Settings from "./pages/Setting.jsx";
import ForgotPassword from "./components/ForgotPassword.jsx";
import ResetPassword from "./components/ResetPassword.jsx";
import FAQ from "./pages/FAQ.jsx";
import ContactUs from "./pages/ContactUs.jsx";
import Terms from "./pages/Terms.jsx";
import Disclaimer from "./pages/Disclaimer.jsx";
import AccountManagement from "./pages/Account.jsx";
import NotFound from "./pages/NotFound.jsx";
import AuthCallback from "./pages/AuthCallback.jsx";
import MealPlan from "./pages/Mealplan.jsx";
import Workout from "./pages/Workout.jsx";
import AdminBackfill from "./pages/AdminBackfill.jsx";

function App() {
  const { dbStatus, isLoading } = useContext(DBStatusContext);

  useEffect(() => {
    if (window.location.hash === "#") {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  // Nice maintenance UI
  if (dbStatus === "maintenance") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen  text-black p-6">
        <div className="max-w-md text-center bg-white/10 backdrop-blur-md rounded-2xl shadow-lg p-8">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="mx-auto h-20 w-20 text-red-400 animate-bounce"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M12 2a10 10 0 1010 10A10 10 0 0012 2z"
            />
          </svg>
          <h1 className="mt-4 text-3xl font-bold">🚧 Maintenance Mode</h1>
          <p className="mt-2 text-lg">
            We are currently improving our services. The dashboard will be back
            shortly.
          </p>
          <p className="mt-4 text-sm">
            Need support? Email us at{" "}
            <a
              href="mailto:support@example.com"
              className="underline text-yellow-300 hover:text-yellow-100"
            >
              smartgenie@gmail.com
            </a>
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 bg-yellow-400 text-purple-700 font-semibold px-6 py-2 rounded-lg hover:bg-yellow-300 transition"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/analyze" element={<AnalyzePage />} />
        <Route path="/result" element={<ResultPage />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Protected routes */}
        <Route
          path="*"
          element={
            <ProtectedRoute>
              <Routes>
                <Route path="/health-profile" element={<HealthProfile />} />
                <Route path="/personaldashboard" element={<PersonalDash />} />
                <Route path="/journal" element={<Journal />} />
                <Route path="/edit-profile" element={<EditProfile />} />
                <Route
                  path="/nutrition-protocol"
                  element={<NutritionProtocol />}
                />
                <Route path="/profile" element={<Profile />} />
                <Route path="/navbar" element={<Navbar />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/faq" element={<FAQ />} />
                <Route path="/contact-us" element={<ContactUs />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/disclaimer" element={<Disclaimer />} />
                <Route path="/account" element={<AccountManagement />} />
                <Route path="/mealplan" element={<MealPlan />} />
                <Route path="/workout" element={<Workout />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/admin/backfill" element={<AdminBackfill />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
