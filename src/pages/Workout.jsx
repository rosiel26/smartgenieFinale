import React, { useEffect, useState, useMemo, useRef } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import { FaClock, FaSearch } from "react-icons/fa";
import FooterNav from "../components/FooterNav";

// Custom hook to fetch user profile
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

// Custom hook to fetch workout data
const useWorkouts = (userId, profile) => {
  const [workoutTypes, setWorkoutTypes] = useState([]);
  const [workouts, setWorkouts] = useState([]);

  const fetchWorkouts = async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("workouts")
      .select(
        "id,duration,calories_burned,fat_burned,carbs_burned,created_at,workout_types(id,name,unsuitable_for,image_url)"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    const userHealthConditionsLower = (profile?.health_conditions || []).map(
      (hc) => hc.toLowerCase().trim()
    );

    const safeWorkouts = (data || []).filter((w) => {
      const unsafeLower = (w.workout_types?.unsuitable_for || []).map((hc) =>
        hc.toLowerCase().trim()
      );
      return !unsafeLower.some((hc) => userHealthConditionsLower.includes(hc));
    });

    setWorkouts(safeWorkouts);
  };

  useEffect(() => {
    const fetchWorkoutTypes = async () => {
      const { data, error } = await supabase.from("workout_types").select("*");
      if (!error) setWorkoutTypes(data);
    };
    fetchWorkoutTypes();
    fetchWorkouts();
  }, [userId, profile]);

  return { workoutTypes, workouts, fetchWorkouts };
};

const shuffleArray = (array) => {
  if (!Array.isArray(array) || array.length === 0) return [];
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr.slice(0, 6);
};

const WorkoutCard = ({ workout, onClick }) => (
  <div
    onClick={onClick}
    className="relative border border-green-100 rounded-2xl shadow-sm cursor-pointer hover:bg-green-100 transition overflow-hidden"
    style={{ height: "160px" }}
  >
    {workout.image_url ? (
      <img
        src={workout.image_url}
        alt={workout.name}
        className="w-full h-full object-cover rounded-2xl"
      />
    ) : (
      <div className="w-full h-full bg-gray-200 flex items-center justify-center text-xs">
        N/A
      </div>
    )}
    <div className="absolute top-0 left-0 w-full h-12 bg-gradient-to-b from-black/50 to-transparent px-2 flex items-center">
      <p className="text-white text-sm font-semibold truncate">
        {workout.name}
      </p>
    </div>
  </div>
);

const AddWorkoutModal = ({ show, onClose, workout, onAdd, loading }) => {
  const [duration, setDuration] = useState("");
  const [modal, setModal] = useState({ show: false, message: "" });

  if (!show) return null;

  const handleAdd = async () => {
    if (!duration)
      return setModal({ show: true, message: "Please enter duration" });
    await onAdd(workout.id, duration);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 transition-all duration-300"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative bg-white rounded-2xl shadow-2xl w-[320px] max-w-[90%] overflow-hidden animate-fadeIn">
        <div className="relative">
          {workout.image_url ? (
            <img
              src={workout.image_url}
              alt={workout.name}
              className="w-full h-32 object-cover"
            />
          ) : (
            <div className="w-full h-32 bg-gradient-to-r from-green-100 to-green-200 flex items-center justify-center text-gray-500 text-sm">
              No Image
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-start justify-between px-4 py-2">
            <h2 className="text-base font-semibold text-white mt-auto mb-1">
              {workout.name}
            </h2>
            <button
              onClick={onClose}
              className="text-red-700 font-semibold bg-black/30 hover:bg-black/50 rounded-full w-7 h-7 flex items-center justify-center text-sm transition"
            >
              ✕
            </button>
          </div>
        </div>
        <div className="p-5 text-center">
          <p className="text-black mb-3 text-sm">Enter workout duration</p>
          <div className="relative mb-4">
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              min="1"
              placeholder="30"
              className="w-full p-2.5 border border-black rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-400 transition text-center text-gray-800 text-sm"
            />
            <span className="absolute right-10 top-2.5 text-gray-400 text-xs">
              min
            </span>
          </div>
          <button
            onClick={handleAdd}
            className="w-full py-2 rounded-xl bg-black text-white hover:bg-gray-700 active:scale-95 transition text-sm font-semibold shadow-sm"
          >
            {loading ? "Adding..." : "Add Workout"}
          </button>
        </div>
      </div>
      {modal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 shadow-lg max-w-sm text-center">
            <p className="mb-4">{modal.message}</p>
            <button
              onClick={() => setModal({ show: false, message: "" })}
              className="bg-lime-600 text-white px-4 py-2 rounded hover:bg-lime-700"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default function Workout() {
  const [selectedWorkout, setSelectedWorkout] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState({ show: false, message: "" });
  const [showDropdown, setShowDropdown] = useState(false);
  const [modalWorkout, setModalWorkout] = useState(null);
  const [timeOfDay, setTimeOfDay] = useState("");

  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) setTimeOfDay("Morning");
    else if (hour >= 12 && hour < 17) setTimeOfDay("Afternoon");
    else if (hour >= 17 && hour < 21) setTimeOfDay("Evening");
    else setTimeOfDay("Night");
  }, []);

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return navigate("/login");
      setUserId(data.user.id);
    };
    getUser();
  }, [navigate]);

  const profile = useUserProfile(userId);
  const { workoutTypes, fetchWorkouts } = useWorkouts(userId, profile);

  const exploreWorkouts = useMemo(
    () => shuffleArray(workoutTypes),
    [workoutTypes]
  );

  const recommended = useMemo(() => {
    if (!workoutTypes.length) return [];
    if (!profile?.goal) return exploreWorkouts;

    const goalLower = profile.goal?.toLowerCase().trim();
    const userHealthConditionsLower = (profile.health_conditions || []).map(
      (hc) => hc.toLowerCase().trim()
    );

    const matched = workoutTypes.filter((w) => {
      const suitableForGoal = w.suitable_for?.some(
        (g) => g.toLowerCase().trim() === goalLower
      );
      const unsafeLower = (w.unsuitable_for || []).map((hc) =>
        hc.toLowerCase().trim()
      );
      const safeForHealth = !unsafeLower.some((hc) =>
        userHealthConditionsLower.includes(hc)
      );
      return suitableForGoal && safeForHealth;
    });

    return matched.length > 0 ? matched : exploreWorkouts;
  }, [profile, workoutTypes, exploreWorkouts]);

  const filteredWorkouts = useMemo(() => {
    if (!searchQuery) return workoutTypes;
    return workoutTypes.filter((w) =>
      w.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [workoutTypes, searchQuery]);

  const checkSafety = (workout) => {
    const userHealthConditionsLower = (profile?.health_conditions || []).map(
      (hc) => hc.toLowerCase().trim()
    );
    const unsafeLower = (workout.unsuitable_for || []).map((hc) =>
      hc.toLowerCase().trim()
    );
    return unsafeLower.some((hc) => userHealthConditionsLower.includes(hc))
      ? "Not recommended"
      : "Recommended";
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setShowDropdown(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAddWorkout = async (workoutId, workoutDuration) => {
    if (!workoutId || !workoutDuration) {
      setModal({ show: true, message: "Please fill all fields." });
      setTimeout(() => setModal({ show: false, message: "" }), 1000);
      return;
    }

    const workoutType = workoutTypes.find((w) => w.id === workoutId);
    const userHealthConditionsLower = (profile?.health_conditions || []).map(
      (hc) => hc.toLowerCase().trim()
    );
    const unsafeLower = (workoutType?.unsuitable_for || []).map((hc) =>
      hc.toLowerCase().trim()
    );

    if (unsafeLower.some((hc) => userHealthConditionsLower.includes(hc))) {
      setModal({
        show: true,
        message:
          "This workout is not recommended for your health condition(s).",
      });
      setTimeout(() => setModal({ show: false, message: "" }), 1000);
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("workouts").insert([
      {
        user_id: userId,
        workout_type_id: workoutId,
        duration: workoutDuration,
      },
    ]);
    setLoading(false);

    if (error) {
      setModal({
        show: true,
        message: "Error saving workout: " + error.message,
      });
      setTimeout(() => setModal({ show: false, message: "" }), 1000);
    } else {
      setModal({ show: true, message: "Workout logged successfully!" });
      setSelectedWorkout("");
      setSearchQuery("");
      fetchWorkouts();
      setTimeout(() => setModal({ show: false, message: "" }), 1000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-100 flex justify-center items-center p-4">
      <div className="bg-white w-[375px] h-[700px] rounded-3xl shadow-2xl overflow-hidden flex flex-col ">
        <div className="bg-black w-full h-[130px] rounded-t-3xl flex flex-col px-2 pt-2 relative">
          <div className="flex justify-between items-start mb-6">
            <div className="p-5 ">
              <p className="text-m font-semibold text-white">
                Hi <span className="text-green-500">{profile?.full_name},</span>{" "}
                Good {timeOfDay}!
              </p>
              <p className="text-s font-medium flex items-center gap-2 text-white">
                Ready to start your workout?
              </p>
            </div>
          </div>
        </div>

        <div className=" p-4 flex-1 space-y-2 overflow-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="space-y-5 relative  p-5 rounded-2xl ">
            <div className="relative" ref={dropdownRef}>
              <label className="block mb-1 text-sm font-medium text-black">
                Workout
              </label>
              <div className="relative">
                <FaSearch className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="Search workout..."
                  className="w-full p-2 pl-9 border rounded-lg placeholder-gray-400 "
                />
              </div>
              {showDropdown && (
                <div className="absolute bg-white border rounded-lg shadow-md mt-1 max-h-48 overflow-y-auto w-full z-20">
                  {filteredWorkouts.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-gray-500">
                      No workouts found.
                    </p>
                  ) : (
                    filteredWorkouts.slice(0, 15).map((w) => {
                      const status = checkSafety(w);
                      return (
                        <div
                          key={w.id}
                          onClick={() => {
                            if (status === "Not recommended") {
                              setModal({
                                show: true,
                                message:
                                  "This workout is not recommended for your health condition(s).",
                              });
                              setTimeout(
                                () => setModal({ show: false, message: "" }),
                                3000
                              );
                              setShowDropdown(false);
                            } else {
                              setModalWorkout(w);
                              setShowDropdown(false);
                            }
                          }}
                          className="px-3 py-2 hover:bg-green-50 cursor-pointer text-sm flex items-center gap-2 justify-between"
                        >
                          <div className="flex items-center gap-2">
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
                          <span
                            className={
                              status === "Not recommended"
                                ? "text-red-500 text-xs"
                                : "text-green-600 text-xs"
                            }
                          >
                            {status}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Recommended Workouts */}
          <div className="space-y-3 relative p-5">
            <p className="text-black text-sm font-medium">
              Recommended Workouts
            </p>
            {recommended.length > 0 && (
              <div className="mt-2 text-sm text-gray-600 flex flex-wrap gap-2">
                {recommended
                  .filter((w) => {
                    const userHealthConditionsLower = (
                      profile?.health_conditions || []
                    ).map((hc) => hc.toLowerCase().trim());
                    const unsafeLower = (w.unsuitable_for || []).map((hc) =>
                      hc.toLowerCase().trim()
                    );
                    return !unsafeLower.some((hc) =>
                      userHealthConditionsLower.includes(hc)
                    );
                  })
                  .slice(0, 4)
                  .map((w) => (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => setModalWorkout(w)}
                      className="px-2 py-1 rounded-xl text-black text-xs font-medium flex items-center gap-1 hover:bg-black hover:text-white transition"
                    >
                      {w.image_url ? (
                        <img
                          src={w.image_url}
                          alt={w.name}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-4 h-4 bg-gray-200 rounded-full flex items-center justify-center text-xs">
                          N/A
                        </div>
                      )}
                      {w.name}
                    </button>
                  ))}
              </div>
            )}
          </div>

          <hr />

          {/* Explore Workouts */}
          <p className="font-bold text-2xl text-center">EXPLORE WORKOUTS</p>
          <p className="italic text-center text-gray-500">
            "The only bad workout is the one you didn’t do."
          </p>
          {exploreWorkouts.length > 0 && (
            <div className="grid grid-cols-2 gap-3 mb-4 p-5">
              {exploreWorkouts.slice(0, 6).map((w) => {
                const status = checkSafety(w);
                return (
                  <div key={w.id} className="relative">
                    <WorkoutCard
                      workout={w}
                      onClick={() => {
                        if (status === "Not recommended") {
                          setModal({
                            show: true,
                            message:
                              "This workout is not recommended for your health condition(s).",
                          });
                          setTimeout(
                            () => setModal({ show: false, message: "" }),
                            1000
                          );
                        } else {
                          setModalWorkout(w);
                        }
                      }}
                    />
                    <span
                      className={`absolute bottom-1 left-1 px-2 py-0.5 rounded text-xs font-semibold ${
                        status === "Not recommended"
                          ? "bg-red-100 text-red-600"
                          : "bg-green-100 text-green-600"
                      }`}
                    >
                      {status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <FooterNav />

        {modal.show && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 shadow-lg max-w-sm text-center">
              <p className="mb-4">{modal.message}</p>
            </div>
          </div>
        )}

        <AddWorkoutModal
          show={!!modalWorkout}
          onClose={() => setModalWorkout(null)}
          workout={modalWorkout}
          onAdd={handleAddWorkout}
          loading={loading}
        />
      </div>
    </div>
  );
}
