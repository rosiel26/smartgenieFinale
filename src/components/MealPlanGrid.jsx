import React, { useState } from "react";
import { FaExclamationTriangle } from "react-icons/fa"; // NEW import

export default function MealPlanGrid({ weeklyPlan, mealTypes, onOpenDish }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [filterDays, setFilterDays] = useState("3");
  const [mealStatusFilter, setMealStatusFilter] = useState("all");

  if (!weeklyPlan?.plan || weeklyPlan.plan.length === 0) {
    return (
      <div className="text-center text-gray-500 mt-10">
        No meal plan generated yet.
      </div>
    );
  }

  const filteredPlan = weeklyPlan.plan.filter((_, index) => {
    if (filterDays === "3") return index < 3;
    if (filterDays === "7") return index < 7;
    return true;
  });

  const computeMacros = (meal) => {
    const ingredients = meal.ingredients_dish_id_fkey || [];
    return {
      calories: Math.round(
        ingredients.reduce((sum, i) => sum + (i.calories || 0), 0)
      ),
      protein: Math.round(
        ingredients.reduce((sum, i) => sum + (i.protein || 0), 0)
      ),
      carbs: Math.round(
        ingredients.reduce((sum, i) => sum + (i.carbs || 0), 0)
      ),
      fats: Math.round(ingredients.reduce((sum, i) => sum + (i.fats || 0), 0)),
    };
  };

  const mealTypeList = ["Breakfast", "Lunch", "Dinner"];

  return (
    <div className="pt-2">
      <div className={filterDays === "3" ? "w-full" : "overflow-x-auto"}>
        <table
          className={`table-auto border-collapse text-sm ${
            filterDays === "3" ? "w-full" : ""
          }`}
        >
          <thead>
            <tr className="bg-gray-100 sticky top-0">
              <th className="border px-2 py-1 text-left text-xs w-1/4">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <select
                    value={filterDays}
                    onChange={(e) => setFilterDays(e.target.value)}
                    className="text-sm p-0.1 font-medium bg-transparent border-none focus:outline-none"
                  >
                    <option value="3">3</option>
                    <option value="7">7</option>
                    <option value="full">Full</option>
                  </select>
                </div>
              </th>

              {filteredPlan.map((day, idx) => {
                const [hYear, hMonth, hDayOfMonth] = day.date.split('-').map(Number);
                const headerDateLocal = new Date(hYear, hMonth - 1, hDayOfMonth);
                const dayLabel = headerDateLocal.toLocaleDateString("en-US", {
                  weekday: "short",
                  day: "numeric",
                });
                return (
                  <th
                    key={idx}
                    className={`border px-2 py-1 text-center ${
                      filterDays === "3" ? "w-1/4" : "min-w-[120px]"
                    }`}
                  >
                    {dayLabel}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {mealTypeList.map((mealType) => (
              <tr key={mealType}>
                <td className="border px-2 py-1 font-semibold text-center text-[10px]">
                  {mealType}
                </td>
                {filteredPlan.map((day, idx) => {
                  const meal = day.meals.find(
                    (m) =>
                      m.type === mealType &&
                      (mealStatusFilter === "all" ||
                        m.status === mealStatusFilter)
                  );
                  if (!meal)
                    return <td key={idx} className="border px-2 py-1"></td>;

                  const { calories, protein, carbs, fats } =
                    computeMacros(meal);

                  // --- Status Logic ---
                  const [mYear, mMonth, mDayOfMonth] = day.date.split('-').map(Number);
                  const mealDateLocal = new Date(mYear, mMonth - 1, mDayOfMonth);

                  const now = new Date();
                  const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());

                  const isActive =
                    mealDateLocal.getTime() === todayLocal.getTime() &&
                    meal.status === "pending";
                  const isClickable = meal.status !== "added";

                  let statusStyles = "";
                  let statusOverlay = null;

                  // NEW: Unsafe meal styling takes precedence for visual warning
                  if (meal.isUnsafe) {
                    statusStyles += " bg-red-50 border-red-400"; // Soft red background
                    statusOverlay = (
                      <div className="absolute top-1 right-1 bg-red-500 text-white rounded-full h-4 w-4 flex items-center justify-center group cursor-help">
                        <FaExclamationTriangle className="w-3 h-3" />
                        <span className="absolute left-full top-1/2 ml-2 max-w-xs bg-red-700 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 break-words text-left shadow-lg">
                          This meal is unsafe for your current health profile.
                        </span>
                      </div>
                    );
                  }
                  
                  if (meal.status === "added") {
                    statusStyles +=
                      " bg-green-100 border-green-300 opacity-70 cursor-not-allowed";
                    // Only show checkmark if not already showing unsafe icon
                    if (!meal.isUnsafe) { 
                      statusOverlay = (
                        <div className="absolute top-1 right-1 bg-green-500 text-white rounded-full h-4 w-4 flex items-center justify-center">
                          <svg
                            className="w-3 h-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="3"
                              d="M5 13l4 4L19 7"
                            ></path>
                          </svg>
                        </div>
                      );
                    }
                  } else if (meal.status === "missed") {
                    statusStyles += " bg-red-100 border-red-300 hover:bg-red-200";
                    // Only show missed overlay if not already showing unsafe icon
                    if (!meal.isUnsafe) {
                      statusOverlay = (
                        <div className="absolute inset-0 flex items-center justify-center bg-red-500 bg-opacity-20">
                          <span className="text-red-700 font-bold text-xs uppercase tracking-wider">
                            Missed
                          </span>
                        </div>
                      );
                    }
                  } else if (isActive) {
                    statusStyles +=
                      " border-2 cursor-pointer hover:bg-yellow-50";
                  } else {
                    // Pending (future meals)
                    statusStyles += " opacity-80 cursor-pointer hover:bg-gray-50";
                  }

                  return (
                    <td
                      key={idx}
                      className={`border px-2 py-1 relative transition-all duration-200 ${statusStyles} ${meal.isUnsafe ? 'border-red-500 border-2' : ''}`} // Apply red border if unsafe
                      onClick={() => isClickable && onOpenDish(meal, day.date)}
                    >
                      {statusOverlay}
                      <div className="flex flex-col items-center gap-1 text-center">
                        {meal.image_url ? (
                          <img
                            src={meal.image_url}
                            alt={meal.name}
                            className="w-12 h-10 object-cover rounded-md"
                          />
                        ) : (
                          <div className="w-12 h-10 bg-gray-200 rounded-md" />
                        )}
                        <div className="text-[10px] font-medium text-lime-600 truncate overflow-hidden whitespace-nowrap">
                          {meal.name}
                        </div>
                        <div className="text-[10px] text-gray-500 grid grid-cols-2 gap-1 text-center">
                          <span>🔥 {calories}</span>
                          <span>💪 {protein}</span>
                          <span>🍞 {carbs}</span>
                          <span>🧈 {fats}</span>
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
