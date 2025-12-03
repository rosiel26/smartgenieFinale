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
}) {
  return (
    <div className="grid grid-cols-2 gap-4 w-full pb-20">
      {/* Meal Logs */}
      {mealLogs.length ? (
        mealLogs.map((entry) => (
          <div
            key={entry.id}
            className="border rounded-xl p-3 flex justify-between items-start hover:bg-gray-100 transition"
          >
            <div className="flex flex-col text-sm">
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
            <button
              onClick={() => onDeleteMeal(entry.id)}
              className="text-red-400 hover:text-red-800 p-2 rounded-full"
            >
              <FiTrash2 size={18} />
            </button>
          </div>
        ))
      ) : (
        <p className="text-gray-500 italic text-sm col-span-2">
          No meals logged for this day.
        </p>
      )}

      {/* Workout Logs */}
      {workoutLogs.length ? (
        workoutLogs.map((w) => (
          <div
            key={w.id}
            className="border rounded-xl p-3 flex justify-between items-start hover:bg-gray-100 transition"
          >
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
            <button
              onClick={() => onDeleteWorkout(w.id)}
              className="text-red-400 hover:text-red-800 p-2 rounded-full"
            >
              <FiTrash2 size={18} />
            </button>
          </div>
        ))
      ) : (
        <p className="text-gray-500 italic text-sm col-span-2">
          No workouts logged for this day.
        </p>
      )}
    </div>
  );
}
