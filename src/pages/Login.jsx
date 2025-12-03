import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { FcGoogle } from "react-icons/fc";
import { FaFacebook } from "react-icons/fa";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // -------------------- Email/password login --------------------
  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);

    if (error) {
      setErrorMsg("Invalid email or password");
    } else {
      sessionStorage.setItem("showDisclaimer", "true");
      navigate("/personaldashboard");
    }
  };

  // -------------------- OAuth login --------------------
  const handleOAuthLogin = async (provider) => {
    setErrorMsg("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider });
      if (error) throw error;
      // Supabase will redirect to site root
    } catch (err) {
      console.error(err);
      setErrorMsg(`Failed to sign in with ${provider}. Please try again.`);
    }
  };

  // -------------------- Auto-redirect if already logged in --------------------
  useEffect(() => {
    // 1️⃣ Check current user on page load
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) navigate("/personaldashboard", { replace: true });
    };
    checkUser();

    // 2️⃣ Listen for OAuth login redirect
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          sessionStorage.setItem("showDisclaimer", "true");
          navigate("/personaldashboard", { replace: true });
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  // -------------------- UI --------------------
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-green-50 to-green-100 flex items-center justify-center px-4 py-12">
      <div className="bg-white w-[400px] max-w-md rounded-3xl shadow-2xl p-6 sm:p-8 flex flex-col items-center">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-800 mb-2 text-center mt-10">
          Welcome Back
        </h2>
        <p className="text-center text-gray-500 mb-10 text-sm sm:text-base px-2 sm:px-0">
          Sign in to continue using{" "}
          <span className="font-semibold text-green-600">SmartGenie</span>
        </p>

        {errorMsg && (
          <div className="bg-red-100 text-red-600 px-4 py-2 rounded-lg text-center text-sm sm:text-base mb-4 w-full">
            {errorMsg}
          </div>
        )}

        {/* Email/Password Form */}
        <form
          onSubmit={handleLogin}
          className="w-full space-y-4 sm:space-y-6 px-2 sm:px-0"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-green-500 text-sm sm:text-base"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-green-500 text-sm sm:text-base pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center text-gray-400 hover:text-gray-600 p-1"
              >
                {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black hover:bg-lime-700 text-white font-semibold py-2 sm:py-3 rounded-xl shadow-lg transition duration-300 text-sm sm:text-base"
          >
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center justify-center w-full my-6">
          <div className="border-t border-gray-300 flex-grow"></div>
          <span className="px-3 text-gray-400 text-sm">or continue with</span>
          <div className="border-t border-gray-300 flex-grow"></div>
        </div>

        {/* Social Login */}
        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={() => handleOAuthLogin("google")}
            className="flex items-center justify-center gap-2 w-full border border-gray-300 rounded-xl py-2 hover:bg-gray-50 transition"
          >
            <FcGoogle size={22} />
            <span className="text-sm sm:text-base font-medium text-gray-700 hover:text-green-600 transition">
              Continue with Google
            </span>
          </button>

          <button
            onClick={() => handleOAuthLogin("facebook")}
            className="flex items-center justify-center gap-2 w-full border border-gray-300 rounded-xl py-2 hover:bg-gray-50 transition"
          >
            <FaFacebook size={22} className="text-blue-600" />
            <span className="text-sm sm:text-base font-medium text-gray-700 hover:text-blue-600 transition">
              Continue with Facebook
            </span>
          </button>
        </div>

        {/* Links */}
        <div className="mt-6 sm:mt-8 text-center text-sm sm:text-base text-gray-600 space-y-1 sm:space-y-2">
          <p>
            Don’t have an account?{" "}
            <span
              onClick={() => navigate("/signup")}
              className="text-lime-600 hover:underline hover:font-medium cursor-pointer"
            >
              Create one
            </span>
          </p>
          <p
            onClick={() => navigate("/forgot-password")}
            className="text-lime-600 hover:underline hover:font-medium cursor-pointer"
          >
            Forgot your password?
          </p>
        </div>
      </div>
    </div>
  );
}
