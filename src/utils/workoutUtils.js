// ---------------------------
// Helpers
// ---------------------------
export const calculateCaloriesBurned = (met, weightKg, durationMinutes) => {
  const durationHours = durationMinutes / 60;
  return Math.round(met * weightKg * durationHours);
};

export const isWorkoutSafe = (workout, userHealthConditions = []) => {
  const unsafe = (workout.unsuitable_for || []).map((hc) =>
    hc.toLowerCase().trim()
  );
  const userHC = (userHealthConditions || []).map((hc) =>
    hc.toLowerCase().trim()
  );
  const conflicts = unsafe.filter((hc) => userHC.includes(hc));
  return { safe: conflicts.length === 0, conflicts };
};

export const getIntensityBadge = (met) => {
  if (met < 4) return { label: "Low", color: "bg-green-100 text-green-700" };
  if (met < 8)
    return { label: "Medium", color: "bg-yellow-100 text-yellow-700" };
  return { label: "High", color: "bg-red-100 text-red-700" };
};
