/**
 * Calculate BMR using Mifflin-St Jeor Equation
 */
export const calculateBMR = (weightKg, heightCm, age, gender) => {
  const g = gender?.toLowerCase();
  return g === "male"
    ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
    : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
};

/**
 * Get activity multiplier based on activity level
 */
export const getActivityMultiplier = (level) => {
  const l = level?.toLowerCase();
  return {
    sedentary: 1.2,
    "lightly active": 1.375,
    "moderately active": 1.55,
    "very active": 1.725,
  }[l] || 1.2;
};

/**
 * Calculate BMI
 */
export const calculateBMI = (weightKg, heightCm) => {
  if (!weightKg || !heightCm) return null;
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
};

/**
 * Calculate daily calories based on goals
 */
export const calculateDailyCalories = (goalsList, tdee) => {
  const goals = (goalsList || []).map((g) => g.toLowerCase());

  let calorieGoal = tdee;

  if (goals.includes("weight loss")) {
    calorieGoal -= 500; // base deficit
    if (
      goals.includes("boost energy") ||
      goals.includes("managing stress") ||
      goals.includes("optimized athletic performance")
    ) {
      calorieGoal += 150; // compensate slightly
    }
  } else {
    if (goals.includes("boost energy")) calorieGoal += 150;
    if (goals.includes("managing stress")) calorieGoal += 100;
    if (goals.includes("optimized athletic performance")) calorieGoal += 300;
  }

  // ❌ Remove minimum 1200 restriction
  return calorieGoal;
};

/**
 * Calculate daily macros with multiple goals
 */
export const calculateDailyMacros = (goalsList, dailyCalories) => {
  const goals = (goalsList || []).map((g) => g.toLowerCase());

  let proteinPerc = 0.25,
    carbPerc = 0.5,
    fatPerc = 0.25;

  if (goals.includes("weight loss")) {
    proteinPerc = 0.35;
    carbPerc = 0.4;
    fatPerc = 0.25;
  } else if (
    goals.includes("boost energy") ||
    goals.includes("optimized athletic performance")
  ) {
    proteinPerc = 0.3;
    carbPerc = 0.55;
    fatPerc = 0.15;
  } else if (goals.includes("managing stress")) {
    proteinPerc = 0.25;
    carbPerc = 0.45;
    fatPerc = 0.3;
  } else if (
    goals.includes("eating a balanced diet") ||
    goals.includes("improve physical health")
  ) {
    proteinPerc = 0.25;
    carbPerc = 0.5;
    fatPerc = 0.25;
  }

  // ❌ Keep decimals, no rounding
  const protein = (dailyCalories * proteinPerc) / 4;
  const carbs = (dailyCalories * carbPerc) / 4;
  const fats = (dailyCalories * fatPerc) / 9;

  return { protein, carbs, fats };
};

/**
 * Full health profile calculation including daily & total macros
 */
export const calculateHealthProfile = ({
  weightKg,
  heightCm,
  age,
  gender,
  activityLevel,
  goalsList,
  timeframeDays = 30,
}) => {
  const bmr = calculateBMR(weightKg, heightCm, age, gender);
  const tdee = bmr * getActivityMultiplier(activityLevel);
  const bmi = calculateBMI(weightKg, heightCm);

  const dailyCalories = calculateDailyCalories(goalsList, tdee);
  const { protein: dailyProtein, carbs: dailyCarbs, fats: dailyFats } =
    calculateDailyMacros(goalsList, dailyCalories);

  // Totals across timeframe (no rounding)
  const totalCalories = dailyCalories * timeframeDays;
  const totalProtein = dailyProtein * timeframeDays;
  const totalCarbs = dailyCarbs * timeframeDays;
  const totalFats = dailyFats * timeframeDays;

  return {
    bmr,
    tdee,
    bmi,
    dailyCalories,
    dailyProtein,
    dailyCarbs,
    dailyFats,
    totalCalories,
    totalProtein,
    totalCarbs,
    totalFats,
  };
};
