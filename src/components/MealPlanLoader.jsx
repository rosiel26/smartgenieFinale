import React from "react";

const MealPlanLoader = ({ timeframe }) => (
  <div className="p-4 max-w-4xl mx-auto">
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
      {Array(timeframe || 7)
        .fill()
        .map((_, i) => (
          <div key={i} className="mb-6">
            <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        ))}
    </div>
  </div>
);

export default MealPlanLoader;
