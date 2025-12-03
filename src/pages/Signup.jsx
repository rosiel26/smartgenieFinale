import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { FcGoogle } from "react-icons/fc";
import { FaFacebook } from "react-icons/fa";

export default function Signup() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Password validation rules
  const rules = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[@$!%*?&]/.test(password),
  };

  // Cooldown countdown for rate limits
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const id = setInterval(() => {
      setCooldownSeconds((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [cooldownSeconds]);

  // Save current path before OAuth redirect
  const saveRedirectPath = () => {
    localStorage.setItem("redirect_after_oauth", window.location.pathname);
  };

  // Email/Password signup
  const handleSignup = async (e) => {
    e.preventDefault();

    if (cooldownSeconds > 0) return;

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match!");
      setIsSuccess(false);
      return;
    }

    if (!Object.values(rules).every(Boolean)) {
      setErrorMsg("Password does not meet all requirements.");
      setIsSuccess(false);
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setIsSuccess(false);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo:
          import.meta.env.VITE_SUPABASE_REDIRECT_URL ||
          `${window.location.origin}/health-profile`,
      },
    });

    setLoading(false);

    if (error) {
      console.error("Signup error:", error);
      setIsSuccess(false);
      const errorMsg = (error.message || "").toLowerCase();

      // Check for duplicate email - Supabase returns different messages
      if (
        errorMsg.includes("already registered") ||
        errorMsg.includes("user already exists") ||
        errorMsg.includes("duplicate") ||
        errorMsg.includes("email already registered")
      ) {
        setErrorMsg("This email is already in use. Try logging in instead.");
      } else if (errorMsg.includes("rate limit")) {
        setErrorMsg("Too many attempts. Please wait a minute and try again.");
        setCooldownSeconds(60);
      } else if (error.message) {
        setErrorMsg(error.message);
      } else {
        setErrorMsg("Something went wrong! Please check your connection.");
      }
    } else if (
      data?.user &&
      (!data.user.identities || data.user.identities.length === 0)
    ) {
      // ⚠️ User exists but has no identities - means email already registered
      console.warn("Email already registered (no identities):", data);
      setIsSuccess(false);
      setErrorMsg("This email is already in use. Try logging in instead.");
    } else {
      // ✅ Show success but inform user about email verification requirement
      setIsSuccess(true);
      setErrorMsg(
        "Signup successful! 📧 Please check your email (including spam folder) to confirm your account. You'll need to verify before logging in."
      );
      // Clear form after success
      setTimeout(() => {
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        setName("");
      }, 500);
    }
  };

  // Google OAuth signup
  const handleGoogleSignup = async () => {
    try {
      saveRedirectPath();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      console.log("Google OAuth response:", { data, error });
      if (error) throw error;
    } catch (err) {
      console.error("Google signup error:", err);
      setIsSuccess(false);
      setErrorMsg("Failed to sign up with Google.");
    }
  };

  // Facebook OAuth signup
  const handleFacebookSignup = async () => {
    try {
      saveRedirectPath();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "facebook",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      console.log("Facebook OAuth response:", { data, error });
      if (error) throw error;
    } catch (err) {
      console.error("Facebook signup error:", err);
      setIsSuccess(false);
      setErrorMsg("Failed to sign up with Facebook.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-green-50 to-green-100 flex items-center justify-center px-4 py-12">
      <div className="bg-white w-[400px] max-w-md rounded-3xl shadow-2xl p-6 sm:p-8 flex flex-col items-center">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-800 mb-2 text-center">
          Create Account
        </h2>
        <p className="text-center text-gray-500 mb-6 text-sm sm:text-base">
          Start your journey with{" "}
          <span className="font-semibold text-green-600">SmartGenie</span>
        </p>

        {errorMsg && (
          <div
            className={`${
              isSuccess
                ? "bg-green-100 text-green-700 border border-green-300"
                : "bg-red-100 text-red-600 border border-red-300"
            } px-4 py-3 rounded-lg text-center text-sm mb-4 w-full`}
          >
            {errorMsg}
          </div>
        )}

        {/* Signup Form */}
        <form onSubmit={handleSignup} className="w-full space-y-5">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Email */}
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
              className="w-full px-4 py-2 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Password */}
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
                className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-green-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-green-600"
              >
                {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
              </button>
            </div>

            {/* Password Rules */}
            <ul className="mt-2 text-xs text-gray-600 space-y-1">
              <li className={rules.length ? "text-green-600" : "text-red-500"}>
                {rules.length ? "✅" : "❌"} At least 8 characters
              </li>
              <li
                className={rules.uppercase ? "text-green-600" : "text-red-500"}
              >
                {rules.uppercase ? "✅" : "❌"} One uppercase letter
              </li>
              <li
                className={rules.lowercase ? "text-green-600" : "text-red-500"}
              >
                {rules.lowercase ? "✅" : "❌"} One lowercase letter
              </li>
              <li className={rules.number ? "text-green-600" : "text-red-500"}>
                {rules.number ? "✅" : "❌"} One number
              </li>
              <li className={rules.special ? "text-green-600" : "text-red-500"}>
                {rules.special ? "✅" : "❌"} One special character (@$!%*?&)
              </li>
            </ul>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-green-500"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-green-600"
              >
                {showConfirmPassword ? (
                  <FiEyeOff size={20} />
                ) : (
                  <FiEye size={20} />
                )}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || cooldownSeconds > 0}
            className={`w-full bg-black hover:bg-lime-700 text-white font-semibold py-3 rounded-xl shadow-lg transition duration-300 ${
              loading || cooldownSeconds > 0
                ? "opacity-60 cursor-not-allowed"
                : ""
            }`}
          >
            {loading ? "Signing Up..." : "Sign Up"}
          </button>

          {cooldownSeconds > 0 && (
            <p className="text-xs text-gray-500 text-center">
              Please wait {cooldownSeconds}s before trying again.
            </p>
          )}
        </form>

        {/* Divider */}
        <div className="flex items-center w-full my-4">
          <hr className="flex-grow border-gray-300" />
          <span className="mx-3 text-gray-400 text-sm">or</span>
          <hr className="flex-grow border-gray-300" />
        </div>

        {/* Google Signup */}
        <button
          onClick={handleGoogleSignup}
          className="w-full border border-gray-300 flex items-center justify-center gap-2 py-3 rounded-xl hover:bg-gray-50 transition duration-300"
        >
          <FcGoogle size={22} />
          <span className="text-gray-700 font-medium hover:text-green-600 transition">
            Continue with Google
          </span>
        </button>

        {/* Facebook Signup */}
        <button
          onClick={handleFacebookSignup}
          className="w-full mt-3 border border-gray-300 flex items-center justify-center gap-2 py-3 rounded-xl hover:bg-gray-50 transition duration-300"
        >
          <FaFacebook size={22} className="text-blue-600" />
          <span className="text-gray-700 font-medium hover:text-blue-600 transition">
            Continue with Facebook
          </span>
        </button>

        <div className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <span
            onClick={() => navigate("/login")}
            className="text-green-600 hover:underline cursor-pointer hover:font-medium"
          >
            Sign In
          </span>
        </div>
      </div>
    </div>
  );
}
