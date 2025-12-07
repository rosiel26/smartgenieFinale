import { supabase } from "../supabaseClient";

// Helper to get the start and end of the current day in UTC for querying
const getTodayDateRange = () => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return { startOfDay: startOfDay.toISOString(), endOfDay: endOfDay.toISOString() };
};


/**
 * Logs a meal and generates a supportive suggestion based on the user's macro targets.
 *
 * @param {object} mealData - The data for the meal to be logged.
 * @param {boolean} forceAdd - If true, add the meal even if duplicate exists.
 * @returns {Promise<{success: boolean, suggestion: string, newMeal: object | null, isDuplicate?: boolean, existingMeal?: object}>} A promise that resolves to an object with success status, a suggestion string, and the newly logged meal. If duplicate, includes isDuplicate and existingMeal.
 */
export async function logMealAndGetSuggestion(mealData, forceAdd = false) {
  try {
    // 1. Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("Error fetching user:", userError);
      return { success: false, suggestion: "Could not get user.", newMeal: null };
    }

    const mealToLog = { ...mealData, user_id: user.id };


    // 2. Check for existing meal with same dish_name (normalized), meal_type, and meal_date
    const dishNameForCheck = mealData.dish_name.replace(" with rice", "");
    const { data: existingMeals, error: checkError } = await supabase
      .from("meal_logs")
      .select("*")
      .eq("user_id", user.id)
      .eq("meal_type", mealData.meal_type)
      .eq("meal_date", mealData.meal_date);

    if (checkError) {
      console.error("Error checking for duplicates:", checkError);
      return { success: false, suggestion: "There was an error checking for duplicates.", newMeal: null };
    }

    // Find if any existing meal has the same normalized dish name
    const existingMeal = existingMeals?.find(meal =>
      meal.dish_name.replace(" with rice", "") === dishNameForCheck
    );

    if (existingMeal && !forceAdd) {
      // Duplicate found, return info for prompt
      return {
        success: false,
        suggestion: "Duplicate meal found.",
        newMeal: null,
        isDuplicate: true,
        existingMeal: existingMeal,
        newMealData: mealToLog
      };
    }

    // 3. Insert the new meal and get it back
    const { data: newMeal, error: insertError } = await supabase.from("meal_logs").insert(mealToLog).select().single();

    if (insertError) {
      console.error("Error logging meal:", insertError);
      return { success: false, suggestion: "There was an error logging your meal.", newMeal: null };
    }

    // 3. Fetch user's health profile for macro targets
    const { data: profile, error: profileError } = await supabase
      .from("health_profiles")
      .select("calorie_needs, protein_needed, fats_needed, carbs_needed")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      console.error("Error fetching profile, or profile not found:", profileError);
      return { success: true, suggestion: "Your meal is logged! Set up your health profile for personalized feedback.", newMeal };
    }

    // 4. Fetch all of the user's meal_logs for the current day
    const { startOfDay, endOfDay } = getTodayDateRange();
    const { data: todaysMeals, error: mealsError } = await supabase
      .from("meal_logs")
      .select("calories, protein, fat, carbs")
      .eq("user_id", user.id)
      .gte("meal_date", startOfDay)
      .lt("meal_date", endOfDay);

    if (mealsError) {
      console.error("Error fetching today's meals:", mealsError);
      return { success: true, suggestion: "Your meal has been logged successfully.", newMeal }; // Fail gracefully
    }
    
    // 5. Calculate total macros consumed today
    const totals = todaysMeals.reduce(
      (acc, meal) => ({
        calories: acc.calories + (meal.calories || 0),
        protein: acc.protein + (meal.protein || 0),
        fat: acc.fat + (meal.fat || 0),
        carbs: acc.carbs + (meal.carbs || 0),
      }),
      { calories: 0, protein: 0, fat: 0, carbs: 0 }
    );

    // 6. Generate a suggestion
    const { calorie_needs, protein_needed, fats_needed, carbs_needed } = profile;
    
    const calorieRatio = totals.calories / calorie_needs;
    const proteinRatio = totals.protein / protein_needed;
    const fatRatio = totals.fat / fats_needed;
    const carbRatio = totals.carbs / carbs_needed;

    let suggestion = "Great job logging your meal! You're on your way to hitting your goals.";

    if (calorieRatio > 1.2 || proteinRatio > 1.2 || fatRatio > 1.2 || carbRatio > 1.2) {
        let exceededMacro = "";
        if (calorieRatio > 1.2) exceededMacro = "calories";
        else if (proteinRatio > 1.2) exceededMacro = "protein";
        else if (fatRatio > 1.2) exceededMacro = "fat";
        else if (carbRatio > 1.2) exceededMacro = "carbs";
        
        suggestion = `You've exceeded your ${exceededMacro} target for the day. For your next meal, consider something lighter to balance it out.`;
    } else if (calorieRatio >= 0.8 && proteinRatio >= 0.8 && fatRatio >= 0.8 && carbRatio >= 0.8) {
        suggestion = "Amazing! You're hitting all your macro targets. Keep up the fantastic work!";
    } else if (calorieRatio < 0.5 || proteinRatio < 0.5 || fatRatio < 0.5 || carbRatio < 0.5) {
        suggestion = "You're a bit low on your targets for the day. Remember to fuel your body! A nutrient-rich snack could be a great idea.";
    }

    return { success: true, suggestion, newMeal };

  } catch (error) {
    console.error("An unexpected error occurred in logMealAndGetSuggestion:", error);
    return { success: false, suggestion: "Your meal has been logged, but we couldn't generate a suggestion right now.", newMeal: null };
  }
}

/**
 * Combines a new meal with an existing meal by adding nutritional values.
 *
 * @param {object} existingMeal - The existing meal to update.
 * @param {object} newMealData - The new meal data to combine.
 * @returns {Promise<{success: boolean, suggestion: string, updatedMeal: object | null}>}
 */
export async function combineMeals(existingMeal, newMealData) {
  try {
    // 1. Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("Error fetching user:", userError);
      return { success: false, suggestion: "Could not get user.", updatedMeal: null };
    }

    // 2. Combine nutritional values
    const combined = {
      calories: (existingMeal.calories || 0) + (newMealData.calories || 0),
      protein: (existingMeal.protein || 0) + (newMealData.protein || 0),
      carbs: (existingMeal.carbs || 0) + (newMealData.carbs || 0),
      fat: (existingMeal.fat || 0) + (newMealData.fat || 0),
    };

    // 3. Update serving label to indicate combined
    const existingServing = existingMeal.serving_label || "";
    const newServing = newMealData.serving_label || "";
    let combinedServing = existingServing;
    if (newServing) {
      combinedServing = existingServing ? `${existingServing} + ${newServing}` : newServing;
    }

    // 4. Update the existing meal
    const { data: updatedMeal, error: updateError } = await supabase
      .from("meal_logs")
      .update({
        calories: combined.calories,
        protein: combined.protein,
        carbs: combined.carbs,
        fat: combined.fat,
        serving_label: combinedServing,
      })
      .eq("id", existingMeal.id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating combined meal:", updateError);
      return { success: false, suggestion: "There was an error combining the meals.", updatedMeal: null };
    }

    // 5. Generate suggestion for combined meal
    const { data: profile, error: profileError } = await supabase
      .from("health_profiles")
      .select("calorie_needs, protein_needed, fats_needed, carbs_needed")
      .eq("user_id", user.id)
      .single();

    let suggestion = "Meals combined successfully!";

    if (profile && !profileError) {
      const { startOfDay, endOfDay } = getTodayDateRange();
      const { data: todaysMeals, error: mealsError } = await supabase
        .from("meal_logs")
        .select("calories, protein, fat, carbs")
        .eq("user_id", user.id)
        .gte("meal_date", startOfDay)
        .lt("meal_date", endOfDay);

      if (!mealsError && todaysMeals) {
        const totals = todaysMeals.reduce(
          (acc, meal) => ({
            calories: acc.calories + (meal.calories || 0),
            protein: acc.protein + (meal.protein || 0),
            fat: acc.fat + (meal.fat || 0),
            carbs: acc.carbs + (meal.carbs || 0),
          }),
          { calories: 0, protein: 0, fat: 0, carbs: 0 }
        );

        const { calorie_needs, protein_needed, fats_needed, carbs_needed } = profile;

        const calorieRatio = totals.calories / calorie_needs;
        const proteinRatio = totals.protein / protein_needed;
        const fatRatio = totals.fat / fats_needed;
        const carbRatio = totals.carbs / carbs_needed;

        if (calorieRatio > 1.2 || proteinRatio > 1.2 || fatRatio > 1.2 || carbRatio > 1.2) {
          let exceededMacro = "";
          if (calorieRatio > 1.2) exceededMacro = "calories";
          else if (proteinRatio > 1.2) exceededMacro = "protein";
          else if (fatRatio > 1.2) exceededMacro = "fat";
          else if (carbRatio > 1.2) exceededMacro = "carbs";

          suggestion = `Meals combined! You've exceeded your ${exceededMacro} target for the day. For your next meal, consider something lighter to balance it out.`;
        } else if (calorieRatio >= 0.8 && proteinRatio >= 0.8 && fatRatio >= 0.8 && carbRatio >= 0.8) {
          suggestion = "Meals combined! Amazing! You're hitting all your macro targets. Keep up the fantastic work!";
        } else if (calorieRatio < 0.5 || proteinRatio < 0.5 || fatRatio < 0.5 || carbRatio < 0.5) {
          suggestion = "Meals combined! You're a bit low on your targets for the day. Remember to fuel your body! A nutrient-rich snack could be a great idea.";
        }
      }
    }

    return { success: true, suggestion, updatedMeal };

  } catch (error) {
    console.error("An unexpected error occurred in combineMeals:", error);
    return { success: false, suggestion: "Meals could not be combined right now.", updatedMeal: null };
  }
}
