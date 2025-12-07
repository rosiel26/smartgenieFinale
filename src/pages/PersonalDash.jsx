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
import { logMealAndGetSuggestion, combineMeals } from "../services/mealService";
import { calculateDishNutrition, markAddedMeals } from "../utils/mealplan";
import TodaysExercise from "../components/TodaysExercise";
import AddWorkoutModal from "../components/AddWorkoutModal";
import SuccessModal from "../components/SuccessModal";
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
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showCombineModal, setShowCombineModal] = useState(false);
  const [duplicateMealInfo, setDuplicateMealInfo] = useState(null);
  const [tempServingSize, setTempServingSize] = useState(100);
  const [showWorkoutMergeModal, setShowWorkoutMergeModal] = useState(false);
  const [workoutMergeInfo, setWorkoutMergeInfo] = useState(null);
  const minSwipeDistance = 50;

  const workoutTypes = useWorkoutTypes();

  const radius = 52;
  const circumference = 2 * Math.PI * radius;

  const navigate = useNavigate();

  // Helper function to get current meal type based on time
  const getCurrentMealType = () => {
    const now = new Date();
    const hour = now.getHours();
    if (hour >= 3 && hour < 16) return "Breakfast";
    if (hour >= 16 && hour < 22) return "Lunch";
    return null; // Outside meal times
  };

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

        // Set weekly plan after both profile and meal logs are handled
        if (!profileResult.error && profileResult.data) {
          let parsedPlan = profileResult.data.weekly_plan_json;
          if (typeof parsedPlan === "string") {
            try {
              parsedPlan = JSON.parse(parsedPlan);
            } catch (e) {
              parsedPlan = null;
            }
          }
          const mealLogs = mealResult.data || [];
          setWeeklyPlan(markAddedMeals(parsedPlan, mealLogs) || null);
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
    return date.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
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

  // -------------------- Current Meal Based on Time --------------------
  const [currentMealType, setCurrentMealType] = useState(getCurrentMealType());
  const todaysMeals = useMemo(() => {
    if (!weeklyPlan?.plan) return [];
    const today = formatDate(new Date());
    const todayPlan = weeklyPlan.plan.find((day) => day.date === today);
    return todayPlan?.meals || [];
  }, [weeklyPlan, formatDate]);
  const currentMeal = useMemo(() => {
    if (!currentMealType || !todaysMeals.length) return null;
    return todaysMeals.find((m) => m.type === currentMealType);
  }, [todaysMeals, currentMealType]);

  const todaysLoggedMeal = useMemo(() => {
    if (!currentMeal || !mealLog.length) return null;
    const today = formatDate(new Date());
    return mealLog.find(
      (meal) =>
        meal.meal_date === today &&
        meal.meal_type === currentMealType &&
        meal.dish_name.replace(" with rice", "") ===
          currentMeal.name.replace(" with rice", "")
    );
  }, [currentMeal, mealLog, currentMealType, formatDate]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMealType(getCurrentMealType());
    }, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

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

      const result = await logMealAndGetSuggestion(newEntry);

      if (result.isDuplicate) {
        setDuplicateMealInfo({
          existingMeal: result.existingMeal,
          newMealData: result.newMealData,
          meal: dish,
          mealType: mealType,
          adjustedTotals: {
            calories: Math.round(totalCalories * portionMultiplier),
            protein: Math.round(totalProtein * portionMultiplier),
            fats: Math.round(totalFats * portionMultiplier),
            carbs: Math.round(totalCarbs * portionMultiplier),
          },
          servingSize,
          mealDate: today,
        });
        setShowCombineModal(true);
      } else if (result.success) {
        setMealLog((prev) => [...prev, result.newMeal]);
        setRefreshRecentLogsTrigger((prev) => prev + 1);
        setSuccessText(
          `${dish.name} added as ${mealType}! ${result.suggestion}`
        );
        setShowSuccessModal(true);
      } else {
        setSuccessText(
          result.suggestion || "Failed to add meal. Please try again."
        );
        setShowSuccessModal(true);
      }
    },
    [
      formatDate,
      setMealLog,
      setSuccessText,
      setShowSuccessModal,
      setDuplicateMealInfo,
      setShowCombineModal,
    ]
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

  const handleCombineMeals = async () => {
    if (!duplicateMealInfo) return;

    const { existingMeal, newMealData } = duplicateMealInfo;
    const result = await combineMeals(existingMeal, newMealData);

    if (result.success) {
      setSuccessText(result.suggestion);
      setShowSuccessModal(true);
      // Refresh meal log
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from("meal_logs")
          .select("*")
          .eq("user_id", user.id)
          .order("meal_date", { ascending: true });
        if (!error) setMealLog(data || []);
      }
      setRefreshRecentLogsTrigger((prev) => prev + 1);
    } else {
      setSuccessText(result.suggestion || "Failed to combine meals.");
      setShowSuccessModal(true);
    }

    setShowCombineModal(false);
    setDuplicateMealInfo(null);
  };

  const handleAddSeparateMeal = async () => {
    if (!duplicateMealInfo) return;

    const { newMealData } = duplicateMealInfo;

    const result = await logMealAndGetSuggestion(newMealData, true);

    if (result.success) {
      setMealLog((prev) => [...prev, result.newMeal]);
      setRefreshRecentLogsTrigger((prev) => prev + 1);
      setSuccessText(`${duplicateMealInfo.meal.name} added as separate entry!`);
      setShowSuccessModal(true);
    } else {
      setSuccessText(result.suggestion || "Failed to add meal.");
      setShowSuccessModal(true);
    }

    setShowCombineModal(false);
    setDuplicateMealInfo(null);
  };

  const handleMergeWorkout = async () => {
    if (!workoutMergeInfo) return;

    const { existing, newData } = workoutMergeInfo;
    const combinedDuration = existing.duration + newData.duration;
    const updatedData = {
      ...newData,
      duration: combinedDuration,
      calories_burned: calculateCaloriesBurned(
        workoutMergeInfo.workout.met_value,
        profile.weight_kg,
        combinedDuration
      ),
      fat_burned:
        (calculateCaloriesBurned(
          workoutMergeInfo.workout.met_value,
          profile.weight_kg,
          combinedDuration
        ) *
          0.3) /
        9,
      carbs_burned:
        (calculateCaloriesBurned(
          workoutMergeInfo.workout.met_value,
          profile.weight_kg,
          combinedDuration
        ) *
          0.7) /
        4,
    };

    const { error } = await supabase
      .from("workouts")
      .update(updatedData)
      .eq("id", existing.id);

    if (!error) {
      setTodaysLoggedWorkout({ ...existing, ...updatedData });
      setRefreshRecentLogsTrigger((prev) => prev + 1);
      const { data } = await supabase
        .from("workouts")
        .select("calories_burned, fat_burned, carbs_burned")
        .eq("user_id", (await supabase.auth.getUser()).data.user.id);
      setWorkouts(data);
      setSuccessText("Workout duration added successfully!");
      setShowSuccessModal(true);
    } else {
      setSuccessText("Error updating workout.");
      setShowSuccessModal(true);
    }

    setShowWorkoutMergeModal(false);
    setWorkoutMergeInfo(null);
  };

  const handleAddSeparateWorkout = async () => {
    if (!workoutMergeInfo) return;

    const { newData } = workoutMergeInfo;

    const { error } = await supabase.from("workouts").insert([newData]);

    if (!error) {
      setTodaysLoggedWorkout(newData);
      setRefreshRecentLogsTrigger((prev) => prev + 1);
      const { data } = await supabase
        .from("workouts")
        .select("calories_burned, fat_burned, carbs_burned")
        .eq("user_id", (await supabase.auth.getUser()).data.user.id);
      setWorkouts(data);
      setSuccessText("Separate workout logged successfully!");
      setShowSuccessModal(true);
    } else {
      setSuccessText("Error saving workout.");
      setShowSuccessModal(true);
    }

    setShowWorkoutMergeModal(false);
    setWorkoutMergeInfo(null);
  };

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

    setLoading(false);

    if (workoutLogId) {
      // Show merge modal instead of updating directly
      const existingWorkout = todaysLoggedWorkout; // Assuming it's the existing
      setWorkoutMergeInfo({
        existing: existingWorkout,
        newData: workoutData,
        workout: selectedWorkout,
      });
      setShowWorkoutMergeModal(true);
    } else {
      // Insert new workout log
      const { data, error } = await supabase
        .from("workouts")
        .insert([workoutData])
        .select()
        .maybeSingle();
      if (error) {
        setSuccessText("Error saving workout: " + error.message);
        console.error("Error saving workout:", error);
      } else {
        setSuccessText("Workout logged successfully!");
        setTodaysLoggedWorkout(data);
        setRefreshRecentLogsTrigger((prev) => prev + 1);

        // Refetch all workouts to update the dashboard totals
        const { data: workoutsData, error: fetchError } = await supabase
          .from("workouts")
          .select("calories_burned, fat_burned, carbs_burned")
          .eq("user_id", user.id);
        if (!fetchError) setWorkouts(workoutsData);
      }
      setShowSuccessModal(true);
    }
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
                <div className="bg-white rounded-2xl border-2 border-black p-2 shadow-md">
                  <div
                    className={`p-4 rounded-xl shadow-md border ${
                      todaysLoggedMeal ? "bg-white border-black" : "bg-black "
                    }`}
                  >
                    <div className="flex justify-between items-center mb-3">
                      <h3
                        className={`text-md font-bold ${
                          todaysLoggedMeal ? "text-black" : "text-white"
                        }`}
                      >
                        Today's {currentMealType || "Breakfast"}
                      </h3>
                      <button
                        onClick={() => setShowConfirmModal(true)}
                        className="py-2 px-2 rounded-md bg-lime-500 text-black text-xs font-bold hover:bg-lime-600 hover:shadow-sm transition-all duration-150 active:scale-95"
                      >
                        {todaysLoggedMeal ? "Update" : "Log Meal"}
                      </button>
                    </div>
                    {currentMeal ? (
                      <div className="flex flex-col space-y-2">
                        <div className="flex items-center text-left">
                          <div className="flex-1">
                            <h4
                              className={`font-medium ${
                                todaysLoggedMeal ? "text-black" : "text-white"
                              }`}
                            >
                              {currentMeal.name}
                            </h4>
                            <div
                              className={`flex space-x-2 mt-1 text-right ${
                                todaysLoggedMeal
                                  ? "text-gray-800"
                                  : "text-lime-400"
                              }`}
                            >
                              <span
                                className={`${
                                  todaysLoggedMeal
                                    ? "text-gray-800"
                                    : "text-lime-400"
                                } text-xs `}
                              >
                                Cal:{" "}
                                <span
                                  className={`${
                                    todaysLoggedMeal
                                      ? "text-gray-800"
                                      : "text-lime-400"
                                  }`}
                                >
                                  {Math.round(
                                    calculateDishNutrition(currentMeal)
                                      .calories || 0
                                  )}
                                </span>
                              </span>
                              <span
                                className={`${
                                  todaysLoggedMeal
                                    ? "text-gray-800"
                                    : "text-lime-400"
                                } text-xs `}
                              >
                                Prot:{" "}
                                <span
                                  className={`${
                                    todaysLoggedMeal
                                      ? "text-gray-800"
                                      : "text-lime-400"
                                  }`}
                                >
                                  {Math.round(
                                    calculateDishNutrition(currentMeal)
                                      .protein || 0
                                  )}
                                  g
                                </span>
                              </span>
                              <span
                                className={`${
                                  todaysLoggedMeal
                                    ? "text-gray-800"
                                    : "text-lime-400"
                                } text-xs `}
                              >
                                Fat:{" "}
                                <span
                                  className={`${
                                    todaysLoggedMeal
                                      ? "text-gray-800"
                                      : "text-lime-400"
                                  }`}
                                >
                                  {Math.round(
                                    calculateDishNutrition(currentMeal).fat || 0
                                  )}
                                  g
                                </span>
                              </span>
                              <span
                                className={`${
                                  todaysLoggedMeal
                                    ? "text-gray-800"
                                    : "text-lime-400"
                                } text-xs `}
                              >
                                Carb:{" "}
                                <span
                                  className={`${
                                    todaysLoggedMeal
                                      ? "text-gray-800"
                                      : "text-lime-400"
                                  }`}
                                >
                                  {Math.round(
                                    calculateDishNutrition(currentMeal).carbs ||
                                      0
                                  )}
                                  g
                                </span>
                              </span>
                            </div>
                          </div>
                          {currentMeal.image_url ? (
                            <img
                              src={currentMeal.image_url}
                              alt={currentMeal.name}
                              className="w-16 h-16 object-cover rounded-md ml-2 border-2 border-lime-500"
                            />
                          ) : (
                            <div className="w-16 h-16 bg-gray-200 rounded-md flex items-center justify-center ml-2">
                              <span className="text-gray-400 text-xs">
                                No Image
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p
                        className={`text-sm ${
                          todaysLoggedMeal ? "text-black" : "text-white"
                        }`}
                      >
                        {currentMealType
                          ? `No ${currentMealType} planned for today`
                          : "Not time for breakfast"}
                      </p>
                    )}
                  </div>
                </div>
                <div className="p-4 rounded-2xl shadow-md border bg-black">
                  <TodaysExercise
                    workout={todaysWorkout}
                    onAdd={() => {
                      setSelectedWorkout(todaysWorkout);
                      setShowWorkoutModal(true);
                    }}
                    onEdit={(workout) => {
                      setSelectedWorkout(workout);
                      setShowWorkoutModal(true);
                    }}
                    isLogged={!!todaysLoggedWorkout}
                    loggedDuration={todaysLoggedWorkout?.duration}
                    loggedCaloriesBurned={todaysLoggedWorkout?.calories_burned}
                  />
                </div>
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
          <SuccessModal
            message={successText}
            onClose={() => setShowSuccessModal(false)}
          />
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

        {/* Confirmation Modal */}
        {showConfirmModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[1000]">
            <div className="bg-black text-white w-[320px] rounded-2xl shadow-2xl p-6 flex flex-col gap-4 border border-lime-400">
              <h2 className="text-lg font-bold text-white">Confirm Meal</h2>

              {/* Summary */}
              <div className="bg-white border border-lime-400 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-black font-medium">Dish:</span>
                  <span className="font-semibold text-black">
                    {currentMeal.name}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-black font-medium">Meal Type:</span>
                  <span className="font-semibold text-black">
                    {currentMealType}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-black font-medium">Serving Size:</span>
                  <input
                    type="number"
                    min="1"
                    step="10"
                    value={tempServingSize}
                    onChange={(e) => setTempServingSize(Number(e.target.value))}
                    className="w-20 bg-white border border-lime-400 rounded px-2 py-1 text-black text-right"
                  />
                  g
                </div>

                <div className="border-t border-lime-400 pt-3">
                  <p className="text-xs text-black mb-2 font-medium">
                    MACROS (per serving):
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {(() => {
                      const multiplier = tempServingSize / 100;
                      const nutrition = calculateDishNutrition(currentMeal);
                      return (
                        <>
                          <div className="bg-white border border-lime-400 rounded p-2 text-center">
                            <p className="text-black">Calories</p>
                            <p className="font-bold text-black">
                              {Math.round(
                                (nutrition.calories || 0) * multiplier
                              )}{" "}
                              kcal
                            </p>
                          </div>
                          <div className="bg-white border border-lime-400 rounded p-2 text-center">
                            <p className="text-black">Protein</p>
                            <p className="font-bold text-black">
                              {Math.round(
                                (nutrition.protein || 0) * multiplier
                              )}
                              g
                            </p>
                          </div>
                          <div className="bg-white border border-lime-400 rounded p-2 text-center">
                            <p className="text-black">Carbs</p>
                            <p className="font-bold text-black">
                              {Math.round((nutrition.carbs || 0) * multiplier)}g
                            </p>
                          </div>
                          <div className="bg-white border border-lime-400 rounded p-2 text-center">
                            <p className="text-black">Fats</p>
                            <p className="font-bold text-black">
                              {Math.round((nutrition.fat || 0) * multiplier)}g
                            </p>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 bg-black border border-red-500 text-red-500 hover:bg-red-900 font-semibold py-2 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowConfirmModal(false);
                    handleAddMeal(
                      currentMeal,
                      currentMealType,
                      1,
                      tempServingSize,
                      [],
                      calculateDishNutrition(currentMeal)
                    );
                  }}
                  className="flex-1 bg-lime-400 hover:bg-lime-500 text-black font-semibold py-2 rounded-lg transition"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Combine Servings Modal */}
        {showCombineModal && duplicateMealInfo && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[1000]">
            <div className="bg-black text-lime-400 w-[340px] rounded-2xl shadow-2xl p-6 flex flex-col gap-4 border border-lime-400">
              <div className="text-center">
                <h2 className="text-lg font-bold text-lime-300 mb-2">
                  {duplicateMealInfo.existingMeal.dish_name} (
                  {(
                    duplicateMealInfo.existingMeal.serving_label || "0 g"
                  ).replace(" g", "")}
                  g + {duplicateMealInfo.servingSize}) is already in your{" "}
                  {duplicateMealInfo.existingMeal.meal_type}
                </h2>
                <p className="text-sm text-lime-400">
                  Do you want to add it as a new entry or increase the existing
                  portion?
                </p>
              </div>

              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleCombineMeals}
                  className="flex-1 bg-lime-400 hover:bg-lime-500 text-black font-semibold py-3 rounded-lg transition text-sm"
                >
                  Increase Portion
                  <span className="block text-xs opacity-75">
                    (recommended)
                  </span>
                </button>
                <button
                  onClick={handleAddSeparateMeal}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-lg transition text-sm"
                >
                  Add Separate Entry
                </button>
              </div>

              <button
                onClick={() => {
                  setShowCombineModal(false);
                  setDuplicateMealInfo(null);
                }}
                className="w-full bg-black border border-red-500 text-red-500 hover:bg-red-900 font-medium py-2 rounded-lg transition text-sm mt-2"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Workout Merge Modal */}
        {showWorkoutMergeModal && workoutMergeInfo && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[1000]">
            <div className="bg-black text-lime-400 w-[340px] rounded-2xl shadow-2xl p-6 flex flex-col gap-4 border border-lime-400">
              <div className="text-center">
                <h2 className="text-lg font-bold text-lime-300 mb-2">
                  {workoutMergeInfo.workout?.name} (
                  {workoutMergeInfo.existing.duration}
                  min + {workoutMergeInfo.newData.duration}min) is already
                  logged today
                </h2>
                <p className="text-sm text-lime-400">
                  Do you want to add the duration to the existing workout or log
                  a separate entry?
                </p>
              </div>

              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleMergeWorkout}
                  className="flex-1 bg-lime-400 hover:bg-lime-500 text-black font-semibold py-3 rounded-lg transition text-sm"
                >
                  Add Duration
                  <span className="block text-xs opacity-75">
                    (recommended)
                  </span>
                </button>
                <button
                  onClick={handleAddSeparateWorkout}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-lg transition text-sm"
                >
                  Log Separate Entry
                </button>
              </div>

              <button
                onClick={() => {
                  setShowWorkoutMergeModal(false);
                  setWorkoutMergeInfo(null);
                }}
                className="w-full bg-black border border-red-500 text-red-500 hover:bg-red-900 font-medium py-2 rounded-lg transition text-sm mt-2"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <FooterNav />
      </div>
    </div>
  );
});

export default PersonalDashboard;
