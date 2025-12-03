import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";

export const emojiMap = {
  Cardio: "🏃",
  Strength: "🏋️",
  Yoga: "🧘",
  Default: "🏋️",
};

export default function RecentLogs({ maxItems = 1 }) {
  const [mealLogs, setMealLogs] = useState([]);
  const [workoutLogs, setWorkoutLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch recent meals
      const { data: meals, error: mealError } = await supabase
        .from("meal_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(maxItems);

      if (mealError) {
        console.error(mealError);
        setMealLogs([]);
        return;
      }

      // Fetch dishes
      const dishIds = meals.map((m) => m.dish_id).filter(Boolean);
      let dishes = [];
      if (dishIds.length) {
        const { data: dishData, error: dishError } = await supabase
          .from("dishes")
          .select("id, image_url")
          .in("id", dishIds);

        if (dishError) console.error(dishError);
        dishes = dishData || [];
      }

      // Merge meals with dishes
      const mealsWithImages = meals.map((meal) => ({
        ...meal,
        dish: dishes.find((d) => d.id === meal.dish_id),
      }));

      setMealLogs(mealsWithImages);

      // Fetch workouts
      const { data: workouts, error: workoutError } = await supabase
        .from("workouts")
        .select(
          "id, duration, calories_burned, fat_burned, carbs_burned, created_at, workout_types!inner(name,image_url)"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(maxItems);

      if (workoutError) console.error(workoutError);
      setWorkoutLogs(workouts || []);
    } catch (err) {
      console.error("Error fetching logs:", err);
    } finally {
      setLoading(false);
    }
  }, [maxItems]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  if (loading)
    return <p className="text-gray-500 text-sm italic">Loading...</p>;

  return (
    <div>
      <p className="font-semibold text-sm text-gray-700 mb-2">
        Recent Activity
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Meal Cards */}
        {mealLogs.map((meal) => {
          const dishImage = meal.dish?.image_url;
          return (
            <div
              key={meal.id}
              className="relative rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 h-64 hover:scale-[1.02]"
            >
              {dishImage ? (
                <img
                  src={dishImage}
                  alt={meal.dish_name}
                  className="w-full h-full object-cover brightness-75 transition-all duration-300"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-green-300 to-green-500 flex items-center justify-center text-6xl">
                  🍽️
                </div>
              )}

              <div className="absolute bottom-0 w-full bg-lime-500 text-black p-3">
                <p className="font-bold text-sm">{meal.dish_name}</p>
                <p className="font-bold text-xs">{meal.serving_label}</p>
                <p className="text-xs text-white font-semibold">
                  {meal.meal_type}
                </p>

                {/* Meal Macros */}
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-semibold">
                  {[
                    { label: "🔥Cal", value: Math.round(meal.calories ?? 0) },
                    {
                      label: "💪Protein",
                      value: (meal.protein ?? 0).toFixed(1) + "g",
                    },
                    { label: "🧈Fat", value: (meal.fat ?? 0).toFixed(1) + "g" },
                    {
                      label: "🍞Carbs",
                      value: (meal.carbs ?? 0).toFixed(1) + "g",
                    },
                  ].map((macro) => (
                    <div
                      key={macro.label}
                      className="flex flex-col items-center text-center"
                    >
                      <span className="text-[10px]">{macro.label}</span>
                      <span className="text-white font-semibold text-xs">
                        {macro.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}

        {/* Workout Cards */}
        {workoutLogs.map((w) => {
          const workoutType = Array.isArray(w.workout_types)
            ? w.workout_types[0]
            : w.workout_types;
          const workoutName = workoutType?.name || "Workout";
          const workoutImage = workoutType?.image_url;
          const emoji = emojiMap[workoutName] || "🏋️";

          return (
            <div
              key={w.id}
              className="relative rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 h-64 hover:scale-[1.02]"
            >
              {workoutImage ? (
                <img
                  src={workoutImage}
                  alt={workoutName}
                  className="w-full h-full object-cover brightness-75 transition-all duration-300"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-green-300 to-green-500 flex items-center justify-center text-6xl">
                  {emoji}
                </div>
              )}

              <div className="absolute bottom-0 w-full bg-black p-3">
                <div className="flex flex-col">
                  <p className="font-bold text-sm tracking-wide text-white">
                    {workoutName}
                  </p>
                  <p className="text-xs text-lime-500 font-bold">
                    {w.duration} min
                  </p>
                  <p className="text-xs text-white">
                    {new Date(w.created_at).toLocaleDateString()}
                  </p>
                </div>

                {/* Workout Macros */}
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-semibold">
                  {[
                    {
                      label: "🔥Calories",
                      value: Math.round(w.calories_burned ?? 0) + " kcal",
                    },
                    {
                      label: "💪Fat",
                      value: (w.fat_burned ?? 0).toFixed(1) + "g",
                    },
                    {
                      label: "⚡Carbs",
                      value: (w.carbs_burned ?? 0).toFixed(1) + "g",
                    },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="flex flex-col items-center text-center"
                    >
                      <span className="text-[10px]">{stat.label}</span>
                      <span className="text-white font-semibold text-xs">
                        {stat.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}

        {!mealLogs.length && !workoutLogs.length && (
          <p className="text-gray-500 italic text-sm col-span-2">
            No recent activity.
          </p>
        )}
      </div>
    </div>
  );
}
