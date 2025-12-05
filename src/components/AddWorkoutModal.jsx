import React, { useState } from "react";
import { calculateCaloriesBurned } from "../utils/workoutUtils";
import AlertModal from "./AlertModal";

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
// Component
// ---------------------------
const AddWorkoutModal = ({
  show,
  onClose,
  workout,
  profile,
  onAdd,
  loading,
  notRecommended,
}) => {
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState(30);
  const [showAlert, setShowAlert] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

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

export default AddWorkoutModal;
