import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// Pages
import LandingPage from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ProtectedRoute from "./components/ProtectedRoute";

import ScanPage from "./pages/ScanPage";
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

function App() {
  useEffect(() => {
    if (window.location.hash === "#") {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  return (
    <Router>
      <Routes>
        {/* Public routes: Landing, Login, Signup */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/analyze" element={<AnalyzePage />} />
        <Route path="/result" element={<ResultPage />} />

        {/* All other routes are protected */}
        <Route
          path="*"
          element={
            <ProtectedRoute>
              <Routes>
                <Route path="/scan" element={<ScanPage />} />

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
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/faq" element={<FAQ />} />
                <Route path="/contact-us" element={<ContactUs />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/disclaimer" element={<Disclaimer />} />
                <Route path="/account" element={<AccountManagement />} />
                <Route path="/mealplan" element={<MealPlan />} />
                <Route path="/workout" element={<Workout />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
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
