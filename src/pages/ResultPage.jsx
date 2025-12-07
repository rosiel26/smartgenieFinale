import React, { useEffect, useState, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { FiMessageCircle, FiCamera } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import FooterNav from "../components/FooterNav";
import MealTypeModal from "../components/MealTypeModal.jsx";
import AlertModal from "../components/AlertModal";
import {
  getBoholCities,
  recommendStoresForIngredients,
} from "../services/storeService";
import { logMealAndGetSuggestion } from "../services/mealService";

// Custom Modal Component
function CustomModal({ isOpen, onClose, title, children, actions }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white rounded-3xl shadow-2xl w-11/12 max-w-xs p-3"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-base font-bold text-black">{title}</h2>
              <button
                onClick={onClose}
                className="text-black bg-lime-200 hover:bg-lime-300 rounded-full p-1 transition"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="text-gray-700 text-sm space-y-3">{children}</div>

            {/* Actions */}
            {actions && (
              <div className="mt-4 flex justify-end gap-2">
                {actions.map((action, idx) => (
                  <button
                    key={idx}
                    onClick={action.onClick}
                    className={`px-3 py-2 rounded-lg font-semibold transition text-sm ${
                      action.variant === "primary"
                        ? "bg-lime-600 text-white hover:bg-lime-700"
                        : "bg-gray-200 text-black hover:bg-gray-300"
                    }`}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function ResultPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    dishId,
    imageSrc: fallbackImage,
    accuracy,
    isLoggedIn = false,
  } = location.state || {};

  const [dish, setDish] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedServing, setSelectedServing] = useState("Per 100g");
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [selectedCityId, setSelectedCityId] = useState("tagbilaran");
  const [boholCities, setBoholCities] = useState([]);
  const [storeRecommendations, setStoreRecommendations] = useState([]);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [showMealTypeModal, setShowMealTypeModal] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [profile, setProfile] = useState(null);
  const [mealLog, setMealLog] = useState([]);
  const [showExceedModal, setShowExceedModal] = useState(false);
  const [exceedMessage, setExceedMessage] = useState("");
  const [skipExceedCheck, setSkipExceedCheck] = useState(false);
  const [pendingMealType, setPendingMealType] = useState(null);

  const fileInputRef = useRef(null);

  const servingOptions = [
    { label: "Per 100g", multiplier: 1 },
    { label: "Per serving (152g)", multiplier: 1.52 },
    { label: "Per cup (245g)", multiplier: 2.45 },
  ];

  const nutritionMultiplier =
    servingOptions.find((s) => s.label === selectedServing)?.multiplier || 1;
  const getNutritionValue = (baseValue) =>
    ((baseValue || 0) * nutritionMultiplier).toFixed(1);

  const fetchDish = useCallback(async () => {
    if (!dishId) return navigate("/", { replace: true });
    setLoading(true);
    const { data, error } = await supabase
      .from("dishinfo")
      .select(
        "id,name,image_url,calories_value,protein_value,fat_value,carbs_value,ingredient,store,dietary,allergen,goal,description"
      )
      .eq("id", dishId)
      .single();

    if (error) setError(`Failed to load dish info: ${error.message}`);
    else if (data)
      setDish({
        id: data.id,
        name: data.name,
        image: fallbackImage || data.image_url,
        calories: data.calories_value || 0,
        protein: data.protein_value || 0,
        fat: data.fat_value || 0,
        carbs: data.carbs_value || 0,
        ingredient: data.ingredient || "",
        description: data.description || "",
      });
    setLoading(false);
  }, [dishId, fallbackImage, navigate]);

  useEffect(() => {
    fetchDish();
  }, [fetchDish]);

  useEffect(() => {
    const fetchProfileAndMeals = async () => {
      if (!isLoggedIn) return;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const [profileRes, mealsRes] = await Promise.all([
        supabase
          .from("health_profiles")
          .select("*")
          .eq("user_id", user.id)
          .single(),
        supabase.from("meal_logs").select("*").eq("user_id", user.id),
      ]);

      if (profileRes.data) setProfile(profileRes.data);
      if (mealsRes.data) setMealLog(mealsRes.data);
    };
    fetchProfileAndMeals();
  }, [isLoggedIn]);

  // Hide scrollbar on this page
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const ingredientList = dish?.ingredient
    ? String(dish.ingredient)
        .split(",")
        .map((n) => ({ name: n.trim() }))
    : [];

  useEffect(() => {
    getBoholCities().then(setBoholCities);
  }, []);
  useEffect(() => {
    if (!dish) return;
    recommendStoresForIngredients(ingredientList, selectedCityId, {}).then(
      setStoreRecommendations
    );
  }, [dish, selectedCityId]);

  const handleAddMeal = async (mealType) => {
    setShowMealTypeModal(false);
    if (!isLoggedIn || !dish)
      return (
        setShowAlertModal(true),
        setAlertMessage("You must be logged in to add a meal.")
      );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const today = new Date();
    const logDate = `${today.getFullYear()}-${String(
      today.getMonth() + 1
    ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    const adjustedTotals = {
      calories: Number(getNutritionValue(dish.calories)),
      protein: Number(getNutritionValue(dish.protein)),
      carbs: Number(getNutritionValue(dish.carbs)),
      fat: Number(getNutritionValue(dish.fat)),
    };

    if (!skipExceedCheck) {
      // Check if adding this meal would exceed daily macro targets
      const currentDayMeals = mealLog.filter((m) => m.meal_date === logDate);
      const currentTotals = currentDayMeals.reduce(
        (totals, m) => ({
          carbs: totals.carbs + (m.carbs || 0),
          protein: totals.protein + (m.protein || 0),
          fat: totals.fat + (m.fat || 0),
        }),
        { carbs: 0, protein: 0, fat: 0 }
      );

      const projectedTotals = {
        carbs: currentTotals.carbs + adjustedTotals.carbs,
        protein: currentTotals.protein + adjustedTotals.protein,
        fat: currentTotals.fat + adjustedTotals.fats,
      };

      let exceedMsg = "";
      const projectedCalories =
        currentTotals.calories + adjustedTotals.calories;
      if (projectedCalories > (profile?.calorie_needs || 0)) {
        exceedMsg =
          "You've gone over your calorie target for today. That's okay — staying aware is what matters. Consider lighter portions for your next meal.";
      } else if (projectedTotals.carbs > (profile?.carbs_needed || 0)) {
        exceedMsg =
          "You've gone over your carbohydrate target for today. That's okay — staying aware is what matters. Consider focusing on lower-carb options for your next meal.";
      } else if (projectedTotals.protein > (profile?.protein_needed || 0)) {
        exceedMsg =
          "You've gone over your protein target for today. That's okay — staying aware is what matters. You might balance it with lighter protein sources for your next meal.";
      } else if (projectedTotals.fat > (profile?.fats_needed || 0)) {
        exceedMsg =
          "You've gone over your fat target for today. That's okay — staying aware is what matters. Try choosing lighter-fat foods for your next meal.";
      }

      if (exceedMsg) {
        setExceedMessage(exceedMsg);
        setPendingMealType(mealType);
        setShowExceedModal(true);
        return;
      }
    } else {
      setSkipExceedCheck(false);
    }

    // Proceed with adding the meal
    const mealLogData = {
      dish_uuid: dish.id, // This page uses UUID
      dish_name: dish.name,
      meal_date: logDate,
      calories: adjustedTotals.calories,
      protein: adjustedTotals.protein,
      carbs: adjustedTotals.carbs,
      fat: adjustedTotals.fat,
      meal_type: mealType.toLowerCase(),
    };

    const { success, suggestion } = await logMealAndGetSuggestion(mealLogData);

    if (success) {
      setAlertMessage(`${dish.name} added to ${mealType}! ${suggestion}`);
    } else {
      setAlertMessage(suggestion || `Failed to add meal.`);
    }
    setShowAlertModal(true);
  };

  const handleSubmitFeedback = async () => {
    if (!isLoggedIn)
      return (
        setAlertMessage("You must log in first to submit feedback."),
        setShowAlertModal(true),
        navigate("/login")
      );
    if (!feedbackText.trim())
      return (
        setAlertMessage("Please enter your feedback."), setShowAlertModal(true)
      );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("feedback_submissions").insert([
      {
        user_id: user.id,
        dish_id: dish.id,
        feedback_text: feedbackText.trim(),
      },
    ]);

    setAlertMessage(
      error
        ? `Failed to submit feedback: ${error.message}`
        : "Thank you for your feedback!"
    );
    setFeedbackText("");
    setShowFeedbackModal(false);
    setShowAlertModal(true);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Image = event.target.result;
      navigate("/analyze", { state: { image: base64Image } });
    };
    reader.readAsDataURL(file);

    // Reset input so the same file can be selected again
    e.target.value = "";
  };

  if (loading)
    return (
      <p className="text-center mt-10 animate-pulse text-lime-600 font-semibold">
        Loading...
      </p>
    );
  if (error)
    return <p className="text-center mt-10 text-red-600 font-bold">{error}</p>;
  if (!dish) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-lime-50 via-white to-lime-100 flex justify-center items-center p-4">
      <div className="bg-white w-[375px] h-[700px] rounded-3xl shadow-2xl overflow-hidden flex flex-col relative">
        {/* Hidden File Input for Scan Again */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/*"
          className="hidden"
        />

        {/* Floating Scan Again Button */}
        <motion.button
          onClick={() => fileInputRef.current?.click()}
          className={`absolute right-4 ${
            isLoggedIn ? "bottom-20" : "bottom-4"
          } z-40 bg-lime-600 hover:bg-lime-700 text-white p-4 rounded-full shadow-lg transition-all hover:scale-110`}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
          title="Scan Again"
        >
          <FiCamera className="w-6 h-6" />
        </motion.button>
        <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-hide">
          {/* Dish Image */}
          <div className="relative rounded-2xl overflow-hidden shadow-lg">
            <motion.img
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              src={dish.image}
              alt={dish.name}
              className="w-full h-64 object-cover"
            />
            {accuracy && (
              <span className="absolute bottom-3 right-3 bg-lime-600 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-md">
                {accuracy}% Match
              </span>
            )}
          </div>

          {/* Dish Info */}
          <div className="flex justify-between items-start">
            <h1 className="text-2xl font-bold text-black">{dish.name}</h1>
            <button
              onClick={() => setShowFeedbackModal(true)}
              className="bg-lime-500 p-2 rounded-full shadow hover:bg-lime-600 transition"
            >
              <FiMessageCircle className="text-white w-5 h-5" />
            </button>
          </div>

          {/* Description */}
          {dish.description && (
            <p className="text-gray-700 text-sm leading-relaxed">
              {showFullDescription
                ? dish.description
                : `${dish.description.slice(0, 120)}...`}
              {dish.description.length > 120 && (
                <button
                  onClick={() => setShowFullDescription(!showFullDescription)}
                  className="text-lime-600 font-medium ml-1 hover:underline"
                >
                  {showFullDescription ? "Show less" : "Show more"}
                </button>
              )}
            </p>
          )}

          {/* Disclaimer */}
          <p className="text-xs text-gray-600 text-center bg-lime-50 p-2 rounded-lg">
            All macro values are estimates generated from your input and may
            vary depending on actual ingredients and serving sizes.
          </p>

          {/* Nutrition */}
          <div className="bg-lime-50 border border-lime-300 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-black text-sm">Serving</span>
              <select
                value={selectedServing}
                onChange={(e) => setSelectedServing(e.target.value)}
                className="border border-lime-300 px-1 py-0.5 rounded text-black text-xs bg-white"
              >
                {servingOptions.map((s) => (
                  <option key={s.label} value={s.label}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  label: "Calories",
                  value: dish.calories,
                  color: "bg-lime-500",
                  icon: "🔥",
                  border: "border-lime-400",
                },
                {
                  label: "Protein",
                  value: dish.protein,
                  color: "bg-black",
                  icon: "💪",
                  border: "border-pink-400",
                },
                {
                  label: "Fat",
                  value: dish.fat,
                  color: "bg-lime-700",
                  icon: "🧈",
                  border: "border-orange-400",
                },
                {
                  label: "Carbs",
                  value: dish.carbs,
                  color: "bg-lime-300",
                  icon: "🍞",
                  border: "border-violet-400",
                },
              ].map(({ label, value, color, icon, border }) => (
                <div
                  key={label}
                  className={`border ${border} rounded-lg p-2 text-center`}
                >
                  <div className="text-lg mb-1">{icon}</div>
                  <div className="text-black text-sm font-medium mb-1">
                    {label}
                  </div>
                  <div className="font-bold text-lime-600 text-sm mb-2">
                    {getNutritionValue(value)}
                  </div>
                  <div className="w-full h-2 bg-lime-200 rounded">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: `${Math.min(
                          (getNutritionValue(value) / 300) * 100,
                          100
                        )}%`,
                      }}
                      className={`h-2 rounded ${color}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ingredients Table */}
          {ingredientList.length > 0 && (
            <div className="overflow-x-auto border border-lime-300 rounded-2xl p-4 bg-white shadow-sm">
              <h2 className="font-semibold text-black mb-3">Ingredients</h2>
              <table className="min-w-full text-sm text-left text-black border-collapse">
                <thead className="bg-lime-200">
                  <tr>
                    <th className="px-4 py-2 font-medium">#</th>
                    <th className="px-4 py-2 font-medium">Ingredient</th>
                  </tr>
                </thead>
                <tbody>
                  {ingredientList.map((ingredient, idx) => (
                    <tr
                      key={idx}
                      className={`border-t border-lime-400 ${
                        idx % 2 === 0 ? "bg-white" : "bg-lime-50"
                      }`}
                    >
                      <td className="px-4 py-2">{idx + 1}</td>
                      <td className="px-4 py-2">{ingredient.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Stores */}
          {ingredientList.length > 0 && (
            <div className="border border-lime-300 rounded-2xl p-4 space-y-3 bg-white">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-black text-base">
                  Where to Buy (Bohol)
                </span>
                <select
                  value={selectedCityId}
                  onChange={(e) => setSelectedCityId(e.target.value)}
                  className="border border-lime-300 px-2 py-1 rounded text-black text-sm bg-white"
                >
                  {boholCities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                {storeRecommendations.map((rec) => (
                  <div
                    key={rec.ingredient.name}
                    className="border border-lime-200 rounded-lg p-3 bg-white"
                  >
                    <p className="font-medium text-black mb-2">
                      {rec.ingredient.name}
                    </p>
                    {rec.stores.length > 0 ? (
                      <ul className="text-sm text-black list-disc list-inside space-y-1">
                        {rec.stores.map((s) => (
                          <li key={s.id}>
                            <span className="font-medium">{s.name}</span>
                            <span className="ml-2 text-xs text-lime-600">
                              (
                              {s.type === "public_market"
                                ? "Public Market"
                                : "Supermarket"}
                              )
                            </span>
                            {s.address && (
                              <span className="ml-2 text-xs text-lime-700">
                                - {s.address}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-lime-600">
                        No suggestions for this city.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add Meal Button */}
          <div className="mt-4">
            <button
              onClick={() =>
                isLoggedIn ? setShowMealTypeModal(true) : navigate("/login")
              }
              className="w-full bg-lime-600 hover:bg-lime-700 text-white py-3 rounded-2xl font-semibold shadow transition"
            >
              {isLoggedIn ? "Add as Meal" : "Continue"}
            </button>
          </div>
        </div>

        {isLoggedIn && <FooterNav />}

        {/* Meal Type Modal */}
        <MealTypeModal
          isOpen={showMealTypeModal}
          onClose={() => setShowMealTypeModal(false)}
          onSelectMealType={handleAddMeal}
        />

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
                  onClick={() => {
                    setShowExceedModal(false);
                    setSkipExceedCheck(true);
                    handleAddMeal(pendingMealType);
                    setPendingMealType(null);
                  }}
                  className="flex-1 bg-lime-400 hover:bg-lime-500 text-black font-semibold py-2 rounded-lg transition"
                >
                  Continue
                </button>
                <button
                  onClick={() => {
                    setShowExceedModal(false);
                    setPendingMealType(null);
                  }}
                  className="flex-1 bg-black border border-red-500 text-red-500 hover:bg-red-900 font-medium py-2 rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Alert Modal */}
        {showAlertModal && (
          <AlertModal
            message={alertMessage}
            onClose={() => setShowAlertModal(false)}
          />
        )}

        {/* Feedback Modal */}
        <CustomModal
          isOpen={showFeedbackModal}
          onClose={() => setShowFeedbackModal(false)}
          title="Submit Feedback"
          actions={[
            {
              label: "Cancel",
              onClick: () => setShowFeedbackModal(false),
              variant: "secondary",
            },
            {
              label: "Submit",
              onClick: handleSubmitFeedback,
              variant: "primary",
            },
          ]}
        >
          <textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            className="w-full border border-lime-300 rounded p-2 text-sm focus:ring-2 focus:ring-lime-400 outline-none"
            rows={3}
            placeholder="Your feedback..."
          />
        </CustomModal>
      </div>
    </div>
  );
}
