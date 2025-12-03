import React from "react";

const NoProfile = ({ onNavigate }) => (
  <div className="p-4 max-w-md mx-auto text-center">
    <p className="text-lg text-gray-600">
      Please complete your health profile to get personalized meal
      recommendations.
    </p>
    <button
      onClick={() => onNavigate("/healthprofile")}
      className="mt-4 px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
    >
      Create Health Profile
    </button>
  </div>
);

export default NoProfile;
