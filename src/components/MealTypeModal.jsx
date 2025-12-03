import React from "react";
import { motion, AnimatePresence } from "framer-motion";

const MealTypeModal = ({ isOpen, onClose, onSelectMealType }) => {
  const mealTypes = ["Breakfast", "Lunch", "Dinner"];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-white rounded-2xl shadow-lg w-full max-w-xs p-5 text-center"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
        >
          <h2 className="font-bold text-lg mb-4">Select Meal Type</h2>
          <div className="grid grid-cols-1 gap-3">
            {mealTypes.map((type) => (
              <button
                key={type}
                onClick={() => onSelectMealType(type)}
                className="w-full bg-black text-white py-3 rounded-xl hover:bg-lime-600 transition-colors"
              >
                {type}
              </button>
            ))}
          </div>
          <button
            onClick={onClose}
            className="w-full mt-4 py-2 text-sm text-gray-600 hover:bg-red-800 hover:text-white rounded-xl"
          >
            Cancel
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MealTypeModal;
