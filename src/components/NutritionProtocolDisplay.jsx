import React from "react";
import {
  FaFire,
  FaDrumstickBite,
  FaOilCan,
  FaBreadSlice,
} from "react-icons/fa";

const NutritionProtocolDisplay = ({
  dailyCalories,
  dailyProtein,
  dailyFats,
  dailyCarbs,
  nutritionAdvice,
}) => {
  return (
    <div className="bg-white space-y-4">
      <hr />
      <p className="font-semibold text-sm text-gray-700 mb-2">
        Nutrition Protocol Overview
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left side: Macros */}
        <div className="grid grid-cols-2 gap-4">
          {/* Calories */}
          <div className="bg-gradient-to-br from-red-100 to-red-200 p-4 rounded-xl text-center shadow hover:shadow-lg transition-shadow duration-300 flex flex-col justify-center items-center">
            <FaFire className="text-xl mb-1 text-red-600" />
            <p className="text-sm text-gray-500 tracking-wide">Calories</p>
            <p className="text-sm font-bold text-red-700">
              {dailyCalories} kcal/day
            </p>
          </div>

          {/* Protein */}
          <div className="bg-gradient-to-br from-blue-100 to-blue-200 p-4 rounded-xl text-center shadow hover:shadow-lg transition-shadow duration-300 flex flex-col justify-center items-center">
            <FaDrumstickBite className="text-xl mb-1 text-blue-600" />
            <p className="text-sm text-gray-500 tracking-wide">Protein</p>
            <p className="text-sm font-bold text-blue-700">
              {dailyProtein} g/day
            </p>
          </div>

          {/* Fats */}
          <div className="bg-gradient-to-br from-yellow-100 to-yellow-200 p-4 rounded-xl text-center shadow hover:shadow-lg transition-shadow duration-300 flex flex-col justify-center items-center">
            <FaOilCan className="text-xl mb-1 text-yellow-600" />
            <p className="text-sm text-gray-500 tracking-wide">Fats</p>
            <p className="text-sm font-bold text-yellow-700">
              {dailyFats} g/day
            </p>
          </div>

          {/* Carbs */}
          <div className="bg-gradient-to-br from-green-100 to-green-200 p-4 rounded-xl text-center shadow hover:shadow-lg transition-shadow duration-300 flex flex-col justify-center items-center">
            <FaBreadSlice className="text-xl mb-1 text-green-600" />
            <p className="text-sm text-gray-500 tracking-wide">Carbs</p>
            <p className="text-sm font-bold text-green-700">
              {dailyCarbs} g/day
            </p>
          </div>
        </div>

        {/* Right side: Nutrition advice */}
        <div className="bg-gray-50 p-4 rounded-xl shadow-inner overflow-auto max-h-64">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">
            Nutrition Advice
          </h3>
          <ul className="list-disc list-inside text-[10px] text-gray-700 space-y-1">
            {nutritionAdvice.length
              ? nutritionAdvice.map((item, idx) => <li key={idx}>{item}</li>)
              : "No advice available."}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default NutritionProtocolDisplay;
