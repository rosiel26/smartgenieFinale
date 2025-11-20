import React, { useEffect } from "react";

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
  // Set default serving size to 100g when a dish is selected
  useEffect(() => {
    if (selectedDish) setServingSize(100);
  }, [selectedDish]);

  // Compute total nutrition from ingredients
  const computeDishTotals = (dish) => {
    const ingredients = dish?.ingredients_dish_id_fkey || [];
    return ingredients.reduce(
      (totals, ing) => ({
        calories: totals.calories + (ing.calories || 0),
        protein: totals.protein + (ing.protein || 0),
        carbs: totals.carbs + (ing.carbs || 0),
        fats: totals.fats + (ing.fats || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    );
  };

  const totals = selectedDish
    ? computeDishTotals(selectedDish)
    : { calories: 0, protein: 0, carbs: 0, fats: 0 };
  const multiplier = servingSize / 100; // scale values per serving size
  const steps = selectedDish?.steps || [];
  const ingredients = selectedDish?.ingredients_dish_id_fkey || [];
  const storeRecs = storeRecommendations || [];

  const handleAdd = () => {
    if (!selectedMealType) {
      setAlertMessage("Please select a meal type.");
      setShowAlertModal(true);
      return;
    }
    handleAddMeal(selectedDish, selectedMealType, multiplier, servingSize);
    setShowMealModal(false);
  };

  if (!showMealModal || !selectedDish) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[999]">
      <div className="bg-white w-[350px] max-w-full h-[80vh] border rounded-2xl shadow-2xl flex flex-col relative">
        {/* Close Button */}
        <button
          onClick={() => setShowMealModal(false)}
          className="absolute top-3 right-3 text-white text-2xl z-50 font-bold bg-red-600 hover:bg-red-700 rounded-full w-8 h-8 flex items-center justify-center shadow-lg transition-colors"
          aria-label="Close modal"
        >
          ✕
        </button>

        {/* Header / Image */}
        <div className="relative flex-shrink-0">
          {selectedDish.image_url ? (
            <>
              <img
                src={selectedDish.image_url}
                alt={selectedDish.name}
                className="w-full h-52 object-cover rounded-t-2xl"
              />
              <div className="absolute bottom-0 left-0 w-full bg-black p-2 flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-white text-lg font-bold truncate">
                    {selectedDish.name}
                  </h2>
                  <button
                    onClick={handleAdd}
                    className="bg-white text-black px-4 py-2 rounded-lg text-sm font-medium border-2 border-lime-400 hover:bg-lime-600 transition shadow-lg"
                  >
                    Add
                  </button>
                </div>
                {selectedDish.description && (
                  <p className="text-white text-sm leading-relaxed line-clamp-3 mt-1">
                    {selectedDish.description}
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="w-full bg-white rounded-t-2xl p-4 shadow-md flex flex-col space-y-2">
              <h2 className="text-gray-900 text-lg font-bold">
                {selectedDish.name}
              </h2>
              {selectedDish.description && (
                <p className="text-gray-700 text-xs leading-relaxed">
                  {selectedDish.description}
                </p>
              )}
              <div className="flex justify-end">
                <button
                  onClick={handleAdd}
                  className="bg-lime-500 text-white px-4 py-2 rounded-lg hover:bg-lime-600 transition shadow-lg"
                >
                  Add
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto scrollbar-hide px-4 py-5 space-y-4 flex-1 rounded-b-2xl">
          {/* Disclaimer */}
          <p className="text-xs text-gray-500 mt-2 text-center px-2">
            All nutritional values and ingredient amounts are estimated based on
            a 100g serving size. Actual values may vary depending on exact
            ingredient measurements, preparation methods, and cooking
            variations.
          </p>
          {/* Nutrition */}
          <div className="p-3 rounded-lg text-xs text-black grid grid-cols-4 gap-4 text-center">
            <div className="border border-lime-500 rounded-lg p-1">
              <span>🔥</span>
              <span className="font-sm block">Calories</span>
              <p className="text-lime-500 font-semibold">
                {Math.round(totals.calories * multiplier)} kcal
              </p>
            </div>
            <div className="border border-pink-500 rounded-lg p-1">
              <span>💪</span>
              <span className="font-sm block">Protein</span>
              <p className="text-pink-500 font-semibold">
                {Math.round(totals.protein * multiplier)} g
              </p>
            </div>
            <div className="border border-yellow-500 rounded-lg p-1">
              <span>🍞</span>
              <span className="font-sm block">Carbs</span>
              <p className="text-yellow-500 font-semibold">
                {Math.round(totals.carbs * multiplier)} g
              </p>
            </div>
            <div className="border border-violet-500 rounded-lg p-1">
              <span>🧈</span>
              <span className="font-sm block">Fats</span>
              <p className="text-violet-500 font-semibold">
                {Math.round(totals.fats * multiplier)} g
              </p>
            </div>
          </div>

          {/* Meal Type & Serving Size */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block font-medium text-gray-700 mb-1 text-center">
                Meal Type
              </label>
              <select
                value={selectedMealType}
                onChange={(e) => setSelectedMealType(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="">Meal Type</option>
                <option value="Breakfast">Breakfast</option>
                <option value="Lunch">Lunch</option>
                <option value="Dinner">Dinner</option>
                <option value="Snack">Snack</option>
              </select>
            </div>

            <div className="flex-1">
              <label className="block font-medium text-gray-700 mb-1 text-center">
                Serving Size (g)
              </label>
              <input
                type="number"
                min="1"
                step="10"
                value={servingSize}
                onChange={(e) => setServingSize(Number(e.target.value))}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                placeholder="Enter servings (e.g. 100)"
              />
            </div>
          </div>

          {/* Steps */}
          {steps.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-800 mb-2 text-center">
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
          {ingredients.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-800 mb-2 text-center">
                Ingredients
              </h3>
              <div className="bg-white border rounded-lg overflow-x-auto text-sm">
                <table className="w-full border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="bg-black text-lime-500 text-center">
                      <th className="text-left p-2">Ingredient</th>
                      <th className="text-left p-2">Amount</th>
                      <th className="text-right p-2">Cal</th>
                      <th className="text-right p-2">Pro</th>
                      <th className="text-right p-2">Carbs</th>
                      <th className="text-right p-2">Fats</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ingredients.map((ing) => (
                      <tr key={ing.id || ing.name} className="border-t">
                        <td className="p-2">{ing.name}</td>
                        <td className="p-2 text-left">
                          {ing.amount} {ing.unit || ""}
                        </td>
                        <td className="text-right p-2">
                          {((ing.calories || 0) * multiplier).toFixed(1)}
                        </td>
                        <td className="text-right p-2">
                          {((ing.protein || 0) * multiplier).toFixed(1)}g
                        </td>
                        <td className="text-right p-2">
                          {((ing.carbs || 0) * multiplier).toFixed(1)}g
                        </td>
                        <td className="text-right p-2">
                          {((ing.fats || 0) * multiplier).toFixed(1)}g
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Store Recommendations */}
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
                        onChange={(e) => onCityChange(Number(e.target.value))}
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
                  {storeRecs.map((rec) => (
                    <div
                      key={rec.ingredient?.id || rec.ingredient?.name}
                      className="border rounded-lg p-2 sm:p-3 border-green-100"
                    >
                      <div className="text-sm font-medium text-gray-800 mb-1 sm:mb-2">
                        {rec.ingredient?.name}
                      </div>
                      {rec.stores?.length ? (
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MealDetailModal;
