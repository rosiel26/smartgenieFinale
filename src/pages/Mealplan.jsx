import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { createPortal } from "react-dom";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import FooterNav from "../components/FooterNav";
import {
  getBoholCities,
  recommendStoresForIngredients,
} from "../services/storeService";
import MealPlanGrid from "../components/MealPlanGrid";
import DishDetailModal from "../components/DishDetailModal";
import AlertModal from "../components/AlertModal";
import SuccessModal from "../components/SuccessModal";
import NoProfile from "../components/NoProfile";
import MealPlanLoader from "../components/MealPlanLoader";
import {
  createSmartWeeklyMealPlan,
  markAddedMeals,
  prepareDishForModal,
  computeDishTotalsWithIngredientOverrides,
  formatDateRange,
  isDishSafeForProfile, // NEW
  identifyUnsafeMeals, // NEW
} from "../utils/mealplan";
import { logMealAndGetSuggestion, combineMeals } from "../services/mealService";
import { FaInfoCircle } from "react-icons/fa";

export default function Mealplan({ userId }) {
  const [profile, setProfile] = useState(null);
  const [dishes, setDishes] = useState([]);
  const [mealLog, setMealLog] = useState([]);
  const [weeklyPlan, setWeeklyPlan] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false); // NEW
  const [alertMessage, setAlertMessage] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [selectedDish, setSelectedDish] = useState(null);
  const [selectedCityId, setSelectedCityId] = useState("tagbilaran");
  const [storeTypeFilters, setStoreTypeFilters] = useState([]);
  const [timeOfDay, setTimeOfDay] = useState("");
  const [boholCities, setBoholCities] = useState([]);
  const [storeRecommendations, setStoreRecommendations] = useState([]);
  const [profileUpdatedSignal, setProfileUpdatedSignal] = useState(0);
  const [showCombineModal, setShowCombineModal] = useState(false);
  const [duplicateMealInfo, setDuplicateMealInfo] = useState(null);
  const [showExceedModal, setShowExceedModal] = useState(false);
  const [exceedMessage, setExceedMessage] = useState("");
  const [skipExceedCheck, setSkipExceedCheck] = useState(false);

  const navigate = useNavigate();

  const triggerProfileRefetch = useCallback(() => {
    setProfileUpdatedSignal((prev) => prev + 1);
  }, []);

  // Build a minimal profile snapshot used to detect when a saved plan
  // was generated from a different profile. Keep values normalized so
  // comparisons are stable across ordering/formatting differences.
  const buildProfileSnapshot = (p) => {
    if (!p) return {};
    const normalizeArr = (a) =>
      Array.isArray(a)
        ? [...a]
            .map(String)
            .map((s) => s.toLowerCase().trim())
            .sort()
        : [];
    return {
      allergens: normalizeArr(p.allergens),
      health_conditions: normalizeArr(p.health_conditions),
      goal: normalizeArr(
        Array.isArray(p.goal)
          ? p.goal
          : typeof p.goal === "string"
          ? p.goal.split(",")
          : []
      ),
      eating_style: (p.eating_style || "").toLowerCase().trim(),
      timeframe: Number(p.timeframe) || 7,
      meals_per_day: Number(p.meals_per_day) || 3,
      max_weekly_repeats: Number(p.max_weekly_repeats) || null,
      min_days_between_same_dish: Number(p.min_days_between_same_dish) || null,
      activity_level: (p.activity_level || "").toLowerCase().trim(),
      calorie_needs: Number(p.calorie_needs) || 0,
      protein_needed: Number(p.protein_needed) || 0,
    };
  };

  // Ensure logged meals are preserved as immutable 'added' entries in the plan.
  // This replaces the scheduled meal for the given date+meal_type with the
  // logged meal (using dish info from `dishes` when available) so regenerating
  // the plan won't overwrite already-eaten/added meals.
  const preserveLoggedMeals = (
    planObj,
    mealLogArray = [],
    dishesArray = []
  ) => {
    if (!planObj || !Array.isArray(planObj.plan)) return planObj;
    if (!Array.isArray(mealLogArray) || mealLogArray.length === 0)
      return planObj;

    // Build quick lookup for dishes by id
    const dishById = (dishesArray || []).reduce((acc, d) => {
      acc[String(d.id)] = d;
      return acc;
    }, {});

    const newPlan = {
      ...planObj,
      plan: planObj.plan.map((day) => {
        const dayCopy = { ...day };
        const logsForDay = mealLogArray.filter((m) => m.meal_date === day.date);
        if (!logsForDay.length) return dayCopy;

        const mealsCopy = (dayCopy.meals || []).map((m) => ({ ...m }));

        for (const log of logsForDay) {
          const mealType = log.meal_type || log.meal_type || "unknown";
          const idx = mealsCopy.findIndex((mm) => mm.type === mealType);
          const loggedDish = dishById[String(log.dish_id)];
          const replacement = loggedDish
            ? {
                ...loggedDish,
                id: log.dish_id,
                name: log.dish_name || loggedDish.name,
                image_url: loggedDish.image_url,
                ingredients_dish_id_fkey:
                  loggedDish.ingredients_dish_id_fkey || [],
                status: "added",
              }
            : {
                id: log.dish_id,
                name: log.dish_name || "Logged Meal",
                image_url: null,
                ingredients_dish_id_fkey: [],
                status: "added",
              };

          // also attach nutrition if available from the log
          if (typeof log.calories !== "undefined")
            replacement.calories = log.calories;
          if (typeof log.protein !== "undefined")
            replacement.protein = log.protein;
          if (typeof log.carbs !== "undefined") replacement.carbs = log.carbs;
          if (typeof log.fat !== "undefined") replacement.fat = log.fat;

          if (idx >= 0) {
            mealsCopy[idx] = { ...mealsCopy[idx], ...replacement };
          } else {
            // If no matching meal slot exists, optionally push it
            mealsCopy.push({ type: mealType, ...replacement });
          }
        }

        dayCopy.meals = mealsCopy;
        return dayCopy;
      }),
    };
    return newPlan;
  };

  const markMissedMeals = (planObj) => {
    if (!planObj || !Array.isArray(planObj.plan)) return planObj;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const newPlan = {
      ...planObj,
      plan: planObj.plan.map((day) => {
        const dayCopy = { ...day };
        const [year, month, dayOfMonth] = day.date.split("-").map(Number);
        const mealDate = new Date(year, month - 1, dayOfMonth);

        if (mealDate < today) {
          dayCopy.meals = (dayCopy.meals || []).map((meal) => {
            if (meal.status !== "added") {
              return { ...meal, status: "missed" };
            }
            return meal;
          });
        }
        return dayCopy;
      }),
    };
    return newPlan;
  };

  // -------------------- FETCH DATA --------------------
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return navigate("/login");

      const [profileResult, dishesResult, mealResult] = await Promise.all([
        supabase
          .from("health_profiles")
          .select("*")
          .eq("user_id", user.id)
          .single(),
        supabase.from("dishes").select(`
          id, name, description, default_serving, meal_type, goal,
          eating_style, health_condition, steps, image_url,
          ingredients_dish_id_fkey(id, name, amount, unit, calories, protein, fats, carbs, is_rice, allergen_id(id, name))
        `),
        supabase.from("meal_logs").select("*").eq("user_id", user.id),
      ]);

      const profileData = profileResult.data;
      const dishesData = dishesResult.data || [];
      const mealData = mealResult.data || [];

      if (!profileData) {
        setAlertMessage("Please complete your health profile first");
        setShowAlertModal(true);
        navigate("/healthprofile");
        return;
      }

      // Ensure allergens and health_conditions are arrays
      if (typeof profileData.allergens === "string") {
        try {
          profileData.allergens = JSON.parse(profileData.allergens);
        } catch (e) {
          profileData.allergens = [];
        }
      }
      if (!Array.isArray(profileData.allergens)) {
        profileData.allergens = [];
      }
      if (typeof profileData.health_conditions === "string") {
        try {
          profileData.health_conditions = JSON.parse(
            profileData.health_conditions
          );
        } catch (e) {
          profileData.health_conditions = [];
        }
      }
      if (!Array.isArray(profileData.health_conditions)) {
        profileData.health_conditions = [];
      }

      setProfile(profileData);
      setDishes(dishesData);
      setMealLog(mealData);

      let plan = null;
      let shouldRegeneratePlan = false;
      let planWasModified = false;

      // Check if profile was recently updated
      try {
        const profileUpdatedAt = localStorage.getItem("profileUpdatedAt");
        if (profileUpdatedAt) {
          shouldRegeneratePlan = true;
          localStorage.removeItem("profileUpdatedAt");
        }
      } catch (e) {}

      // Logic to get the plan
      if (profileData.weekly_plan_json) {
        try {
          const supabasePlan = profileData.weekly_plan_json;
          const planEndDate = new Date(supabasePlan.end_date);
          const now = new Date();
          const today = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
          );

          if (planEndDate < today) {
            // The plan is expired, so we should regenerate it.
            shouldRegeneratePlan = true;
          } else {
            plan = supabasePlan;
          }
        } catch (e) {
          console.error("Error parsing Supabase weekly_plan_json:", e);
          shouldRegeneratePlan = true;
        }
      } else {
        shouldRegeneratePlan = true;
      }

      // If no plan from Supabase, check local storage (but only if not regenerating)
      if (!plan && !shouldRegeneratePlan) {
        const savedPlanRaw = localStorage.getItem(`weeklyPlan_${user.id}`);
        if (savedPlanRaw) {
          try {
            const localPlan = JSON.parse(savedPlanRaw);
            const planEndDateLocal = new Date(localPlan.end_date);
            const now = new Date();
            const today = new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate()
            );

            if (planEndDateLocal < today) {
              shouldRegeneratePlan = true; // Plan expired
            } else {
              plan = localPlan;
            }
          } catch (e) {
            console.error("Error parsing local storage weeklyPlan:", e);
            shouldRegeneratePlan = true;
          }
        } else {
          shouldRegeneratePlan = true; // No plan anywhere
        }
      }

      let finalPlanToProcess;

      if (!plan || shouldRegeneratePlan) {
        finalPlanToProcess = createSmartWeeklyMealPlan(profileData, dishesData);
        planWasModified = true;
      } else {
        finalPlanToProcess = plan;
      }

      // Process the final plan
      const planWithMissed = markMissedMeals(finalPlanToProcess);
      const planWithAdded = markAddedMeals(planWithMissed, mealData);

      // Check if marking meals as missed or added changed the plan
      if (
        JSON.stringify(planWithAdded) !== JSON.stringify(finalPlanToProcess)
      ) {
        planWasModified = true;
      }

      const planWithSnapshot = {
        ...planWithAdded,
        profile_snapshot: buildProfileSnapshot(profileData),
      };

      setWeeklyPlan(planWithSnapshot);
      localStorage.setItem(
        `weeklyPlan_${user.id}`,
        JSON.stringify(planWithSnapshot)
      );

      if (planWasModified) {
        const planStartISO = new Date(
          planWithSnapshot.start_date
        ).toISOString();
        const planEndISO = new Date(planWithSnapshot.end_date).toISOString();
        const safePlanJSON = JSON.parse(JSON.stringify(planWithSnapshot));

        const { error: updateError } = await supabase
          .from("health_profiles")
          .update({
            plan_start_date: planStartISO,
            plan_end_date: planEndISO,
            weekly_plan_json: safePlanJSON,
          })
          .eq("user_id", user.id);

        if (updateError)
          console.error("Supabase update error (fetchData):", updateError);
      }

      // If plan was regenerated due to profile update, reload to display
      if (shouldRegeneratePlan) {
        window.location.reload();
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setAlertMessage("An error occurred while loading your meal plan");
      setShowAlertModal(true);
      setWeeklyPlan({ plan: [], start_date: null, end_date: null });
      setDishes([]);
      setProfile({});
    } finally {
      setLoading(false);
    }
  }, [navigate, profileUpdatedSignal]);

  // -------------------- EFFECTS --------------------
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) setTimeOfDay("Morning");
    else if (hour >= 12 && hour < 17) setTimeOfDay("Afternoon");
    else if (hour >= 17 && hour < 21) setTimeOfDay("Evening");
    else setTimeOfDay("Night");
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

  // -------------------- PROFILE UPDATE LISTENER --------------------
  // When the user updates their profile elsewhere (EditProfile), we want
  // to regenerate the meal plan automatically while preserving logged
  // meals. The EditProfile page writes `profileUpdatedAt` to localStorage
  // and dispatches a `profileUpdated` event.
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const dishesRef = useRef(dishes);
  dishesRef.current = dishes;
  const mealLogRef = useRef(mealLog);
  mealLogRef.current = mealLog;

  useEffect(() => {
    let mounted = true;

    const doRefreshPlan = async () => {
      try {
        const currentDishes = dishesRef.current;
        const currentMealLog = mealLogRef.current;

        // Fetch the latest profile from Supabase to ensure we use fresh values
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const { data: freshProfileRow, error: profileErr } = await supabase
          .from("health_profiles")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (profileErr) {
          console.error("Failed to refetch profile after update:", profileErr);
          return;
        }

        const freshProfile = { ...(freshProfileRow || {}) };
        if (typeof freshProfile.allergens === "string") {
          try {
            freshProfile.allergens = JSON.parse(freshProfile.allergens);
          } catch (e) {
            freshProfile.allergens = [];
          }
        }
        if (!Array.isArray(freshProfile.allergens)) freshProfile.allergens = [];
        if (typeof freshProfile.health_conditions === "string") {
          try {
            freshProfile.health_conditions = JSON.parse(
              freshProfile.health_conditions
            );
          } catch (e) {
            freshProfile.health_conditions = [];
          }
        }
        if (!Array.isArray(freshProfile.health_conditions))
          freshProfile.health_conditions = [];

        if (!currentDishes?.length) return;
        setLoading(true);

        // Generate a fresh plan based on the updated profile
        const newPlan = createSmartWeeklyMealPlan(freshProfile, currentDishes);

        const updatedPlan = preserveLoggedMeals(
          newPlan,
          currentMealLog,
          currentDishes
        );
        const profileSnapshot = buildProfileSnapshot(freshProfile);
        const planWithSnapshot = {
          ...updatedPlan,
          profile_snapshot: profileSnapshot,
        };
        setWeeklyPlan(planWithSnapshot);

        // Persist to localStorage and to Supabase profile
        localStorage.setItem(
          `weeklyPlan_${user.id}`,
          JSON.stringify(planWithSnapshot)
        );

        // Auto-refresh to ensure the new plan is displayed
        window.location.reload();

        try {
          const planStartISO = new Date(
            planWithSnapshot.start_date
          ).toISOString();
          const planEndISO = new Date(planWithSnapshot.end_date).toISOString();
          const safePlanJSON = JSON.parse(JSON.stringify(planWithSnapshot));
          const { error: updateError } = await supabase
            .from("health_profiles")
            .update({
              plan_start_date: planStartISO,
              plan_end_date: planEndISO,
              weekly_plan_json: safePlanJSON,
            })
            .eq("user_id", user.id);
          if (updateError)
            console.error(
              "Supabase update error (profile listener):",
              updateError
            );
        } catch (e) {
          console.error(
            "Failed to persist updated plan after profile change:",
            e
          );
        }

        // Notify the user
        setAlertMessage(
          "Your meal plan has been updated based on your new profile. Logged meals have been preserved."
        );
        setShowAlertModal(true);
      } catch (e) {
        console.error("Error refreshing plan after profile update:", e);
      } finally {
        if (mounted) setLoading(false);
        try {
          // clear the profileUpdatedAt marker so we don't re-run unnecessarily
          localStorage.removeItem("profileUpdatedAt");
        } catch (e) {}
      }
    };

    const handler = () => doRefreshPlan();

    window.addEventListener("profileUpdated", handler);

    // Also listen for cross-tab localStorage changes
    const storageHandler = (e) => {
      if (e.key === "profileUpdatedAt") handler();
    };
    window.addEventListener("storage", storageHandler);

    // If a profileUpdatedAt exists on mount (user returned here), refresh
    try {
      const stamp = localStorage.getItem("profileUpdatedAt");
      if (stamp) {
        // Slight delay so other data loading can finish first
        setTimeout(() => handler(), 300);
      }
    } catch (e) {}

    return () => {
      mounted = false;
      window.removeEventListener("profileUpdated", handler);
      window.removeEventListener("storage", storageHandler);
    };
  }, []);

  // -------------------- HANDLERS --------------------
  const handleCombineMeals = async () => {
    if (!duplicateMealInfo) return;

    const { existingMeal, newMealData, mealDate } = duplicateMealInfo;
    const result = await combineMeals(existingMeal, newMealData);

    if (result.success) {
      // Update meal log with the updated meal
      setMealLog((prev) =>
        prev.map((m) => (m.id === existingMeal.id ? result.updatedMeal : m))
      );

      // Update weekly plan with the updated nutrition
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setWeeklyPlan((prev) => {
        const newPlan = {
          ...prev,
          plan: prev.plan.map((day) => {
            const dayCopy = { ...day };
            if (dayCopy.date === mealDate) {
              dayCopy.meals = dayCopy.meals.map((m) =>
                Number(m.id) === Number(existingMeal.dish_id)
                  ? { ...m, ...result.updatedMeal }
                  : m
              );
            }
            return dayCopy;
          }),
        };
        if (user) {
          localStorage.setItem(
            `weeklyPlan_${user.id}`,
            JSON.stringify(newPlan)
          );
        }
        return newPlan;
      });

      setSelectedDish(null);
      setShowSuccessModal(true);
    } else {
      setAlertMessage(
        result.suggestion || "Failed to combine meals. Please try again."
      );
      setShowAlertModal(true);
    }

    setShowCombineModal(false);
    setDuplicateMealInfo(null);
  };

  const handleAddSeparateMeal = async () => {
    if (!duplicateMealInfo) return;

    const {
      newMealData,
      meal,
      mealType,
      adjustedTotals,
      servingSize,
      mealDate,
    } = duplicateMealInfo;

    const result = await logMealAndGetSuggestion(newMealData, true); // forceAdd = true

    if (result.success) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setMealLog((prev) => [...(prev || []), result.newMeal]);

      setWeeklyPlan((prev) => {
        const newPlan = {
          ...prev,
          plan: prev.plan.map((day) => {
            const dayCopy = { ...day };
            if (dayCopy.date === mealDate) {
              dayCopy.meals = dayCopy.meals.map((m) =>
                Number(m.id) === Number(meal.id) &&
                m.type === (meal.planMealType || meal.type)
                  ? { ...m, status: "added" }
                  : m
              );
            }
            return dayCopy;
          }),
        };
        localStorage.setItem(`weeklyPlan_${user.id}`, JSON.stringify(newPlan));
        return newPlan;
      });

      setSelectedDish(null);
      setShowSuccessModal(true);
    } else {
      setAlertMessage(
        result.suggestion || "Failed to add meal. Please try again."
      );
      setShowAlertModal(true);
    }

    setShowCombineModal(false);
    setDuplicateMealInfo(null);
  };

  const handleOpenDish = (dish, date) => {
    const full = dishes.find((d) => d.id === dish.id) || dish;
    const prepared = prepareDishForModal(full);
    if (dish && dish.type) prepared.planMealType = dish.type;
    else if (dish && dish.meal_type) prepared.planMealType = dish.meal_type;
    if (dish && dish.status) prepared.status = dish.status;
    if (date) prepared.meal_date = date;
    setSelectedDish(prepared);
  };

  const handleServingSizeChange = (newSize) => {
    setSelectedDish((prev) => {
      if (!prev) return prev;
      const newDish = { ...prev, servingSize: newSize };
      const adjusted = computeDishTotalsWithIngredientOverrides(newDish);
      return { ...newDish, ...adjusted };
    });
  };

  const handleIngredientAmountChange = (ingredientId, newAmountRaw) => {
    const newAmount = Number(newAmountRaw) || 0;
    setSelectedDish((prev) => {
      if (!prev) return prev;
      const ingredients = (prev.ingredients_dish_id_fkey || []).map((ing) =>
        ing.id !== ingredientId
          ? ing
          : { ...ing, amount: newAmount, customAmount: true }
      );
      const updatedDish = { ...prev, ingredients_dish_id_fkey: ingredients };
      const adjusted = computeDishTotalsWithIngredientOverrides(updatedDish);
      return { ...updatedDish, ...adjusted };
    });
  };

  const handleAddMeal = async (
    meal,
    mealType,
    adjustedTotals,
    servingSize,
    mealDate = null
  ) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setAlertMessage("Please log in to add meals");
        setShowAlertModal(true);
        return;
      }

      const logDate = mealDate
        ? mealDate
        : new Date(
            new Date().getTime() - new Date().getTimezoneOffset() * 60000
          )
            .toISOString()
            .split("T")[0];

      // Proceed with adding the meal
      await proceedWithAddMeal(
        meal,
        mealType,
        adjustedTotals,
        servingSize,
        mealDate,
        logDate,
        user
      );
    } catch (error) {
      console.error("Error adding meal:", error);
      setAlertMessage("Failed to add meal. Please try again.");
      setShowAlertModal(true);
    }
  };

  const proceedWithAddMeal = async (
    meal,
    mealType,
    adjustedTotals,
    servingSize,
    mealDate,
    logDate,
    user
  ) => {
    const riceIngredient = (meal.ingredients_dish_id_fkey || []).find(
      (ing) => ing.is_rice
    );
    const riceAmount = riceIngredient?.amount;
    const hasRice = riceAmount && Number(riceAmount) > 0; // only if > 0

    // Normalize dish name by removing " with rice" if present
    let baseName = meal.name || "Unknown Dish";
    if (baseName.toLowerCase().endsWith(" with rice")) {
      baseName = baseName.slice(0, -9).trim();
    }

    const dishName = hasRice ? `${baseName} with rice` : baseName;

    const mealLogData = {
      dish_id: parseInt(meal.id),
      dish_name: dishName,
      meal_date: logDate,
      calories: adjustedTotals.calories,
      protein: adjustedTotals.protein,
      carbs: adjustedTotals.carbs,
      fat: adjustedTotals.fats,
      meal_type: mealType || "unknown",
      serving_label: `${servingSize} g`,
      created_at: new Date().toISOString(),
    };

    const result = await logMealAndGetSuggestion(mealLogData);

    if (result.isDuplicate) {
      // Show combine prompt
      setDuplicateMealInfo({
        existingMeal: result.existingMeal,
        newMealData: result.newMealData,
        meal,
        mealType,
        adjustedTotals,
        servingSize,
        mealDate,
      });
      setSelectedDish(null); // Close the dish detail modal
      setShowCombineModal(true);
      return;
    }

    if (result.success) {
      setMealLog((prev) => [...(prev || []), result.newMeal]);

      setWeeklyPlan((prev) => {
        const newPlan = {
          ...prev,
          plan: prev.plan.map((day) => {
            const dayCopy = { ...day };
            if (dayCopy.date === mealDate) {
              dayCopy.meals = dayCopy.meals.map((m) =>
                Number(m.id) === Number(meal.id) &&
                m.type === (meal.planMealType || meal.type)
                  ? { ...m, status: "added" }
                  : m
              );
            }
            return dayCopy;
          }),
        };
        localStorage.setItem(`weeklyPlan_${user.id}`, JSON.stringify(newPlan));
        return newPlan;
      });

      setSelectedDish(null);
      setShowSuccessModal(true);
    } else {
      setAlertMessage(
        result.suggestion || "Failed to add meal. Please try again."
      );
      setShowAlertModal(true);
    }
  };

  const memoizedWeeklyPlan = useMemo(() => {
    if (!weeklyPlan?.plan || !Array.isArray(weeklyPlan.plan))
      return { plan: [], start_date: null, end_date: null };
    return weeklyPlan;
  }, [weeklyPlan]);

  const mealTypes = useMemo(
    () => ["Breakfast", "Lunch", "Dinner", "Snack"],
    []
  );
  const dateRange = useMemo(
    () =>
      formatDateRange(
        memoizedWeeklyPlan.start_date,
        memoizedWeeklyPlan.end_date
      ),
    [memoizedWeeklyPlan.start_date, memoizedWeeklyPlan.end_date]
  );

  const canRegenerate = useMemo(() => {
    if (!weeklyPlan?.plan?.length) return true;

    if (weeklyPlan.end_date) {
      const planEndDate = new Date(weeklyPlan.end_date);
      const now = new Date();
      const today = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
      );
      planEndDate.setUTCHours(0, 0, 0, 0);
      if (planEndDate < today) return false;
    }

    for (const day of weeklyPlan.plan) {
      if (
        day.meals.some(
          (meal) => meal.status === "added" || meal.status === "missed"
        )
      ) {
        return false;
      }
    }

    return true;
  }, [weeklyPlan]);

  const handleRegenerateMealPlan = async () => {
    if (!canRegenerate) {
      setAlertMessage(
        "You cannot regenerate a meal plan with logged meals. A new plan can be generated once the current one is complete."
      );
      setShowAlertModal(true);
      return;
    }

    if (!profile || !dishes.length) return;

    setLoading(true);

    try {
      const newPlan = createSmartWeeklyMealPlan(profile, dishes);

      // Preserve logged meals so they stay 'added' after regeneration
      const preserved = preserveLoggedMeals(newPlan, mealLog, dishes);

      // Update state
      const planWithSnapshot = {
        ...preserved,
        profile_snapshot: buildProfileSnapshot(profile),
      };
      setWeeklyPlan(planWithSnapshot);

      // Save to localStorage
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        localStorage.setItem(
          `weeklyPlan_${user.id}`,
          JSON.stringify(planWithSnapshot)
        );

        // Update Supabase profile
        const planStartISO = new Date(
          planWithSnapshot.start_date
        ).toISOString();
        const planEndISO = new Date(planWithSnapshot.end_date).toISOString();
        const safePlanJSON = JSON.parse(JSON.stringify(planWithSnapshot));

        const { error: updateError } = await supabase
          .from("health_profiles")
          .update({
            plan_start_date: planStartISO,
            plan_end_date: planEndISO,
            weekly_plan_json: safePlanJSON,
          })
          .eq("user_id", user.id);

        if (updateError) console.error("Supabase update error:", updateError);
      }

      setAlertMessage("Meal plan regenerated successfully!");
      setShowAlertModal(true);
    } catch (error) {
      console.error("Error regenerating meal plan:", error);
      setAlertMessage("Failed to regenerate meal plan. Please try again.");
      setShowAlertModal(true);
    } finally {
      setLoading(false);
    }
  };
  if (loading) return <MealPlanLoader timeframe={profile?.timeframe} />;
  if (!profile) return <NoProfile onNavigate={navigate} />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-100 flex justify-center items-center p-4">
      <div className="bg-white w-[375px] h-[700px] rounded-3xl shadow-2xl overflow-hidden relative">
        <div className="h-full overflow-auto pb-20 scrollbar-hide">
          {/* Header */}
          <div className="bg-white w-full h-[130px] rounded-t-3xl flex flex-col px-2 pt-2 relative border-b-4 border-black">
            <div className="flex justify-between items-start mb-6">
              <div className="p-5">
                <p className="text-m font-semibold text-black">
                  Good {timeOfDay}{" "}
                  <span className="text-black font-bold">
                    {profile?.full_name}!
                  </span>
                </p>
                <p className="text-s font-medium flex items-center gap-2 text-black">
                  Here's your meal plan for today
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 space-y-2">
            <div className="flex justify-between items-center mb-2">
              {/* Date Range */}
              {dateRange && (
                <p className="text-sm font-medium text-black">
                  {dateRange.start} – {dateRange.end} ({profile.timeframe || 7}{" "}
                  Days)
                  <span className="relative inline-flex ml-1 group">
                    <FaInfoCircle className="text-red-700 cursor-pointer" />
                    <span
                      className="absolute left-full top-1/2 ml-2 max-w-xs
                     bg-green-600 text-white text-xs rounded px-2 py-1
                     opacity-0 group-hover:opacity-100 transition-opacity z-10
                     break-words text-left"
                    >
                      Once you update your health profile, the generation of
                      meals and dishes will adjust accordingly.
                    </span>
                  </span>
                </p>
              )}

              {/* Regenerate Button */}
              <div className="relative group flex items-center">
                <button
                  onClick={handleRegenerateMealPlan}
                  disabled={!canRegenerate}
                  className={`px-3 py-1 text-white rounded-lg shadow transition text-xs ${
                    !canRegenerate
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-green-600 hover:bg-green-700"
                  }`}
                >
                  Regenerate
                </button>

                {!canRegenerate && (
                  <span className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 max-w-xs bg-gray-600 text-white text-xs text-center rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-50 break-words shadow-lg">
                    You cannot regenerate a meal plan with logged meals. A new
                    plan can be generated once the current one is complete.
                  </span>
                )}
              </div>
            </div>

            <MealPlanGrid
              weeklyPlan={memoizedWeeklyPlan}
              mealTypes={mealTypes}
              onOpenDish={handleOpenDish}
            />

            {/* AlertModal with fade */}
            {showAlertModal && (
              <AlertModal
                message={alertMessage}
                visible={alertVisible} // NEW
                onClose={() => setShowAlertModal(false)}
              />
            )}

            {/* SuccessModal */}
            {showSuccessModal && (
              <SuccessModal
                onClose={() => setShowSuccessModal(false)}
                autoCloseDelay={1000}
              />
            )}

            {selectedDish && (
              <DishDetailModal
                dish={selectedDish}
                onClose={() => setSelectedDish(null)}
                onServingSizeChange={handleServingSizeChange}
                onIngredientAmountChange={handleIngredientAmountChange}
                onAddMeal={handleAddMeal}
                boholCities={boholCities}
                selectedCityId={selectedCityId}
                onCityChange={setSelectedCityId}
                storeTypeFilters={storeTypeFilters}
                onStoreTypeFilterChange={(type) =>
                  setStoreTypeFilters((prev) =>
                    prev.includes(type)
                      ? prev.filter((x) => x !== type)
                      : [...prev, type]
                  )
                }
                storeRecommendations={storeRecommendations}
                profile={profile}
                mealLog={mealLog}
              />
            )}

            {/* Exceed Modal */}
            {showExceedModal && (
              <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[1000]">
                <div className="bg-black text-lime-400 w-[320px] rounded-2xl shadow-2xl p-6 flex flex-col gap-4 border border-lime-400">
                  <h2 className="text-lg font-bold text-lime-300">
                    Macro Target Exceeded
                  </h2>
                  <p className="text-sm text-lime-400">{exceedMessage}</p>
                  <div className="flex gap-3">
                    <button
                      onClick={async () => {
                        setShowExceedModal(false);
                        // Proceed with adding the meal
                        const {
                          data: { user },
                        } = await supabase.auth.getUser();
                        const logDate = new Date().toISOString().split("T")[0];
                        await proceedWithAddMeal(
                          selectedDish,
                          selectedDish.planMealType || "unknown",
                          selectedDish,
                          selectedDish.servingSize || 100,
                          selectedDish.meal_date,
                          logDate,
                          user
                        );
                      }}
                      className="flex-1 bg-lime-400 hover:bg-lime-500 text-black font-semibold py-2 rounded-lg transition"
                    >
                      Continue
                    </button>
                    <button
                      onClick={() => setShowExceedModal(false)}
                      className="flex-1 bg-black border border-red-500 text-red-500 hover:bg-red-900 font-medium py-2 rounded-lg transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Combine Servings Modal */}
            {showCombineModal &&
              duplicateMealInfo &&
              createPortal(
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]">
                  <div className="bg-white w-[340px] rounded-2xl shadow-2xl p-6 flex flex-col gap-4">
                    <div className="text-center">
                      <h2 className="text-lg font-bold text-gray-900 mb-2">
                        {duplicateMealInfo.existingMeal.dish_name} is already in
                        your {duplicateMealInfo.existingMeal.meal_type}
                      </h2>
                      <p className="text-sm text-gray-600">
                        Do you want to add it as a new entry or increase the
                        existing portion?
                      </p>
                    </div>

                    <div className="flex gap-3 mt-4">
                      <button
                        onClick={handleCombineMeals}
                        className="flex-1 bg-lime-500 hover:bg-lime-600 text-white font-semibold py-3 rounded-lg transition text-sm"
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
                      className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 rounded-lg transition text-sm mt-2"
                    >
                      Cancel
                    </button>
                  </div>
                </div>,
                document.body
              )}
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0">
          <FooterNav />
        </div>
      </div>
    </div>
  );
}
