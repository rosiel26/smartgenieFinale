import React, { useState, useMemo, useEffect } from "react";

const DishDetailModal = ({
  dish,
  onClose,
  onAddMeal,
  onIngredientAmountChange, // optional callback to parent
  boholCities,
  selectedCityId,
  onCityChange,
  storeTypeFilters,
  onStoreTypeFilterChange,
  storeRecommendations,
}) => {
  // Track if the dish has been added
  const [isAdded, setIsAdded] = useState(dish.status === "added");

  // --- Local state for serving size ---
  const defaultServing = dish.default_serving || 100;
  const [servingSize, setServingSize] = useState(
    dish.servingSize || defaultServing
  );

  // --- Local state for ingredients ---
  const [ingredients, setIngredients] = useState(
    dish.ingredients_dish_id_fkey?.map((ing) => ({
      ...ing,
      amount: ing.amount || ing.defaultAmount || defaultServing,
      defaultAmount: ing.defaultAmount || ing.amount || 100,
    })) || []
  );

  // --- Compute totals dynamically based on ingredient amounts ---
  const adjustedTotals = useMemo(() => {
    return ingredients.reduce(
      (totals, ing) => {
        const multiplier = ing.amount / (ing.defaultAmount || 100);
        return {
          calories: totals.calories + (ing.calories || 0) * multiplier,
          protein: totals.protein + (ing.protein || 0) * multiplier,
          carbs: totals.carbs + (ing.carbs || 0) * multiplier,
          fats: totals.fats + (ing.fats || 0) * multiplier,
        };
      },
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    );
  }, [ingredients]);

  // --- Handle serving size change (optional multiplier for the whole dish) ---
  const handleServingSizeChange = (value) => {
    // Allow empty string so user can erase
    if (value === "") {
      setServingSize("");
      return;
    }

    const newServing = parseFloat(value) || defaultServing;

    setIngredients((prev) =>
      prev.map((ing) => {
        if (ing.is_rice) return ing; // don't scale rice
        return {
          ...ing,
          amount: (ing.amount / (servingSize || defaultServing)) * newServing,
        };
      })
    );

    setServingSize(newServing);
  };

  // --- Handle individual ingredient change ---
  const handleIngredientChange = (id, value) => {
    // Allow empty string for editing
    if (value === "") {
      setIngredients((prev) =>
        prev.map((ing) => (ing.id === id ? { ...ing, amount: "" } : ing))
      );
      return;
    }

    const newAmount = parseFloat(value) || 0;
    setIngredients((prev) =>
      prev.map((ing) => (ing.id === id ? { ...ing, amount: newAmount } : ing))
    );
    onIngredientAmountChange?.(id, newAmount); // optional parent sync
  };
  const mealDate = dish.meal_date
    ? dish.meal_date.split("T")[0]
    : new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000)
        .toISOString()
        .split("T")[0];
  // --- Handle Add Meal ---
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start sm:items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-2xl w-[350px] h-[70vh] overflow-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden relative">
        {/* Close Button */}
        <button
          className="absolute top-3 right-3 sm:top-4 sm:right-4 text-gray-600 hover:text-gray-900 text-xl"
          onClick={onClose}
        >
          ✕
        </button>

        {/* Dish Title */}
        <div className="relative w-full h-48 sm:h-64 rounded-lg overflow-hidden mb-4">
          {dish.image_url && (
            <img
              src={dish.image_url}
              alt={dish.name}
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute bottom-0 left-0 w-full bg-black text-white text-lg sm:text-xl font-bold p-2 text-center">
            {dish.name}
            <p className="text-white text-xs sm:text-sm font-thin">
              {dish.description}
            </p>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2 text-center px-2">
          All nutritional values and ingredient amounts are estimated based on a
          100g serving size. Actual values may vary depending on exact
          ingredient measurements, preparation methods, and cooking variations.
        </p>
        <br />
        {/* Serving size */}
        <div className="mb-4 flex flex-col text-center sm:flex-row sm:items-center sm:justify-between gap-3 p-2">
          <label className="flex items-center text-sm text-black font-medium gap-1">
            Serving size:
            <input
              type="number"
              value={servingSize}
              min="1"
              className="w-16 px-2 py-1 border rounded text-sm"
              onChange={(e) => handleServingSizeChange(e.target.value)}
            />
            g
          </label>
        </div>

        {/* Nutritional Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4 p-2 sm:p-3 rounded-lg">
          {[
            { label: "Calories", value: adjustedTotals.calories, unit: "kcal" },
            { label: "Protein", value: adjustedTotals.protein, unit: "g" },
            { label: "Carbs", value: adjustedTotals.carbs, unit: "g" },
            { label: "Fats", value: adjustedTotals.fats, unit: "g" },
          ].map((n, i) => (
            <div
              key={i}
              className="bg-black p-2 sm:p-3 rounded-lg shadow text-center"
            >
              <div className="text-xs sm:text-xs text-white">{n.label}</div>
              <div className="text-sm sm:text-xs font-semibold text-lime-500">
                {Math.round(n.value)} {n.unit}
              </div>
            </div>
          ))}
        </div>

        {/* Ingredient Table */}
        <div className="overflow-x-auto bg-gray-50 rounded-lg mb-4">
          <table className="min-w-[600px] w-full border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="text-left p-2 sm:p-3">Ingredient</th>
                <th className="text-right p-2 sm:p-3">Amount</th>
                <th className="text-right p-2 sm:p-3">Calories</th>
                <th className="text-right p-2 sm:p-3">Protein</th>
                <th className="text-right p-2 sm:p-3">Carbs</th>
                <th className="text-right p-2 sm:p-3">Fats</th>
              </tr>
            </thead>
            <tbody>
              {ingredients.map((ingredient) => (
                <tr key={ingredient.id} className="border-t border-gray-200">
                  <td className="p-2 sm:p-3">{ingredient.name}</td>
                  <td className="text-right p-2 sm:p-3">
                    {ingredient.is_rice ? (
                      <input
                        type="number"
                        step="0.1"
                        className="w-16 sm:w-20 text-right px-1 py-0.5 border rounded"
                        value={ingredient.amount}
                        onChange={(e) =>
                          handleIngredientChange(ingredient.id, e.target.value)
                        }
                      />
                    ) : (
                      <span>
                        {ingredient.amount} {ingredient.unit || "g"}
                      </span>
                    )}
                  </td>
                  <td className="text-right p-2 sm:p-3">
                    {Math.round(
                      (ingredient.calories || 0) *
                        (ingredient.amount / ingredient.defaultAmount)
                    )}
                  </td>
                  <td className="text-right p-2 sm:p-3">
                    {Math.round(
                      (ingredient.protein || 0) *
                        (ingredient.amount / ingredient.defaultAmount)
                    )}
                    g
                  </td>
                  <td className="text-right p-2 sm:p-3">
                    {Math.round(
                      (ingredient.carbs || 0) *
                        (ingredient.amount / ingredient.defaultAmount)
                    )}
                    g
                  </td>
                  <td className="text-right p-2 sm:p-3">
                    {Math.round(
                      (ingredient.fats || 0) *
                        (ingredient.amount / ingredient.defaultAmount)
                    )}
                    g
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Preparation Steps */}
        {dish.steps && dish.steps.length > 0 && (
          <div className="mb-4 bg-gray-50 rounded-lg p-3 sm:p-4">
            <h3 className="text-base sm:text-lg font-semibold text-green-700 mb-2">
              Preparation Steps
            </h3>
            <ol className="list-decimal list-inside text-sm sm:text-base text-gray-700 space-y-1">
              {dish.steps.map((step, index) => (
                <li key={index}>{step}</li>
              ))}
            </ol>
          </div>
        )}

        {/* Where to Buy */}
        <div className="mb-4 bg-white rounded-xl border border-green-100 p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 mb-2 sm:mb-3">
            <h3 className="text-base sm:text-lg font-semibold text-green-700">
              Where to buy (Bohol)
            </h3>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <label className="text-sm text-gray-700 flex items-center gap-1">
                City/Municipality
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
                    className={`px-2 sm:px-3 py-1 rounded-full text-sm border ${
                      active
                        ? "bg-green-600 text-white border-green-600"
                        : "bg-white text-gray-700 border-green-200"
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            {storeRecommendations.map((rec) => (
              <div
                key={rec.ingredient.id || rec.ingredient.name}
                className="border rounded-lg p-2 sm:p-3 border-green-100"
              >
                <div className="text-sm font-medium text-gray-800 mb-1 sm:mb-2">
                  {rec.ingredient.name}
                </div>
                {rec.stores.length ? (
                  <ul className="text-sm text-gray-700 list-disc list-inside space-y-1">
                    {rec.stores.map((s) => (
                      <li key={s.id}>
                        <span className="font-medium">{s.name}</span>
                        <span className="ml-1 sm:ml-2 text-xs text-gray-500">
                          {s.type === "public_market"
                            ? "Public Market"
                            : "Supermarket"}
                        </span>
                        {s.address && (
                          <span className="ml-1 sm:ml-2 text-xs text-gray-500">
                            {s.address}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-sm text-gray-500">
                    No suggestions for this city. Try removing filters.
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Add & Close Buttons */}
        <div className="mt-4 border-t border-gray-200 pt-3 flex flex-col sm:flex-row justify-end gap-2 sticky bottom-0 bg-white z-10 p-2 sm:p-3">
          <button
            onClick={handleAddMeal}
            disabled={isAdded}
            className={`px-4 py-2 rounded-lg ${
              isAdded
                ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                : "bg-black text-white hover:bg-lime-700 transition-colors"
            }`}
          >
            {isAdded ? "Already Added" : "Add to Meal Log"}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-red-800 text-white rounded-lg hover:bg-white hover:text-black transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default DishDetailModal;
