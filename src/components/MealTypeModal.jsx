import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiCoffee, FiSun, FiMoon } from "react-icons/fi";

const MealTypeModal = ({ isOpen, onClose, onSelectMealType }) => {
  const mealTypes = [
    { name: "Breakfast", icon: FiCoffee },
    { name: "Lunch", icon: FiSun },
    { name: "Dinner", icon: FiMoon },
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-white rounded-3xl shadow-2xl w-full max-w-xs p-5 text-center border border-lime-200"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
        >
          <h2 className="font-bold text-xl mb-6 text-black">
            Select Meal Type
          </h2>
          <div className="grid grid-cols-1 gap-4">
            {mealTypes.map(({ name, icon: Icon }) => (
              <motion.button
                key={name}
                onClick={() => onSelectMealType(name)}
                className="w-full bg-lime-600 text-white py-4 px-6 rounded-2xl hover:bg-lime-700 transition-all duration-200 flex items-center justify-center gap-3 font-semibold shadow-lg hover:shadow-xl"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Icon className="w-5 h-5" />
                {name}
              </motion.button>
            ))}
          </div>
          <motion.button
            onClick={onClose}
            className="w-full mt-6 py-3 text-sm text-gray-600 hover:bg-gray-100 rounded-2xl transition-colors font-medium"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Cancel
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MealTypeModal;
