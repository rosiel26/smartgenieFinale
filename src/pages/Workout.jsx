import React, { useEffect, useState, useMemo, useRef } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import { FaSearch } from "react-icons/fa";
import FooterNav from "../components/FooterNav";

// ---------------------------
// Helpers
// ---------------------------
const calculateCaloriesBurned = (met, weightKg, durationMinutes) => {
  const durationHours = durationMinutes / 60;
  return Math.round(met * weightKg * durationHours);
};

const isWorkoutSafe = (workout, userHealthConditions = []) => {
  const unsafe = (workout.unsuitable_for || []).map((hc) =>
    hc.toLowerCase().trim()
  );
  const userHC = (userHealthConditions || []).map((hc) =>
    hc.toLowerCase().trim()
  );
  const conflicts = unsafe.filter((hc) => userHC.includes(hc));
  return { safe: conflicts.length === 0, conflicts };
};

const getIntensityBadge = (met) => {
  if (met < 4) return { label: "Low", color: "bg-green-100 text-green-700" };
  if (met < 8)
    return { label: "Medium", color: "bg-yellow-100 text-yellow-700" };
  return { label: "High", color: "bg-red-100 text-red-700" };
};

// ---------------------------
// Custom Modals
// ---------------------------
const AlertModal = ({ show, message, onClose }) => {
  if (!show) return null;
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-white rounded-xl p-5 shadow-lg max-w-sm text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-gray-700 mb-4">{message}</p>
      </div>
    </div>
  );
};

const ConfirmModal = ({ show, message, onConfirm, onCancel }) => {
  if (!show) return null;
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-[300px] max-w-[90%] p-5 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-gray-700 mb-4">{message}</p>
        <div className="flex justify-between gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 transition font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 rounded-xl bg-black text-white hover:bg-gray-800 transition font-semibold"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------------------------
// Hooks
// ---------------------------
const useUserProfile = (userId) => {
  const [profile, setProfile] = useState(null);
  useEffect(() => {
    if (!userId) return;
    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from("health_profiles")
        .select(
          "goal, gender, age, weight_kg, height_cm, activity_level, health_conditions, full_name"
        )
        .eq("user_id", userId)
        .single();
      if (!error) setProfile(data);
    };
    fetchProfile();
  }, [userId]);
  return profile;
};

const useWorkoutTypes = () => {
  const [workoutTypes, setWorkoutTypes] = useState([]);
  useEffect(() => {
    const fetchWorkoutTypes = async () => {
      const { data, error } = await supabase.from("workout_types").select("*");
      if (!error) setWorkoutTypes(data);
    };
    fetchWorkoutTypes();
  }, []);
  return workoutTypes;
};

// ---------------------------
// Components
// ---------------------------
const WorkoutCard = ({ workout, profile, onClick }) => {
  const intensity = getIntensityBadge(workout.met_value);
  const estimatedCalories = profile
    ? calculateCaloriesBurned(workout.met_value, profile.weight_kg, 30)
    : 0;
  const healthConflicts = workout.health_conflicts?.length
    ? workout.health_conflicts.join(", ")
    : null;

  return (
    <div
      onClick={onClick}
      className={`relative border rounded-2xl shadow-md cursor-pointer hover:shadow-xl transition overflow-hidden ${
        workout.warning ? "opacity-80" : ""
      }`}
      style={{ height: "180px" }}
    >
      {workout.image_url ? (
        <img
          src={workout.image_url}
          alt={workout.name}
          className="w-full h-full object-cover rounded-2xl"
        />
      ) : (
        <div className="w-full h-full bg-gray-200 flex items-center justify-center text-xs">
          No Image
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent p-3 flex flex-col justify-between">
        <div className="flex flex-col items-start gap-1">
          <span
            className={`px-2 py-0.5 rounded text-xs font-medium ${intensity.color}`}
          >
            {intensity.label}
          </span>
          {healthConflicts && (
            <span className="px-2 py-0.5 rounded text-xs bg-yellow-100 text-yellow-800">
              ⚠ {healthConflicts}
            </span>
          )}
        </div>
        <div>
          <p className="text-white font-semibold truncate">{workout.name}</p>
          {workout.description && (
            <p className="text-white text-xs truncate">{workout.description}</p>
          )}
          <span className="text-white text-xs">{estimatedCalories} cal</span>
          {workout.warning && (
            <div className="absolute top-2 right-2 bg-yellow-200 text-yellow-800 text-xs px-2 py-0.5 rounded font-semibold">
              {workout.warning}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const AddWorkoutModal = ({
  show,
  onClose,
  workout,
  profile,
  onAdd,
  loading,
  notRecommended,
  showAlert,
  showConfirm,
  setShowAlert,
  setShowConfirm,
}) => {
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState(30);

  if (!show || !workout) return null;

  const parsedHours = parseInt(hours || "0", 10);
  const parsedMinutes = parseInt(minutes || "0", 10);

  const totalDurationMinutes = parsedHours * 60 + parsedMinutes;

  const estimatedCalories = profile
    ? calculateCaloriesBurned(
        workout.met_value,
        profile.weight_kg,
        totalDurationMinutes
      )
    : 0;

  const handleAdd = async () => {
    if (totalDurationMinutes <= 0) {
      setShowAlert("Please enter a valid duration (hours or minutes).");
      return;
    }

    if (notRecommended) {
      setShowConfirm(true); // show confirm modal instead of window.confirm
      return;
    }

    await onAdd(workout.id, totalDurationMinutes);
    onClose();
    setHours("");
    setMinutes(30);
  };

  const handleConfirm = async () => {
    setShowConfirm(false);
    await onAdd(workout.id, totalDurationMinutes);
    onClose();
    setHours("");
    setMinutes(30);
  };

  const handleCancelConfirm = () => {
    setShowConfirm(false);
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div
          className="relative bg-white rounded-2xl shadow-2xl w-[320px] max-w-[90%] overflow-auto max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-red-700 hover:text-red-600 font-bold text-xl z-10"
          >
            ✕
          </button>

          {workout.image_url && (
            <div className="relative w-full h-32 rounded-lg overflow-hidden">
              <img
                src={workout.image_url}
                alt={workout.name}
                className="w-full h-full object-cover"
              />
              <h2 className="absolute bottom-2 left-2 text-white text-lg font-semibold bg-black bg-opacity-50 px-2 py-1 rounded">
                {workout.name}
              </h2>
            </div>
          )}

          <div className="p-5 text-left">
            {workout.description && (
              <p className="text-gray-700 text-xs mb-2 ">
                {workout.description}
              </p>
            )}
            {workout.benefits && (
              <div className="mb-4">
                <h4 className="text-gray-700 font-semibold text-sm mb-2">
                  Benefits
                </h4>
                <p className="text-gray-600 text-xs text-left whitespace-pre-line">
                  {workout.benefits}
                </p>
              </div>
            )}
            {workout.reference_link && (
              <a
                href={workout.reference_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-600 text-[10px] underline mb-3 block hover:text-blue-600"
              >
                Click to learn more about {workout.name}.
              </a>
            )}

            <p className="text-gray-600 mb-3">
              Enter workout duration
            </p>
            <div className="flex gap-2 mb-2">
              <input
                type="number"
                min="0"
                value={hours}
                onChange={(e) => setHours(e.target.value === "" ? "" : parseInt(e.target.value, 10))}
                className="w-1/2 p-2.5 border border-black rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-400 text-center"
                placeholder="Hours"
              />
              <input
                type="number"
                min="0"
                max="59"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value === "" ? "" : parseInt(e.target.value, 10))}
                className="w-1/2 p-2.5 border border-black rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-400 text-center"
                placeholder="Minutes"
              />
            </div>

            <p className="text-sm text-gray-700 mb-3">
              Estimated Calories Burned:{" "}
              <span className="font-semibold">{estimatedCalories} cal</span>
            </p>

            <button
              onClick={handleAdd}
              className="w-full py-2 rounded-xl bg-black text-white hover:bg-gray-700 active:scale-95 transition font-semibold"
            >
              {loading ? "Adding..." : "Add Workout"}
            </button>
          </div>
        </div>
      </div>

      <AlertModal
        show={!!showAlert}
        message={showAlert}
        onClose={() => setShowAlert("")}
      />
      <ConfirmModal
        show={showConfirm}
        message="⚠ This workout is not recommended for you. Do you want to continue?"
        onConfirm={handleConfirm}
        onCancel={handleCancelConfirm}
      />
    </>
  );
};

// ---------------------------
// Main Component
// ---------------------------
export default function Workout() {
  const [userId, setUserId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [showAlert, setShowAlert] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [timeOfDay, setTimeOfDay] = useState("");

  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  const profile = useUserProfile(userId);
  const workoutTypes = useWorkoutTypes();
  const [showMoreSafeRecommended, setShowMoreSafeRecommended] = useState(false);
  const [showMoreWarnedRecommended, setShowMoreWarnedRecommended] =
    useState(false);
  const [showMoreNotRecommended, setShowMoreNotRecommended] = useState(false);

  // Time of day greeting
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) setTimeOfDay("Morning");
    else if (hour >= 12 && hour < 17) setTimeOfDay("Afternoon");
    else if (hour >= 17 && hour < 21) setTimeOfDay("Evening");
    else setTimeOfDay("Night");
  }, []);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return navigate("/login");
      setUserId(data.user.id);
    };
    getUser();
  }, [navigate]);

  // ---------------------------
  // Filter workouts
  // ---------------------------
  const {
    safeRecommendedWorkouts,
    warnedRecommendedWorkouts,
    notRecommendedWorkouts,
  } = useMemo(() => {
    if (!workoutTypes.length || !profile)
      return {
        safeRecommendedWorkouts: [],
        warnedRecommendedWorkouts: [],
        notRecommendedWorkouts: [],
      };

    const userGoals = (profile.goal || "")
      .split(",")
      .map((g) => g.toLowerCase().trim())
      .filter(Boolean);
    const userHC = profile.health_conditions || [];

    const safeRecommended = [];
    const warnedRecommended = [];
    const notRecommended = [];

    workoutTypes.forEach((w) => {
      const { safe: safeForHealth, conflicts: healthConflicts } = isWorkoutSafe(
        w,
        userHC
      );
      const warning =
        !safeForHealth && healthConflicts.length
          ? `⚠ Health conflict: ${healthConflicts.join(", ")}`
          : null;

      let matchesGoal =
        userGoals.length === 0 ||
        (w.suitable_for || []).some((suitable) =>
          userGoals.includes(suitable.toLowerCase().trim())
        );

      if (safeForHealth && matchesGoal) safeRecommended.push(w);
      else if (!safeForHealth && matchesGoal)
        warnedRecommended.push({ ...w, warning });
      else notRecommended.push(safeForHealth ? w : { ...w, warning });
    });

    safeRecommended.sort((a, b) => b.met_value - a.met_value);
    warnedRecommended.sort((a, b) => b.met_value - a.met_value);
    notRecommended.sort((a, b) => b.met_value - a.met_value);

    return {
      safeRecommendedWorkouts: safeRecommended,
      warnedRecommendedWorkouts: warnedRecommended,
      notRecommendedWorkouts: notRecommended,
    };
  }, [workoutTypes, profile]);

  // ---------------------------
  // Search filter
  // ---------------------------
  const filteredWorkouts = useMemo(() => {
    if (!searchQuery) return workoutTypes;
    return workoutTypes.filter((w) =>
      w.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [workoutTypes, searchQuery]);

  const handleAddWorkout = async (workoutId, durationMinutes) => {
    if (!workoutId || !durationMinutes) {
      setShowAlert("Please fill all fields.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("workouts").insert([
      {
        user_id: userId,
        workout_type_id: workoutId,
        duration: durationMinutes,
      },
    ]);
    setLoading(false);

    if (error) {
      setShowAlert("Error saving workout: " + error.message);
      return;
    }
    setModalMessage("Workout logged successfully!");
    setSelectedWorkout(null);
    setTimeout(() => setModalMessage(""), 1000);
  };

  // ---------------------------
  // Render
  // ---------------------------
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-100 flex justify-center items-center p-4">
      <div className="bg-white w-[375px] h-[700px] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-black w-full h-[130px] rounded-t-3xl flex flex-col px-5 pt-5">
          <p className="text-lg font-semibold text-white">
            Hi <span className="text-green-400">{profile?.full_name}</span>,
            Good {timeOfDay}!
          </p>
          <p className="text-sm text-white mt-1">
            Ready to start your workout?
          </p>
        </div>

        {/* Body */}
        <div className="p-4 flex-1 overflow-auto space-y-4">
          {/* Search */}
          <div className="relative" ref={dropdownRef}>
            <FaSearch className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search workouts..."
              className="w-full p-2 pl-9 border rounded-lg placeholder-gray-400 mb-2"
            />
            {searchQuery && (
              <div className="absolute bg-white border rounded-lg shadow-md mt-1 max-h-48 overflow-y-auto w-full z-20">
                {filteredWorkouts.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-gray-500">
                    No workouts found.
                  </p>
                ) : (
                  filteredWorkouts.slice(0, 10).map((w) => (
                    <div
                      key={w.id}
                      onClick={() => setSelectedWorkout(w)}
                      className="px-3 py-2 hover:bg-green-50 cursor-pointer flex items-center gap-2 text-sm"
                    >
                      {w.image_url ? (
                        <img
                          src={w.image_url}
                          alt={w.name}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs">
                          N/A
                        </div>
                      )}
                      <span>{w.name}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Workout lists */}
          {safeRecommendedWorkouts.length > 0 && (
            <div className="mb-6">
              <p className="font-medium text-sm mb-2 text-green-700">
                Recommended Workouts
              </p>
              <div className="grid grid-cols-2 gap-3">
                {(showMoreSafeRecommended
                  ? safeRecommendedWorkouts
                  : safeRecommendedWorkouts.slice(0, 4)
                ).map((w) => (
                  <WorkoutCard
                    key={w.id}
                    workout={w}
                    profile={profile}
                    onClick={() => setSelectedWorkout(w)}
                  />
                ))}
              </div>
              {safeRecommendedWorkouts.length > 4 && (
                <button
                  onClick={() =>
                    setShowMoreSafeRecommended(!showMoreSafeRecommended)
                  }
                  className="text-green-600 text-sm mt-2 font-medium"
                >
                  {showMoreSafeRecommended ? "Show Less" : "Show More"}
                </button>
              )}
            </div>
          )}

          {warnedRecommendedWorkouts.length > 0 && (
            <div className="mb-6">
              <p className="font-medium text-sm mb-2 text-yellow-800">
                Recommended with Warning ⚠
              </p>
              <div className="grid grid-cols-2 gap-3">
                {(showMoreWarnedRecommended
                  ? warnedRecommendedWorkouts
                  : warnedRecommendedWorkouts.slice(0, 4)
                ).map((w) => (
                  <WorkoutCard
                    key={w.id}
                    workout={w}
                    profile={profile}
                    onClick={() =>
                      setSelectedWorkout({ ...w, notRecommended: true })
                    }
                  />
                ))}
              </div>
              {warnedRecommendedWorkouts.length > 4 && (
                <button
                  onClick={() =>
                    setShowMoreWarnedRecommended(!showMoreWarnedRecommended)
                  }
                  className="text-yellow-800 text-sm mt-2 font-medium"
                >
                  {showMoreWarnedRecommended ? "Show Less" : "Show More"}
                </button>
              )}
            </div>
          )}

          {notRecommendedWorkouts.length > 0 && (
            <div className="mb-6">
              <p className="font-medium text-sm mb-2 text-red-600">
                Not Recommended for You
              </p>
              <div className="grid grid-cols-2 gap-3">
                {(showMoreNotRecommended
                  ? notRecommendedWorkouts
                  : notRecommendedWorkouts.slice(0, 4)
                ).map((w) => (
                  <WorkoutCard
                    key={w.id}
                    workout={w}
                    profile={profile}
                    onClick={() =>
                      setSelectedWorkout({ ...w, notRecommended: true })
                    }
                  />
                ))}
              </div>
              {notRecommendedWorkouts.length > 4 && (
                <button
                  onClick={() =>
                    setShowMoreNotRecommended(!showMoreNotRecommended)
                  }
                  className="text-red-600 text-sm mt-2 font-medium"
                >
                  {showMoreNotRecommended ? "Show Less" : "Show More"}
                </button>
              )}
            </div>
          )}
        </div>

        <FooterNav />

        {/* Modals */}
        <AddWorkoutModal
          show={!!selectedWorkout}
          onClose={() => setSelectedWorkout(null)}
          workout={selectedWorkout}
          profile={profile}
          onAdd={handleAddWorkout}
          loading={loading}
          notRecommended={selectedWorkout?.notRecommended}
          showAlert={showAlert}
          showConfirm={showConfirm}
          setShowAlert={setShowAlert}
          setShowConfirm={setShowConfirm}
        />

        {modalMessage && (
          <AlertModal
            show={!!modalMessage}
            message={modalMessage}
            onClose={() => setModalMessage("")}
          />
        )}
      </div>
    </div>
  );
}
