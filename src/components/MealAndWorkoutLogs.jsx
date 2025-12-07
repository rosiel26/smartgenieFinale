import React, { useState } from "react";
import { FiTrash2, FiX } from "react-icons/fi";

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
  filteredMealLogs = [], // Needed to determine if all are selected for the "select all" checkbox
  filteredWorkoutLogs = [], // Needed to determine if all are selected for the "select all" checkbox
}) {
  return (
    <div className="flex flex-col gap-4 w-full pb-20">
      <MealLogGrid
        mealLogs={mealLogs}
        isMultiDeleteMode={isMultiDeleteMode}
        selectedMealLogs={selectedMealLogs}
        onToggleSelectMeal={onToggleSelectMeal}
        onDeleteMeal={onDeleteMeal}
        onToggleSelectAllMeals={onToggleSelectAllMeals}
        filteredMealLogs={filteredMealLogs}
      />

      <div className="border-t pt-3" />

      <WorkoutLogGrid
        workoutLogs={workoutLogs}
        isMultiDeleteMode={isMultiDeleteMode}
        selectedWorkoutLogs={selectedWorkoutLogs}
        onToggleSelectWorkout={onToggleSelectWorkout}
        onDeleteWorkout={onDeleteWorkout}
        onToggleSelectAllWorkouts={onToggleSelectAllWorkouts}
        filteredWorkoutLogs={filteredWorkoutLogs}
      />
    </div>
  );
}

function MealLogGrid({
  mealLogs,
  isMultiDeleteMode,
  selectedMealLogs,
  onToggleSelectMeal,
  onDeleteMeal,
  onToggleSelectAllMeals,
  filteredMealLogs,
  initialCount = 3,
}) {
  const [expanded, setExpanded] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState(null);
  const allMealsSelected =
    filteredMealLogs.length > 0 &&
    selectedMealLogs.length === filteredMealLogs.length;

  const visible = expanded ? mealLogs : mealLogs.slice(0, initialCount);

  const gridColsClass =
    mealLogs.length === 1
      ? "grid-cols-1"
      : mealLogs.length === 2
      ? "grid-cols-2"
      : "grid-cols-3";

  return (
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
        <>
          <div className={`grid ${gridColsClass} gap-3`}>
            {visible.map((entry) => (
              <div
                key={entry.id}
                onClick={() => !isMultiDeleteMode && setSelectedMeal(entry)}
                className={`relative border rounded-xl p-3 transition flex flex-col justify-between h-44 overflow-hidden cursor-pointer ${
                  selectedMealLogs.includes(entry.id)
                    ? "bg-red-100 border-red-400"
                    : "hover:bg-gray-100"
                }`}
                title={entry.dish_name}
              >
                <div className="flex-1">
                  <div className="font-medium text-xs text-lime-500 truncate">
                    {entry.dish_name}
                  </div>
                  <div className="text-xs text-black mt-1 truncate">
                    {entry.meal_type}
                  </div>
                  <div className="text-xs text-gray-600 mt-0.5 truncate">
                    {entry.serving_label}
                  </div>
                </div>
                <div className="text-xs text-black mt-3 space-y-0.5">
                  <div>Cal: {(entry.calories ?? 0).toFixed(0)} kcal</div>
                  <div>Pro: {(entry.protein ?? 0).toFixed(0)} g</div>
                  <div>Carb: {(entry.carbs ?? 0).toFixed(0)} g</div>
                  <div className="flex items-center justify-between">
                    <span>Fat: {(entry.fat ?? 0).toFixed(0)} g</span>
                    {isMultiDeleteMode ? (
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-lime-600"
                        checked={selectedMealLogs.includes(entry.id)}
                        onChange={() => onToggleSelectMeal(entry.id)}
                      />
                    ) : (
                      <button
                        onClick={() => onDeleteMeal(entry.id)}
                        className="text-red-500 hover:text-red-700 p-0"
                        aria-label="Delete meal"
                        title="Delete"
                      >
                        <FiTrash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {mealLogs.length > initialCount && (
            <div className="flex justify-center mt-3">
              <button
                onClick={() => setExpanded((s) => !s)}
                className="px-4 py-1 text-sm text-gray-700 border rounded-full"
              >
                {expanded ? "Show less" : "Show more"}
              </button>
            </div>
          )}
        </>
      ) : (
        <p className="text-gray-500 italic text-sm mt-2">
          No meals logged for this day.
        </p>
      )}

      {/* Meal detail modal removed per request */}
    </div>
  );
}

function WorkoutLogGrid({
  workoutLogs,
  isMultiDeleteMode,
  selectedWorkoutLogs,
  onToggleSelectWorkout,
  onDeleteWorkout,
  onToggleSelectAllWorkouts,
  filteredWorkoutLogs,
  initialCount = 3,
}) {
  const [expanded, setExpanded] = useState(false);
  const allWorkoutsSelected =
    filteredWorkoutLogs.length > 0 &&
    selectedWorkoutLogs.length === filteredWorkoutLogs.length;

  const visible = expanded ? workoutLogs : workoutLogs.slice(0, initialCount);

  const gridColsClass =
    workoutLogs.length === 1
      ? "grid-cols-1"
      : workoutLogs.length === 2
      ? "grid-cols-2"
      : "grid-cols-3";

  return (
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
        <>
          <div className={`grid ${gridColsClass} gap-3`}>
            {visible.map((w) => (
              <div
                key={w.id}
                className="border rounded-xl p-3 hover:bg-gray-100 transition flex flex-col justify-between h-36 overflow-hidden cursor-pointer"
                title={w.workout_types?.name || "Workout"}
              >
                <div>
                  <div className="font-medium text-xs text-lime-500 truncate">
                    {emojiMap[w.workout_types?.name] || "🏋️"}{" "}
                    {w.workout_types?.name || "—"}
                  </div>
                  <div className="text-xs text-black mt-1">
                    {w.duration} min
                  </div>
                  <div className="text-xs text-gray-600 mt-0.5">
                    {new Date(w.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                </div>

                <div className="text-xs text-black mt-2">
                  {w.calories_burned && (
                    <div>Cal: {(w.calories_burned ?? 0).toFixed(0)} kcal</div>
                  )}
                  {w.fat_burned && (
                    <div>Fat: {(w.fat_burned ?? 0).toFixed(1)} g</div>
                  )}
                  {w.carbs_burned && (
                    <div className="flex items-center justify-between">
                      <span>Carb: {(w.carbs_burned ?? 0).toFixed(1)} g</span>
                      {isMultiDeleteMode ? (
                        <input
                          type="checkbox"
                          className="h-4 w-4 text-lime-600"
                          checked={selectedWorkoutLogs.includes(w.id)}
                          onChange={() => onToggleSelectWorkout(w.id)}
                        />
                      ) : (
                        <button
                          onClick={() => onDeleteWorkout(w.id)}
                          className="text-red-500 hover:text-red-700 p-0"
                          aria-label="Delete workout"
                          title="Delete"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {!w.carbs_burned &&
                  (isMultiDeleteMode ? (
                    <div className="mt-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-lime-600"
                        checked={selectedWorkoutLogs.includes(w.id)}
                        onChange={() => onToggleSelectWorkout(w.id)}
                      />
                    </div>
                  ) : (
                    <div className="mt-2 flex justify-end">
                      <button
                        onClick={() => onDeleteWorkout(w.id)}
                        className="text-red-500 hover:text-red-700 p-2 rounded-full"
                      >
                        <FiTrash2 size={18} />
                      </button>
                    </div>
                  ))}
              </div>
            ))}
          </div>

          {workoutLogs.length > initialCount && (
            <div className="flex justify-center mt-3">
              <button
                onClick={() => setExpanded((s) => !s)}
                className="px-4 py-1 text-sm text-gray-700 border rounded-full"
              >
                {expanded ? "Show less" : "Show more"}
              </button>
            </div>
          )}
        </>
      ) : (
        <p className="text-gray-500 italic text-sm mt-2">
          No workouts logged for this day.
        </p>
      )}

      {/* Workout Detail Modal removed per request */}
    </div>
  );
}
