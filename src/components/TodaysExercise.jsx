import React from "react";
import { getIntensityBadge } from "../utils/workoutUtils";
import { CheckCircleIcon } from "@heroicons/react/24/solid"; // Assuming @heroicons/react is available or will be installed

const TodaysExercise = ({
  workout,
  onAdd,
  onEdit,
  isLogged = false,
  loggedDuration,
  loggedCaloriesBurned,
  onClose,
}) => {
  if (!workout) {
    return (
      <div className="p-4 bg-white rounded-2xl shadow-md text-center border border-lime-500">
        <p className="text-black">No workout suggested for today.</p>
      </div>
    );
  }

  const intensity = getIntensityBadge(workout.met_value);
  const displayDuration = workout.duration;

  return (
    <div
      className={`p-4 rounded-2xl shadow-md border relative ${
        isLogged ? "bg-black" : "bg-white"
      }`}
    >
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
      <div className="flex items-center justify-between mb-2">
        <h3
          className={`font-bold text-md flex items-center ${
            isLogged ? "text-white" : "text-black"
          }`}
        >
          Today's Exercise
          {isLogged && (
            <CheckCircleIcon className="h-6 w-6 text-lime-600 ml-2" />
          )}
        </h3>
        {isLogged ? (
          <button
            onClick={() => onAdd(workout)}
            className="py-2 px-2 rounded-md bg-lime-500 text-black text-xs font-bold hover:bg-lime-600 hover:shadow-sm transition-all duration-150 active:scale-95"
          >
            update
          </button>
        ) : (
          <button
            onClick={() => onAdd(workout)}
            className="py-2 px-2 rounded-md bg-black text-white text-sm font-bold hover:bg-lime-500 hover:text-black hover:shadow-sm transition-all duration-150 active:scale-95"
          >
            Log Workout
          </button>
        )}
      </div>

      <div className="flex items-center gap-4">
        {workout.image_url && (
          <img
            src={workout.image_url}
            alt={workout.name}
            className="w-24 h-24 object-cover rounded-lg border-2 border-white"
          />
        )}
        <div className="flex-1">
          <p
            className={`font-semibold text-lg ${
              isLogged ? "text-white" : "text-black"
            }`}
          >
            {workout.name}
          </p>
          <p
            className={`text-xs mb-2 ${
              isLogged ? "text-white/70" : "text-black"
            }`}
          >
            {workout.description}
          </p>
          <div className="flex items-center gap-2">
            <span
              className={`py-0.5 rounded text-xs font-medium ${intensity.color}`}
            >
              {intensity.label} Intensity
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TodaysExercise;
