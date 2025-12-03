import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import {
  FiTarget,
  FiTrendingUp,
  FiBookOpen,
  FiSun,
  FiMoon,
} from "react-icons/fi";
import DashboardCard from "../components/DashboardCard";
import MealPlanLoader from "../components/MealPlanLoader";

export default function NewDashboard() {
  const [profile, setProfile] = useState(null);
  const [mealLog, setMealLog] = useState([]);
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate("/login");
        return;
      }

      const [profileResult, mealResult, dishesResult] = await Promise.all([
        supabase
          .from("health_profiles")
          .select("*")
          .eq("user_id", user.id)
          .single(),
        supabase
          .from("meal_logs")
          .select("*")
          .eq("user_id", user.id)
          .order("meal_date", { ascending: false })
          .limit(5),
        supabase.from("dishes").select("id, name, image_url").limit(5),
      ]);

      if (profileResult.data) {
        setProfile(profileResult.data);
      } else {
        navigate("/health-profile");
      }

      if (mealResult.data) {
        setMealLog(mealResult.data);
      }

      if (dishesResult.data) {
        setDishes(dishesResult.data);
      }

      setLoading(false);
    };

    fetchData();
  }, [navigate]);

  const dailyGoals = useMemo(() => {
    if (!profile) return null;
    return {
      calories: profile.calorie_needs || 0,
      protein: profile.protein_needed || 0,
      carbs: profile.carbs_needed || 0,
      fats: profile.fats_needed || 0,
    };
  }, [profile]);

  const timeOfDay = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Morning";
    if (hour >= 12 && hour < 17) return "Afternoon";
    if (hour >= 17 && hour < 21) return "Evening";
    return "Night";
  }, []);

  if (loading) {
    return <MealPlanLoader />;
  }

  return (
    <div className="p-4 bg-gray-50 min-h-full">
      {/* Header */}
      <div className="mb-6">
        <p className="text-lg text-gray-600">
          Good {timeOfDay},{" "}
          <span className="font-semibold text-green-500">
            {profile?.full_name}
          </span>
        </p>
        <h2 className="text-2xl font-bold text-gray-800">
          Here's your summary
        </h2>
      </div>

      {/* Daily Goals */}
      <DashboardCard title="Daily Goals" icon={<FiTarget size={24} />}>
        {dailyGoals && (
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-500">
                {dailyGoals.calories}
              </p>
              <p className="text-sm text-gray-600">Calories</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-500">
                {dailyGoals.protein}g
              </p>
              <p className="text-sm text-gray-600">Protein</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-500">
                {dailyGoals.carbs}g
              </p>
              <p className="text-sm text-gray-600">Carbs</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-500">
                {dailyGoals.fats}g
              </p>
              <p className="text-sm text-gray-600">Fats</p>
            </div>
          </div>
        )}
      </DashboardCard>

      {/* Recent Meals */}
      <div className="mt-6">
        <DashboardCard title="Recent Meals" icon={<FiBookOpen size={24} />}>
          {mealLog.length > 0 ? (
            <ul>
              {mealLog.map((meal) => (
                <li
                  key={meal.id}
                  className="flex items-center justify-between py-2 border-b"
                >
                  <p className="text-gray-800">{meal.dish_name}</p>
                  <p className="text-gray-600">{meal.calories} cal</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-600">No meals logged yet.</p>
          )}
        </DashboardCard>
      </div>

      {/* Suggested Dishes */}
      <div className="mt-6">
        <DashboardCard title="Suggested Dishes" icon={<FiSun size={24} />}>
          {dishes.length > 0 ? (
            <div className="grid grid-cols-2 gap-4">
              {dishes.map((dish) => (
                <div key={dish.id} className="text-center">
                  <img
                    src={dish.image_url}
                    alt={dish.name}
                    className="w-full h-24 object-cover rounded-lg mb-2"
                  />
                  <p className="text-sm font-semibold text-gray-800">
                    {dish.name}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600">No dishes to suggest.</p>
          )}
        </DashboardCard>
      </div>
    </div>
  );
}
