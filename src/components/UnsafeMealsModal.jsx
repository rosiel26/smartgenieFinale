// src/components/UnsafeMealsModal.jsx
import React from 'react';

export default function UnsafeMealsModal({
  unsafeMeals,
  onAutoFix,
  onKeep,
  onClose,
  visible // New prop for fade effect
}) {
  const modalClasses = `fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50 transition-opacity duration-300 ${
    visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
  }`;

  const contentClasses = `bg-white p-6 rounded-lg shadow-xl max-w-sm w-full mx-4 transition-transform duration-300 ${
    visible ? 'scale-100' : 'scale-95'
  }`;

  return (
    <div className={modalClasses}>
      <div className={contentClasses}>
        <h2 className="text-xl font-bold mb-4 text-red-600">Unsafe Meals Detected!</h2>
        <p className="mb-4 text-gray-700">
          Your updated health profile indicates some meals in your current plan are no longer suitable.
          You can choose to auto-fix these by replacing them with new suggestions, or keep them with a warning.
        </p>
        <div className="max-h-40 overflow-y-auto mb-4 border border-gray-200 rounded p-2">
          {unsafeMeals.length > 0 ? (
            unsafeMeals.map((meal, index) => (
              <p key={index} className="text-sm text-gray-800">
                • {meal.name} ({meal.type} on {meal.date})
              </p>
            ))
          ) : (
            <p className="text-sm text-gray-500">No unsafe meals identified.</p>
          )}
        </div>
        <div className="flex justify-end gap-3">
          <button
            onClick={onKeep}
            className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors"
          >
            Keep Unsafe Meals
          </button>
          <button
            onClick={onAutoFix}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Auto-fix
          </button>
        </div>
      </div>
    </div>
  );
}
