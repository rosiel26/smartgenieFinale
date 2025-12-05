import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function ProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Get initial session
    const initSession = async () => {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        // If there's a refresh token error, log the user out
        if (
          sessionError?.message?.includes("Refresh Token Not Found") ||
          sessionError?.message?.includes("Invalid Refresh Token")
        ) {
          console.warn("Invalid session - user needs to re-authenticate");
          await supabase.auth.signOut();
          setSession(null);
          setError("Your session has expired. Please log in again.");
        } else if (sessionError) {
          console.error("Session error:", sessionError);
          setError(sessionError.message);
        } else {
          setSession(session);
          setError(null);
        }
      } catch (err) {
        console.error("Critical auth error:", err);
        setError("Authentication error. Please try logging in again.");
      } finally {
        setLoading(false);
      }
    };

    initSession();

    // Listen for auth changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // console.log("Auth state changed:", event);

        // Handle sign-out or token refresh failures
        if (event === "SIGNED_OUT" || event === "TOKEN_REFRESHED") {
          if (!session) {
            setSession(null);
            setError(null);
          } else {
            setSession(session);
            setError(null);
          }
        } else if (session) {
          setSession(session);
          setError(null);
        }
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  if (loading) return <div className="text-center p-6">Loading...</div>;

  // Show error message if there's an auth problem
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-red-50">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
          <h2 className="text-xl font-bold text-red-600 mb-3">Session Error</h2>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={() => (window.location.href = "/login")}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return session ? children : <Navigate to="/" replace />;
}
