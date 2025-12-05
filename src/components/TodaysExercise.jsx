import React from "react";
import { getIntensityBadge } from "../utils/workoutUtils";

const TodaysExercise = ({ workout, onAdd }) => {
  if (!workout) {
    return (
      <div className="p-4 bg-white rounded-2xl shadow-md text-center">
        <p className="text-gray-500">No workout suggested for today.</p>
      </div>
    );
  }

  const intensity = getIntensityBadge(workout.met_value);

  return (
    <div className="p-4 bg-white rounded-2xl shadow-md">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-xl text-black">Today's Exercise</h3>
        <button
          onClick={() => onAdd(workout)}
          className="py-2 px-2 rounded-md bg-black text-white text-sm font-bold hover:bg-lime-500 hover:text-black hover:shadow-sm transition-all duration-150 active:scale-95"
        >
          Log Workout
        </button>
      </div>

      <div className="flex items-center gap-4">
        {workout.image_url && (
          <img
            src={workout.image_url}
            alt={workout.name}
            className="w-24 h-24 object-cover rounded-lg"
          />
        )}
        <div className="flex-1">
          <p className="font-semibold text-lg">{workout.name}</p>
          <p className="text-sm text-gray-600 mb-2">{workout.description}</p>
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded text-xs font-medium ${intensity.color}`}
            >
              {intensity.label} Intensity || 30 mins
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TodaysExercise;
