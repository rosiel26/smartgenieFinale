import React, { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import FooterNav from "../components/FooterNav";
import MealDetailModal from "../components/MealDetailModal";
import NutritionProtocolDisplay from "../components/NutritionProtocolDisplay";
import MyStatusDisplay from "../components/MyStatusDisplay";
import SuggestedDishList from "../components/SuggestedDishList";
import DisclaimerModal from "../components/DisclaimerModal";
import RecentMealAndWorkoutLogs from "../components/RecentMealAndWorkoutLogs";
import {
  getBoholCities,
  recommendStoresForIngredients,
} from "../services/storeService";
import useWorkoutTypes from "../hooks/useWorkoutTypes";
import { isWorkoutSafe, calculateCaloriesBurned } from "../utils/workoutUtils";
import { logMealAndGetSuggestion } from "../services/mealService";
import TodaysExercise from "../components/TodaysExercise";
import AddWorkoutModal from "../components/AddWorkoutModal";
const PersonalDashboard = React.memo(function PersonalDashboard() {
  const [profile, setProfile] = useState(null);
  const [view, setView] = useState("nutrition-protocol");
  const [nutritionAdvice, setNutritionAdvice] = useState([]);
  const [dishes, setDishes] = useState([]);
  const [mealLog, setMealLog] = useState([]);
  const [weeklyPlan, setWeeklyPlan] = useState([]);
  const [workouts, setWorkouts] = useState([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successText, setSuccessText] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showMealModal, setShowMealModal] = useState(false);
  const [selectedDish, setSelectedDish] = useState(null);
  const [mealType, setMealType] = useState("");
  const [servingSize, setServingSize] = useState(100);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMealType, setSelectedMealType] = useState("");
  const [allergenOptions, setAllergenOptions] = useState([]);
  const [boholCities, setBoholCities] = useState([]);
  const [selectedCityId, setSelectedCityId] = useState("tagbilaran");
  const [storeTypeFilters, setStoreTypeFilters] = useState([]);
  const [storeRecommendations, setStoreRecommendations] = useState([]);

  // New state for workout feature
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [loading, setLoading] = useState(false);
  const [todaysLoggedWorkout, setTodaysLoggedWorkout] = useState(null);
  const [refreshRecentLogsTrigger, setRefreshRecentLogsTrigger] = useState(0);

  const workoutTypes = useWorkoutTypes();

  const radius = 52;
  const circumference = 2 * Math.PI * radius;

  const navigate = useNavigate();


  useEffect(() => {
    const checkUserAndDisclaimer = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate("/login", { replace: true });
        return;
      }

      // ✅ Show disclaimer only on first login or if last login > 1 day
      const lastLogin = localStorage.getItem("lastLoginTime");
      const now = new Date();

      let show = false;

      if (!lastLogin) {
        show = true; // first login ever
      } else {
        const last = new Date(lastLogin);
        const diffMs = now - last;
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        if (diffDays >= 1) show = true; // inactive >= 1 day
      }

      if (show) setShowDisclaimer(true);
    };

    checkUserAndDisclaimer();
  }, [navigate]);

  // -------------------- Fetch Data (Ultra-Optimized) --------------------
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        // Batch all database queries for better performance
        const [profileResult, mealResult, workoutResult, dishesResult] =
          await Promise.all([
            supabase
              .from("health_profiles")
              .select("*")
              .eq("user_id", user.id)
              .single(),
            supabase
              .from("meal_logs")
              .select("*")
              .eq("user_id", user.id)
              .order("meal_date", { ascending: true }),
            supabase
              .from("workouts")
              .select("calories_burned, fat_burned, carbs_burned")
              .eq("user_id", user.id),
            supabase.from("dishes").select(`
          id, name, description, default_serving, meal_type, goal,
          eating_style, health_condition, steps, image_url,
          ingredients_dish_id_fkey(
            id, name, amount, unit, calories, protein, fats, carbs, is_rice,allergen_id
          )
        `),
          ]);

        // Handle profile data
        if (!profileResult.error && profileResult.data) {
          setProfile(profileResult.data);
          setWeeklyPlan(profileResult.data.weekly_plan_json || null); // Set weeklyPlan
          setNutritionAdvice(generateNutritionAdvice(profileResult.data));
        } else {
          navigate("/profile");
          setProfile(null);
          setNutritionAdvice([]);
        }

        // Handle meal logs
        if (mealResult.error) {
        } else {
          setMealLog(mealResult.data || []);
        }

        // Handle workouts
        if (workoutResult.error) {
        } else {
          setWorkouts(workoutResult.data || []);
        }

        // Handle dishes and filter by health conditions
        if (dishesResult.error) {
        } else {
          // ❗ Don't pre-filter by health conditions here — keep all dishes
          setDishes(dishesResult.data || []);
        }
      } catch (error) {
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  useEffect(() => {
    // Log weeklyPlan after it's set
    if (weeklyPlan) {
      // console.log("Weekly Plan after set:", weeklyPlan);
    }
  }, [weeklyPlan]); // Add weeklyPlan to dependencies
  useEffect(() => {
    const fetchAllergens = async () => {
      const { data, error } = await supabase.from("allergens").select("*");
      if (!error && data) setAllergenOptions(data);
    };
    fetchAllergens();
  }, []);

  useEffect(() => {
    (async () => {
      const cities = await getBoholCities();
      setBoholCities(cities || []);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!selectedDish) {
        setStoreRecommendations([]);
        return;
      }
      const ings = selectedDish.ingredients_dish_id_fkey || [];
      const recs = await recommendStoresForIngredients(ings, selectedCityId, {
        onlyTypes: storeTypeFilters,
      });
      setStoreRecommendations(recs || []);
    })();
  }, [selectedDish, selectedCityId, storeTypeFilters]);

  const userAllergenIds = useMemo(() => {
    return (profile?.allergens || [])
      .map((name) => {
        const match = allergenOptions.find(
          (a) => a.name.toLowerCase().trim() === name.toLowerCase().trim()
        );
        return match?.id;
      })
      .filter(Boolean); // only valid IDs
  }, [profile?.allergens, allergenOptions]);

  // -------------------- Nutrition Advice --------------------
  const generateNutritionAdvice = (profile) => {
    const advice = [];

    if (profile.weight_kg && profile.height_cm) {
      const bmi = (profile.weight_kg / (profile.height_cm / 100) ** 2).toFixed(
        1
      );
      if (bmi < 18.5)
        advice.push(
          "You're underweight. Increase calorie intake with nutrient-dense foods."
        );
      else if (bmi >= 25 && bmi < 30)
        advice.push(
          "You're overweight. Consider a calorie deficit with more whole foods."
        );
      else if (bmi >= 30)
        advice.push(
          "Obesity risk detected. Focus on calorie control and regular exercise."
        );
      else
        advice.push(
          "Your BMI is in a healthy range. Maintain with balanced meals."
        );
    }

    if (profile.allergens?.length)
      advice.push(`Avoid foods containing: ${profile.allergens.join(", ")}.`);

    advice.push("Stay consistent with sleep (7–9 hours) to support recovery.");
    advice.push("Drink at least 2–3 liters of water daily.");

    return advice;
  };

  // -------------------- Totals (Memoized for Performance) --------------------
  const nutritionTotals = useMemo(() => {
    if (!profile) return {};

    // ✅ Helper to safely parse numbers
    const parseSafe = (val, fallback = 0) => {
      const num = parseFloat(val);
      return isFinite(num) && !isNaN(num) ? num : fallback;
    };

    // ✅ Use derived values as fallback
    const dailyCalories = parseSafe(profile.calorie_needs);
    const dailyFats = parseSafe(profile.fats_needed);
    const dailyCarbs = parseSafe(profile.carbs_needed);
    const dailyProtein = parseSafe(profile.protein_needed);
    const timeframeDays = parseSafe(profile.timeframe, 1);

    // ✅ Calculate totals for the timeframe
    const totalCalories = dailyCalories * timeframeDays;
    const totalFats = dailyFats * timeframeDays;
    const totalProtein = dailyProtein * timeframeDays;
    const totalCarbs = dailyCarbs * timeframeDays;

    // ✅ Compute consumed totals (from meals)
    const consumedTotals = mealLog.reduce(
      (acc, meal) => ({
        calories: acc.calories + parseSafe(meal.calories),
        protein: acc.protein + parseSafe(meal.protein),
        fats: acc.fats + parseSafe(meal.fat),
        carbs: acc.carbs + parseSafe(meal.carbs),
      }),
      { calories: 0, protein: 0, fats: 0, carbs: 0 }
    );

    // ✅ Compute burned totals (from workouts)
    const burnedTotals = workouts.reduce(
      (acc, workout) => ({
        calories: acc.calories + parseSafe(workout.calories_burned),
        fats: acc.fats + parseSafe(workout.fat_burned),
        carbs: acc.carbs + parseSafe(workout.carbs_burned),
      }),
      { calories: 0, fats: 0, carbs: 0 }
    );

    // ✅ Combine totals
    const netTotals = {
      calories: consumedTotals.calories + burnedTotals.calories,
      protein: consumedTotals.protein,
      fats: consumedTotals.fats + burnedTotals.fats,
      carbs: consumedTotals.carbs + burnedTotals.carbs,
    };

    // ✅ Remaining (goal - used)
    const remainingTotals = {
      calories: totalCalories - netTotals.calories,
      protein: totalProtein - netTotals.protein,
      fats: totalFats - netTotals.fats,
      carbs: totalCarbs - netTotals.carbs,
    };

    // ✅ Progress %
    const progressPercent = totalCalories
      ? Math.min(100, Math.round((netTotals.calories / totalCalories) * 100))
      : 0;

    // ✅ Round all final numbers to prevent weird decimals (like 174.1700000002)
    const roundAll = (obj) =>
      Object.fromEntries(
        Object.entries(obj).map(([key, val]) => [key, Math.round(val)])
      );

    return {
      dailyCalories: Math.round(dailyCalories),
      dailyFats: Math.round(dailyFats),
      dailyCarbs: Math.round(dailyCarbs),
      dailyProtein: Math.round(dailyProtein),

      totalCalories: Math.round(totalCalories),
      totalFats: Math.round(totalFats),
      totalProtein: Math.round(totalProtein),
      totalCarbs: Math.round(totalCarbs),

      consumedTotals: roundAll(consumedTotals),
      netTotals: roundAll(netTotals),
      remainingTotals: roundAll(remainingTotals),
      progressPercent,
    };
  }, [profile, mealLog, workouts]);

  // Destructure for easier access
  const {
    dailyCalories = 0,
    dailyFats = 0,
    dailyCarbs = 0,
    dailyProtein = 0,
    totalCalories = 0,
    totalFats = 0,
    totalProtein = 0,
    totalCarbs = 0,
    consumedTotals = { calories: 0, protein: 0, fats: 0, carbs: 0 },
    netTotals = { calories: 0, protein: 0, fats: 0, carbs: 0 },
    remainingTotals = { calories: 0, protein: 0, fats: 0, carbs: 0 },
    progressPercent = 0,
  } = nutritionTotals;

  // -------------------- Format Date Helper (Memoized) --------------------
  const formatDate = useCallback((date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  // -------------------- Chart Data (Ultra-Optimized) --------------------
  const chartData = useMemo(() => {
    if (!mealLog.length) return [];

    // Group meals by date for faster lookup
    const mealsByDate = mealLog.reduce((acc, meal) => {
      const dateKey = meal.meal_date;
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(meal);
      return acc;
    }, {});

    const startDate = new Date(mealLog[0].meal_date);
    const endDate = new Date(mealLog[mealLog.length - 1].meal_date);

    // Limit chart data to last 30 days for better performance
    const maxDays = 30;
    const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const actualEndDate =
      daysDiff > maxDays
        ? new Date(startDate.getTime() + maxDays * 24 * 60 * 60 * 1000)
        : endDate;

    const days = [];
    for (
      let d = new Date(startDate);
      d <= actualEndDate;
      d.setDate(d.getDate() + 1)
    ) {
      const dateStr = formatDate(new Date(d));
      const mealsOfDay = mealsByDate[dateStr] || [];

      // Pre-calculate totals to avoid multiple reduce calls
      let calories = 0,
        protein = 0,
        fats = 0,
        carbs = 0;
      for (const meal of mealsOfDay) {
        calories += meal.calories || 0;
        protein += meal.protein || 0;
        fats += meal.fat || 0;
        carbs += meal.carbs || 0;
      }

      days.push({
        date: dateStr,
        calories,
        protein,
        fats,
        carbs,
      });
    }
    return days;
  }, [mealLog, formatDate]);

  // -------------------- Suggested Dishes (Ultra-Optimized) --------------------
  const suggestedDishes = useMemo(() => {
    if (!profile || !dishes?.length || !allergenOptions?.length) return [];

    return dishes.map((dish) => {
      let recommended = true;

      // --- Allergens ---
      if (userAllergenIds.length && dish.ingredients_dish_id_fkey?.length) {
        const ingredientAllergenIds = dish.ingredients_dish_id_fkey
          .map((ing) => ing.allergen)
          .filter(Boolean);

        if (userAllergenIds.some((id) => ingredientAllergenIds.includes(id))) {
          recommended = false;
        }
      }

      // --- Health conditions ---
      const userHealthConditions = Array.isArray(profile.health_conditions)
        ? profile.health_conditions
            .map((h) => h.toLowerCase().trim())
            .filter(Boolean)
        : profile.health_conditions
        ? [profile.health_conditions.toLowerCase().trim()]
        : [];

      if (userHealthConditions.length && dish.health_condition) {
        const dishConditions = Array.isArray(dish.health_condition)
          ? dish.health_condition
              .map((c) => c?.toLowerCase().trim())
              .filter(Boolean)
          : dish.health_condition?.toLowerCase().trim()
          ? [dish.health_condition.toLowerCase().trim()]
          : [];
        if (dishConditions.some((c) => userHealthConditions.includes(c))) {
          recommended = false;
        }
      }

      // --- Goal ---
      const userGoal = profile.goal?.toLowerCase().trim() || "";
      if (userGoal && dish.goal) {
        const dishGoals = Array.isArray(dish.goal)
          ? dish.goal.map((g) => g.toLowerCase().trim()).filter(Boolean)
          : [dish.goal.toLowerCase().trim()];

        if (!dishGoals.some((g) => g.includes(userGoal))) recommended = false;
      }

      // --- Eating style ---
      const userEatingStyle = profile.eating_style?.toLowerCase().trim() || "";
      if (userEatingStyle && dish.eating_style) {
        const dishStyles = Array.isArray(dish.eating_style)
          ? dish.eating_style.map((s) => s.toLowerCase().trim()).filter(Boolean)
          : [dish.eating_style.toLowerCase().trim()];

        if (!dishStyles.some((s) => s.includes(userEatingStyle)))
          recommended = false;
      }

      return { ...dish, recommended };
    });
  }, [profile, dishes, allergenOptions]);

  // 2️⃣ Apply search filter
  const filteredDishes = useMemo(() => {
    if (!searchTerm?.trim()) return suggestedDishes;

    const query = searchTerm.toLowerCase().trim();
    if (query.length < 2) return suggestedDishes;

    return suggestedDishes.filter((dish) => {
      const dishName = dish.name?.toLowerCase() || "";
      const dishDescription = dish.description?.toLowerCase() || "";
      return dishName.includes(query) || dishDescription.includes(query);
    });
  }, [suggestedDishes, searchTerm]);

  const handleAddMeal = useCallback(
    async (
      dish,
      mealType,
      multiplier = 1,
      servingSize = 100,
      editableIngredients = [],
      computedTotals = null
    ) => {
      const today = formatDate(new Date());

      const totalCalories =
        computedTotals?.calories ??
        dish.calories ??
        dish.total_calories ??
        dish.base_total_calories ??
        0;
      const totalProtein =
        computedTotals?.protein ??
        dish.protein ??
        dish.total_protein ??
        dish.base_total_protein ??
        0;
      const totalFats =
        computedTotals?.fats ??
        dish.fats ??
        dish.total_fats ??
        dish.base_total_fats ??
        0;
      const totalCarbs =
        computedTotals?.carbs ??
        dish.carbs ??
        dish.total_carbs ??
        dish.base_total_carbs ??
        0;

      const portionMultiplier = servingSize / 100;

      const newEntry = {
        dish_id: dish.id,
        dish_name: dish.name,
        meal_date: today,
        meal_type: mealType,
        serving_label: `${servingSize}g`,
        calories: Math.round(totalCalories * portionMultiplier),
        protein: Math.round(totalProtein * portionMultiplier),
        fat: Math.round(totalFats * portionMultiplier),
        carbs: Math.round(totalCarbs * portionMultiplier),
      };

      const { success, suggestion, newMeal } = await logMealAndGetSuggestion(newEntry);

      if (success) {
        setMealLog((prev) => [...prev, newMeal]);
        setSuccessText(`${dish.name} added as ${mealType}! ${suggestion}`);
      } else {
        setSuccessText(suggestion || "Failed to add meal. Please try again.");
      }
      setShowSuccessModal(true);
    },
    [formatDate, setMealLog, setSuccessText, setShowSuccessModal]
  );

  const todaysWorkout = useMemo(() => {
    if (!workoutTypes.length || !profile) return null;
    const safeWorkouts = workoutTypes.filter(
      (w) => isWorkoutSafe(w, profile.health_conditions).safe
    );
    if (safeWorkouts.length === 0) return null;

    const dayOfYear = Math.floor(
      (new Date() - new Date(new Date().getFullYear(), 0, 0)) /
        (1000 * 60 * 60 * 24)
    );
    return safeWorkouts[dayOfYear % safeWorkouts.length];
  }, [workoutTypes, profile]);

  useEffect(() => {
    const fetchTodaysLoggedWorkout = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !todaysWorkout) {
        setTodaysLoggedWorkout(null);
        return;
      }

      const today = formatDate(new Date());

      const { data, error } = await supabase
        .from("workouts")
        .select("*")
        .eq("user_id", user.id)
        .eq("workout_type_id", todaysWorkout.id)
        .order("created_at", { ascending: false }) // Get the most recent
        .limit(1) // Only interested in the latest one
        .maybeSingle(); // Get it if it exists

      if (error && error.code !== "PGRST116") {
        // PGRST116 means no rows found
        // console.error("Error fetching today's logged workout:", error.message);
        setTodaysLoggedWorkout(null);
      } else if (data) {
        setTodaysLoggedWorkout(data);
        // console.log("Fetched todaysLoggedWorkout on load:", data); // Debug log
      } else {
        setTodaysLoggedWorkout(null);
        // console.log("Fetched todaysLoggedWorkout on load: null"); // Debug log
      }
    };

    fetchTodaysLoggedWorkout();
  }, [profile, todaysWorkout, formatDate]);

  const handleSaveWorkout = async (
    workoutId,
    durationMinutes,
    workoutLogId = null
  ) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !workoutId || !durationMinutes) {
      setSuccessText("Please fill all fields.");
      setShowSuccessModal(true);
      return;
    }
    setLoading(true);

    const workoutData = {
      user_id: user.id,
      workout_type_id: workoutId,
      duration: durationMinutes,
      // Recalculate burned macros based on new duration
      calories_burned: calculateCaloriesBurned(
        selectedWorkout.met_value,
        profile.weight_kg,
        durationMinutes
      ),
      // Placeholder calculations for fat/carbs burned - NEEDS ACCURATE FORMULA/SCHEMA INFO
      // Assuming a general split for demonstration; replace with actual logic
      fat_burned:
        (calculateCaloriesBurned(
          selectedWorkout.met_value,
          profile.weight_kg,
          durationMinutes
        ) *
          0.3) /
        9, // Example: 30% of calories from fat, 9kcal/g fat
      carbs_burned:
        (calculateCaloriesBurned(
          selectedWorkout.met_value,
          profile.weight_kg,
          durationMinutes
        ) *
          0.7) /
        4, // Example: 70% of calories from carbs, 4kcal/g carb
    };

    let error;
    let newWorkoutLog;

    if (workoutLogId) {
      // Update existing workout log
      const { data, error: updateError } = await supabase
        .from("workouts")
        .update(workoutData)
        .eq("id", workoutLogId)
        .select()
        .maybeSingle(); // Changed from .single()
      error = updateError;
      newWorkoutLog = data;
      console.log("Updated workout log:", newWorkoutLog); // Debug log
    } else {
      // Insert new workout log
      const { data, error: insertError } = await supabase
        .from("workouts")
        .insert([workoutData])
        .select()
        .maybeSingle(); // Changed from .single()
      error = insertError;
      newWorkoutLog = data;
      console.log("Inserted workout log:", newWorkoutLog); // Debug log
    }
    setLoading(false);

    if (error) {
      setSuccessText("Error saving workout: " + error.message);
      console.error("Error saving workout:", error); // Log the full error object
    } else {
      setSuccessText("Workout logged successfully!");
      setTodaysLoggedWorkout(newWorkoutLog); // Update today's logged workout state
      setRefreshRecentLogsTrigger((prev) => prev + 1); // Increment to trigger refresh

      // Refetch all workouts to update the dashboard totals
      const { data, error: fetchError } = await supabase
        .from("workouts")
        .select("calories_burned, fat_burned, carbs_burned")
        .eq("user_id", user.id);
      if (!fetchError) setWorkouts(data);
    }
    setShowSuccessModal(true);
    setShowWorkoutModal(false);
    setSelectedWorkout(null);
  };


  // Early return after all hooks
  if (isLoading || !profile)
    return (
      <div className="min-h-screen flex items-center justify-center  via-white to-green-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-lg text-green-700 font-medium">
            Loading SmartGenie...
          </p>
        </div>
      </div>
    );

  return (
    <div className=" flex items-center justify-center px-4 py-6 font-sans">
      <div className="bg-white w-[375px] h-[700px] rounded-3xl shadow-2xl overflow-hidden flex flex-col border">
        {/* Header */}
        <div className="bg-black w-full h-[160px] rounded-t-3xl flex flex-col px-5 pt-10 relative">
          <div className="flex justify-between items-start mb-6">
            {/* Title */}
            <h1 className="text-xl font-bold text-white tracking-wide">
              Smart<span className="text-lime-400">Genie.</span>
            </h1>

            {/* User Info */}
            <div
              className="flex flex-col items-end cursor-pointer"
              onClick={() => navigate("/profile")}
            >
              <span className="font-semibold text-sm text-white">
                Hi <span className="text-lime-300">{profile.full_name} </span>
                ,welcome!
              </span>
              <span className="text-[12px] text-white/80 mt-1">
                <strong>BMI:</strong> {profile.bmi}
              </span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-3 ">
            {[
              { label: "My Diary", viewName: "nutrition-protocol" },
              { label: "Explore", viewName: "suggested-dish" },
            ].map((tab) => (
              <button
                key={tab.viewName}
                className={`py-2 px-8 border rounded-lg border-gray-600 shadow text-[12px] font-semibold transition ${
                  view === tab.viewName
                    ? "bg-white text-black"
                    : "bg-black text-white"
                }`}
                onClick={() => setView(tab.viewName)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        {/* Main Content */}
        <div className="p-4 flex-1 space-y-5 overflow-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {/* Nutrition Protocol */}
          {view === "nutrition-protocol" && (
            <div className="space-y-5">
              <MyStatusDisplay
                profile={profile}
                remainingTotals={remainingTotals}
                totalCalories={totalCalories}
                progressPercent={progressPercent}
                netTotals={netTotals}
                totalProtein={totalProtein}
                totalFats={totalFats}
                totalCarbs={totalCarbs}
                chartData={chartData}
                radius={radius}
                circumference={circumference}
              />

              <div className="grid grid-cols-1 gap-5">
                <TodaysExercise
                  workout={todaysWorkout}
                  onAdd={() => {
                    setSelectedWorkout(todaysWorkout);
                    setShowWorkoutModal(true);
                  }}
                  onEdit={(workout) => {
                    setSelectedWorkout(workout); // This should be todaysWorkout
                    setShowWorkoutModal(true);
                  }}
                  isLogged={!!todaysLoggedWorkout}
                  loggedDuration={todaysLoggedWorkout?.duration}
                  loggedCaloriesBurned={todaysLoggedWorkout?.calories_burned}
                />
              </div>
              <hr />
              <RecentMealAndWorkoutLogs
                refreshTrigger={refreshRecentLogsTrigger}
              />

              <NutritionProtocolDisplay
                dailyCalories={dailyCalories}
                dailyProtein={dailyProtein}
                dailyFats={dailyFats}
                dailyCarbs={dailyCarbs}
                nutritionAdvice={nutritionAdvice}
              />
            </div>
          )}

          {/* Suggested Dish */}
          {view === "suggested-dish" && (
            <SuggestedDishList
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              filteredDishes={filteredDishes}
              setSelectedDish={setSelectedDish}
              setShowMealModal={setShowMealModal}
            />
          )}
        </div>
        {/* Meal Modal */}
        <MealDetailModal
          showMealModal={showMealModal}
          selectedDish={selectedDish}
          setShowMealModal={setShowMealModal}
          selectedMealType={selectedMealType}
          setSelectedMealType={setSelectedMealType}
          servingSize={servingSize}
          setServingSize={setServingSize}
          handleAddMeal={handleAddMeal}
          setAlertMessage={setAlertMessage}
          setShowAlertModal={setShowAlertModal}
          boholCities={boholCities}
          selectedCityId={selectedCityId}
          onCityChange={(cityId) => setSelectedCityId(cityId)}
          storeTypeFilters={storeTypeFilters}
          onStoreTypeFilterChange={(type) => {
            setStoreTypeFilters((prev) =>
              prev.includes(type)
                ? prev.filter((t) => t !== type)
                : [...prev, type]
            );
          }}
          storeRecommendations={storeRecommendations}
        />

        {showDisclaimer && (
          <DisclaimerModal
            onAcknowledge={() => {
              localStorage.setItem("lastLoginTime", new Date().toISOString());
              setShowDisclaimer(false);
            }}
          />
        )}
        {showSuccessModal && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setShowSuccessModal(false)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl p-6 w-[320px] animate-fadeIn relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button onClick={() => setShowSuccessModal(false)} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              <h3 className="text-lg font-semibold mb-2 text-green-700">
                Success
              </h3>
              <p className="text-sm text-gray-700 mb-4">{successText}</p>
            </div>
          </div>
        )}

        <AddWorkoutModal
          show={showWorkoutModal}
          onClose={() => {
            setShowWorkoutModal(false);
            setSelectedWorkout(null);
          }}
          workout={selectedWorkout}
          profile={profile}
          onAdd={handleSaveWorkout} // Changed to handleSaveWorkout
          existingWorkoutLog={todaysLoggedWorkout} // Pass existing workout log for editing
          loading={loading}
          notRecommended={selectedWorkout?.notRecommended}
        />

        <FooterNav />
      </div>
    </div>
  );
});

export default PersonalDashboard;
