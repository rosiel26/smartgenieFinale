import React, { useEffect, useState, useMemo, useCallback } from "react";
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
import NoProfile from "../components/NoProfile";
import MealPlanLoader from "../components/MealPlanLoader";
import {
  createSmartWeeklyMealPlan,
  markAddedMeals,
  prepareDishForModal,
  computeDishTotalsWithIngredientOverrides,
  formatDateRange,
} from "../utils/mealplan";
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
  const [selectedDish, setSelectedDish] = useState(null);
  const [selectedCityId, setSelectedCityId] = useState("tagbilaran");
  const [storeTypeFilters, setStoreTypeFilters] = useState([]);
  const [timeOfDay, setTimeOfDay] = useState("");
  const [boholCities, setBoholCities] = useState([]);
  const [storeRecommendations, setStoreRecommendations] = useState([]);

  const navigate = useNavigate();

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
          ingredients_dish_id_fkey(id, name, amount, unit, calories, protein, fats, carbs, is_rice)
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

      setProfile(profileData);
      setDishes(dishesData);
      setMealLog(mealData);

      let plan = null;
      let shouldRegeneratePlan = false;

      if (profileData.plan_start_date && profileData.plan_end_date) {
        const savedPlanRaw = localStorage.getItem(`weeklyPlan_${user.id}`);
        if (savedPlanRaw) {
          plan = JSON.parse(savedPlanRaw);

          // Parse dates from the SAVED PLAN, not profile data, to avoid sync issues
          // Use the plan's own start_date and end_date for consistency
          const planStartStr = plan.start_date || profileData.plan_start_date;
          const planEndStr = plan.end_date || profileData.plan_end_date;
          
          // Parse date strings consistently - extract year, month, day parts
          const parseLocalDate = (dateStr) => {
            if (!dateStr) return null;
            // Handle both "YYYY-MM-DD" and ISO format "YYYY-MM-DDTHH:mm:ss.sssZ"
            const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (match) {
              return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
            }
            return new Date(dateStr);
          };
          
          const planStartDate = parseLocalDate(planStartStr);
          const planEndDate = parseLocalDate(planEndStr);
          
          const now = new Date();
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

          // Calculate duration using consistently parsed dates
          const planDuration = planStartDate && planEndDate
            ? Math.round((planEndDate.getTime() - planStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
            : 0;

          // Only regenerate if plan has expired OR duration doesn't match timeframe
          if (planEndDate < today || Math.abs(planDuration - profileData.timeframe) > 1) {
            shouldRegeneratePlan = true;
            plan = null;
          }
        } else {
          shouldRegeneratePlan = true;
        }
      } else {
        shouldRegeneratePlan = true;
      }

      if (!plan || shouldRegeneratePlan) {
        plan = createSmartWeeklyMealPlan(profileData, dishesData);
        localStorage.setItem(`weeklyPlan_${user.id}`, JSON.stringify(plan));

        const planStartISO = new Date(plan.start_date).toISOString();
        const planEndISO = new Date(plan.end_date).toISOString();
        const safePlanJSON = JSON.parse(JSON.stringify(plan));

        const { error: updateError } = await supabase
          .from("health_profiles")
          .update({
            plan_start_date: planStartISO,
            plan_end_date: planEndISO,
            weekly_plan_json: safePlanJSON,
          })
          .eq("user_id", user.id);

        if (updateError) 
          console.error("Supabase update error:", updateError);
      }

      const updatedPlan = markAddedMeals(plan, mealData);
      setWeeklyPlan(updatedPlan);
      localStorage.setItem(
        `weeklyPlan_${user.id}`,
        JSON.stringify(updatedPlan)
      );
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
  }, [navigate]);

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

  // -------------------- AUTO-CLOSE ALERT --------------------
  useEffect(() => {
    let fadeOutTimer;

    if (showAlertModal) {
      setAlertVisible(true); // fade in

      fadeOutTimer = setTimeout(() => {
        setAlertVisible(false); // fade out
        setTimeout(() => setShowAlertModal(false), 500); // hide after transition
      }, 1000); // visible for 3s
    }

    return () => clearTimeout(fadeOutTimer);
  }, [showAlertModal]);

  // -------------------- HANDLERS --------------------
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

      const riceIngredient = (meal.ingredients_dish_id_fkey || []).find(
        (ing) => ing.is_rice
      );
      const riceAmount = riceIngredient?.amount;
      const hasRice = riceAmount && Number(riceAmount) > 0; // only if > 0
      const dishName = hasRice
        ? `${meal.name || "Unknown Dish"} with rice`
        : meal.name || "Unknown Dish";

      const mealLogData = {
        user_id: user.id,
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

      const { error } = await supabase.from("meal_logs").insert([mealLogData]);
      if (error) throw error;

      setMealLog((prev) => [...(prev || []), mealLogData]);

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
      setAlertMessage("Meal added successfully!");
      setShowAlertModal(true);
    } catch (error) {
      console.error("Error adding meal:", error);
      setAlertMessage("Failed to add meal. Please try again.");
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
      if (planEndDate < today) return true;
    }

    for (const day of weeklyPlan.plan) {
      if (day.meals.some((meal) => meal.status === "added")) {
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

      // Mark already added meals
      const updatedPlan = markAddedMeals(newPlan, mealLog);

      // Update state
      setWeeklyPlan(updatedPlan);

      // Save to localStorage
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        localStorage.setItem(
          `weeklyPlan_${user.id}`,
          JSON.stringify(updatedPlan)
        );

        // Update Supabase profile
        const planStartISO = new Date(newPlan.start_date).toISOString();
        const planEndISO = new Date(newPlan.end_date).toISOString();
        const safePlanJSON = JSON.parse(JSON.stringify(newPlan));

        const { error: updateError } = await supabase
          .from("health_profiles")
          .update({
            plan_start_date: planStartISO,
            plan_end_date: planEndISO,
            weekly_plan_json: safePlanJSON,
          })
          .eq("user_id", user.id);

        if (updateError) 
          console.error("Supabase update error:", updateError);
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
        <div className="h-full overflow-auto pb-20">
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
              />
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
