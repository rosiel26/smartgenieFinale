import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import { FiEye, FiEyeOff } from "react-icons/fi";

// Define styles here
const container = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "linear-gradient(to bottom right, #e0f2f7, #ffffff, #e3f2fd)",
  padding: "1rem",
};

const card = {
  background: "#ffffff",
  borderRadius: "12px",
  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
  padding: "2.5rem",
  textAlign: "center",
  maxWidth: "400px",
  width: "100%",
  border: "1px solid #e0e0e0",
};

const title = {
  fontSize: "1.875rem", // text-3xl
  fontWeight: "700", // font-bold
  color: "#333",
  marginBottom: "1.5rem",
};

const messageBox = {
  padding: "1rem",
  borderRadius: "8px",
  marginBottom: "1.5rem",
  fontSize: "0.875rem", // text-sm
  fontWeight: "500", // font-medium
};

const form = {
  display: "flex",
  flexDirection: "column",
  gap: "1rem", // space-y-4
};

const inputContainer = {
  position: "relative",
};

const input = {
  width: "100%",
  padding: "0.75rem 1rem",
  borderRadius: "8px",
  border: "1px solid #ccc",
  fontSize: "1rem",
  outline: "none",
  transition: "border-color 0.2s",
};

const eyeIcon = {
  position: "absolute",
  right: "1rem",
  top: "50%",
  transform: "translateY(-50%)",
  cursor: "pointer",
  color: "#666",
};

const button = {
  padding: "0.75rem 1.25rem",
  borderRadius: "8px",
  border: "none",
  backgroundColor: "#4f46e5", // indigo-600
  color: "#fff",
  fontSize: "1rem",
  fontWeight: "600", // font-semibold
  cursor: "pointer",
  transition: "background-color 0.2s",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "0.5rem",
};

const backToLogin = {
  marginTop: "1.5rem",
  color: "#4f46e5", // indigo-600
  cursor: "pointer",
  textDecoration: "underline",
  fontSize: "0.875rem", // text-sm
};

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [loading, setLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {

    const verifySession = async () => {
      try {
        // Get session - Supabase will automatically process the hash URL
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("Session error:", sessionError);
          setMessage({ text: "Error verifying session.", type: "error" });
          return;
        }

        // Check if we have a valid session (which means recovery token was processed)
        if (session?.user) {
          setIsVerified(true);
          setMessage({ text: "", type: "" });
          console.log("Recovery session verified");
        } else {
          setMessage({ text: "Reset link expired or invalid.", type: "error" });
        }
      } catch (err) {
        console.error("Verification exception:", err);
        setMessage({ text: "Reset link is invalid or expired.", type: "error" });
      }
    };

    // Wait a moment for Supabase to process the URL
    setTimeout(verifySession, 500);
  }, []);

  const handleReset = async (e) => {
    e.preventDefault();
    setMessage({ text: "", type: "" });

    if (!isVerified) {
      setMessage({ text: "Please verify your reset link first.", type: "error" });
      return;
    }

    if (!password || !confirmPassword) {
      setMessage({ text: "Please fill in all fields.", type: "error" });
      return;
    }
    if (password !== confirmPassword) {
      setMessage({ text: "Passwords do not match.", type: "error" });
      return;
    }
    if (password.length < 6) {
      setMessage({
        text: "Password must be at least 6 characters.",
        type: "error",
      });
      return;
    }

    setLoading(true);

    try {
      // Update password with the verified session
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        console.error("Password update error:", error);
        setMessage({ text: error.message, type: "error" });
      } else {
        setMessage({
          text: "✅ Password successfully updated! Signing out...",
          type: "success",
        });
        
        // Sign out and redirect to login
        await supabase.auth.signOut();
        setTimeout(() => navigate("/login"), 2000);
      }
    } catch (err) {
      console.error("Password reset exception:", err);
      setMessage({ text: "Something went wrong. Try again.", type: "error" });
    }

    setLoading(false);
  };

  if (!isVerified && !message.text) {
    return (
      <div style={container}>
        <div style={card}>
          <h2 style={title}>Verifying Reset Link...</h2>
          <p style={{ color: "#666", marginTop: "20px" }}>
            Please wait while we verify your reset link.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={container}>
      <div style={card}>
        <h2 style={title}>Reset Your Password</h2>

        {message.text && (
          <div
            style={{
              ...messageBox,
              backgroundColor:
                message.type === "success" ? "#e6ffed" : "#ffe6e6",
              color: message.type === "success" ? "#2e7d32" : "#d32f2f",
            }}
          >
            {message.text}
          </div>
        )}

        {isVerified && !message.type === "error" ? (
          <form onSubmit={handleReset} style={form}>
            {/* New Password */}
            <div style={inputContainer}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="New Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={input}
              />
              <span
                onClick={() => setShowPassword((prev) => !prev)}
                style={eyeIcon}
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </span>
            </div>

            {/* Confirm Password */}
            <div style={inputContainer}>
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={input}
              />
              <span
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                style={eyeIcon}
              >
                {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
              </span>
            </div>

            <button type="submit" style={button} disabled={loading}>
              {loading ? "Updating..." : "Reset Password"}
            </button>
          </form>
        ) : null}

        {message.type === "error" && (
          <button
            onClick={() => navigate("/forgot-password")}
            style={{
              ...button,
              marginTop: "15px",
              background: "linear-gradient(90deg, #ff6b6b 0%, #ee5a6f 100%)",
            }}
          >
            Request New Reset Link
          </button>
        )}

        <p style={backToLogin} onClick={() => navigate("/login")}>
          ← Back to Login
        </p>
      </div>
    </div>
  );
}
