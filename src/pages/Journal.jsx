import React, { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import { FiCalendar } from "react-icons/fi";
import FooterNav from "../components/FooterNav";
import MealAndWorkoutLogs from "../components/MealAndWorkoutLogs";
import { getLocalDateString } from "../utils/utils";

const getWeekDays = (date) => {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay());
  return [...Array(7)].map((_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
};

export default function Journal() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [mealLog, setMealLog] = useState([]);
  const [workoutLog, setWorkoutLog] = useState([]);
  const [selectedMealLogs, setSelectedMealLogs] = useState([]);
  const [selectedWorkoutLogs, setSelectedWorkoutLogs] = useState([]);
  const [isMultiDeleteMode, setIsMultiDeleteMode] = useState(false);
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [mealTypeFilter, setMealTypeFilter] = useState("");
  const ITEMS_PER_PAGE = 4;
  const [logPage, setLogPage] = useState(0);

  // Fetch data
  const fetchData = useCallback(async () => {
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) return navigate("/login");

    try {
      const [profileRes, mealRes, workoutRes] = await Promise.all([
        supabase
          .from("health_profiles")
          .select("calorie_needs, protein_needed, fats_needed, carbs_needed")
          .eq("user_id", user.id)
          .single(),
        supabase
          .from("meal_logs")
          .select(
            "id, meal_type, calories, protein, fat, carbs, meal_date, dish_name, serving_label"
          )
          .eq("user_id", user.id)
          .order("meal_date", { ascending: true }),
        supabase
          .from("workouts")
          .select(
            "id, duration, calories_burned, fat_burned, carbs_burned, created_at, workout_types!inner(name)"
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: true }),
      ]);

      setProfile(profileRes.data ?? null);
      setMealLog(mealRes.data ?? []);
      setWorkoutLog(workoutRes.data ?? []);
    } catch (err) {
      console.error("Data fetch failed:", err);
    }
  }, [navigate]);

  useEffect(() => {
    setIsMultiDeleteMode(false);
    setSelectedMealLogs([]);
    setSelectedWorkoutLogs([]);
    setLogPage(0); // Reset pagination when filters change
  }, [selectedDay, mealTypeFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filtered logs
  const filteredMealLogs = useMemo(() => {
    const dayStr = getLocalDateString(selectedDay);
    return mealLog.filter(
      (m) =>
        getLocalDateString(m.meal_date) === dayStr &&
        (!mealTypeFilter || m.meal_type === mealTypeFilter)
    );
  }, [mealLog, selectedDay, mealTypeFilter]);

  const filteredWorkoutLogs = useMemo(() => {
    const dayStr = getLocalDateString(selectedDay);
    return workoutLog.filter(
      (w) => getLocalDateString(w.created_at) === dayStr
    );
  }, [workoutLog, selectedDay]);

  // Totals
  const totalsMeals = useMemo(
    () =>
      filteredMealLogs.reduce(
        (a, m) => ({
          calories: a.calories + (m.calories || 0),
          protein: a.protein + (m.protein || 0),
          fat: a.fat + (m.fat || 0),
          carbs: a.carbs + (m.carbs || 0),
        }),
        { calories: 0, protein: 0, fat: 0, carbs: 0 }
      ),
    [filteredMealLogs]
  );

  const totalsWorkout = useMemo(
    () =>
      filteredWorkoutLogs.reduce(
        (a, w) => ({
          calories: a.calories + (w.calories_burned || 0),
          fat: a.fat + (w.fat_burned || 0),
          carbs: a.carbs + (w.carbs_burned || 0),
          duration: a.duration + (w.duration || 0),
        }),
        { calories: 0, fat: 0, carbs: 0, duration: 0 }
      ),
    [filteredWorkoutLogs]
  );

  const [deleteConfirm, setDeleteConfirm] = useState({
    show: false,
    type: null,
    idsToDelete: [],
  });

  const toggleSelectMeal = useCallback((id) => {
    setSelectedMealLogs((prev) =>
      prev.includes(id) ? prev.filter((_id) => _id !== id) : [...prev, id]
    );
  }, []);

  const toggleSelectWorkout = useCallback((id) => {
    setSelectedWorkoutLogs((prev) =>
      prev.includes(id) ? prev.filter((_id) => _id !== id) : [...prev, id]
    );
  }, []);

  const toggleSelectAllMeals = useCallback(
    (checked) => {
      if (checked) {
        setSelectedMealLogs(filteredMealLogs.map((meal) => meal.id));
      } else {
        setSelectedMealLogs([]);
      }
    },
    [filteredMealLogs]
  );

  const toggleSelectAllWorkouts = useCallback(
    (checked) => {
      if (checked) {
        setSelectedWorkoutLogs(
          filteredWorkoutLogs.map((workout) => workout.id)
        );
      } else {
        setSelectedWorkoutLogs([]);
      }
    },
    [filteredWorkoutLogs]
  );

  const clearSelections = () => {
    setSelectedMealLogs([]);
    setSelectedWorkoutLogs([]);
    setIsMultiDeleteMode(false);
  };

  // Delete handlers
  const handleDeleteMeal = async (ids) => {
    const { error } = await supabase.from("meal_logs").delete().in("id", ids);
    if (!error) {
      setMealLog((prev) => prev.filter((m) => !ids.includes(m.id)));
      setSelectedMealLogs((prev) => prev.filter((id) => !ids.includes(id)));
    }
    setDeleteConfirm({ show: false, type: null, idsToDelete: [] });
  };

  const handleDeleteWorkout = async (ids) => {
    const { error } = await supabase.from("workouts").delete().in("id", ids);
    if (!error) {
      setWorkoutLog((prev) => prev.filter((w) => !ids.includes(w.id)));
      setSelectedWorkoutLogs((prev) => prev.filter((id) => !ids.includes(id)));
    }
    setDeleteConfirm({ show: false, type: null, idsToDelete: [] });
  };

  const handleBulkDelete = () => {
    if (selectedMealLogs.length > 0) {
      setDeleteConfirm({
        show: true,
        type: "meal",
        idsToDelete: selectedMealLogs,
      });
    }
    if (selectedWorkoutLogs.length > 0) {
      setDeleteConfirm({
        show: true,
        type: "workout",
        idsToDelete: selectedWorkoutLogs,
      });
    }
  };

  const confirmDelete = () => {
    if (deleteConfirm.type === "meal") {
      handleDeleteMeal(deleteConfirm.idsToDelete);
    } else if (deleteConfirm.type === "workout") {
      handleDeleteWorkout(deleteConfirm.idsToDelete);
    }
    clearSelections(); // Clear selections after deletion
  };

  // Pagination
  const paginatedMealLogs = filteredMealLogs.slice(
    logPage * ITEMS_PER_PAGE,
    logPage * ITEMS_PER_PAGE + ITEMS_PER_PAGE
  );

  const paginatedWorkoutLogs = filteredWorkoutLogs.slice(
    logPage * ITEMS_PER_PAGE,
    logPage * ITEMS_PER_PAGE + ITEMS_PER_PAGE
  );

  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center px-4 py-6">
      <div className="bg-white w-[375px] h-[700px] rounded-2xl shadow-2xl flex flex-col overflow-hidden relative">
        {/* Header */}
        <div className="rounded-t-2xl px-5 pt-6 pb-4 shadow-lg">
          <div className="flex justify-between items-center mb-3">
            <div className="text-black font-semibold text-sm">
              {selectedDay.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
                day: "numeric",
              })}
            </div>
          </div>

          <div className="flex justify-between gap-1 overflow-x-auto pb-1">
            {getWeekDays(selectedDay).map((d) => {
              const isSel =
                getLocalDateString(d) === getLocalDateString(selectedDay);
              return (
                <button
                  key={d}
                  onClick={() => setSelectedDay(d)}
                  className={`flex flex-col items-center min-w-[40px] py-2 px-1 rounded-xl text-xs transition ${
                    isSel
                      ? "bg-black text-lime-500 font-bold shadow-md"
                      : "text-black hover:bg-lime-100"
                  }`}
                >
                  <span className="text-[10px]">
                    {d.toLocaleDateString("en-US", { weekday: "short" })}
                  </span>
                  <span className="mt-1 text-sm">{d.getDate()}</span>
                </button>
              );
            })}
          </div>
          <div className="flex gap-2 mt-2">
            <input
              type="date"
              value={getLocalDateString(selectedDay)}
              onChange={(e) => setSelectedDay(new Date(e.target.value))}
              className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm shadow-inner"
            />
            <select
              className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm shadow-inner"
              value={mealTypeFilter}
              onChange={(e) => setMealTypeFilter(e.target.value)}
            >
              <option value="">All Meals</option>
              <option>Breakfast</option>
              <option>Lunch</option>
              <option>Dinner</option>
              <option>Snack</option>
            </select>
          </div>
        </div>

        {/* Scrollable content area */}
        <div className="p-4 flex-1 space-y-5 overflow-auto pb-24 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {/* Filters */}

          <div className="grid grid-cols-2 gap-4 w-full max-w-4xl mx-auto">
            {/* Calories Consumed Half-Moon */}
            {/* Calories Consumed Half-Moon (affected by meals & workouts) */}
            {/* Calories Half-Moon with Congrats & Exceed */}
            <div className="bg-black p-4 rounded-xl shadow-lg flex flex-col items-center">
              <h3 className="text-white font-semibold mb-2 text-sm">
                Calories
              </h3>

              <div className="relative w-40 h-20">
                <svg className="w-40 h-20" viewBox="0 0 100 50">
                  {/* Background semicircle */}
                  <path
                    d="M 10 50 A 40 40 0 0 1 90 50"
                    fill="none"
                    stroke="#374151"
                    strokeWidth="10"
                    strokeLinecap="round"
                  />
                  {/* Progress semicircle */}
                  <path
                    d="M 10 50 A 40 40 0 0 1 90 50"
                    fill="none"
                    stroke="yellow"
                    strokeWidth="10"
                    strokeDasharray={125.6} // circumference of half circle
                    strokeDashoffset={
                      125.6 -
                      (125.6 *
                        Math.min(
                          totalsMeals.calories + totalsWorkout.calories,
                          profile?.calorie_needs ?? 1
                        )) /
                        (profile?.calorie_needs ?? 1)
                    }
                    style={{ transition: "stroke-dashoffset 0.5s ease" }}
                  />
                </svg>
              </div>

              {/* Consumed / Target */}
              <div className="flex justify-between w-40 mt-1 text-white text-xs font-semibold px-2">
                <span>
                  {(totalsMeals.calories + totalsWorkout.calories).toFixed(0)}
                </span>
                <span>{(profile?.calorie_needs ?? 0).toFixed(0)}</span>
              </div>

              {/* Status message */}
              {totalsMeals.calories + totalsWorkout.calories >=
              (profile?.calorie_needs ?? 0) ? (
                <span className="font-semibold text-lime-500 text-center mt-2 text-xs">
                  Congrats!{" "}
                  {(
                    totalsMeals.calories +
                    totalsWorkout.calories -
                    (profile?.calorie_needs ?? 0)
                  ).toFixed(0)}{" "}
                  kcal over for today!
                </span>
              ) : (
                <span className="font-semibold text-lime-500 text-center mt-2 text-xs">
                  {(totalsMeals.calories + totalsWorkout.calories).toFixed(0)}{" "}
                  kcal counted toward {(profile?.calorie_needs ?? 0).toFixed(0)}{" "}
                  kcal daily goal
                </span>
              )}
            </div>

            {/* Workout Summary Main Card */}
            <div className="bg-black p-4 rounded-xl shadow-lg">
              <h3 className="text-lime-500 font-semibold mb-2 text-sm">
                Workout Summary
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {/* Calories */}
                <div className="bg-gray-800 p-3 rounded-lg text-white text-xs flex flex-col items-center justify-center">
                  <span className="font-medium">Calories</span>
                  <span className="font-semibold text-lime-500">
                    {(totalsWorkout.calories ?? 0).toFixed(0)} kcal
                  </span>
                </div>

                {/* Fat */}
                <div className="bg-gray-800 p-3 rounded-lg text-white text-xs flex flex-col items-center justify-center">
                  <span className="font-medium">Fat</span>
                  <span className="font-semibold text-yellow-400">
                    {(totalsWorkout.fat ?? 0).toFixed(1)} g
                  </span>
                </div>

                {/* Carbs */}
                <div className="bg-gray-800 p-3 rounded-lg text-white text-xs flex flex-col items-center justify-center">
                  <span className="font-medium">Carbs</span>
                  <span className="font-semibold text-blue-400">
                    {(totalsWorkout.carbs ?? 0).toFixed(1)} g
                  </span>
                </div>

                {/* Duration */}
                <div className="bg-gray-800 p-3 rounded-lg text-white text-xs flex flex-col items-center justify-center">
                  <span className="font-medium">Duration</span>
                  <span className="font-semibold text-pink-500">
                    {(totalsWorkout.duration ?? 0).toFixed(0)} min
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-300 pt-3 flex justify-end">
            {isMultiDeleteMode && (
              <div className="flex justify-between gap-2 mr-3">
                <button
                  onClick={handleBulkDelete}
                  disabled={
                    selectedMealLogs.length === 0 &&
                    selectedWorkoutLogs.length === 0
                  }
                  className="bg-red-500 text-white px-3 py-2 rounded-md text-[10px] disabled:opacity-50"
                >
                  Delete Selected (
                  {selectedMealLogs.length + selectedWorkoutLogs.length})
                </button>
                {/* <button
                  onClick={clearSelections}
                  className="bg-gray-300 text-gray-700 px-3 py-2 rounded-md text-[10px]"
                >
                  Clear Selections
                </button> */}
              </div>
            )}
            <button
              onClick={() => setIsMultiDeleteMode((prev) => !prev)}
              className={`px-3 py-1 text-xs border rounded-md hover:bg-red-600 hover:text-white transition ${
                isMultiDeleteMode
                  ? "bg-red-500 text-white"
                  : "bg-gray-200 text-gray-700"
              }`}
            >
              {isMultiDeleteMode ? "Cancel" : "Select to Delete"}
            </button>
          </div>

          <h3 className="text-black font-semibold text-sm">
            Meal & Workout Logged
          </h3>

          {/* Logs */}
          <MealAndWorkoutLogs
            mealLogs={filteredMealLogs}
            workoutLogs={filteredWorkoutLogs}
            onDeleteMeal={(id) =>
              setDeleteConfirm({ show: true, type: "meal", idsToDelete: [id] })
            }
            onDeleteWorkout={(id) =>
              setDeleteConfirm({
                show: true,
                type: "workout",
                idsToDelete: [id],
              })
            }
            isMultiDeleteMode={isMultiDeleteMode}
            selectedMealLogs={selectedMealLogs}
            selectedWorkoutLogs={selectedWorkoutLogs}
            onToggleSelectMeal={toggleSelectMeal}
            onToggleSelectWorkout={toggleSelectWorkout}
            onToggleSelectAllMeals={toggleSelectAllMeals}
            onToggleSelectAllWorkouts={toggleSelectAllWorkouts}
            filteredMealLogs={filteredMealLogs}
            filteredWorkoutLogs={filteredWorkoutLogs}
          />

          {/* (Show more handled inside MealAndWorkoutLogs) */}
        </div>

        {/* Fixed Footer */}
        <div className="absolute bottom-0 left-0 w-full">
          <FooterNav />
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 shadow-lg max-w-sm w-full text-center">
            <h2 className="text-lg font-semibold text-red-600 mb-3">
              Confirm Delete
            </h2>
            <p className="text-gray-600 mb-5">
              Are you sure you want to delete{" "}
              {deleteConfirm.idsToDelete.length > 1
                ? `${deleteConfirm.idsToDelete.length} selected items`
                : `this ${deleteConfirm.type}`}
              ?
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() =>
                  setDeleteConfirm({ show: false, type: null, idsToDelete: [] })
                }
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
