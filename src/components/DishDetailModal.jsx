import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import jsPDF from "jspdf";

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
      amount: ing.amount || ing.defaultAmount || 100,
      defaultAmount: ing.defaultAmount || ing.amount || 100,
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
    const calculatedServingValue =
      isNaN(newNumericServing) || newNumericServing < 0
        ? 100 // Default to 100 if empty, invalid, or negative
        : newNumericServing;

    // Retrieve the dish's default serving size (e.g., 100g)
    const dishDefaultServing = dish.default_serving || 100;

    setIngredients((prev) =>
      prev.map((ing) => {
        // Base amount for the ingredient is its defaultAmount
        const baseIngredientAmount = parseFloat(ing.defaultAmount) || 0;

        // Calculate new amount based on the ratio of current serving to default dish serving
        const newIngredientAmount =
          baseIngredientAmount * (calculatedServingValue / dishDefaultServing);

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
      roundedNumericAmountForCalculations = parseFloat(
        newNumericAmount.toFixed(1)
      );
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
    doc.text(`Dish: ${dish.name}`, margin, yPosition);
    yPosition += 8;

    // Serving size
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
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
    ingredients.forEach((ing) => {
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
    if (storeRecommendations.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Where to Buy:", margin, yPosition);
      yPosition += 8;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);

      storeRecommendations.forEach((rec) => {
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
    doc.save(`${dish.name}-shopping-list.pdf`);
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[999]">
      <div className="bg-white text-black w-[360px] max-w-full h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden relative transition-all border">
        {/* Dish Name and Add Button */}
        <div className="flex items-center justify-between p-4 border-b  bg-black border-lime-400">
          <button
            onClick={onClose}
            className="text-white hover:text-lime-600 text-2xl font-bold"
            aria-label="Close modal"
          >
            ←
          </button>
          <h1 className="text-white text-xl font-bold truncate flex-1 text-center">
            {dish.name}
          </h1>
          <button
            onClick={handleAddMeal}
            disabled={isAdded || isFutureMeal}
            className={`px-4 py-2 rounded-lg font-medium shadow ${
              isAdded || isFutureMeal
                ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                : "bg-lime-400 hover:bg-lime-500 text-black"
            }`}
          >
            {isAdded ? "Added" : isFutureMeal ? "Future" : "Add"}
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
              {[
                {
                  label: "Calories",
                  value: adjustedTotals.calories,
                  unit: "kcal",
                  icon: "🔥",
                  border: "border-lime-400",
                },
                {
                  label: "Protein",
                  value: adjustedTotals.protein,
                  unit: "g",
                  icon: "💪",
                  border: "border-pink-400",
                },
                {
                  label: "Carbs",
                  value: adjustedTotals.carbs,
                  unit: "g",
                  icon: "🍞",
                  border: "border-violet-400",
                },
                {
                  label: "Fats",
                  value: adjustedTotals.fats,
                  unit: "g",
                  icon: "🧈",
                  border: "border-orange-400",
                },
              ].map((n, i) => (
                <div
                  key={i}
                  className={`border ${n.border} rounded p-1 text-center`}
                >
                  <div className="text-lg">{n.icon}</div>
                  <div className="text-black">{n.label}</div>
                  <div className="font-bold text-lime-600">
                    {Math.ceil(n.value)} {n.unit}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {dish.image_url && (
            <div className="flex-1 pt-2">
              <img
                src={dish.image_url}
                alt={dish.name}
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
          {/* Serving Size */}
          <div className=" p-4">
            <div>
              <label className="block text-black font-medium mb-1">
                Serving Size (g)
              </label>
              <input
                type="number"
                min="1"
                value={servingSize}
                onChange={(e) => handleServingSizeChange(e.target.value)}
                className="w-full bg-white border rounded px-3 py-2 text-black focus:ring-2 focus:ring-lime-500 outline-none"
              />
            </div>
          </div>
          <hr />

          {/* Ingredients Card */}
          {ingredients.length > 0 && (
            <div className=" p-2">
              <h3 className="text-black font-semibold text-left mb-2">
                Ingredients
              </h3>
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
                        <tr key={ing.id} className="border-t border-lime-400">
                          <td className="p-2 text-black">{ing.name}</td>
                          <td className="p-2">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={ing.amount}
                              onChange={(e) =>
                                handleIngredientChange(ing.id, e.target.value)
                              }
                              className="w-20 bg-white border border-lime-400 rounded px-2 py-1 text-black focus:ring-2 focus:ring-lime-500 outline-none text-right"
                            />{" "}
                            {ing.unit || ""}
                          </td>
                          <td className="p-2 text-right text-black">
                            {calories}
                          </td>
                          <td className="p-2 text-right text-black">
                            {protein}
                          </td>
                          <td className="p-2 text-right text-black">{carbs}</td>
                          <td className="p-2 text-right text-black">{fats}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Steps */}
          {dish.steps?.length > 0 && (
            <div className="p-2">
              <h3 className="text-black font-semibold text-left mb-2">Steps</h3>
              <ol className="list-decimal list-inside text-black text-sm space-y-1">
                {dish.steps.map((step, idx) => (
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
                    onClick={() => generateShoppingListPDF()}
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
                {storeRecommendations.map((rec) => (
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
    </div>,
    document.body
  );
};

export default DishDetailModal;
