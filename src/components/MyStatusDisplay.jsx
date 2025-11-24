import React from "react";
import { GiChickenOven, GiCookingPot, GiWheat } from "react-icons/gi";

export default function MyStatusDisplay({
  profile,
  remainingTotals,
  totalCalories,
  progressPercent,
  netTotals,
  totalProtein,
  totalFats,
  totalCarbs,
}) {
  const nutrients = [
    {
      label: "Protein",
      consumed: netTotals.protein,
      goal: totalProtein,
      color: "#3B82F6",
      icon: GiChickenOven,
    },
    {
      label: "Fats",
      consumed: netTotals.fats,
      goal: totalFats,
      color: "#FACC15",
      icon: GiCookingPot,
    },
    {
      label: "Carbs",
      consumed: netTotals.carbs,
      goal: totalCarbs,
      color: "#22C55E",
      icon: GiWheat,
    },
  ];

  const circleRadius = 18;
  const circumference = 2 * Math.PI * circleRadius;

  return (
    <div className="space-y-6 font-sans">
      {/* Goal Header */}
      <div className="flex items-center gap-2 text-left">
        <p className="text-gray-600 text-sm font-semibold">Goal:</p>
        <span className="font-semibold text-xs text-emerald-700">
          {(() => {
            // Convert to array safely
            const goals = Array.isArray(profile.goal)
              ? profile.goal
              : typeof profile.goal === "string"
              ? profile.goal.split(",").map((g) => g.trim())
              : [];

            if (goals.length === 1) return goals[0];
            if (goals.length === 2) return `${goals[0]} • ${goals[1]}`;
            if (goals.length > 2) return `${goals[0]} • ${goals[1]} and  more`;

            return "";
          })()}
        </span>
      </div>

      {/* Half-moon + nutrients */}
      <div className="flex justify-center items-start gap-8 relative">
        {/* Half-moon */}
        <div className="relative w-60 h-40">
          <svg viewBox="0 0 100 50" className="absolute inset-0">
            <path
              d="M10 50 A40 40 0 0 1 90 50"
              fill="none"
              stroke="#E5E7EB"
              strokeWidth="10"
              strokeLinecap="round"
            />
            <path
              d="M10 50 A40 40 0 0 1 90 50"
              fill="none"
              stroke="limegreen"
              strokeWidth="10"
              strokeDasharray="126"
              strokeDashoffset={126 * (1 - progressPercent / 100)}
              style={{ transition: "stroke-dashoffset 1s ease-in-out" }}
            />
          </svg>

          {/* Center text */}
          <div className="absolute inset-0 flex flex-col justify-center items-center mt-1">
            {progressPercent >= 100 ? (
              remainingTotals.calories >= 0 ? (
                <span className="text-lg font-bold text-lime-600 text-center">
                  🎉 Congrats! <br /> You’ve completed your goal
                </span>
              ) : (
                <span className="text-lg font-bold text-red-500 text-center">
                  ⚠️ You’ve exceeded by{" "}
                  {Math.abs(remainingTotals.calories)} kcal
                </span>
              )
            ) : (
              <>
                <span className="text-xl font-bold text-lime-600">
                  {progressPercent}%
                </span>
                <span className="text-gray-600 text-[10px]">
                  {remainingTotals.calories > 0
                    ? `${remainingTotals.calories} kcal left`
                    : `+${Math.abs(remainingTotals.calories)} kcal`}
                </span>
                <span className="text-gray-400 text-[10px]">
                  of {totalCalories} kcal goal
                </span>
              </>
            )}
          </div>

          {/* Current / Target summary */}
          <div className="flex justify-between text-center px-4 absolute bottom-2 w-full">
            <div>
              <p className="text-xs text-gray-500">Current</p>
              <p className="text-sm font-semibold text-lime-500">
                {totalCalories - remainingTotals.calories} kcal
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Target</p>
              <p className="text-sm font-semibold text-gray-800">
                {totalCalories} kcal
              </p>
            </div>
          </div>
        </div>

        {/* Circular nutrients */}
        <div className="flex flex-col gap-4">
          {nutrients.map((nutrient) => {
            const percent = nutrient.goal
              ? Math.min(
                  100,
                  (nutrient.consumed / nutrient.goal) * 100
                )
              : 0;
            const Icon = nutrient.icon;

            return (
              <div key={nutrient.label} className="flex items-center gap-2">
                <div className="relative w-12 h-12">
                  <svg width="45" height="45">
                    <circle
                      cx="24"
                      cy="24"
                      r={circleRadius}
                      stroke="#E5E7EB"
                      strokeWidth="5"
                      fill="none"
                    />
                    <circle
                      cx="24"
                      cy="24"
                      r={circleRadius}
                      stroke={nutrient.color}
                      strokeWidth="5"
                      fill="none"
                      strokeDasharray={circumference}
                      strokeDashoffset={circumference * (1 - percent / 100)}
                      strokeLinecap="round"
                      transform="rotate(-90 24 24)"
                    />
                  </svg>
                  <Icon
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-gray-700"
                    size={12}
                  />
                </div>
                <div className="flex flex-col text-xs">
                  <span className="font-semibold text-gray-700 text-[10px]">
                    {nutrient.label}
                  </span>
                  <span className="font-medium text-gray-800 text-[8px]">
                    {nutrient.consumed}/{nutrient.goal} g
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <hr />
    </div>
  );
}
