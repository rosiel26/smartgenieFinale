  export const calculateDishNutrition = (dish) => {
    const ingredients = dish.ingredients_dish_id_fkey || dish.ingredients || [];
    if (!ingredients?.length)
      return { calories: 0, protein: 0, fat: 0, carbs: 0 };

    return ingredients.reduce(
      (totals, ingredient) => ({
        calories: totals.calories + (ingredient.calories || 0),
        protein: totals.protein + (ingredient.protein || 0),
        fat: totals.fat + (ingredient.fats || 0),
        carbs: totals.carbs + (ingredient.carbs || 0),
      }),
      { calories: 0, protein: 0, fat: 0, carbs: 0 }
    );
  };

  export const computeDishTotalsWithIngredientOverrides = (dish) => {
    if (!dish) return { calories: 0, protein: 0, carbs: 0, fats: 0 };
    // amountBaseUnit is the grams basis used for ingredient.baseAmount.
    // It can be 100 (per-100g) or the dish.default_serving if the DB stores
    // ingredient amounts per dish serving. Default to 100 if not present.
    const baseline = dish.amountBaseUnit || 100;
    const scale = (dish.servingSize || baseline) / baseline;

    // scaled dish totals from DB (per amountBaseUnit baseline)
    const scaledCalories = (dish.base_total_calories || 0) * scale;
    const scaledProtein = (dish.base_total_protein || 0) * scale;
    const scaledCarbs = (dish.base_total_carbs || 0) * scale;
    const scaledFats = (dish.base_total_fats || 0) * scale;

    // compute delta from ingredient overrides (only for ingredients with customAmount)
    let deltaCalories = 0;
    let deltaProtein = 0;
    let deltaCarbs = 0;
    let deltaFats = 0;

    const ingredients = dish.ingredients_dish_id_fkey || [];
    for (const ing of ingredients) {
      // storedAmount is the grams stored in DB for amountBaseUnit
      const storedAmount = ing.storedAmount || 0;
      const caloriesPerGram = ing.caloriesPerGram || 0;
      const proteinPerGram = ing.proteinPerGram || 0;
      const carbsPerGram = ing.carbsPerGram || 0;
      const fatsPerGram = ing.fatsPerGram || 0;

      // defaultDisplayAmount is how many grams of this ingredient are used
      // for the current servingSize based on the baseline unit.
      const defaultDisplayAmount = +(storedAmount * scale);

      // default contribution from this ingredient (for current serving)
      const defaultCalories = caloriesPerGram * defaultDisplayAmount;
      const defaultProtein = proteinPerGram * defaultDisplayAmount;
      const defaultCarbs = carbsPerGram * defaultDisplayAmount;
      const defaultFats = fatsPerGram * defaultDisplayAmount;

      if (ing.customAmount) {
        // custom amount is in grams for the ingredient in the current serving
        const customAmt = ing.amount || 0;
        const customCalories = caloriesPerGram * customAmt;
        const customProtein = proteinPerGram * customAmt;
        const customCarbs = carbsPerGram * customAmt;
        const customFats = fatsPerGram * customAmt;

        deltaCalories += customCalories - defaultCalories;
        deltaProtein += customProtein - defaultProtein;
        deltaCarbs += customCarbs - defaultCarbs;
        deltaFats += customFats - defaultFats;
      }
    }

    return {
      calories: +(scaledCalories + deltaCalories).toFixed(2),
      protein: +(scaledProtein + deltaProtein).toFixed(2),
      carbs: +(scaledCarbs + deltaCarbs).toFixed(2),
      fats: +(scaledFats + deltaFats).toFixed(2),
    };
  };

  export const markAddedMeals = (planObject, mealLog = []) => {
  if (!planObject?.plan || !Array.isArray(planObject.plan)) {
    return planObject || { plan: [], start_date: null, end_date: null };
  }
  if (!Array.isArray(mealLog)) {
    mealLog = [];
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const localDate = today.toISOString().split("T")[0];

  const updatedPlanArray = planObject.plan.map((day) => {
    const meals = (day.meals || []).map((meal) => {
      const idNum = Number(meal?.id);
      const mealScheduledDate = day.date;

      const isAdded = mealLog.some(
        (m) =>
          Number(m.dish_id) === idNum &&
          m.meal_type === meal.type &&
          m.meal_date === mealScheduledDate
      );

      let status = "pending";
      if (isAdded) {
        status = "added";
      } else if (new Date(mealScheduledDate) < today) {
        status = "missed";
      }

      return { ...(meal || {}), status, meal_date: mealScheduledDate };
    });
    return { ...day, meals };
  });

  return { ...planObject, plan: updatedPlanArray };
};

  export const prepareDishForModal = (dish) => {
    // Determine whether ingredient.amount values are stored per 100g of dish
    // or per the dish.default_serving. We infer this by summing raw amounts
    // and seeing which baseline (100 or default_serving) is closer.
    const rawIngredients = dish.ingredients_dish_id_fkey || [];
    const sumBase = rawIngredients.reduce((s, i) => s + (i.amount || 0), 0);

    const defaultServing = 100; // UI default baseline
    let amountBaseUnit = 100;
    if (dish.default_serving) {
      if (Math.abs(sumBase - dish.default_serving) < Math.abs(sumBase - 100)) {
        amountBaseUnit = dish.default_serving;
      }
    }

    // If caller already provided an amountBaseUnit prefer it
    if (dish.amountBaseUnit) amountBaseUnit = dish.amountBaseUnit;

    const servingSize = dish.servingSize || defaultServing;

    console.debug(
      "prepareDishForModal - rawIngredients:",
      rawIngredients,
      "amountBaseUnit:",
      amountBaseUnit,
      "servingSize:",
      servingSize
    );
    // Interpret the DB ingredient fields (calories/protein/carbs/fats) as the
    // total contribution for the stored ingredient amount (`amount`). To keep
    // the modal totals identical to the daily totals (which sum raw
    // ingredient contribution fields), compute per-gram rates from the DB
    // contribution and use those to scale when serving size changes or when
    // the user edits an ingredient (rice).
    const ingredients = rawIngredients.map((ing) => {
      const storedAmount = ing.amount || 0; // grams stored in DB for the ingredient (per amountBaseUnit)
      const totalCaloriesForStored = ing.calories || 0; // contribution for storedAmount
      const totalProteinForStored = ing.protein || 0;
      const totalCarbsForStored = ing.carbs || 0;
      const totalFatsForStored = ing.fats || 0;

      // per-gram contribution rates (guard against divide-by-zero)
      const caloriesPerGram =
        storedAmount > 0 ? totalCaloriesForStored / storedAmount : 0;
      const proteinPerGram =
        storedAmount > 0 ? totalProteinForStored / storedAmount : 0;
      const carbsPerGram =
        storedAmount > 0 ? totalCarbsForStored / storedAmount : 0;
      const fatsPerGram =
        storedAmount > 0 ? totalFatsForStored / storedAmount : 0;

      // Additional safety check for NaN values
      if (isNaN(caloriesPerGram) || !isFinite(caloriesPerGram)) {
        console.warn(
          `Invalid nutrition data for ingredient ${ing.name}: storedAmount=${storedAmount}`
        );
      }

      // Compute displayed ingredient amount for current servingSize using amountBaseUnit
      const displayAmount = +(
        storedAmount *
        (servingSize / amountBaseUnit)
      ).toFixed(2);

      // Contribution for the displayed amount (using per-gram rates)
      const displayCalories = +(caloriesPerGram * displayAmount).toFixed(2);
      const displayProtein = +(proteinPerGram * displayAmount).toFixed(2);
      const displayCarbs = +(carbsPerGram * displayAmount).toFixed(2);
      const displayFats = +(fatsPerGram * displayAmount).toFixed(2);

      return {
        ...ing,
        // store the DB raw storedAmount and total contribution values
        storedAmount,
        totalCaloriesForStored,
        totalProteinForStored,
        totalCarbsForStored,
        totalFatsForStored,
        // per-gram rates for easy recomputation
        caloriesPerGram,
        proteinPerGram,
        carbsPerGram,
        fatsPerGram,
        // amount and nutrient fields reflect the contribution for current servingSize
        amount: displayAmount,
        calories: displayCalories,
        protein: displayProtein,
        carbs: displayCarbs,
        fats: displayFats,
        customAmount: false,
      };
    });

    // Compute authoritative base dish totals from ingredients (per amountBaseUnit of dish)
    let base_total_calories = 0;
    let base_total_protein = 0;
    let base_total_carbs = 0;
    let base_total_fats = 0;

    // Sum the DB-provided contribution totals for the stored ingredient amounts
    // to create authoritative base totals for the dish (per amountBaseUnit).
    for (const ing of ingredients) {
      base_total_calories += ing.totalCaloriesForStored || 0;
      base_total_protein += ing.totalProteinForStored || 0;
      base_total_carbs += ing.totalCarbsForStored || 0;
      base_total_fats += ing.totalFatsForStored || 0;
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
      total_calories: +(base_total_calories * scale).toFixed(2),
      total_protein: +(base_total_protein * scale).toFixed(2),
      total_carbs: +(base_total_carbs * scale).toFixed(2),
      total_fats: +(base_total_fats * scale).toFixed(2),
      ingredients_dish_id_fkey: ingredients,
      db_raw_ingredients: rawIngredients,
    };
  };

  export const getSuggestedDishes = (profile, dishes, searchQuery = "") => {
    if (!profile || !dishes?.length) return [];

    // --- User preferences ---
    let userAllergens = (profile.allergens || []).map((a) =>
      a.toLowerCase().trim()
    );
    const userHealthConditions = (profile.health_conditions || []).map((hc) =>
      hc.toLowerCase().trim()
    );
    const userGoal = profile.goal?.toLowerCase().trim();
    const userEatingStyle = profile.eating_style?.toLowerCase().trim();

    const allergenMap = {
      meat: ["beef", "pork", "chicken", "turkey"],
      seafood: ["fish", "shellfish", "shrimp", "crab", "lobster", "squid"],
      dairy: ["milk", "cheese", "butter", "yogurt"],
    };

    // Expand allergens
    const expandedAllergens = new Set();
    for (const allergen of userAllergens) {
      expandedAllergens.add(allergen);
      if (allergenMap[allergen])
        allergenMap[allergen].forEach((a) => expandedAllergens.add(a));
    }
    userAllergens = Array.from(expandedAllergens);

    return dishes.filter((dish) => {
      // --- Dish allergens ---
      const ingredients =
        dish.ingredients_dish_id_fkey || dish.ingredients || [];
      const dishAllergens = Array.isArray(ingredients)
        ? ingredients.flatMap((ing) => {
            if (Array.isArray(ing.allergen_id)) {
              return ing.allergen_id.map((a) => a.name.toLowerCase().trim());
            }
            return ing.allergen_id?.name
              ? [ing.allergen_id.name.toLowerCase().trim()]
              : [];
          })
        : [];

      const dishIngredients = Array.isArray(ingredients)
        ? ingredients.map((i) => i.name?.toLowerCase().trim() || "")
        : [];

      // --- Dish health conditions ---
      let dishHealth = [];
      if (dish.health_condition) {
        if (Array.isArray(dish.health_condition)) {
          dishHealth = dish.health_condition.map((hc) =>
            hc.toLowerCase().trim()
          );
        } else if (typeof dish.health_condition === "string") {
          try {
            // Parse JSON array
            let cleaned = dish.health_condition
              .replace(/^\{/, "[")
              .replace(/\}$/, "]")
              .replace(/"/g, '"');
            const parsed = JSON.parse(cleaned);
            dishHealth = Array.isArray(parsed)
              ? parsed.map((hc) => hc.toLowerCase().trim())
              : [parsed.toLowerCase().trim()];
          } catch {
            dishHealth = [dish.health_condition.toLowerCase().trim()];
          }
        }
      }

      // --- Dish goals ---
      const dishGoals = Array.isArray(dish.goal)
        ? dish.goal.map((g) => g.toLowerCase().trim())
        : [];

      // --- Dish dietary / eating style ---
      const dishDietary = Array.isArray(dish.dietary)
        ? dish.dietary.map((d) => d.toLowerCase().trim())
        : [];

      const dishName = (dish.name || "").toLowerCase();
      const dishDescription = (dish.description || "").toLowerCase();

      // --- Filter by allergen ---
      const hasAllergen = userAllergens.some(
        (ua) =>
          dishAllergens.includes(ua) ||
          dishIngredients.includes(ua) ||
          dishIngredients.some((i) => i.includes(ua)) ||
          dishName.includes(ua) ||
          dishDescription.includes(ua)
      );
      if (hasAllergen) return false;

      // --- Filter by health conditions ---
      if (userHealthConditions.some((hc) => dishHealth.includes(hc)))
        return false;

      // --- Filter by goal ---
      // if (userGoal && dishGoals.length && !dishGoals.includes(userGoal))
      //   return false;

      // --- Filter by eating style ---
      if (
        userEatingStyle &&
        dishDietary.length &&
        !dishDietary.includes(userEatingStyle)
      )
        return false;

      // --- Search query ---
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (
          !dishName.includes(q) &&
          !dishIngredients.some((i) => i.includes(q))
        )
          return false;
      }

      return true;
    });
  };

export const createSmartWeeklyMealPlan = (profile, dishes) => {
  if (!dishes?.length || !profile) return [];

  const timeframe = Number(profile.timeframe) || 7;
  const mealsPerDay = Number(profile.meals_per_day) || 3;
  const targetCalories = (profile.calorie_needs || 0) / mealsPerDay;
  const targetProtein = (profile.protein_needed || 0) / mealsPerDay;
  const targetCarbs = (profile.carbs_needed || 0) / mealsPerDay;
  const targetFats = (profile.fats_needed || 0) / mealsPerDay;
  const userGoal = profile.goal?.toLowerCase().trim();

  // --- FIXED: Parse plan_start_date as local date to avoid UTC shift ---
  let startDate;
  if (profile.plan_start_date) {
    // Treat the incoming date string as UTC to avoid timezone issues
    startDate = new Date(profile.plan_start_date + 'T00:00:00Z');
  } else {
    const now = new Date();
    // For new plans, create a UTC date for today
    startDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  }

  // normalize startDate to UTC midnight
  startDate.setUTCHours(0, 0, 0, 0);

  const endDate = new Date(startDate);
  endDate.setUTCDate(startDate.getUTCDate() + timeframe - 1);
  endDate.setUTCHours(0, 0, 0, 0);

  // store back to profile (for saving to DB / localStorage)
  profile.plan_start_date = `${startDate.getUTCFullYear()}-${String(
    startDate.getUTCMonth() + 1
  ).padStart(2, "0")}-${String(startDate.getUTCDate()).padStart(2, "0")}`;
  profile.plan_end_date = `${endDate.getUTCFullYear()}-${String(
    endDate.getUTCMonth() + 1
  ).padStart(2, "0")}-${String(endDate.getUTCDate()).padStart(2, "0")}`;

  // --- Filter eligible dishes ---
  const eligibleDishes = getSuggestedDishes(profile, dishes);

  const hasMealType = (dish, type) => {
    if (!dish.meal_type) return false;
    const types = dish.meal_type
      .split(/[,|/]/)
      .map((t) => t.toLowerCase().trim());
    return types.includes(type.toLowerCase());
  };

  const scoreDish = (dish) => {
    const nutrition = calculateDishNutrition(dish);
    const calorieScore =
      1 - Math.abs(nutrition.calories - targetCalories) / targetCalories;
    const proteinScore =
      1 - Math.abs(nutrition.protein - targetProtein) / targetProtein;
    const carbsScore =
      1 - Math.abs(nutrition.carbs - targetCarbs) / targetCarbs;
    const fatsScore = 1 - Math.abs(nutrition.fat - targetFats) / targetFats;

    let weights = { calories: 1, protein: 1, carbs: 1, fats: 1 };
    if (userGoal?.includes("weight loss")) {
      weights = { calories: 1.5, protein: 1.2, carbs: 0.8, fats: 0.8 };
    } else if (userGoal?.includes("athletic")) {
      weights = { calories: 1, protein: 1.5, carbs: 1.2, fats: 0.8 };
    }

    return (
      (calorieScore * weights.calories +
        proteinScore * weights.protein +
        carbsScore * weights.carbs +
        fatsScore * weights.fats) /
      Object.values(weights).reduce((a, b) => a + b)
    );
  };

  const createMealPool = (type) =>
    eligibleDishes
      .filter((d) => hasMealType(d, type))
      .map((dish) => ({ ...dish, score: scoreDish(dish) }))
      .sort((a, b) => b.score - a.score);

  const breakfastPool = createMealPool("breakfast");
  const lunchPool = createMealPool("lunch");
  const dinnerPool = createMealPool("dinner");
  const snackPool = createMealPool("snack");

  // --- Build plan ---
  const weeklyPlan = [];

  for (let i = 0; i < timeframe; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);

    const dayPlan = {
      day: `Day ${i + 1}`,
      date: `${currentDate.getFullYear()}-${String(
        currentDate.getMonth() + 1
      ).padStart(2, "0")}-${String(currentDate.getDate()).padStart(2, "0")}`,
      meals: [],
    };

    const usedToday = new Set();

    const selectMeal = (pool, index) => {
      if (!pool?.length) return { name: "Meal not found", ingredients: [] };
      const available = pool.filter((d) => !usedToday.has(d.id));
      const meal = available[index % available.length] || pool[index % pool.length];
      if (meal?.id) usedToday.add(meal.id);
      return meal;
    };

    const breakfast = selectMeal(breakfastPool, i);
    const lunch = selectMeal(lunchPool, i);
    const dinner = selectMeal(dinnerPool, i);

    dayPlan.meals.push({ type: "Breakfast", ...breakfast });
    dayPlan.meals.push({ type: "Lunch", ...lunch });
    dayPlan.meals.push({ type: "Dinner", ...dinner });

    if (mealsPerDay > 3) {
      const snacks = Array(mealsPerDay - 3)
        .fill()
        .map((_, j) => ({ type: "Snack", ...selectMeal(snackPool, i + j) }));
      dayPlan.meals.push(...snacks);
    }

    // totals per day
    const dailyTotals = dayPlan.meals.reduce(
      (totals, meal) => {
        const nutrition = calculateDishNutrition(meal);
        return {
          calories: totals.calories + nutrition.calories,
          protein: totals.protein + nutrition.protein,
          carbs: totals.carbs + nutrition.carbs,
          fat: totals.fat + nutrition.fat,
        };
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
    dayPlan.totals = dailyTotals;

    weeklyPlan.push(dayPlan);
  }

  return {
    start_date: profile.plan_start_date,
    end_date: profile.plan_end_date,
    plan: weeklyPlan,
  };
};




  export const formatDateRange = (startDate, endDate) => {
    if (!startDate || !endDate) return null;
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      return {
        start: start.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        end: end.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
      };
    } catch (error) {
      console.error("Error formatting dates:", error);
      return null;
    }
  };
