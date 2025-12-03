import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";

const DishDetailModal = ({
  dish,
  onClose,
  onAddMeal,
  onIngredientAmountChange,
  boholCities,
  selectedCityId,
  onCityChange,
  storeTypeFilters,
  onStoreTypeFilterChange,
  storeRecommendations,
}) => {
  const [isAdded, setIsAdded] = useState(dish.status === "added");
  const [servingSize, setServingSize] = useState(
    dish.servingSize !== undefined && dish.servingSize !== null
      ? dish.servingSize
      : 100 // Fallback to a hardcoded 100 if dish.servingSize is not provided
  );
  const [ingredients, setIngredients] = useState(
    dish.ingredients_dish_id_fkey?.map((ing) => ({
      ...ing,
                amount: ing.amount || ing.defaultAmount || 100,      defaultAmount: ing.defaultAmount || ing.amount || 100,
    })) || []
  );

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  const adjustedTotals = useMemo(() => {
    const totals = ingredients.reduce(
      (acc, ing) => {
        const multiplier = ing.amount / (ing.defaultAmount || 100);
        return {
          calories: acc.calories + (ing.calories || 0) * multiplier,
          protein: acc.protein + (ing.protein || 0) * multiplier,
          carbs: acc.carbs + (ing.carbs || 0) * multiplier,
          fats: acc.fats + (ing.fats || 0) * multiplier,
        };
      },
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    );

    return {
      calories: parseFloat(totals.calories.toFixed(2)),
      protein: parseFloat(totals.protein.toFixed(2)),
      carbs: parseFloat(totals.carbs.toFixed(2)),
      fats: parseFloat(totals.fats.toFixed(2)),
    };
  }, [ingredients]);

  const isFutureMeal = useMemo(() => {
    if (!dish.meal_date) return false;
    const mealDate = new Date(dish.meal_date);
    mealDate.setHours(0, 0, 0, 0); // Normalized to local midnight
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    console.log("DishDetailModal - isFutureMeal debug:");
    console.log("  dish.meal_date:", dish.meal_date);
    console.log("  mealDate (normalized local):", mealDate.toISOString());
    console.log("  today (normalized local):", today.toISOString());
    const result = mealDate.getTime() > today.getTime();
    console.log("  mealDate.getTime() > today.getTime():", result);
    return result;
  }, [dish.meal_date]);

  const handleServingSizeChange = (value) => {
    setServingSize(value); // Update display state

    // Determine the numeric value for calculations
    const newNumericServing = parseFloat(value);
    const calculatedServingValue = (isNaN(newNumericServing) || newNumericServing < 0)
        ? 100 // Default to 100 if empty, invalid, or negative
        : newNumericServing;

    // Retrieve the dish's default serving size (e.g., 100g)
    const dishDefaultServing = dish.default_serving || 100;

    setIngredients((prev) =>
      prev.map((ing) => {
        // Base amount for the ingredient is its defaultAmount
        const baseIngredientAmount = parseFloat(ing.defaultAmount) || 0;

        // Calculate new amount based on the ratio of current serving to default dish serving
        const newIngredientAmount = baseIngredientAmount * (calculatedServingValue / dishDefaultServing);

        return {
          ...ing,
          amount: parseFloat(newIngredientAmount.toFixed(1)),
        };
      })
    );
  };

  const handleIngredientChange = (id, value) => {
    // 1. Update the state with the raw input value for display.
    setIngredients((prev) =>
      prev.map((ing) => (ing.id === id ? { ...ing, amount: value } : ing))
    );

    // 2. Derive the numeric value for calculations, with appropriate rounding.
    // If value is empty or invalid, use 0 for calculations.
    const newNumericAmount = parseFloat(value);
    let roundedNumericAmountForCalculations;

    if (isNaN(newNumericAmount) || value === "") {
        roundedNumericAmountForCalculations = 0; // Treat empty or invalid as 0 for calculations
    } else {
        roundedNumericAmountForCalculations = parseFloat(newNumericAmount.toFixed(1));
    }

    // 3. Pass the rounded numeric amount to the parent handler.
    onIngredientAmountChange?.(id, roundedNumericAmountForCalculations);
  };

  const mealDate = dish.meal_date
    ? dish.meal_date.split("T")[0]
    : new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000)
        .toISOString()
        .split("T")[0];

  const handleAddMeal = () => {
    onAddMeal(
      dish,
      dish.planMealType || dish.meal_type,
      adjustedTotals,
      servingSize,
      mealDate
    );
    setIsAdded(true);
  };

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-white w-[360px] h-[650px] rounded-2xl shadow-lg flex flex-col overflow-hidden">
        {/* Scrollable Content */}
        <div className="overflow-auto flex-1 relative">
          {/* Close button */}
          <button
            className="absolute top-4 right-4 text-gray-600 text-2xl font-bold z-20"
            onClick={onClose}
          >
            ×
          </button>

          {/* Dish Image */}
          <div className="relative w-full h-48 rounded-t-2xl overflow-hidden">
            {dish.image_url && (
              <img
                src={dish.image_url}
                alt={dish.name}
                className="w-full h-full object-cover"
              />
            )}
            <div className="absolute bottom-0 w-full bg-gradient-to-t from-black/80 to-transparent p-3 text-center">
              <h2 className="text-white text-lg font-bold">{dish.name}</h2>
              {dish.description && (
                <p className="text-white text-xs font-light">
                  {dish.description}
                </p>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="p-3 space-y-3">
            {/* Serving size */}
            <div className="flex items-center justify-between text-sm font-medium">
              <label className="flex items-center gap-2">
                Serving size:
                <input
                  type="number"
                  min="1"
                  value={servingSize}
                  className="w-16 px-2 py-1 border rounded text-sm focus:ring-1 focus:ring-green-400 focus:outline-none"
                  onChange={(e) => handleServingSizeChange(e.target.value)}
                />
                g
              </label>
            </div>

            {/* Nutrition cards */}
            <div className="grid grid-cols-2 gap-2">
              {[
                {
                  label: "Calories",
                  value: adjustedTotals.calories,
                  unit: "kcal",
                },
                { label: "Protein", value: adjustedTotals.protein, unit: "g" },
                { label: "Carbs", value: adjustedTotals.carbs, unit: "g" },
                { label: "Fats", value: adjustedTotals.fats, unit: "g" },
              ].map((n, i) => (
                <div key={i} className="bg-green-50 p-2 rounded-lg text-center">
                  <div className="text-xs font-medium text-gray-600">
                    {n.label}
                  </div>
                  <div className="text-sm font-semibold text-green-700">
                    {Math.round(n.value)} {n.unit}
                  </div>
                </div>
              ))}
            </div>

            {/* Ingredients Table */}
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-gray-800 mb-2">
                Ingredients
              </h3>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 py-2 text-left font-medium text-gray-500">
                        Ingredient
                      </th>
                      <th className="px-2 py-2 text-right font-medium text-gray-500">
                        Amount
                      </th>
                      <th className="px-2 py-2 text-right font-medium text-gray-500">
                        Cal
                      </th>
                      <th className="px-2 py-2 text-right font-medium text-gray-500">
                        Prot
                      </th>
                      <th className="px-2 py-2 text-right font-medium text-gray-500">
                        Carbs
                      </th>
                      <th className="px-2 py-2 text-right font-medium text-gray-500">
                        Fats
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {ingredients.map((ing) => {
                      const multiplier =
                        ing.amount / (ing.defaultAmount || 100);
                      const calories = Math.round(
                        (ing.calories || 0) * multiplier
                      );
                      const protein = Math.round(
                        (ing.protein || 0) * multiplier
                      );
                      const carbs = Math.round((ing.carbs || 0) * multiplier);
                      const fats = Math.round((ing.fats || 0) * multiplier);

                      return (
                        <tr key={ing.id} className="border-b">
                          <td className="px-2 py-2 whitespace-nowrap">
                            {ing.name}
                          </td>
                          <td className="px-2 py-2 text-right">
                            {/* Always render an input field for editing, regardless of ing.is_rice */}
                            <input
                              type="number"
                              step="0.1"
                              className="w-16 px-1 py-1 border rounded text-right text-xs"
                              value={ing.amount}
                              onChange={(e) =>
                                handleIngredientChange(ing.id, e.target.value)
                              }
                            />
                            <span className="whitespace-nowrap">
                               {" "}{ing.unit || "g"} {/* Display unit next to input */}
                            </span>
                          </td>
                          <td className="px-2 py-2 text-right text-gray-600">
                            {calories}
                          </td>
                          <td className="px-2 py-2 text-right text-gray-600">
                            {protein}g
                          </td>
                          <td className="px-2 py-2 text-right text-gray-600">
                            {carbs}g
                          </td>
                          <td className="px-2 py-2 text-right text-gray-600">
                            {fats}g
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Preparation Steps */}
            {dish.steps?.length > 0 && (
              <div className="bg-green-50 rounded-lg p-2">
                <h3 className="text-sm font-semibold text-green-700 mb-1">
                  Preparation Steps
                </h3>
                <ol className="list-decimal list-inside text-xs text-gray-700 space-y-1">
                  {dish.steps.map((step, idx) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ol>
              </div>
            )}

            {/* Store Recommendations */}
            <div className="bg-white rounded-lg border border-green-100 p-2 space-y-1">
              <h3 className="text-sm font-semibold text-green-700">
                Where to buy (Bohol)
              </h3>
              <div className="flex flex-wrap gap-2 items-center mb-1">
                <select
                  className="border rounded px-2 py-1 text-xs flex-1"
                  value={selectedCityId}
                  onChange={(e) => onCityChange(e.target.value)}
                >
                  {boholCities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {["supermarket", "public_market"].map((type) => {
                  const active = storeTypeFilters.includes(type);
                  return (
                    <button
                      key={type}
                      onClick={() => onStoreTypeFilterChange(type)}
                      className={`px-2 py-1 rounded-full text-xs border ${
                        active
                          ? "bg-green-600 text-white border-green-600"
                          : "bg-white text-gray-700 border-green-200"
                      }`}
                    >
                      {type === "supermarket" ? "Supermarket" : "Public Market"}
                    </button>
                  );
                })}
              </div>
              <div className="space-y-1">
                {storeRecommendations.map((rec) => (
                  <div
                    key={rec.ingredient.id || rec.ingredient.name}
                    className="border p-1 rounded-lg border-green-100 text-xs"
                  >
                    <div className="font-medium text-gray-800 mb-1">
                      {rec.ingredient.name}
                    </div>
                    {rec.stores.length ? (
                      <ul className="list-disc list-inside text-gray-700 space-y-1">
                        {rec.stores.map((s) => (
                          <li key={s.id}>
                            <span className="font-medium">{s.name}</span>{" "}
                            <span className="ml-1 text-gray-500">
                              {s.type === "public_market"
                                ? "Public Market"
                                : "Supermarket"}
                            </span>{" "}
                            {s.address && (
                              <span className="ml-1 text-gray-500">
                                {s.address}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-gray-500">
                        No suggestions for this city. Try removing filters.
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="bg-white border-t border-gray-200 p-3 flex flex-col gap-2">
          <button
            onClick={handleAddMeal}
            disabled={isAdded || isFutureMeal}
            className={`px-4 py-2 rounded-lg font-semibold text-white transition ${
              isAdded || isFutureMeal
                ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                : "bg-green-700 hover:bg-green-800"
            }`}
          >
            {isAdded
              ? "Already Added"
              : isFutureMeal
              ? "Future Meal"
              : "Add to Meal Log"}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default DishDetailModal;
