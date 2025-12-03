// src/pages/AuthCallback.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleSession = async () => {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("Session error:", sessionError);
          setError(sessionError.message);
          // Redirect to login after 3 seconds
          setTimeout(() => navigate("/login"), 3000);
          return;
        }

        if (session) {
          // ✅ Redirect to last visited or fallback
          const savedPath =
            localStorage.getItem("redirect_after_oauth") || "/health-profile";
          localStorage.removeItem("redirect_after_oauth");
          navigate(savedPath, { replace: true });
        } else {
          // ❌ No session → go to login
          navigate("/login", { replace: true });
        }
      } catch (err) {
        console.error("Auth callback error:", err);
        setError("Authentication failed. Redirecting to login...");
        setTimeout(() => navigate("/login"), 3000);
      }
    };

    handleSession();
  }, [navigate]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-red-50">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
          <h2 className="text-xl font-bold text-red-600 mb-3">Error</h2>
          <p className="text-gray-700">{error}</p>
          <p className="text-sm text-gray-500 mt-4">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen text-gray-600">
      <div className="animate-pulse text-center">
        <div className="text-lg font-semibold mb-2">Signing you in...</div>
        <div className="text-sm text-gray-500">
          Please wait while we complete your authentication.
        </div>
      </div>
    </div>
  );
}
