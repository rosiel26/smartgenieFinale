export const calculateDishNutrition = (dish) => {
  const ingredients = dish.ingredients_dish_id_fkey || dish.ingredients || [];
  if (!ingredients?.length) return { calories: 0, protein: 0, fat: 0, carbs: 0 };

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

  const baseline = dish.amountBaseUnit || 100;
  const scale = (dish.servingSize || baseline) / baseline;

  const scaledCalories = (dish.base_total_calories || 0) * scale;
  const scaledProtein = (dish.base_total_protein || 0) * scale;
  const scaledCarbs = (dish.base_total_carbs || 0) * scale;
  const scaledFats = (dish.base_total_fats || 0) * scale;

  let deltaCalories = 0;
  let deltaProtein = 0;
  let deltaCarbs = 0;
  let deltaFats = 0;

  const ingredients = dish.ingredients_dish_id_fkey || [];
  for (const ing of ingredients) {
    const storedAmount = ing.storedAmount || 0;
    const caloriesPerGram = ing.caloriesPerGram || 0;
    const proteinPerGram = ing.proteinPerGram || 0;
    const carbsPerGram = ing.carbsPerGram || 0;
    const fatsPerGram = ing.fatsPerGram || 0;

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

  return {
    calories: +(scaledCalories + deltaCalories).toFixed(2),
    protein: +(scaledProtein + deltaProtein).toFixed(2),
    carbs: +(scaledCarbs + deltaCarbs).toFixed(2),
    fats: +(scaledFats + deltaFats).toFixed(2),
  };
};

export const isDesktop = () => {
  if (typeof navigator === "undefined") {
    return true; // Assume desktop for SSR or non-browser environments
  }
  return !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

export const getCurrentMealType = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return "Breakfast";
  }
  if (hour >= 12 && hour < 17) {
    return "Lunch";
  }
  if (hour >= 17 || hour < 5) {
    return "Dinner";
  }
  return "Snack"; // Default or fallback
};