// utils/mealplan.js
// Cleaned-up and slightly hardened version of your mealplan utilities.
// Key changes made here:
// - Added normalizeIngredient to canonicalize incoming ingredient fields
// - Standardized on `fat` as the canonical nutrient key but also keep `fats` as
//   a mirrored alias for backward compatibility (some UI code expects `fats`)
// - Added an export alias `createSmarterWeeklyMealPlan` to match imports

export const normalizeIngredient = (ing = {}) => ({
  id: ing.id,
  name: ing.name,
  // canonicalize amounts
  amount: ing.amount ?? ing.storedAmount ?? 0,
  storedAmount: ing.storedAmount ?? ing.amount ?? 0,
  unit: ing.unit,
  // DB may provide total contribution fields or per-gram rates; prefer totals
  calories: ing.calories ?? ing.totalCalories ?? 0,
  protein: ing.protein ?? ing.totalProtein ?? 0,
  carbs: ing.carbs ?? ing.totalCarbs ?? 0,
  // support both fat / fats / totalFats
  fat: ing.fat ?? ing.fats ?? ing.totalFats ?? 0,
  fats: ing.fat ?? ing.fats ?? ing.totalFats ?? 0,
  // per-gram rates if present
  caloriesPerGram: ing.caloriesPerGram ?? ing.cal_per_g ?? 0,
  proteinPerGram: ing.proteinPerGram ?? ing.prot_per_g ?? 0,
  carbsPerGram: ing.carbsPerGram ?? ing.carb_per_g ?? 0,
  fatsPerGram: ing.fatsPerGram ?? ing.fat_per_g ?? 0,
  is_rice: !!ing.is_rice,
  allergen_id: ing.allergen_id,
  customAmount: !!ing.customAmount,
  // preserve raw for debugging
  _raw: ing,
});

export const calculateDishNutrition = (dish) => {
  const ingredientsRaw = dish.ingredients_dish_id_fkey || dish.ingredients || [];
  if (!ingredientsRaw?.length)
    return { calories: 0, protein: 0, fat: 0, carbs: 0, fats: 0 };

  const ingredients = ingredientsRaw.map(normalizeIngredient);

  const totals = ingredients.reduce(
    (totals, ing) => ({
      calories: totals.calories + (ing.calories || 0),
      protein: totals.protein + (ing.protein || 0),
      fat: totals.fat + (ing.fat || 0),
      carbs: totals.carbs + (ing.carbs || 0),
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0 }
  );

  // keep `fats` as alias for older code that expects plural
  return { ...totals, fats: totals.fat };
};

export const computeDishTotalsWithIngredientOverrides = (dish) => {
  if (!dish) return { calories: 0, protein: 0, carbs: 0, fat: 0, fats: 0 };

  const baseline = dish.amountBaseUnit || 100;
  const scale = (dish.servingSize || baseline) / baseline;

  const scaledCalories = (dish.base_total_calories || 0) * scale;
  const scaledProtein = (dish.base_total_protein || 0) * scale;
  const scaledCarbs = (dish.base_total_carbs || 0) * scale;
  const scaledFats = (dish.base_total_fats || dish.base_total_fat || 0) * scale;

  let deltaCalories = 0;
  let deltaProtein = 0;
  let deltaCarbs = 0;
  let deltaFats = 0;

  const ingredientsRaw = dish.ingredients_dish_id_fkey || [];
  const ingredients = ingredientsRaw.map(normalizeIngredient);

  for (const ing of ingredients) {
    const storedAmount = ing.storedAmount || 0;
    // prefer per-gram if available, otherwise derive from total contribution
    const caloriesPerGram =
      ing.caloriesPerGram || (storedAmount > 0 ? (ing.calories || 0) / storedAmount : 0);
    const proteinPerGram =
      ing.proteinPerGram || (storedAmount > 0 ? (ing.protein || 0) / storedAmount : 0);
    const carbsPerGram =
      ing.carbsPerGram || (storedAmount > 0 ? (ing.carbs || 0) / storedAmount : 0);
    const fatsPerGram =
      ing.fatsPerGram || (storedAmount > 0 ? ing.fat / storedAmount : 0);

    const defaultDisplayAmount = +(storedAmount * scale);

    const defaultCalories = caloriesPerGram * defaultDisplayAmount;
    const defaultProtein = proteinPerGram * defaultDisplayAmount;
    const defaultCarbs = carbsPerGram * defaultDisplayAmount;
    const defaultFats = fatsPerGram * defaultDisplayAmount;

    if (ing.customAmount) {
      const customAmt = ing.amount || 0;
      const customCalories = caloriesPerGram * customAmt;
      const customProtein = proteinPerGram * customAmt;
      const customCarbs = carbsPerGram * customAmt;
      const customFats = fatsPerGram * customAmt;

      deltaCalories += Math.ceil(customCalories) - Math.ceil(defaultCalories);
      deltaProtein += Math.ceil(customProtein) - Math.ceil(defaultProtein);
      deltaCarbs += Math.ceil(customCarbs) - Math.ceil(defaultCarbs);
      deltaFats += Math.ceil(customFats) - Math.ceil(defaultFats);
    }
  }

  const finalCalories = +(scaledCalories + deltaCalories).toFixed(2);
  const finalProtein = +(scaledProtein + deltaProtein).toFixed(2);
  const finalCarbs = +(scaledCarbs + deltaCarbs).toFixed(2);
  const finalFat = +(scaledFats + deltaFats).toFixed(2);

  return {
    calories: finalCalories,
    protein: finalProtein,
    carbs: finalCarbs,
    fat: finalFat,
    // backward compat
    fats: finalFat,
  };
};

export const markAddedMeals = (planObject, mealLog = []) => {
  if (!planObject?.plan || !Array.isArray(planObject.plan)) {
    return planObject || { plan: [], start_date: null, end_date: null };
  }
  if (!Array.isArray(mealLog)) {
    mealLog = [];
  }

  const now = new Date();
  // Get today's date based on local time, at local midnight
  const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const updatedPlanArray = planObject.plan.map((day) => {
    const meals = (day.meals || []).map((meal) => {
      const idNum = Number(meal?.id);
      const mealScheduledDate = day.date; // "YYYY-MM-DD" from plan generated by local dates
      // Explicitly construct Date object for local time midnight
      const [year, month, dayOfMonth] = mealScheduledDate.split('-').map(Number);
      const scheduleDateLocal = new Date(year, month - 1, dayOfMonth); // month is 0-indexed

      const isAdded = mealLog.some(
        (m) =>
          Number(m.dish_id) === idNum &&
          m.meal_type === meal.type &&
          m.meal_date === mealScheduledDate
      );

      let status = "pending";
      if (isAdded) {
        status = "added";
      } else if (scheduleDateLocal < todayLocal) {
        status = "missed";
      }

      return { ...(meal || {}), status, meal_date: mealScheduledDate };
    });
    return { ...day, meals };
  });

  return { ...planObject, plan: updatedPlanArray };
};

export const prepareDishForModal = (dish) => {
  const rawIngredients = dish.ingredients_dish_id_fkey || [];
  const sumBase = rawIngredients.reduce((s, i) => s + (i.amount || i.storedAmount || 0), 0);

  const defaultServing = 100;
  // Determine amountBaseUnit more clearly: prioritize dish.amountBaseUnit, then dish.default_serving, then a default of 100
  let amountBaseUnit = dish.amountBaseUnit || dish.default_serving || defaultServing;

  const servingSize = dish.servingSize || defaultServing;

  const ingredients = rawIngredients.map((ingRaw) => {
    const ing = normalizeIngredient(ingRaw);

    const storedAmount = ing.storedAmount || 0; // grams stored in DB for the ingredient (per amountBaseUnit)
    const totalCaloriesForStored = ing.calories || 0;
    const totalProteinForStored = ing.protein || 0;
    const totalCarbsForStored = ing.carbs || 0;
    const totalFatsForStored = ing.fat || 0;

    const caloriesPerGram = storedAmount > 0 ? totalCaloriesForStored / storedAmount : 0;
    const proteinPerGram = storedAmount > 0 ? totalProteinForStored / storedAmount : 0;
    const carbsPerGram = storedAmount > 0 ? totalCarbsForStored / storedAmount : 0;
    const fatsPerGram = storedAmount > 0 ? totalFatsForStored / storedAmount : 0;

    if (isNaN(caloriesPerGram) || !isFinite(caloriesPerGram)) {
      console.warn(`Invalid nutrition data for ingredient ${ing.name}: storedAmount=${storedAmount}`);
    }

    let effectiveAmountBaseUnit = amountBaseUnit;
    // Heuristic: if amountBaseUnit is 1, it likely means '1 piece' or '1 serving'
    // but servingSize and storedAmount are in grams. Assume 1 piece/serving = 100g for scaling.
    // This addresses the 100g -> 10000g issue if amountBaseUnit was mistakenly '1'.
    if (effectiveAmountBaseUnit === 1 && storedAmount > 0) { // Apply heuristic only if storedAmount is meaningful
        effectiveAmountBaseUnit = 100;
    }

    const rawDisplayAmount = storedAmount * (servingSize / effectiveAmountBaseUnit);
    const displayAmount = Number.isInteger(rawDisplayAmount) ? rawDisplayAmount : +rawDisplayAmount.toFixed(1); // Round to 1 decimal if not integer, else keep as integer

    const displayCalories = Math.ceil(caloriesPerGram * displayAmount);
    const displayProtein = Math.ceil(proteinPerGram * displayAmount);
    const displayCarbs = Math.ceil(carbsPerGram * displayAmount);
    const displayFat = Math.ceil(fatsPerGram * displayAmount);

    return {
      ...ingRaw,
      // canonicalized copies
      storedAmount,
      totalCaloriesForStored,
      totalProteinForStored,
      totalCarbsForStored,
      totalFatsForStored,
      caloriesPerGram,
      proteinPerGram,
      carbsPerGram,
      fatsPerGram,
      amount: displayAmount,
      calories: displayCalories,
      protein: displayProtein,
      carbs: displayCarbs,
      fat: displayFat,
      fats: displayFat, // alias
      customAmount: ingRaw.customAmount || false, // Preserve original customAmount flag
    };
  });

  let base_total_calories = 0;
  let base_total_protein = 0;
  let base_total_carbs = 0;
  let base_total_fats = 0;

  for (const ing of ingredients) {
    base_total_calories += Math.ceil(ing.totalCaloriesForStored || 0);
    base_total_protein += Math.ceil(ing.totalProteinForStored || 0);
    base_total_carbs += Math.ceil(ing.totalCarbsForStored || 0);
    base_total_fats += Math.ceil(ing.totalFatsForStored || 0);
  }

  const scale = servingSize / amountBaseUnit;

  return {
    ...dish,
    name: dish.name,
    description: dish.description,
    image_url: dish.image_url,
    servingSize,
    default_serving: defaultServing,
    amountBaseUnit,
    base_total_calories: +base_total_calories.toFixed(2),
    base_total_protein: +base_total_protein.toFixed(2),
    base_total_carbs: +base_total_carbs.toFixed(2),
    base_total_fats: +base_total_fats.toFixed(2),
    // expose both singular and plural keys for compatibility
    base_total_fat: +base_total_fats.toFixed(2),
    total_calories: +(base_total_calories * scale).toFixed(2),
    total_protein: +(base_total_protein * scale).toFixed(2),
    total_carbs: +(base_total_carbs * scale).toFixed(2),
    total_fats: +(base_total_fats * scale).toFixed(2),
    total_fat: +(base_total_fats * scale).toFixed(2),
    ingredients_dish_id_fkey: ingredients,
    db_raw_ingredients: rawIngredients,
  };
};

const parseHealthCondition = (condition) => {
  if (!condition) return [];
  if (Array.isArray(condition)) {
    return condition.map((hc) => String(hc).toLowerCase().trim());
  }
  if (typeof condition === "string") {
    try {
      let parsed = JSON.parse(condition);
      if (Array.isArray(parsed)) {
        return parsed.map((hc) => String(hc).toLowerCase().trim());
      } else {
        return [String(parsed).toLowerCase().trim()];
      }
    } catch {
      // If JSON parsing fails, try to treat it as a single string or loosely parse
      try {
        let cleaned = condition.replace(/^\{/, "[").replace(/\}$/, "]");
        const parsedLoose = JSON.parse(cleaned);
        if (Array.isArray(parsedLoose)) {
          return parsedLoose.map((hc) => String(hc).toLowerCase().trim());
        } else {
          return [String(parsedLoose).toLowerCase().trim()];
        }
      } catch {
        return [condition.toLowerCase().trim()];
      }
    }
  }
  return []; // Fallback for unexpected types
};


export const isDishSafeForProfile = (profile, dish) => {
  if (!profile || !dish) return false;

  let userAllergens = (profile.allergens || []).map((a) => a.toLowerCase().trim());
  const userHealthConditions = (profile.health_conditions || []).map((hc) => hc.toLowerCase().trim());

  const allergenMap = {
    meat: ["beef", "pork", "chicken", "turkey"],
    seafood: ["fish", "shellfish", "shrimp", "crab", "lobster", "squid"],
    dairy: ["milk", "cheese", "butter", "yogurt"],
  };

  const expandedAllergens = new Set();
  for (const allergen of userAllergens) {
    expandedAllergens.add(allergen);
    if (allergenMap[allergen]) allergenMap[allergen].forEach((a) => expandedAllergens.add(a));
  }
  userAllergens = Array.from(expandedAllergens);

  const ingredientsRaw = dish.ingredients_dish_id_fkey || dish.ingredients || [];
  const ingredients = ingredientsRaw.map(normalizeIngredient);

  const dishAllergens = Array.isArray(ingredientsRaw)
    ? ingredients.flatMap((ing) => {
        if (Array.isArray(ing.allergen_id)) {
          return ing.allergen_id.map((a) => a.name.toLowerCase().trim());
        }
        return ing.allergen_id?.name ? [ing.allergen_id.name.toLowerCase().trim()] : [];
      })
    : [];

  const dishIngredients = Array.isArray(ingredients)
    ? ingredients.map((i) => i.name?.toLowerCase().trim() || "")
    : [];

  const dishHealth = parseHealthCondition(dish.health_condition);

  const hasAllergen = userAllergens.some(
    (ua) =>
      dishAllergens.includes(ua) ||
      dishIngredients.includes(ua) ||
      dishIngredients.some((i) => new RegExp(`\\b${ua}\\b`).test(i)) || // More precise word boundary match
      (dish.name || "").toLowerCase().includes(ua) ||
      (dish.description || "").toLowerCase().includes(ua)
  );
    if (hasAllergen) {
      return false;
    }
  
    if (userHealthConditions.some((hc) => dishHealth.includes(hc))) {
      return false;
    }
  
    return true;
  };

export const identifyUnsafeMeals = (profile, weeklyPlan) => {
  const unsafeMeals = [];
  if (!profile || !weeklyPlan?.plan || !Array.isArray(weeklyPlan.plan)) {
    return unsafeMeals;
  }

  for (const day of weeklyPlan.plan) {
    for (const meal of day.meals) {
      // Only check meals that are not yet logged
      if (meal.status !== "added" && !isDishSafeForProfile(profile, meal)) {
        unsafeMeals.push({
          ...meal,
          date: day.date,
          day: day.day,
        });
      }
    }
  }
  return unsafeMeals;
};

export const getSuggestedDishes = (profile, dishes, searchQuery = "") => {
  if (!profile || !dishes?.length) return [];

  const userGoal = profile.goal?.toLowerCase().trim();
  const userEatingStyle = profile.eating_style?.toLowerCase().trim();

  return dishes.filter((dish) => {
    // First, check if the dish is generally safe for the profile's health conditions and allergens
    if (!isDishSafeForProfile(profile, dish)) {
      return false;
    }

    const dishGoals = Array.isArray(dish.goal) ? dish.goal.map((g) => g.toLowerCase().trim()) : [];
    const dishDietary = Array.isArray(dish.dietary) ? dish.dietary.map((d) => d.toLowerCase().trim()) : [];
    const dishName = (dish.name || "").toLowerCase();
    const dishIngredients = (dish.ingredients_dish_id_fkey || [])
      .map((i) => i.name?.toLowerCase().trim() || "");

    if (
      userEatingStyle &&
      dishDietary.length &&
      !dishDietary.includes(userEatingStyle)
    )
      return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!dishName.includes(q) && !dishIngredients.some((i) => i.includes(q))) return false;
    }

    return true;
  });
};

// Helper to calculate a recommended serving size based on user needs
const calculateRecommendedServingSize = (
  dish,
  targetPerMealCalories,
  targetPerMealProtein,
  targetPerMealCarbs,
  targetPerMealFats,
  userGoal
) => {
  const dishNutrition = calculateDishNutrition(dish);
  const baseAmount = dish.amountBaseUnit || 100; // Default to 100g if not specified

  const caloriesPerGram = (dishNutrition.calories || 0) / baseAmount;
  const proteinPerGram = (dishNutrition.protein || 0) / baseAmount;
  const carbsPerGram = (dishNutrition.carbs || 0) / baseAmount;
  const fatsPerGram = (dishNutrition.fat || 0) / baseAmount;

  let suggestedServingSize = baseAmount; // Start with the dish's default/base serving

  let servingSizes = [];

  // Calculate serving size based on calorie needs
  if (caloriesPerGram > 0 && targetPerMealCalories > 0) {
    servingSizes.push(targetPerMealCalories / caloriesPerGram);
  }

  // Calculate serving size based on protein needs
  if (proteinPerGram > 0 && targetPerMealProtein > 0) {
    servingSizes.push(targetPerMealProtein / proteinPerGram);
  }

  // Calculate serving size based on carbs needs
  if (carbsPerGram > 0 && targetPerMealCarbs > 0) {
    servingSizes.push(targetPerMealCarbs / carbsPerGram);
  }

  // Calculate serving size based on fat needs
  if (fatsPerGram > 0 && targetPerMealFats > 0) {
    servingSizes.push(targetPerMealFats / fatsPerGram);
  }

  // Determine the final suggested serving size
  if (servingSizes.length > 0) {
    // Simple average for now, could be made more sophisticated
    let averageServingSize = servingSizes.reduce((a, b) => a + b, 0) / servingSizes.length;
    suggestedServingSize = averageServingSize;

    // Prioritize protein for muscle gain or athletic goals
    if (
      (userGoal.includes("muscle") || userGoal.includes("athletic")) &&
      proteinPerGram > 0 &&
      targetPerMealProtein > 0
    ) {
      const proteinBasedServing = targetPerMealProtein / proteinPerGram;
      // If protein-based serving is within a reasonable range of the average, lean towards it.
      // Or if the current average is too low for protein needs, boost it.
      if (proteinBasedServing > suggestedServingSize * 0.8 && proteinBasedServing < suggestedServingSize * 1.5) {
        suggestedServingSize = proteinBasedServing;
      } else if (proteinBasedServing > suggestedServingSize) {
        suggestedServingSize = Math.max(suggestedServingSize, proteinBasedServing * 0.9); // Ensure minimum protein
      }
    }
  }

  // Clamp suggestedServingSize to a reasonable range, e.g., 30g to 700g
  suggestedServingSize = Math.max(30, Math.min(700, suggestedServingSize));
  return parseFloat(suggestedServingSize.toFixed(1)); // Round to one decimal place
};

// ----- BEGIN REPLACEMENT: createSmartWeeklyMealPlan -----
export const createSmartWeeklyMealPlan = (profile, dishes) => {
  // logging helper (populated for debug; not persisted)
  const plannerLog = [];
  const log = (msg, meta = {}) => plannerLog.push({ ts: Date.now(), msg, meta });

  if (!dishes?.length || !profile) {
    log("missing input", { dishes: !!dishes, profile: !!profile });
    return { start_date: null, end_date: null, plan: [] };
  }

  const timeframe = Number(profile.timeframe) || 7;
  const mealsPerDay = Number(profile.meals_per_day) || 3;

  const targetPerMealCalories = (profile.calorie_needs || 0) / Math.max(1, mealsPerDay);
  const targetPerMealProtein = (profile.protein_needed || 0) / Math.max(1, mealsPerDay);
  const targetPerMealCarbs = (profile.carbs_needed || 0) / Math.max(1, mealsPerDay);
  const targetPerMealFats = (profile.fat_needed || 0) / Math.max(1, mealsPerDay);
  const targetDailyCalories = profile.calorie_needs || 0;
  const targetDailyProtein = profile.protein_needed || 0;

  const userGoal = profile.goal?.toLowerCase?.() || "";

  // set start/end date
  const now = new Date();
  // A new or regenerated plan should always start from the current local date.
  const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // Local midnight
  startDate.setHours(0, 0, 0, 0); // Ensure it's local midnight

  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + timeframe - 1); // Use setDate for local day
  endDate.setHours(0, 0, 0, 0); // Ensure local midnight

  profile.plan_start_date = `${startDate.getFullYear()}-${String(
    startDate.getMonth() + 1
  ).padStart(2, "0")}-${String(startDate.getDate()).padStart(2, "0")}`;
  profile.plan_end_date = `${endDate.getFullYear()}-${String(
    endDate.getMonth() + 1
  ).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`;

  // helpers -------------------------------------------------
  const safeScore = (val, tgt) => {
    if (tgt === 0) {
      return val === 0 ? 1 : 0; // Perfect score if both are 0, else 0 if target is 0 but value is not.
    }
    return Math.max(0, 1 - Math.abs(val - tgt) / tgt);
  };

  const scoreByNutrition = (dish) => {
    const n = calculateDishNutrition(dish);
    const calorieScore = safeScore(n.calories, targetPerMealCalories);
    const proteinScore = safeScore(n.protein, targetPerMealProtein);
    const carbsScore = safeScore(n.carbs, targetPerMealCarbs || 0);
    const fatsScore = safeScore(n.fat, targetPerMealFats || 0);

    let weights = { calories: 1, protein: 1, carbs: 1, fats: 1 };
    if (userGoal.includes("weight loss")) {
      weights = { calories: 1.4, protein: 1.3, carbs: 0.8, fats: 0.8 };
    } else if (userGoal.includes("athletic")) {
      weights = { calories: 1, protein: 1.4, carbs: 1.3, fats: 0.9 };
    } else if (userGoal.includes("muscle")) {
      weights = { calories: 1.1, protein: 1.6, carbs: 1.0, fats: 0.9 };
    }

    const weighted =
      calorieScore * weights.calories +
      proteinScore * weights.protein +
      carbsScore * weights.carbs +
      fatsScore * weights.fats;

    const denom = Object.values(weights).reduce((a, b) => a + b, 0) || 1;
    return weighted / denom;
  };

  // fallback similarity using embeddings (if available)
  const cosineSim = (a = [], b = []) => {
    if (!a.length || !b.length || a.length !== b.length) return 0;
    let dot = 0,
      na = 0,
      nb = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    if (na === 0 || nb === 0) return 0;
    return dot / (Math.sqrt(na) * Math.sqrt(nb));
  };

  const getSimilarDishByEmbedding = (dish, pool) => {
    if (!dish?.dish_embedding || !Array.isArray(dish.dish_embedding)) return null;
    let best = null;
    let bestScore = -Infinity;
    for (const cand of pool) {
      if (!cand?.dish_embedding) continue;
      if (String(cand.id) === String(dish.id)) continue;
      const s = cosineSim(dish.dish_embedding, cand.dish_embedding);
      if (s > bestScore) {
        bestScore = s;
        best = cand;
      }
    }
    return best;
  };

  // Build pools using existing filtering and scoring logic
  const eligibleBase = getSuggestedDishes(profile, dishes) || [];

 const hasMealType = (dish, type) => {
  if (!dish?.meal_type) return false;
  const types = String(dish.meal_type || "")
    .split(/[^a-zA-Z0-9]+/) // split on any non-alphanumeric char
    .map(t => t.toLowerCase().trim())
    .filter(Boolean);

  return types.includes(type.toLowerCase());
};


  const passesHardFilters = (dish, perMealCalories, perMealProtein) => {
    if (!dish) return false;
    const nutrition = calculateDishNutrition(dish);
    if (
      typeof nutrition.calories !== "number" ||
      typeof nutrition.protein !== "number" ||
      typeof nutrition.carbs !== "number" ||
      typeof nutrition.fat !== "number"
    ) {
      return false;
    }
    let maxFactor = 1.4;
    if (userGoal.includes("weight loss")) maxFactor = 1.25;
    else if (userGoal.includes("athletic") || userGoal.includes("muscle")) maxFactor = 1.5;
    if (nutrition.calories > perMealCalories * maxFactor) return false; // Removed arbitrary + 1 buffer

    let minProtein = 0;
    if (userGoal.includes("weight loss")) minProtein = 15;
    else if (userGoal.includes("athletic")) minProtein = 20;
    else if (userGoal.includes("muscle")) minProtein = 25;
    minProtein = Math.max(minProtein, Math.min(10, perMealProtein));

    if (nutrition.protein < minProtein) return false;
    return true;
  };

  const buildPool = (type) => {
    const perMealCalories = targetPerMealCalories || 1;
    const perMealProtein = targetPerMealProtein || 0;
    const pool = eligibleBase
      .filter((d) => hasMealType(d, type))
      .filter((d) => passesHardFilters(d, perMealCalories, perMealProtein))
      .map((d) => ({ ...d, _score: scoreByNutrition(d) }));

    // Sort by score descending, but add slight randomization for items with similar scores
    pool.sort((a, b) => {
      const scoreDiff = b._score - a._score;
      // If scores are very close (within 0.05), add random factor for variety
      if (Math.abs(scoreDiff) < 0.05) {
        return Math.random() - 0.5;
      }
      return scoreDiff;
    });
    log("builtPool", { type, poolLength: pool.length });
    return pool;
  };

  const breakfastPool = buildPool("breakfast");
  const lunchPool = buildPool("lunch");
  const dinnerPool = buildPool("dinner");
  const snackPool = buildPool("snack");

  // Precompute high-protein subsets for targeted swaps
  const highProteinThreshold = 20; // grams, heuristic
  const highProteinByType = {
    Breakfast: breakfastPool.filter((d) => calculateDishNutrition(d).protein >= highProteinThreshold),
    Lunch: lunchPool.filter((d) => calculateDishNutrition(d).protein >= highProteinThreshold),
    Dinner: dinnerPool.filter((d) => calculateDishNutrition(d).protein >= highProteinThreshold + 10),
    Snack: snackPool.filter((d) => calculateDishNutrition(d).protein >= Math.max(8, highProteinThreshold / 2)),
  };

  // Repetition constraints
  const maxRepeatsPerWeek = Math.max(1, Number(profile.max_weekly_repeats) || 2);
  const minDaysBetweenSameDish = Math.max(1, Number(profile.min_days_between_same_dish) || 2);

  const usedHistory = { counts: {}, lastUsedDay: {} };

  // Helper to shuffle array (Fisher-Yates algorithm)
  const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Helper to select randomly from top candidates with similar scores
  const selectFromTopCandidates = (candidates, topN = 5) => {
    if (!candidates?.length) return null;
    // Get top N candidates (or all if fewer)
    const topCandidates = candidates.slice(0, Math.min(topN, candidates.length));
    // Randomly select one from the top candidates
    const randomIndex = Math.floor(Math.random() * topCandidates.length);
    return topCandidates[randomIndex];
  };

  const chooseCandidate = (pool, dayIndex, usedToday = new Set()) => {
    if (!pool?.length) return null;

    const filteredPool = pool.filter(p => !usedToday.has(String(p.id)));

    // First pass: strict adherence to repetition rules
    // Collect all valid candidates, then randomly select from top ones
    const validCandidates = [];
    for (let i = 0; i < filteredPool.length; i++) {
      const candidate = filteredPool[i];
      const id = String(candidate.id);
      const usedCount = usedHistory.counts[id] || 0;
      if (usedCount >= maxRepeatsPerWeek) continue;
      const lastUsedDay = usedHistory.lastUsedDay[id];
      if (typeof lastUsedDay === "number" && dayIndex - lastUsedDay <= minDaysBetweenSameDish) continue;
      validCandidates.push(candidate);
    }
    
    if (validCandidates.length > 0) {
      // Select randomly from top 5 valid candidates (which are already sorted by score)
      const selected = selectFromTopCandidates(validCandidates, 5);
      log("chooseCandidateRandom", { dayIndex, candidateId: selected?.id, poolSize: validCandidates.length });
      return selected;
    }

    // Second pass: Relax minDaysBetweenSameDish, but still respect maxRepeatsPerWeek
    const relaxedCandidates = [];
    for (let i = 0; i < filteredPool.length; i++) {
      const candidate = filteredPool[i];
      const id = String(candidate.id);
      const usedCount = usedHistory.counts[id] || 0;
      if (usedCount >= maxRepeatsPerWeek) continue;
      relaxedCandidates.push(candidate);
    }
    
    if (relaxedCandidates.length > 0) {
      const selected = selectFromTopCandidates(relaxedCandidates, 5);
      log("chooseCandidateRelaxedMinDays", { dayIndex, candidateId: selected?.id });
      return selected;
    }

    // Third pass: Relax maxRepeatsPerWeek, take from least used candidates
    // Sort by least used count, then score, then add randomization
    const sortedByLeastUsed = [...filteredPool].sort((a, b) => {
      const aUsed = usedHistory.counts[String(a.id)] || 0;
      const bUsed = usedHistory.counts[String(b.id)] || 0;
      if (aUsed !== bUsed) return aUsed - bUsed;
      return b._score - a._score;
    });
    
    const selected = selectFromTopCandidates(sortedByLeastUsed, 3);
    log("chooseCandidateRelaxedAll", { dayIndex, chosenId: selected?.id });
    
    // Final fallback: If all else fails, pick any safe dish from the pool, ignoring all repetition constraints
    // This ensures a dish is always selected and isDishSafeForProfile should not find a "Meal not found"
    if (!selected && filteredPool.length > 0) {
      const fallbackSelected = selectFromTopCandidates(filteredPool, 1); // Pick the top scoring one from the full pool
      log("chooseCandidateFallback", { dayIndex, chosenId: fallbackSelected?.id });
      return fallbackSelected;
    }

    return selected;
  };

  // trySwapMeal improved: prefer targeted pools (highProtein) and embedding fallback
  const trySwapMealImproved = (dayPlan, mealIndex, poolsMap, dayIdx, dailyTotals, reason) => {
    const current = dayPlan.meals[mealIndex];
    if (!current || !current.type) return false;
    const type = current.type;
    const pool = poolsMap[type] || [];
    if (!pool.length) return false;

    // Candidate order: high protein (if reason is protein), then by score, then embedding-similar
    const candidates = [...pool];
    if (reason === "protein" && highProteinByType[type]?.length) {
      candidates.unshift(...highProteinByType[type].filter((d) => !candidates.includes(d)));
    }

    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i];
      if (!candidate) continue;
      const candId = String(candidate.id);
      const candUsed = usedHistory.counts[candId] || 0;
      if (candUsed >= maxRepeatsPerWeek) continue;
      const last = usedHistory.lastUsedDay[candId];
      if (typeof last === "number" && dayIdx - last <= minDaysBetweenSameDish) continue;

      // attempt substitution
      const old = dayPlan.meals[mealIndex];
      dayPlan.meals[mealIndex] = { type: type, ...candidate };

      // recompute totals for the trial
      const trialTotals = dayPlan.meals.reduce(
        (acc, m) => {
          const n = calculateDishNutrition(m);
          return {
            calories: acc.calories + (n.calories || 0),
            protein: acc.protein + (n.protein || 0),
            carbs: acc.carbs + (n.carbs || 0),
            fat: acc.fat + (n.fat || 0),
          };
        },
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      );

      // Evaluate improvement depending on reason
      let accept = false;
      if (reason === "calorieReduce") {
        accept = trialTotals.calories < dailyTotals.calories;
      } else if (reason === "calorieIncrease") {
        accept = trialTotals.calories > dailyTotals.calories;
      } else if (reason === "protein") {
        accept = trialTotals.protein > dailyTotals.protein;
      } else {
        // general accept if closer to daily target
        const oldDelta = Math.abs(dailyTotals.calories - targetDailyCalories);
        const newDelta = Math.abs(trialTotals.calories - targetDailyCalories);
        accept = newDelta < oldDelta;
      }

      if (accept) {
        // update usage history
        usedHistory.counts[String(old.id)] = Math.max(0, (usedHistory.counts[String(old.id)] || 1) - 1);
        usedHistory.lastUsedDay[String(old.id)] = undefined;

        usedHistory.counts[candId] = (usedHistory.counts[candId] || 0) + 1;
        usedHistory.lastUsedDay[candId] = dayIdx;

        log("swapAccepted", { dayIdx, type, swappedOut: old.id, swappedIn: candidate.id, reason });
        return { accepted: true, newTotals: trialTotals };
      } else {
        // revert
        dayPlan.meals[mealIndex] = old;
      }
    }

    // embedding fallback: try to find a similar dish to the current from the pool
    const similar = getSimilarDishByEmbedding(current, pool);
    if (similar && String(similar.id) !== String(current.id)) {
      const candId = String(similar.id);
      const candUsed = usedHistory.counts[candId] || 0;
      if (candUsed >= maxRepeatsPerWeek) {
        log("embeddingSwapRejectedRepetition", { dayIdx, type, candidateId: candId, reason: "maxRepeatsPerWeek" });
        return { accepted: false }; // Cannot use similar due to max repeats
      }
      const last = usedHistory.lastUsedDay[candId];
      if (typeof last === "number" && dayIdx - last <= minDaysBetweenSameDish) {
        log("embeddingSwapRejectedRepetition", { dayIdx, type, candidateId: candId, reason: "minDaysBetweenSameDish" });
        return { accepted: false }; // Cannot use similar due to min days between
      }

      const old = dayPlan.meals[mealIndex];
      const candidate = similar;
      dayPlan.meals[mealIndex] = { type, ...candidate };
      const trialTotals = dayPlan.meals.reduce(
        (acc, m) => {
          const n = calculateDishNutrition(m);
          return {
            calories: acc.calories + (n.calories || 0),
            protein: acc.protein + (n.protein || 0),
            carbs: acc.carbs + (n.carbs || 0),
            fat: acc.fat + (n.fat || 0),
          };
        },
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      );
      // accept if it improves protein or reduces calories (depending)
      const accept = trialTotals.protein > dailyTotals.protein || trialTotals.calories < dailyTotals.calories;
      if (accept) {
        usedHistory.counts[String(old.id)] = Math.max(0, (usedHistory.counts[String(old.id)] || 1) - 1);
        usedHistory.lastUsedDay[String(old.id)] = undefined;
        usedHistory.counts[String(candidate.id)] = (usedHistory.counts[String(candidate.id)] || 0) + 1;
        usedHistory.lastUsedDay[String(candidate.id)] = dayIdx;
        log("embeddingSwapAccepted", { dayIdx, type, swappedOut: old.id, swappedIn: candidate.id });
        return { accepted: true, newTotals: trialTotals };
      } else {
        dayPlan.meals[mealIndex] = old;
      }
    }

    return { accepted: false };
  };

  // pick function similar to original but uses chooseCandidate
  const selectMealForType = (type, poolsMap, dayIdx, usedToday) => {
    const pool = poolsMap[type] || [];
    const candidate = chooseCandidate(pool, dayIdx, usedToday);
    if (!candidate) {
      return { name: "Meal not found", ingredients: [] };
    }
    const id = String(candidate.id);
    usedHistory.counts[id] = (usedHistory.counts[id] || 0) + 1;
    usedHistory.lastUsedDay[id] = dayIdx;

    // Calculate suggested serving size using the new helper function
    const suggestedServingSize = calculateRecommendedServingSize(
      candidate,
      targetPerMealCalories,
      targetPerMealProtein,
      targetPerMealCarbs,
      targetPerMealFats,
      userGoal
    );

    return { ...candidate, servingSize: suggestedServingSize };
  };

  // Assemble pools map for selection and swapping
  const poolsMap = {
    Breakfast: breakfastPool,
    Lunch: lunchPool,
    Dinner: dinnerPool,
    Snack: snackPool,
  };

  // Build the weekly plan (first pass greedy)
  const weeklyPlan = [];
  for (let dayIdx = 0; dayIdx < timeframe; dayIdx++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + dayIdx);
    const dateISO = `${currentDate.getFullYear()}-${String(
      currentDate.getMonth() + 1
    ).padStart(2, "0")}-${String(currentDate.getDate()).padStart(2, "0")}`;

    const dayPlan = { day: `Day ${dayIdx + 1}`, date: dateISO, meals: [] };
    const usedToday = new Set();

    // primary meals
    const breakfast = selectMealForType("Breakfast", poolsMap, dayIdx, usedToday);
    if (breakfast.id) usedToday.add(String(breakfast.id));
    dayPlan.meals.push({ type: "Breakfast", ...breakfast });

    const lunch = selectMealForType("Lunch", poolsMap, dayIdx, usedToday);
    if (lunch.id) usedToday.add(String(lunch.id));
    dayPlan.meals.push({ type: "Lunch", ...lunch });

    const dinner = selectMealForType("Dinner", poolsMap, dayIdx, usedToday);
    if (dinner.id) usedToday.add(String(dinner.id));
    dayPlan.meals.push({ type: "Dinner", ...dinner });

    // optional snacks based on mealsPerDay
    if (mealsPerDay > 3) {
      const extraSnacks = mealsPerDay - 3;
      for (let s = 0; s < extraSnacks; s++) {
        const snack = selectMealForType("Snack", poolsMap, dayIdx + s, usedToday);
        if (snack.id) usedToday.add(String(snack.id));
        dayPlan.meals.push({ type: "Snack", ...snack });
      }
    }

    // compute day totals
    const computeTotals = (mealsArray) =>
      mealsArray.reduce(
        (totals, meal) => {
          const nutrition = calculateDishNutrition(meal);
          return {
            calories: totals.calories + (nutrition.calories || 0),
            protein: totals.protein + (nutrition.protein || 0),
            carbs: totals.carbs + (nutrition.carbs || 0),
            fat: totals.fat + (nutrition.fat || 0),
          };
        },
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      );

    let dailyTotals = computeTotals(dayPlan.meals);

    // try to fix obvious deficits/excesses with improved swap logic
    const calTolerance = 0.15;
    const needsCalorieReduction = dailyTotals.calories > targetDailyCalories * (1 + calTolerance);
    const needsCalorieIncrease = dailyTotals.calories < targetDailyCalories * (1 - calTolerance);
    const needsProteinBoost = dailyTotals.protein < Math.max(10, targetDailyProtein * 0.85);

    if (needsCalorieReduction) {
      // pick highest calorie meal index and try swap
      let highestIdx = 0;
      let highestCal = -1;
      for (let m = 0; m < dayPlan.meals.length; m++) {
        const n = calculateDishNutrition(dayPlan.meals[m]);
        if ((n.calories || 0) > highestCal) {
          highestCal = n.calories || 0;
          highestIdx = m;
        }
      }
      const res = trySwapMealImproved(dayPlan, highestIdx, poolsMap, dayIdx, dailyTotals, "calorieReduce");
      if (res.accepted) dailyTotals = res.newTotals;
    }

    if (needsCalorieIncrease) {
      let lowestIdx = 0;
      let lowestCal = Infinity;
      for (let m = 0; m < dayPlan.meals.length; m++) {
        const n = calculateDishNutrition(dayPlan.meals[m]);
        if ((n.calories || 0) < lowestCal) {
          lowestCal = n.calories || 0;
          lowestIdx = m;
        }
      }
      const res = trySwapMealImproved(dayPlan, lowestIdx, poolsMap, dayIdx, dailyTotals, "calorieIncrease");
      if (res.accepted) dailyTotals = res.newTotals;
    }

    if (needsProteinBoost) {
      // try to boost protein starting from dinners then lunch then breakfast
      const order = ["Dinner", "Lunch", "Breakfast", "Snack"];
      for (const type of order) {
        const mIdx = dayPlan.meals.findIndex((m) => m.type === type);
        if (mIdx >= 0) {
          const res = trySwapMealImproved(dayPlan, mIdx, poolsMap, dayIdx, dailyTotals, "protein");
          if (res.accepted) {
            dailyTotals = res.newTotals;
            break;
          }
        }
      }
    }

    // finalize totals
    dayPlan.totals = dailyTotals;
    weeklyPlan.push(dayPlan);
    log("dayConstructed", { dayIdx, dateISO, totals: dailyTotals });
  }

  // ----- Second pass: weekly optimizer to smooth totals across days -----
  const computeWeeklyTotals = (plan) =>
    plan.reduce(
      (acc, day) => ({
        calories: acc.calories + (day.totals?.calories || 0),
        protein: acc.protein + (day.totals?.protein || 0),
        carbs: acc.carbs + (day.totals?.carbs || 0),
        fat: acc.fat + (day.totals?.fat || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

  const weeklyTotals = computeWeeklyTotals(weeklyPlan);
  const targetWeeklyProtein = (profile.protein_needed || 0) * (timeframe / (profile.timeframe || timeframe));
  log("weeklyBeforeOptimize", { weeklyTotals, targetWeeklyProtein });

  // If weekly protein is too low, try targeted swaps across days
  const weeklyProteinShortfall = targetWeeklyProtein ? targetWeeklyProtein - weeklyTotals.protein : 0;
  if (weeklyProteinShortfall > Math.max(5, targetWeeklyProtein * 0.05)) {
    // Attempt to upgrade some days by replacing one meal with a high-protein alternative from the day's pools
    for (let dayIdx = 0; dayIdx < weeklyPlan.length; dayIdx++) {
      if (weeklyTotals.protein >= targetWeeklyProtein) break;
      const dayPlan = weeklyPlan[dayIdx];
      // look for a meal that can be improved (Dinner -> Lunch -> Breakfast)
      const order = ["Dinner", "Lunch", "Breakfast", "Snack"];
      for (const type of order) {
        const mIdx = dayPlan.meals.findIndex((m) => m.type === type);
        if (mIdx < 0) continue;
        const pool = highProteinByType[type] || [];
        if (!pool.length) continue;
        // try to swap in the highest-protein that respects repetition constraints
        for (const candidate of pool) {
          const candId = String(candidate.id);
          const usedCount = usedHistory.counts[candId] || 0;
          if (usedCount >= maxRepeatsPerWeek) continue;
          const last = usedHistory.lastUsedDay[candId];
          if (typeof last === "number" && dayIdx - last <= minDaysBetweenSameDish) continue;

          const old = dayPlan.meals[mIdx];
          dayPlan.meals[mIdx] = { type, ...candidate };

          // recompute day totals and weekly totals
          dayPlan.totals = dayPlan.meals.reduce(
            (acc, m) => {
              const n = calculateDishNutrition(m);
              return {
                calories: acc.calories + (n.calories || 0),
                protein: acc.protein + (n.protein || 0),
                carbs: acc.carbs + (n.carbs || 0),
                fat: acc.fat + (n.fat || 0),
              };
            },
            { calories: 0, protein: 0, carbs: 0, fat: 0 }
          );

          // recompute weekly totals
          const newWeeklyTotals = computeWeeklyTotals(weeklyPlan);
          if (newWeeklyTotals.protein > weeklyTotals.protein) {
            // accept
            usedHistory.counts[String(old.id)] = Math.max(0, (usedHistory.counts[String(old.id)] || 1) - 1);
            usedHistory.lastUsedDay[String(old.id)] = undefined;
            usedHistory.counts[candId] = (usedHistory.counts[candId] || 0) + 1;
            usedHistory.lastUsedDay[candId] = dayIdx;

            log("weeklyProteinSwap", { dayIdx, replaced: old.id, with: candidate.id });
            // update weeklyTotals to reflect accepted change
            weeklyTotals.protein = newWeeklyTotals.protein;
            break;
          } else {
            // revert
            dayPlan.meals[mIdx] = old;
            dayPlan.totals = dayPlan.meals.reduce(
              (acc, m) => {
                const n = calculateDishNutrition(m);
                return {
                  calories: acc.calories + (n.calories || 0),
                  protein: acc.protein + (n.protein || 0),
                  carbs: acc.carbs + (n.carbs || 0),
                  fat: acc.fat + (n.fat || 0),
                };
              },
              { calories: 0, protein: 0, carbs: 0, fat: 0 }
            );
          }
        }
        if (weeklyTotals.protein >= targetWeeklyProtein) break;
      }
    }
  }

  log("weeklyAfterOptimize", { weeklyTotals });

  return {
    start_date: profile.plan_start_date,
    end_date: profile.plan_end_date,
    plan: weeklyPlan,
    // attach plannerLog for debug consumers — if you prefer not to ship logs, remove this field
    _plannerLog: plannerLog,
  };
};
// ----- END REPLACEMENT -----


// backward-compatible alias matching the import in pages/mealplan.jsx
export const createSmarterWeeklyMealPlan = createSmartWeeklyMealPlan;

export const formatDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) return null;
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return {
      start: start.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }),
      end: end.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }),
    };
  } catch (error) {
    console.error("Error formatting dates:", error);
    return null;
  }
};
