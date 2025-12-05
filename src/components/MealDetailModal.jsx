import React, { useEffect, useMemo, useState } from "react";

const MealDetailModal = ({
  showMealModal,
  selectedDish,
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
  onCityChange = () => {},
  storeTypeFilters = [],
  onStoreTypeFilterChange = () => {},
  storeRecommendations = [],
}) => {
  const [editableIngredients, setEditableIngredients] = useState([]);

  useEffect(() => {
    if (selectedDish?.ingredients_dish_id_fkey) {
      // Initialize editableIngredients with current amounts, ensuring each ingredient has an 'id' for keying
      setEditableIngredients(
        selectedDish.ingredients_dish_id_fkey.map((ing) => ({
          ...ing,
          // Ensure a unique ID is present, fallback to name if ID is missing (though ID is preferred)
          id: ing.id || ing.name,
        }))
      );
    } else {
      setEditableIngredients([]);
    }
  }, [selectedDish]);

  useEffect(() => {
    if (selectedDish) setServingSize(100);
  }, [selectedDish]);

  const computeDishTotals = (dish, ingredientsToUse) => {
    const ingredientsList = ingredientsToUse || dish?.ingredients_dish_id_fkey || [];
    return ingredientsList.reduce(
      (totals, ing) => ({
        calories: totals.calories + (ing.calories || 0) * (ing.amount / 100 || 1),
        protein: totals.protein + (ing.protein || 0) * (ing.amount / 100 || 1),
        carbs: totals.carbs + (ing.carbs || 0) * (ing.amount / 100 || 1),
        fats: totals.fats + (ing.fats || 0) * (ing.amount / 100 || 1),
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    );
  };

  const totals = useMemo(() => {
    if (!selectedDish) return { calories: 0, protein: 0, carbs: 0, fats: 0 };
    if (selectedDish.source === "dishinfo") {
      return {
        calories: selectedDish.calories || 0,
        protein: selectedDish.protein || 0,
        carbs: selectedDish.carbs || 0,
        fats: selectedDish.fats || 0,
      };
    }
    // Pass editableIngredients to computeDishTotals
    return computeDishTotals(selectedDish, editableIngredients);
  }, [selectedDish, editableIngredients]);

  const multiplier = servingSize / 100;
  const steps = selectedDish?.steps || [];
  // Use editableIngredients here for rendering the table
  const ingredientsToDisplay = editableIngredients;
  const storeRecs = storeRecommendations || [];

  const handleAdd = () => {
    if (!selectedMealType) {
      setAlertMessage("Please select a meal type.");
      setShowAlertModal(true);
      return;
    }
    handleAddMeal(selectedDish, selectedMealType, multiplier, servingSize, editableIngredients);
    setShowMealModal(false);
  };

  const handleIngredientAmountChange = (ingredientId, newAmount) => {
    setEditableIngredients((prevIngredients) =>
      prevIngredients.map((ing) =>
        ing.id === ingredientId ? { ...ing, amount: Number(newAmount) } : ing
      )
    );
  };

  if (!showMealModal || !selectedDish) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[999]">
      <div className="bg-white w-[365px] max-w-full h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden relative">
        {/* Close Button */}
        <button
          onClick={() => setShowMealModal(false)}
          className="absolute top-4 right-4 z-50 bg-red-600 hover:bg-red-700 text-white rounded-full w-9 h-9 flex items-center justify-center shadow-md transition"
          aria-label="Close modal"
        >
          ✕
        </button>

        {/* Header / Dish Image */}
        <div className="relative">
          {selectedDish.image_url ? (
            <>
              <img
                src={selectedDish.image_url}
                alt={selectedDish.name}
                className="w-full h-56 object-cover"
              />
              <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/80 via-black/50 to-transparent p-4 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <h2 className="text-white text-lg font-bold truncate">
                    {selectedDish.name}
                  </h2>
                  <button
                    onClick={handleAdd}
                    className="bg-lime-500 hover:bg-lime-600 text-white px-4 py-2 rounded-lg font-medium shadow"
                  >
                    Add
                  </button>
                </div>
                {selectedDish.description && (
                  <p className="text-white text-sm line-clamp-3">
                    {selectedDish.description}
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="p-4 flex flex-col gap-2">
              <h2 className="text-gray-900 text-lg font-bold">
                {selectedDish.name}
              </h2>
              {selectedDish.description && (
                <p className="text-gray-600 text-sm">
                  {selectedDish.description}
                </p>
              )}
              <div className="flex justify-end mt-2">
                <button
                  onClick={handleAdd}
                  className="bg-lime-500 hover:bg-lime-600 text-white px-4 py-2 rounded-lg shadow"
                >
                  Add
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto px-4 py-4 flex-1 space-y-4">
          <p className="text-xs text-gray-400 text-center">
            All nutritional values and ingredient amounts are estimated based on
            a 100g serving size. Actual values may vary depending on exact
            ingredient measurements, preparation methods, and cooking
            variations.
          </p>

          {/* Nutrition Summary */}
          <div className="grid grid-cols-4 gap-3 text-center">
            {[
              {
                label: "Calories",
                icon: "🔥",
                value: totals.calories,
                color: "text-lime-500",
                unit: "kcal",
              },
              {
                label: "Protein",
                icon: "💪",
                value: totals.protein,
                color: "text-pink-500",
                unit: "g",
              },
              {
                label: "Carbs",
                icon: "🍞",
                value: totals.carbs,
                color: "text-yellow-500",
                unit: "g",
              },
              {
                label: "Fats",
                icon: "🧈",
                value: totals.fats,
                color: "text-violet-500",
                unit: "g",
              },
            ].map((nutrient) => (
              <div
                key={nutrient.label}
                className={`border rounded-lg p-2 ${nutrient.color} bg-gray-50`}
              >
                <span className="text-lg">{nutrient.icon}</span>
                <p className="text-xs">{nutrient.label}</p>
                <p className="font-semibold">
                  {Math.round(nutrient.value * multiplier)} {nutrient.unit}
                </p>
              </div>
            ))}
          </div>

          {/* Meal Type & Serving Size */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-gray-700 font-medium mb-1 text-center">
                Meal Type
              </label>
              <select
                value={selectedMealType}
                onChange={(e) => setSelectedMealType(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-lime-500 outline-none"
              >
                <option value="">Select Meal Type</option>
                <option value="Breakfast">Breakfast</option>
                <option value="Lunch">Lunch</option>
                <option value="Dinner">Dinner</option>
                <option value="Snack">Snack</option>
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-gray-700 font-medium mb-1 text-center">
                Serving Size (g)
              </label>
              <input
                type="number"
                min="1"
                step="10"
                value={servingSize}
                onChange={(e) => setServingSize(Number(e.target.value))}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-lime-500 outline-none"
              />
            </div>
          </div>

          {/* Steps */}
          {steps.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-800 text-center mb-2">
                Steps
              </h3>
              <ol className="list-decimal list-inside text-gray-700 text-sm space-y-1">
                {steps.map((step, idx) => (
                  <li key={idx}>{step}</li>
                ))}
              </ol>
            </div>
          )}

          {/* Ingredients */}
          {ingredientsToDisplay.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-800 text-center mb-2">
                Ingredients
              </h3>
              {selectedDish.source === "dishinfo" ? (
                <div className="text-center">
                  <ul className="list-disc list-inside text-gray-700 text-sm space-y-1">
                    {ingredientsToDisplay.map((ing, index) => (
                      <li key={index}>{ing.name}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="overflow-x-auto border rounded-lg bg-gray-50">
                  <table className="w-full text-sm border-collapse whitespace-nowrap">
                    <thead className="bg-gray-200 text-gray-700">
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
                      {ingredientsToDisplay.map((ing) => (
                        <tr key={ing.id || ing.name} className="border-t">
                          <td className="p-2">{ing.name}</td>
                          <td className="p-2">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={ing.amount}
                              onChange={(e) =>
                                handleIngredientAmountChange(ing.id, e.target.value)
                              }
                              className="w-20 border rounded-lg px-2 py-1 focus:ring-2 focus:ring-lime-500 outline-none text-right"
                            />{" "}
                            {ing.unit || ""}
                          </td>
                          <td className="p-2 text-right">
                            {((ing.calories || 0) * multiplier).toFixed(1)}
                          </td>
                          <td className="p-2 text-right">
                            {((ing.protein || 0) * multiplier).toFixed(1)}
                          </td>
                          <td className="p-2 text-right">
                            {((ing.carbs || 0) * multiplier).toFixed(1)}
                          </td>
                          <td className="p-2 text-right">
                            {((ing.fats || 0) * multiplier).toFixed(1)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Store Recommendations */}
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 mt-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                  <h3 className="font-semibold text-green-700 text-base">
                    Where to buy (Bohol)
                  </h3>
                  <div className="flex flex-wrap gap-2 items-center">
                    <label className="flex items-center gap-1 text-sm">
                      City
                      <select
                        className="ml-1 border rounded px-2 py-1 text-sm"
                        value={selectedCityId}
                        onChange={(e) => onCityChange(e.target.value)}
                      >
                        {boholCities.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    {[
                      { id: "supermarket", label: "Supermarket" },
                      { id: "public_market", label: "Public Market" },
                    ].map((t) => {
                      const active = storeTypeFilters.includes(t.id);
                      return (
                        <button
                          key={t.id}
                          onClick={() => onStoreTypeFilterChange(t.id)}
                          className={`px-3 py-1 rounded-full text-sm border transition ${
                            active
                              ? "bg-green-600 text-white border-green-600"
                              : "bg-white text-gray-700 border-green-300"
                          }`}
                        >
                          {t.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  {storeRecs.map((rec) => (
                    <div
                      key={rec.ingredient?.id || rec.ingredient?.name}
                      className="border p-2 rounded-lg border-green-200 bg-white"
                    >
                      <p className="font-medium text-gray-800">
                        {rec.ingredient?.name}
                      </p>
                      {rec.stores?.length ? (
                        <ul className="text-sm text-gray-700 list-disc list-inside">
                          {rec.stores.map((s) => (
                            <li key={s.id}>
                              <span className="font-medium">{s.name}</span>
                              <span className="ml-2 text-xs text-gray-500">
                                {s.type === "public_market"
                                  ? "Public Market"
                                  : "Supermarket"}
                              </span>
                              {s.address && (
                                <span className="ml-2 text-xs text-gray-400">
                                  {s.address}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-gray-500">
                          No suggestions for this city. Try removing filters.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MealDetailModal;
