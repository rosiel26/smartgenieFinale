import React, { useState } from "react";

export default function MealPlanGrid({ weeklyPlan, mealTypes, onOpenDish }) {
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
                const date = new Date(day.date);
                const dayLabel = date.toLocaleDateString("en-US", {
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

                  // ✅ Only "added" meals are unclickable
                  const isClickable = meal.status !== "added";

                  let statusStyles = "";
                  if (meal.status === "added") {
                    statusStyles =
                      "bg-green-50 border-green-200 opacity-60 cursor-not-allowed";
                  } else if (meal.status === "missed") {
                    // Missed meals are clickable
                    statusStyles =
                      "bg-red-50 border-red-200 cursor-pointer hover:bg-red-100";
                  } else {
                    statusStyles = "cursor-pointer hover:bg-green-50";
                  }

                  return (
                    <td
                      key={idx}
                      className={`border px-2 py-1 relative ${statusStyles}`}
                      onClick={() => isClickable && onOpenDish(meal, day.date)}
                    >
                      {meal.status === "missed" && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-10">
                          <span className="text-red-500 font-bold text-xs">
                            Missed
                          </span>
                        </div>
                      )}
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
