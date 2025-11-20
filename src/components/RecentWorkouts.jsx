import React from "react";
import { FaTrashAlt } from "react-icons/fa";

export default function RecentWorkouts({ workouts, setConfirmDelete }) {
  if (!workouts || workouts.length === 0)
    return <p className="text-gray-400 text-center">No workouts logged yet.</p>;

  return (
    <div className="space-y-3">
      <h3 className="text-md font-semibold text-gray-700">Recent Workouts</h3>
      <div className="flex flex-col gap-3">
        {workouts.map((w) => {
          const workoutName = w.workout_types?.name || "Unknown";
          const workoutImage = w.workout_types?.image_url;

          return (
            <div
              key={w.id}
              className="flex items-center justify-between p-3 bg-green-50 rounded-xl shadow-sm"
            >
              <div className="flex items-center gap-3">
                {workoutImage ? (
                  <img
                    src={workoutImage}
                    alt={workoutName}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-xs">
                    N/A
                  </div>
                )}
                <div>
                  <p className="font-medium text-gray-800">{workoutName}</p>
                  <p className="text-xs text-gray-500">
                    Duration: {w.duration} min
                  </p>
                  {w.calories_burned && (
                    <p className="text-xs text-gray-500">
                      Calories: {w.calories_burned} kcal
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setConfirmDelete(w.id)}
                className="text-red-600 hover:text-red-800"
              >
                <FaTrashAlt />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
