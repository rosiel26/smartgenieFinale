// /utils/calculateHealth.js

/**
 * Calculate BMR using Mifflin-St Jeor Equation
 * @param {number} weightKg 
 * @param {number} heightCm 
 * @param {number} age 
 * @param {"male"|"female"} gender 
 * @returns {number} BMR
 */
const calculateBMR = (weightKg, heightCm, age, gender) => {
  const g = gender?.toLowerCase();
  return g === "male"
    ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
    : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
};

/**
 * Get activity multiplier based on activity level
 * @param {string} level 
 * @returns {number} multiplier
 */
const getActivityMultiplier = (level) => {
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
 * @param {number} weightKg 
 * @param {number} heightCm 
 * @returns {number|null} BMI
 */
const calculateBMI = (weightKg, heightCm) => {
  if (!weightKg || !heightCm) return null;
  const heightM = heightCm / 100;
  return +(weightKg / (heightM * heightM)).toFixed(1);
};

/**
 * Calculate calorie goal and macros based on goals
 * @param {string[]} goalsList 
 * @param {number} tdee 
 * @returns {{calories: number, protein: number, carbs: number, fats: number}}
 */
const calculateMacros = (goalsList, tdee) => {
  let calorieGoal = tdee;
  const goals = (goalsList || []).map(g => g.toLowerCase());

  if (goals.includes("weight loss")) calorieGoal -= 500;
  if (goals.includes("boost energy")) calorieGoal += 150;
  if (goals.includes("managing stress")) calorieGoal += 100;
  if (goals.includes("optimized athletic performance")) calorieGoal += 300;

  calorieGoal = Math.max(1200, Math.round(calorieGoal));

  let proteinPerc = 0.25, carbPerc = 0.5, fatPerc = 0.25;

  if (goals.includes("weight loss")) {
    proteinPerc = 0.35; carbPerc = 0.4; fatPerc = 0.25;
  }
  if (goals.includes("boost energy") || goals.includes("optimized athletic performance")) {
    proteinPerc = 0.3; carbPerc = 0.55; fatPerc = 0.15;
  }
  if (goals.includes("managing stress")) {
    proteinPerc = 0.25; carbPerc = 0.45; fatPerc = 0.3;
  }
  if (goals.includes("eating a balanced diet") || goals.includes("improve physical health")) {
    proteinPerc = 0.25; carbPerc = 0.5; fatPerc = 0.25;
  }

  const protein = Math.round((calorieGoal * proteinPerc) / 4);
  const carbs = Math.round((calorieGoal * carbPerc) / 4);
  const fats = Math.round((calorieGoal * fatPerc) / 9);

  return { calories: calorieGoal, protein, carbs, fats };
};

/**
 * Full health profile calculation
 * @param {object} profile - { weightKg, heightCm, age, gender, activityLevel, goalsList }
 * @returns {object} { bmr, tdee, bmi, calories, protein, carbs, fats }
 */
const calculateHealthProfile = ({ weightKg, heightCm, age, gender, activityLevel, goalsList }) => {
  const bmr = calculateBMR(weightKg, heightCm, age, gender);
  const tdee = Math.round(bmr * getActivityMultiplier(activityLevel));
  const bmi = calculateBMI(weightKg, heightCm);
  const { calories, protein, carbs, fats } = calculateMacros(goalsList, tdee);

  return { bmr, tdee, bmi, calories, protein, carbs, fats };
};

export {
  calculateBMR,
  getActivityMultiplier,
  calculateBMI,
  calculateMacros,
  calculateHealthProfile
};
