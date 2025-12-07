import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../supabaseClient";
import { logMealAndGetSuggestion, combineMeals } from "../services/mealService";
import SuccessModal from "./SuccessModal";
import jsPDF from "jspdf";

const MealDetailModal = ({
  showMealModal,
  selectedDish: propSelectedDish, // Rename prop to avoid conflict
  setShowMealModal,
  selectedMealType,
  setSelectedMealType,
  servingSize,
  setServingSize,
  handleAddMeal,
  setAlertMessage,
  setShowAlertModal,
  boholCities = [],
  selectedCityId,
  onCityChange,
  storeTypeFilters = [],
  onStoreTypeFilterChange,
  storeRecommendations = [],
  profile,
  mealLog,
}) => {
  const [editableIngredients, setEditableIngredients] = useState([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showMealTypeModal, setShowMealTypeModal] = useState(false);
  const [tempMealType, setTempMealType] = useState("");
  const [showCombineModal, setShowCombineModal] = useState(false);
  const [duplicateMealInfo, setDuplicateMealInfo] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showExceedModal, setShowExceedModal] = useState(false);
  const [exceedMessage, setExceedMessage] = useState("");
  const [skipExceedCheck, setSkipExceedCheck] = useState(false);

  // Create a local state for the dish, ensuring it's a deep copy
  const [selectedDish, setSelectedDish] = useState(null);

  useEffect(() => {
    if (propSelectedDish) {
      // Perform a deep copy of propSelectedDish to ensure isolation
      setSelectedDish(JSON.parse(JSON.stringify(propSelectedDish)));
    } else {
      setSelectedDish(null);
    }
  }, [propSelectedDish]); // Re-run if the prop itself changes

  useEffect(() => {
    if (selectedDish?.ingredients_dish_id_fkey) {
      // Initialize editableIngredients with current amounts and original values, ensuring each ingredient has an 'id' for keying
      setEditableIngredients(
        selectedDish.ingredients_dish_id_fkey.map((ing) => ({
          ...ing,
          id: ing.id || ing.name,
          amount: Number(ing.amount), // Ensure amount is a number from the start
          originalAmount: Number(ing.amount),
          originalCalories: ing.calories || 0,
          originalProtein: ing.protein || 0,
          originalCarbs: ing.carbs || 0,
          originalFats: ing.fats || 0,
        }))
      );
    } else {
      setEditableIngredients([]);
    }
  }, [selectedDish]);

  useEffect(() => {
    if (selectedDish) setServingSize(100);
  }, [selectedDish]);

  const getScaledMacros = (ing) => {
    const scale = ing.originalAmount > 0 ? ing.amount / ing.originalAmount : 1;
    return {
      calories: Math.ceil(ing.originalCalories * scale || 0),
      protein: Math.ceil(ing.originalProtein * scale || 0),
      carbs: Math.ceil(ing.originalCarbs * scale || 0),
      fats: Math.ceil(ing.originalFats * scale || 0),
    };
  };

  const computeDishTotals = (dish, ingredientsToUse) => {
    const ingredientsList =
      ingredientsToUse || dish?.ingredients_dish_id_fkey || [];
    return ingredientsList.reduce(
      (totals, ing) => {
        const scaled = getScaledMacros(ing);
        return {
          calories: totals.calories + scaled.calories,
          protein: totals.protein + scaled.protein,
          carbs: totals.carbs + scaled.carbs,
          fats: totals.fats + scaled.fats,
        };
      },
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    );
  };

  const totals = useMemo(() => {
    if (!selectedDish) return { calories: 0, protein: 0, carbs: 0, fats: 0 };
    // Always compute from editableIngredients so user edits are reflected
    // This ensures the displayed macros match what the user actually edited
    return computeDishTotals(selectedDish, editableIngredients);
  }, [selectedDish, editableIngredients]);

  const totalWeight = useMemo(
    () =>
      editableIngredients.reduce(
        (sum, ing) => sum + (Number(ing.amount) || 0),
        0
      ),
    [editableIngredients]
  );

  const multiplier = servingSize / 100;
  const steps = selectedDish?.steps || [];
  // Use editableIngredients here for rendering the table
  const ingredientsToDisplay = editableIngredients;
  const storeRecs = storeRecommendations || [];

  const handleAdd = () => {
    if (!selectedMealType) {
      // Show meal type selection modal if not selected
      setShowMealTypeModal(true);
      // Auto-close modal after 2 seconds
      setTimeout(() => setShowMealTypeModal(false), 2000);
      return;
    }

    if (!skipExceedCheck && profile && mealLog) {
      // Check if adding this meal would exceed daily macro targets
      const logDate = new Date().toISOString().split("T")[0];
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
        carbs: currentTotals.carbs + totals.carbs,
        protein: currentTotals.protein + totals.protein,
        fat: currentTotals.fat + totals.fats,
      };

      const projectedCalories = currentTotals.calories + totals.calories;

      let exceedMsg = "";
      if (projectedCalories > (profile.calorie_needs || 0)) {
        exceedMsg =
          "You've gone over your calorie target for today. That's okay — staying aware is what matters. Consider lighter portions for your next meal.";
      } else if (projectedTotals.carbs > (profile.carbs_needed || 0)) {
        exceedMsg =
          "You've gone over your carbohydrate target for today. That's okay — staying aware is what matters. Consider focusing on lower-carb options for your next meal.";
      } else if (projectedTotals.protein > (profile.protein_needed || 0)) {
        exceedMsg =
          "You've gone over your protein target for today. That's okay — staying aware is what matters. You might balance it with lighter protein sources for your next meal.";
      } else if (projectedTotals.fat > (profile.fats_needed || 0)) {
        exceedMsg =
          "You've gone over your fat target for today. That's okay — staying aware is what matters. Try choosing lighter-fat foods for your next meal.";
      }

      if (exceedMsg) {
        setExceedMessage(exceedMsg);
        setShowExceedModal(true);
        return;
      }
    } else {
      setSkipExceedCheck(false);
    }

    // Show confirmation modal instead of directly adding
    setShowConfirmModal(true);
  };

  const handleConfirmAdd = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setAlertMessage("Please log in to add meals");
        setShowAlertModal(true);
        return;
      }

      // Check if dish has rice with amount > 0
      const riceIngredient = editableIngredients.find(
        (ing) => ing.is_rice && Number(ing.amount) > 0
      );
      const hasRice = !!riceIngredient;

      // Normalize dish name by removing " with rice" if present
      let baseName = selectedDish.name || "Unknown Dish";
      if (baseName.toLowerCase().endsWith(" with rice")) {
        baseName = baseName.slice(0, -9).trim();
      }

      // Create modified dish with "with rice" if applicable
      const modifiedDish = {
        ...selectedDish,
        name: hasRice ? `${baseName} with rice` : baseName,
      };

      const logDate = new Date().toISOString().split("T")[0];

      const mealLogData = {
        dish_id: modifiedDish.id,
        dish_name: modifiedDish.name,
        meal_date: logDate,
        calories: totals.calories,
        protein: totals.protein,
        carbs: totals.carbs,
        fat: totals.fats,
        meal_type: selectedMealType,
        serving_label: `${servingSize} g`,
        created_at: new Date().toISOString(),
      };

      const result = await logMealAndGetSuggestion(mealLogData);

      if (result.isDuplicate) {
        setDuplicateMealInfo({
          existingMeal: result.existingMeal,
          newMealData: result.newMealData,
          meal: modifiedDish,
          mealType: selectedMealType,
          adjustedTotals: totals,
          servingSize,
          mealDate: logDate,
        });
        setShowCombineModal(true);
        return;
      }

      if (result.success) {
        setShowSuccessModal(true);
      } else {
        setAlertMessage(
          result.suggestion || "Failed to add meal. Please try again."
        );
        setShowAlertModal(true);
      }
    } catch (error) {
      setAlertMessage("Failed to add meal. Please try again.");
      setShowAlertModal(true);
    }

    setShowConfirmModal(false);
    setShowMealModal(false);
  };

  const handleCancelConfirm = () => {
    // Cancel confirmation and go back to meal detail modal
    setShowConfirmModal(false);
  };

  const handleCombineMeals = async () => {
    if (!duplicateMealInfo) return;

    const { existingMeal, newMealData } = duplicateMealInfo;
    const result = await combineMeals(existingMeal, newMealData);

    if (result.success) {
      setShowSuccessModal(true);
    } else {
      setAlertMessage(
        result.suggestion || "Failed to combine meals. Please try again."
      );
      setShowAlertModal(true);
    }

    setShowCombineModal(false);
    setDuplicateMealInfo(null);
    setShowMealModal(false);
  };

  const handleAddSeparateMeal = async () => {
    if (!duplicateMealInfo) return;

    const { newMealData } = duplicateMealInfo;

    const result = await logMealAndGetSuggestion(newMealData, true);

    if (result.success) {
      setShowSuccessModal(true);
    } else {
      setAlertMessage(
        result.suggestion || "Failed to add meal. Please try again."
      );
      setShowAlertModal(true);
    }

    setShowCombineModal(false);
    setDuplicateMealInfo(null);
    setShowMealModal(false);
  };

  const handleIngredientAmountChange = (ingredientId, newAmount) => {
    setEditableIngredients((prevIngredients) =>
      prevIngredients.map((ing) =>
        ing.id === ingredientId ? { ...ing, amount: Number(newAmount) } : ing
      )
    );
  };

  const generateShoppingListPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 15;
    const margin = 10;
    const maxWidth = pageWidth - margin * 2;

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("Shopping List", margin, yPosition);
    yPosition += 12;

    // Dish name
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(`Dish: ${selectedDish.name}`, margin, yPosition);
    yPosition += 8;

    // Meal type and serving size
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Meal Type: ${selectedMealType}`, margin, yPosition);
    yPosition += 5;
    doc.text(`Serving Size: ${servingSize}g`, margin, yPosition);
    yPosition += 10;

    // Ingredients section
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Ingredients:", margin, yPosition);
    yPosition += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    // Add ingredients
    ingredientsToDisplay.forEach((ing) => {
      const ingredientText = `• ${ing.name} - ${ing.amount}${ing.unit || ""}`;
      const lines = doc.splitTextToSize(ingredientText, maxWidth - 5);
      lines.forEach((line) => {
        if (yPosition + 5 > pageHeight - 20) {
          doc.addPage();
          yPosition = 15;
        }
        doc.text(line, margin + 2, yPosition);
        yPosition += 5;
      });
    });

    yPosition += 8;

    // Where to buy section
    if (storeRecs.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Where to Buy:", margin, yPosition);
      yPosition += 8;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);

      storeRecs.forEach((rec) => {
        if (yPosition + 10 > pageHeight - 20) {
          doc.addPage();
          yPosition = 15;
        }

        // Ingredient name
        doc.setFont("helvetica", "bold");
        doc.text(`${rec.ingredient?.name}:`, margin + 2, yPosition);
        yPosition += 5;

        doc.setFont("helvetica", "normal");

        // Stores for this ingredient
        if (rec.stores?.length) {
          rec.stores.forEach((store) => {
            if (yPosition + 5 > pageHeight - 20) {
              doc.addPage();
              yPosition = 15;
            }

            const storeType =
              store.type === "public_market" ? "Public Market" : "Supermarket";
            const storeText = `  • ${store.name} (${storeType})`;
            const lines = doc.splitTextToSize(storeText, maxWidth - 10);

            lines.forEach((line, idx) => {
              doc.text(line, margin + 4, yPosition);
              yPosition += 4;
            });

            // Add address if available
            if (store.address) {
              const addressText = `    📍 ${store.address}`;
              const addressLines = doc.splitTextToSize(
                addressText,
                maxWidth - 15
              );
              addressLines.forEach((line) => {
                doc.text(line, margin + 4, yPosition);
                yPosition += 4;
              });
            }
          });
        } else {
          doc.text("  No suggestions available", margin + 4, yPosition);
          yPosition += 5;
        }

        yPosition += 3;
      });
    }

    // Save PDF
    doc.save(`${selectedDish.name}-shopping-list.pdf`);
  };

  if (!showMealModal || !selectedDish) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[999]">
      <div className="bg-white text-black w-[360px] max-w-full h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden relative transition-all border">
        {/* Dish Name and Add Button */}
        <div className="flex items-center justify-between p-4 border-b  bg-black border-lime-400">
          <button
            onClick={() => setShowMealModal(false)}
            className="text-white hover:text-lime-600 text-2xl font-bold"
            aria-label="Close modal"
          >
            ←
          </button>
          <h1 className="text-white text-xl font-bold truncate flex-1 text-center">
            {selectedDish.name}
          </h1>
          <button
            onClick={handleAdd}
            className="bg-lime-400 hover:bg-lime-500 text-black px-4 py-2 rounded-lg font-medium shadow"
          >
            Add
          </button>
        </div>
        <div>
          <p className="text-xs text-gray-600/80 p-4 text-center">
            all macro values are estimates generated from your input and may
            vary depending on actual ingredients and serving sizes.
          </p>
        </div>

        {/* Nutrition Summary and Image */}
        <div className="flex gap-4 p-4">
          <div className="flex-1">
            <div className="grid grid-cols-2 gap-1 text-xs">
              <div className="border border-lime-400 rounded p-1 text-center">
                <div className="text-lg">🔥</div>
                <div className="text-black">Calories</div>
                <div className="font-bold text-lime-600">
                  {Math.ceil(totals.calories * multiplier)} kcal
                </div>
              </div>
              <div className="border border-pink-400 rounded p-1 text-center">
                <div className="text-lg">💪</div>
                <div className="text-black">Protein</div>
                <div className="font-bold text-lime-600">
                  {Math.ceil(totals.protein * multiplier)} g
                </div>
              </div>
              <div className="border border-violet-400 rounded p-1 text-center">
                <div className="text-lg">🍞</div>
                <div className="text-black">Carbs</div>
                <div className="font-bold text-lime-600">
                  {Math.ceil(totals.carbs * multiplier)} g
                </div>
              </div>
              <div className="border border-orange-400 rounded p-1 text-center">
                <div className="text-lg">🧈</div>
                <div className="text-black">Fat</div>
                <div className="font-bold text-lime-600">
                  {Math.ceil(totals.fats * multiplier)} g
                </div>
              </div>
            </div>
          </div>
          {selectedDish.image_url && (
            <div className="flex-1 pt-2">
              <img
                src={selectedDish.image_url}
                alt={selectedDish.name}
                className="w-full h-32 object-cover rounded border border-lime-400"
              />
            </div>
          )}
        </div>
        <hr />

        {/* Scrollable Content */}
        <div
          className="overflow-y-auto px-2 py-2 flex-1 space-y-2"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {/* Meal Type & Serving Size */}
          <div className=" p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-black font-medium mb-1">
                  Meal Type
                </label>
                <select
                  value={selectedMealType}
                  onChange={(e) => setSelectedMealType(e.target.value)}
                  className="w-full bg-white border rounded px-3 py-2 text-black focus:ring-2 focus:ring-lime-500 outline-none"
                >
                  <option value="">Select Meal Type</option>
                  <option value="Breakfast">Breakfast</option>
                  <option value="Lunch">Lunch</option>
                  <option value="Dinner">Dinner</option>
                  <option value="Snack">Snack</option>
                </select>
              </div>
              <div>
                <label className="block text-black font-medium mb-1">
                  Serving Size (g)
                </label>
                <input
                  type="number"
                  min="1"
                  step="10"
                  value={servingSize}
                  onChange={(e) => setServingSize(Number(e.target.value))}
                  className="w-full bg-white border rounded px-3 py-2 text-black focus:ring-2 focus:ring-lime-500 outline-none"
                />
              </div>
            </div>
          </div>
          <hr />

          {/* Ingredients Card */}
          {ingredientsToDisplay.length > 0 && (
            <div className=" p-2">
              <h3 className="text-black font-semibold text-left mb-2">
                Ingredients
              </h3>
              {selectedDish.source === "dishinfo" ? (
                <div className="text-center">
                  <ul className="list-disc list-inside text-black text-sm space-y-1">
                    {ingredientsToDisplay.map((ing, index) => (
                      <li key={index}>{ing.name}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="overflow-x-auto border  rounded bg-white">
                  <table className="w-full text-sm border-collapse whitespace-nowrap">
                    <thead className="bg-lime-200 text-black">
                      <tr>
                        <th className="p-2 text-left">Ingredient</th>
                        <th className="p-2 text-left">Amount</th>
                        <th className="p-2 text-right">Cal</th>
                        <th className="p-2 text-right">Pro</th>
                        <th className="p-2 text-right">Carbs</th>
                        <th className="p-2 text-right">Fats</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ingredientsToDisplay.map((ing) => {
                        const scaled = getScaledMacros(ing);
                        return (
                          <tr
                            key={ing.id || ing.name}
                            className="border-t border-lime-400"
                          >
                            <td className="p-2 text-black">{ing.name}</td>
                            <td className="p-2">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={ing.amount}
                                onChange={(e) =>
                                  handleIngredientAmountChange(
                                    ing.id,
                                    e.target.value
                                  )
                                }
                                className="w-20 bg-white border border-lime-400 rounded px-2 py-1 text-black focus:ring-2 focus:ring-lime-500 outline-none text-right"
                              />{" "}
                              {ing.unit || ""}
                            </td>
                            <td className="p-2 text-right text-black">
                              {scaled.calories}
                            </td>
                            <td className="p-2 text-right text-black">
                              {scaled.protein}
                            </td>
                            <td className="p-2 text-right text-black">
                              {scaled.carbs}
                            </td>
                            <td className="p-2 text-right text-black">
                              {scaled.fats}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          {/* Steps */}
          {steps.length > 0 && (
            <div className="p-2">
              <h3 className="text-black font-semibold text-left mb-2">Steps</h3>
              <ol className="list-decimal list-inside text-black text-sm space-y-1">
                {steps.map((step, idx) => (
                  <li key={idx}>{step}</li>
                ))}
              </ol>
            </div>
          )}

          {/* Where to Buy Card */}
          {storeRecommendations && storeRecommendations.length > 0 && (
            <div className="border rounded p-4">
              <div className="flex flex-col gap-3 mb-3">
                {/* Header with Title and Download Button */}
                <div className="flex items-center justify-between">
                  <h3 className="text-black font-semibold text-base">
                    Where to Buy (Bohol)
                  </h3>
                  <button
                    onClick={generateShoppingListPDF}
                    className="bg-lime-400 hover:bg-lime-500 text-black px-3 py-1 rounded-full text-sm font-medium transition flex items-center gap-1"
                    title="Download shopping list as PDF"
                  >
                    📥 Download PDF
                  </button>
                </div>

                {/* City Selector */}
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1 text-sm font-medium text-black">
                    City
                  </label>
                  <select
                    className="bg-white border rounded px-2 py-1 text-sm text-black flex-1"
                    value={selectedCityId}
                    onChange={(e) => onCityChange(e.target.value)}
                  >
                    {boholCities.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Store Type Filters */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-black">
                    Store Type:
                  </span>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { id: "supermarket", label: "Supermarket" },
                      { id: "public_market", label: "Public Market" },
                    ].map((t) => {
                      const active = storeTypeFilters.includes(t.id);
                      return (
                        <button
                          key={t.id}
                          onClick={() => onStoreTypeFilterChange(t.id)}
                          className={`px-3 py-1 rounded-full text-sm border  transition ${
                            active
                              ? "bg-lime-400 text-black"
                              : "bg-white text-black"
                          }`}
                        >
                          {t.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {storeRecs.map((rec) => (
                  <div
                    key={rec.ingredient?.id || rec.ingredient?.name}
                    className="border p-2 rounded bg-white"
                  >
                    <p className="font-medium text-black">
                      {rec.ingredient?.name}
                    </p>
                    {rec.stores?.length ? (
                      <ul className="text-sm text-black list-disc list-inside">
                        {rec.stores.map((s) => (
                          <li key={s.id}>
                            <span className="font-medium">{s.name}</span>
                            <span className="ml-2 text-xs text-lime-600">
                              {s.type === "public_market"
                                ? "Public Market"
                                : "Supermarket"}
                            </span>
                            {s.address && (
                              <span className="ml-2 text-xs text-lime-700">
                                {s.address}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-lime-600">
                        No suggestions for this city. Try removing filters.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

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
                  setShowConfirmModal(true);
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
                  {selectedDish.name}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-black font-medium">Meal Type:</span>
                <span className="font-semibold text-black">
                  {selectedMealType}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-black font-medium">Serving Size:</span>
                <span className="font-semibold text-black">{servingSize}g</span>
              </div>

              <div className="border-t border-lime-400 pt-3">
                <p className="text-xs text-black mb-2 font-medium">
                  MACROS (per serving):
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-white border border-lime-400 rounded p-2 text-center">
                    <p className="text-black">Calories</p>
                    <p className="font-bold text-black">
                      {Math.ceil(totals.calories * multiplier)} kcal
                    </p>
                  </div>
                  <div className="bg-white border border-lime-400 rounded p-2 text-center">
                    <p className="text-black">Protein</p>
                    <p className="font-bold text-black">
                      {Math.ceil(totals.protein * multiplier)}g
                    </p>
                  </div>
                  <div className="bg-white border border-lime-400 rounded p-2 text-center">
                    <p className="text-black">Carbs</p>
                    <p className="font-bold text-black">
                      {Math.ceil(totals.carbs * multiplier)}g
                    </p>
                  </div>
                  <div className="bg-white border border-lime-400 rounded p-2 text-center">
                    <p className="text-black">Fats</p>
                    <p className="font-bold text-black">
                      {Math.ceil(totals.fats * multiplier)}g
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleCancelConfirm}
                className="flex-1 bg-black border border-red-500 text-red-500 hover:bg-red-900 font-semibold py-2 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAdd}
                className="flex-1 bg-lime-400 hover:bg-lime-500 text-black font-semibold py-2 rounded-lg transition"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Meal Type Selection Modal */}
      {showMealTypeModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[1000]">
          <div className="bg-black text-lime-400 w-[320px] rounded-2xl shadow-2xl p-6 flex flex-col gap-4 text-center border border-lime-400">
            <h2 className="text-lg font-bold text-lime-300">
              ⚠️ Please choose meal type
            </h2>
            <p className="text-sm text-lime-400">
              Select a meal type before adding this dish.
            </p>
          </div>
        </div>
      )}

      {/* Combine Servings Modal */}
      {showCombineModal &&
        duplicateMealInfo &&
        createPortal(
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[1000]">
            <div className="bg-black text-lime-400 w-[340px] rounded-2xl shadow-2xl p-6 flex flex-col gap-4 border border-lime-400">
              <div className="text-center">
                <h2 className="text-lg font-bold text-lime-300 mb-2">
                  {duplicateMealInfo.existingMeal.dish_name} (
                  {(
                    duplicateMealInfo.existingMeal.serving_label || "0 g"
                  ).replace(" g", "")}
                  g + {duplicateMealInfo.servingSize}g) is already in your{" "}
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
          </div>,
          document.body
        )}

      {/* SuccessModal */}
      {showSuccessModal && (
        <SuccessModal onClose={() => setShowSuccessModal(false)} />
      )}
    </div>
  );
};

export default MealDetailModal;
