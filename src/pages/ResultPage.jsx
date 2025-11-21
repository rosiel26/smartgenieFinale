import React, { useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { FiMessageCircle } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import FooterNav from "../components/FooterNav";
import MealTypeModal from "../components/MealTypeModal.jsx";
import AlertModal from "../components/AlertModal";
import {
  getBoholCities,
  recommendStoresForIngredients,
} from "../services/storeService";

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
    if (!dishId) {
      navigate("/", { replace: true });
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("dishinfo")
      .select(
        "id,name,image_url,calories_value,protein_value,fat_value,carbs_value,ingredient,store,dietary,allergen,goal,description"
      )
      .eq("id", dishId)
      .single();

    if (error) {
      setError(`Failed to load dish info: ${error.message}`);
    } else if (data) {
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
    }
    setLoading(false);
  }, [dishId, fallbackImage, navigate]);

  useEffect(() => {
    fetchDish();
  }, [fetchDish]);

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
    if (!isLoggedIn || !dish) {
      setAlertMessage("You must be logged in to add a meal.");
      setShowAlertModal(true);
      return;
    }

    // Defensive check for dish.id to prevent mobile-specific null value errors
    if (!dish.id || isNaN(parseInt(dish.id, 10))) {
      setAlertMessage("Failed to add meal: Dish ID is missing or invalid.");
      setShowAlertModal(true);
      console.error("Attempted to add meal with invalid dish.id:", dish.id);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const today = new Date();
    const logDate = `${today.getFullYear()}-${String(
      today.getMonth() + 1
    ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    const mealLogData = {
      user_id: user.id,
      dish_id: parseInt(dish.id, 10),
      dish_name: dish.name,
      meal_date: logDate,
      calories: Number(getNutritionValue(dish.calories)),
      protein: Number(getNutritionValue(dish.protein)),
      carbs: Number(getNutritionValue(dish.carbs)),
      fat: Number(getNutritionValue(dish.fat)),
      meal_type: mealType.toLowerCase(),
    };

    const { error } = await supabase.from("meal_logs").insert([mealLogData]);

    if (error) {
      setAlertMessage(`Failed to add meal: ${error.message}`);
      setShowAlertModal(true);
    } else {
      setAlertMessage(`${dish.name} added to ${mealType}!`);
      setShowAlertModal(true);
      setTimeout(() => {
        setShowAlertModal(false);
      }, 1000); // Auto-close success modal after 1 second
    }
  };

  const handleSubmitFeedback = async () => {
    if (!isLoggedIn) {
      setAlertMessage("You must log in first to submit feedback.");
      setShowAlertModal(true);
      navigate("/login");
      return;
    }
    if (!feedbackText.trim()) {
      setAlertMessage("Please enter your feedback.");
      setShowAlertModal(true);
      return;
    }
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

    if (error) {
      setAlertMessage(`Failed to submit feedback: ${error.message}`);
    } else {
      setAlertMessage("Thank you for your feedback!");
      setFeedbackText("");
      setShowFeedbackModal(false);
    }
    setShowAlertModal(true);
  };

  if (loading)
    return <p className="text-center mt-10 animate-pulse">Loading...</p>;
  if (error) return <p className="text-center mt-10 text-red-600">{error}</p>;
  if (!dish) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-100 flex justify-center items-center p-4">
      <div className="bg-white w-[375px] h-[700px] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="relative">
            <motion.img
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              src={dish.image}
              alt={dish.name}
              className="w-full h-60 object-cover rounded-2xl shadow-lg"
            />
            {accuracy && (
              <span className="absolute bottom-3 right-3 bg-green-600 text-white text-xs px-3 py-1 rounded-full">
                {accuracy}% Match
              </span>
            )}
          </div>

          <div className="flex justify-between items-start">
            <h1 className="text-xl font-bold">{dish.name}</h1>
            <button
              onClick={() => setShowFeedbackModal(true)}
              className="bg-green-500 p-2 rounded-full"
            >
              <FiMessageCircle className="text-white w-5 h-5" />
            </button>
          </div>

          {dish.description && (
            <p className="text-sm text-gray-700">
              {showFullDescription
                ? dish.description
                : `${dish.description.slice(0, 100)}...`}
              {dish.description.length > 100 && (
                <button
                  onClick={() => setShowFullDescription(!showFullDescription)}
                  className="text-green-500 text-sm ml-1"
                >
                  {showFullDescription ? "Show less" : "Show more"}
                </button>
              )}
            </p>
          )}

          <div className="bg-green-100 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Serving:</span>
              <select
                value={selectedServing}
                onChange={(e) => setSelectedServing(e.target.value)}
                className="border px-2 py-1 rounded"
              >
                {servingOptions.map((s) => (
                  <option key={s.label} value={s.label}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            {[
              { label: "Calories", value: dish.calories, color: "bg-red-500" },
              { label: "Protein", value: dish.protein, color: "bg-blue-500" },
              { label: "Fat", value: dish.fat, color: "bg-yellow-500" },
              { label: "Carbs", value: dish.carbs, color: "bg-green-500" },
            ].map(({ label, value, color }) => (
              <div key={label} className="space-y-1">
                <div className="flex justify-between items-center">
                  <span>{label}</span>
                  <span>{getNutritionValue(value)}</span>
                </div>
                <div className="w-full h-2 bg-green-200 rounded">
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

          {ingredientList.length > 0 && (
            <div>
              <h2 className="font-semibold mb-1">Ingredients:</h2>
              <ul className="list-disc list-inside text-sm">
                {ingredientList.map((i, idx) => (
                  <li key={idx}>{i.name}</li>
                ))}
              </ul>
            </div>
          )}

          {ingredientList.length > 0 && (
            <div className="border rounded-xl p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Where to buy (Bohol)</span>
                <select
                  value={selectedCityId}
                  onChange={(e) => setSelectedCityId(e.target.value)}
                  className="border px-2 py-1 rounded"
                >
                  {boholCities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              {storeRecommendations.map((rec) => (
                <div key={rec.ingredient.name} className="border p-2 rounded">
                  <p className="font-medium">{rec.ingredient.name}</p>
                  {rec.stores.length > 0 ? (
                    <ul className="list-disc list-inside text-sm">
                      {rec.stores.map((s) => (
                        <li key={s.id}>
                          {s.name} (
                          {s.type === "public_market"
                            ? "Public Market"
                            : "Supermarket"}
                          ){s.address && ` - ${s.address}`}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-gray-500">No stores found</p>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mt-4">
            {isLoggedIn ? (
              <button
                onClick={() => setShowMealTypeModal(true)}
                className="w-full bg-green-500 text-white py-3 rounded-xl mb-2"
              >
                Add as Meal
              </button>
            ) : (
              <button
                onClick={() => navigate("/login")}
                className="w-full bg-green-500 text-white py-3 rounded-xl mb-2"
              >
                Continue
              </button>
            )}
          </div>
        </div>

        {isLoggedIn && <FooterNav />}

        <MealTypeModal
          isOpen={showMealTypeModal}
          onClose={() => setShowMealTypeModal(false)}
          onSelectMealType={handleAddMeal}
        />

        {showAlertModal && (
          <AlertModal
            message={alertMessage}
            onClose={() => setShowAlertModal(false)}
          />
        )}

        <AnimatePresence>
          {showFeedbackModal && (
            <motion.div
              className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="bg-white rounded-2xl shadow-lg w-80 p-5 text-center">
                <h2 className="font-bold mb-3">Submit Feedback</h2>
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  className="w-full border rounded p-2 text-sm focus:ring-2 focus:ring-green-400 outline-none"
                  rows={3}
                  placeholder="Your feedback..."
                />
                <div className="flex justify-end gap-2 mt-4">
                  <button
                    onClick={() => setShowFeedbackModal(false)}
                    className="px-4 py-2 text-sm text-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitFeedback}
                    className="px-4 py-2 text-sm bg-green-500 text-white rounded"
                  >
                    Submit
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
