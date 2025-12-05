import React from "react";
import { FiTrash2 } from "react-icons/fi";

export const emojiMap = {
  Cardio: "🏃",
  Strength: "🏋️",
  Yoga: "🧘",
  Default: "🏋️",
};

export default function MealAndWorkoutLogs({
  mealLogs = [],
  workoutLogs = [],
  onDeleteMeal,
  onDeleteWorkout,
  isMultiDeleteMode,
  selectedMealLogs,
  selectedWorkoutLogs,
  onToggleSelectMeal,
  onToggleSelectWorkout,
  onToggleSelectAllMeals,
  onToggleSelectAllWorkouts,
  filteredMealLogs, // Needed to determine if all are selected for the "select all" checkbox
  filteredWorkoutLogs, // Needed to determine if all are selected for the "select all" checkbox
}) {
  const allMealsSelected =
    filteredMealLogs.length > 0 &&
    selectedMealLogs.length === filteredMealLogs.length;
  const allWorkoutsSelected =
    filteredWorkoutLogs.length > 0 &&
    selectedWorkoutLogs.length === filteredWorkoutLogs.length;

  return (
    <div className="grid grid-cols-2 gap-4 w-full pb-20">
      {/* Meal Logs */}
      <div className="flex flex-col">
        {isMultiDeleteMode && (
          <div className="flex items-center mb-3 p-2 rounded-lg bg-gray-100">
            <input
              type="checkbox"
              id="selectAllMeals"
              className="mr-2 h-4 w-4 text-lime-600 focus:ring-lime-500 border-gray-300 rounded"
              checked={allMealsSelected}
              onChange={(e) => onToggleSelectAllMeals(e.target.checked)}
            />
            <label
              htmlFor="selectAllMeals"
              className="text-xs font-medium text-gray-900 cursor-pointer"
            >
              Select All Meals
            </label>
          </div>
        )}
        {mealLogs.length ? (
          mealLogs.map((entry) => (
            <div
              key={entry.id}
              className="border rounded-xl p-3 flex justify-between items-start hover:bg-gray-100 transition mb-2"
            >
              {isMultiDeleteMode && (
                <input
                  type="checkbox"
                  className="mr-2 mt-1 h-4 w-4 text-lime-600 focus:ring-lime-500 border-gray-300 rounded"
                  checked={selectedMealLogs.includes(entry.id)}
                  onChange={() => onToggleSelectMeal(entry.id)}
                />
              )}
              <div className="flex flex-col text-sm flex-grow">
                <span className="font-medium text-sm text-lime-500">
                  {entry.dish_name}
                </span>
                <span className="text-xs text-black">
                  {entry.meal_type} | {entry.serving_label}
                </span>
                <p className="text-xs text-black mt-1">
                  Calories: {(entry.calories ?? 0).toFixed(0)}
                </p>
                <p className="text-xs text-black">
                  Protein: {(entry.protein ?? 0).toFixed(0)}
                </p>
                <p className="text-xs text-black">
                  Carbs: {(entry.carbs ?? 0).toFixed(0)}
                </p>
                <p className="text-xs text-black">
                  Fats: {(entry.fat ?? 0).toFixed(0)}
                </p>
              </div>
              {!isMultiDeleteMode && (
                <button
                  onClick={() => onDeleteMeal(entry.id)}
                  className="text-red-400 hover:text-red-800 p-2 rounded-full"
                >
                  <FiTrash2 size={18} />
                </button>
              )}
            </div>
          ))
        ) : (
          <p className="text-gray-500 italic text-sm mt-2">
            No meals logged for this day.
          </p>
        )}
      </div>

      {/* Workout Logs */}
      <div className="flex flex-col">
        {isMultiDeleteMode && (
          <div className="flex items-center mb-3 p-2 rounded-lg bg-gray-100">
            <input
              type="checkbox"
              id="selectAllWorkouts"
              className="mr-2 h-4 w-4 text-lime-600 focus:ring-lime-500 border-gray-300 rounded"
              checked={allWorkoutsSelected}
              onChange={(e) => onToggleSelectAllWorkouts(e.target.checked)}
            />
            <label
              htmlFor="selectAllWorkouts"
              className="text-xs font-medium text-gray-900 cursor-pointer"
            >
              Select All Workouts
            </label>
          </div>
        )}
        {workoutLogs.length ? (
          workoutLogs.map((w) => (
            <div
              key={w.id}
              className="border rounded-xl p-3 flex justify-between items-start hover:bg-gray-100 transition mb-2"
            >
              {isMultiDeleteMode && (
                <input
                  type="checkbox"
                  className="mr-2 mt-1 h-4 w-4 text-lime-600 focus:ring-lime-500 border-gray-300 rounded"
                  checked={selectedWorkoutLogs.includes(w.id)}
                  onChange={() => onToggleSelectWorkout(w.id)}
                />
              )}
              <div>
                <p className="font-medium flex items-center gap-1 text-lime-500">
                  <span className="text-sm">
                    {emojiMap[w.workout_types?.name] || "🏋️"}
                    {w.workout_types?.name || "—"}
                  </span>
                </p>
                <p className="text-xs text-black">{w.duration} min</p>
                <div className="flex flex-col gap-1 mt-2 text-xs text-black">
                  {w.calories_burned && (
                    <div>Calories: {(w.calories_burned ?? 0).toFixed(0)}</div>
                  )}
                  {w.fat_burned && (
                    <div>Fats: {(w.fat_burned ?? 0).toFixed(1)}</div>
                  )}
                  {w.carbs_burned && (
                    <div>Carbs: {(w.carbs_burned ?? 0).toFixed(1)}</div>
                  )}
                </div>
              </div>
              {!isMultiDeleteMode && (
                <button
                  onClick={() => onDeleteWorkout(w.id)}
                  className="text-red-400 hover:text-red-800 p-2 rounded-full"
                >
                  <FiTrash2 size={18} />
                </button>
              )}
            </div>
          ))
        ) : (
          <p className="text-gray-500 italic text-sm mt-2">
            No workouts logged for this day.
          </p>
        )}
      </div>
    </div>
  );
}
