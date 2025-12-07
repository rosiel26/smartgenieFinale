import React, { useEffect, useState, useMemo, useRef } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import { FaSearch } from "react-icons/fa";
import FooterNav from "../components/FooterNav";
import useUserProfile from "../hooks/useUserProfile";
import useWorkoutTypes from "../hooks/useWorkoutTypes";
import {
  calculateCaloriesBurned,
  getIntensityBadge,
  isWorkoutSafe,
} from "../utils/workoutUtils";
import AddWorkoutModal from "../components/AddWorkoutModal";
import AlertModal from "../components/AlertModal";

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

// ---------------------------
// Main Component
// ---------------------------
export default function Workout() {
  const [userId, setUserId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [timeOfDay, setTimeOfDay] = useState("");
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState(null);

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

  const handleMergeWorkout = async () => {
    if (!duplicateInfo) return;
    const { existingWorkout, newDuration } = duplicateInfo;
    const newTotalDuration = existingWorkout.duration + newDuration;

    const { error } = await supabase
      .from("workouts")
      .update({ duration: newTotalDuration })
      .eq("id", existingWorkout.id);

    setLoading(false);
    if (error) {
      setModalMessage("Error merging workout: " + error.message);
    } else {
      setModalMessage("Workout merged successfully!");
      setSelectedWorkout(null);
      setTimeout(() => setModalMessage(""), 1000);
    }
    setShowDuplicateModal(false);
    setDuplicateInfo(null);
  };

  const handleAddSeparateWorkout = async () => {
    if (!duplicateInfo) return;
    const { workoutId, newDuration } = duplicateInfo;

    const { error } = await supabase.from("workouts").insert([
      {
        user_id: userId,
        workout_type_id: workoutId,
        duration: newDuration,
      },
    ]);

    setLoading(false);
    if (error) {
      setModalMessage("Error saving workout: " + error.message);
    } else {
      setModalMessage("Workout logged successfully!");
      setSelectedWorkout(null);
      setTimeout(() => setModalMessage(""), 1000);
    }
    setShowDuplicateModal(false);
    setDuplicateInfo(null);
  };

  const handleAddWorkout = async (workoutId, durationMinutes) => {
    if (!workoutId || !durationMinutes) {
      setModalMessage("Please fill all fields.");
      return;
    }
    setLoading(true);

    // Check for existing workout on the same day
    const today = new Date().toISOString().split("T")[0];
    const { data: existingWorkouts, error: checkError } = await supabase
      .from("workouts")
      .select("id, duration")
      .eq("user_id", userId)
      .eq("workout_type_id", workoutId)
      .gte("created_at", `${today}T00:00:00.000Z`)
      .lt("created_at", `${today}T23:59:59.999Z`);

    if (checkError) {
      setModalMessage(
        "Error checking existing workouts: " + checkError.message
      );
      setLoading(false);
      return;
    }

    if (existingWorkouts && existingWorkouts.length > 0) {
      // Duplicate found, show modal
      setDuplicateInfo({
        existingWorkout: existingWorkouts[0],
        newDuration: durationMinutes,
        workoutId,
      });
      setShowDuplicateModal(true);
      setLoading(false);
      return;
    }

    // No duplicate, insert new
    const { error } = await supabase.from("workouts").insert([
      {
        user_id: userId,
        workout_type_id: workoutId,
        duration: durationMinutes,
      },
    ]);
    setLoading(false);

    if (error) {
      setModalMessage("Error saving workout: " + error.message);
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
            Hi <span className="text-lime-500">{profile?.full_name}</span>, Good{" "}
            {timeOfDay}!
          </p>
          <p className="text-sm text-white mt-1">
            Ready to start your workout?
          </p>
        </div>

        {/* Body */}
        <div className="p-4 flex-1 overflow-auto space-y-4 scrollbar-hide">
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
        />

        {modalMessage && (
          <AlertModal
            show={!!modalMessage}
            message={modalMessage}
            onClose={() => setModalMessage("")}
          />
        )}

        {/* Duplicate Workout Modal */}
        {showDuplicateModal && duplicateInfo && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[1000]">
            <div className="bg-black text-lime-400 w-[320px] rounded-2xl shadow-2xl p-6 flex flex-col gap-4 border border-lime-400">
              <h2 className="text-lg font-bold text-lime-300">
                Duplicate Workout
              </h2>
              <p className="text-sm text-lime-400">
                You already have this workout logged today. Do you want to merge
                the durations or add as a separate entry?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleMergeWorkout}
                  className="flex-1 bg-lime-400 hover:bg-lime-500 text-black font-semibold py-2 rounded-lg transition"
                >
                  Merge Durations
                </button>
                <button
                  onClick={handleAddSeparateWorkout}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 rounded-lg transition"
                >
                  Add Separate
                </button>
              </div>
              <button
                onClick={() => {
                  setShowDuplicateModal(false);
                  setDuplicateInfo(null);
                  setSelectedWorkout(null);
                }}
                className="w-full bg-black border border-red-500 text-red-500 hover:bg-red-900 font-medium py-2 rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
