import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import {
  FiArrowLeft,
  FiTrash2,
  FiDatabase,
  FiX,
  FiKey,
  FiEye,
  FiEyeOff,
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import ConfirmOldPasswordModal from "../components/ConfirmOldPasswordModal";

export default function AccountManagement() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);
  const [hasHealthData, setHasHealthData] = useState(false);

  const [showClearModal, setShowClearModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showConfirmOldPasswordModal, setShowConfirmOldPasswordModal] =
    useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [verifiedOldPassword, setVerifiedOldPassword] = useState(""); // New state to store the confirmed old password
  const [showPassword, setShowPassword] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error || !data?.user) {
          navigate("/login");
          return;
        }
        setUserId(data.user.id);
        await checkHealthData(data.user.id);
      } catch (err) {
        console.error(err);
        navigate("/login");
      }
    };
    fetchUser();
  }, [navigate]);

  const checkHealthData = async (uid) => {
    try {
      const tablesToCheck = [
        "health_profiles",
        "meal_logs",
        "workouts",
        "feedback_submissions",
        "contact_messages",
      ];

      const promises = tablesToCheck.map((table) =>
        supabase
          .from(table)
          .select("id", { count: "exact", head: true })
          .eq("user_id", uid)
      );

      const results = await Promise.all(promises);
      const hasData = results.some((res) => res.count > 0);

      setHasHealthData(hasData);
    } catch {
      setHasHealthData(true); // Assume data exists if check fails
    }
  };

  const handleClearData = async () => {
    if (!userId) return;
    setLoading(true);
    setErrorText("");
    try {
      const tablesToClear = [
        "health_profiles",
        "meal_logs",
        "workouts",
        "feedback_submissions",
        "contact_messages",
      ];

      const promises = tablesToClear.map((table) =>
        supabase.from(table).delete().eq("user_id", userId)
      );

      const results = await Promise.all(promises);
      const errors = results.map((res) => res.error).filter(Boolean);

      if (errors.length > 0) {
        // Log individual errors for debugging
        errors.forEach((error) => console.error("Deletion error:", error));
        throw new Error(
          "Failed to clear some data. Check console for details."
        );
      }

      setHasHealthData(false);
      setShowClearModal(false);
      setSuccessMessage("✅ Health data cleared successfully!");
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 2500);
    } catch (err) {
      console.error(err);
      setErrorText(err.message || "Unexpected error while clearing data.");
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!userId) return;
    setLoading(true);
    setErrorText("");

    try {
      // Get current session for access token
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;
      if (!session)
        throw new Error("You must be logged in to delete your account.");

      // console.log("Attempting to delete user with ID:", userId);

      const response = await fetch(
        "https://exscmqdazkrtrfhstytk.supabase.co/functions/v1/delete-user",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ userId }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        // Successfully deleted account
        setShowDeleteModal(false);
        setSuccessMessage("✅ Your account has been successfully deleted.");
        setShowSuccessToast(true);

        // Sign out and navigate to login after a delay
        setTimeout(async () => {
          await supabase.auth.signOut();
          navigate("/login");
        }, 2500);
      } else {
        throw new Error(data.error || "Failed to delete account.");
      }
    } catch (error) {
      console.error("Error deleting account:", error);
      setErrorText(
        error.message || "Failed to delete account. Please try again."
      );
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmOldPassword = (password) => {
    setVerifiedOldPassword(password); // Store the confirmed old password
    setShowConfirmOldPasswordModal(false); // Close the old password confirmation modal
    setShowChangePasswordModal(true); // Open the change password modal
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      setErrorText("Please fill in all fields.");
      setShowErrorModal(true);
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorText("New passwords do not match.");
      setShowErrorModal(true);
      return;
    }
    if (newPassword === verifiedOldPassword) {
      setErrorText("New password must be different from the old password.");
      setShowErrorModal(true);
      return;
    }
    if (
      newPassword.length < 8 ||
      !/[A-Z]/.test(newPassword) ||
      !/[a-z]/.test(newPassword) ||
      !/[0-9]/.test(newPassword) ||
      !/[@$!%*?&]/.test(newPassword)
    ) {
      setErrorText(
        "New password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)."
      );
      setShowErrorModal(true);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      setShowChangePasswordModal(false);
      setNewPassword("");
      setConfirmPassword("");
      setVerifiedOldPassword(""); // Clear the verified old password after successful change
      setSuccessMessage("✅ Password updated successfully!");
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 2500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-green-100 via-white to-green-200 flex items-center justify-center px-4 py-6">
        <div className="bg-white w-[380px] h-[720px] rounded-3xl shadow-2xl overflow-auto flex flex-col border border-green-100 relative">
          <div className="bg-black p-5 rounded-t-3xl text-white shadow-lg flex items-center justify-between">
            <button
              onClick={() => navigate("/settings")}
              className="text-white text-lg p-1 hover:text-xl rounded transition"
            >
              <FiArrowLeft />
            </button>
            <div className="font-bold text-lg">Account Management</div>
            <div className="w-6" />
          </div>

          <div className="p-5 flex-1 flex flex-col justify-start space-y-6">
            <p className="text-gray-700 text-sm">
              Manage your account. You must <b>clear your health data first</b>{" "}
              before permanently deleting your account.
            </p>

            <div className="bg-blue-50 p-4 rounded-xl shadow-sm">
              <button
                onClick={() => setShowConfirmOldPasswordModal(true)}
                disabled={loading}
                className="w-full bg-black text-white py-2 rounded-xl hover:bg-gray-700 transition flex items-center justify-center gap-2 font-medium"
              >
                <FiKey /> Change Password
              </button>
            </div>

            <div className="bg-green-50 p-4 rounded-xl shadow-sm">
              <button
                onClick={() => setShowClearModal(true)}
                disabled={loading}
                className="w-full bg-lime-500 text-black py-2 rounded-xl hover:bg-lime-700 transition flex items-center justify-center gap-2 font-medium"
              >
                <FiDatabase /> Clear Health Profiles & Meal Logs
              </button>
            </div>

            <div className="bg-red-50 p-4 rounded-xl shadow-sm">
              <button
                onClick={() => !hasHealthData && setShowDeleteModal(true)}
                disabled={hasHealthData || loading}
                className={`w-full py-2 rounded-xl text-white flex items-center justify-center gap-2 font-medium transition ${
                  hasHealthData
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                <FiTrash2 />{" "}
                {hasHealthData ? "Clear Data First" : "Delete Account"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showConfirmOldPasswordModal && (
          <motion.div
            key="confirm-old-password-modal" // Unique key for AnimatePresence
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" // Apply consistent styling
          >
            <ConfirmOldPasswordModal
              visible={showConfirmOldPasswordModal} // Modal now uses its own visible prop
              onConfirm={handleConfirmOldPassword}
              onCancel={() => setShowConfirmOldPasswordModal(false)}
              confirmLoading={loading}
            />
          </motion.div>
        )}

        {showChangePasswordModal && (
          <motion.div
            key="change-password-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-80 p-6 text-center space-y-4"
            >
              <h3 className="text-lg font-semibold text-gray-800">
                Change Password
              </h3>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="New Password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full border border-gray-300 p-2 rounded-lg pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-gray-500"
                >
                  {showPassword ? <FiEye /> : <FiEyeOff />}
                </button>
              </div>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Confirm New Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full border border-gray-300 p-2 rounded-lg pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-gray-500"
                >
                  {showPassword ? <FiEye /> : <FiEyeOff />}
                </button>
              </div>
              <div className="flex justify-center gap-3 mt-4">
                <button
                  onClick={() => {
                    setShowChangePasswordModal(false);
                    setNewPassword("");
                    setConfirmPassword("");
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleChangePassword}
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {loading ? "Saving..." : "Confirm"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showClearModal && (
          <motion.div
            key="clear-data-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-80 p-6 text-center space-y-4"
            >
              <h3 className="text-lg font-semibold text-gray-800">
                Clear Health Data?
              </h3>
              <p className="text-sm text-gray-600">
                This will permanently remove all your health profiles and meal
                logs.
              </p>
              <div className="flex justify-center gap-3 mt-4">
                <button
                  onClick={() => setShowClearModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearData}
                  disabled={loading}
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                >
                  {loading ? "Clearing..." : "Confirm"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showDeleteModal && (
          <motion.div
            key="delete-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-80 p-6 text-center space-y-4"
            >
              <h3 className="text-lg font-semibold text-gray-800">
                Delete Account?
              </h3>
              <p className="text-sm text-gray-600">
                This action is permanent and cannot be undone.
              </p>
              <div className="flex justify-center gap-3 mt-4">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={loading}
                  className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                >
                  {loading ? "Deleting..." : "Confirm"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showErrorModal && (
          <motion.div
            key="error-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ y: 10 }}
              animate={{ y: 0 }}
              exit={{ y: 10 }}
              className="bg-white rounded-2xl shadow-xl w-80 p-5 text-center"
            >
              <div className="flex justify-between items-start">
                <h4 className="text-md font-semibold text-red-600">Error</h4>
                <button
                  onClick={() => setShowErrorModal(false)}
                  className="text-gray-400"
                >
                  <FiX />
                </button>
              </div>
              <p className="mt-3 text-sm text-gray-700">{errorText}</p>
              <div className="mt-4">
                <button
                  onClick={() => setShowErrorModal(false)}
                  className="px-4 py-2 bg-gray-200 rounded-lg"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showSuccessToast && (
          <motion.div
            key="success-toast"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 flex items-center justify-center z-50"
          >
            <div className="bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg text-center">
              {successMessage}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
