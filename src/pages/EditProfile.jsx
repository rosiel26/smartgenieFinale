import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiSave } from "react-icons/fi";
import {
  calculateBMR,
  getActivityMultiplier,
  calculateMacros,
} from "../utils/calculateHealth";

export default function EditProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // --- Options ---
  const allergenOptions = useMemo(
    () => [
      { name: "Peanuts", category: "Legume" },
      { name: "Tree nuts", category: "Legume" },
      { name: "Soy", category: "Legume" },
      { name: "Soy sauce", category: "Legume" },
      { name: "Miso", category: "Legume" },
      { name: "Tofu", category: "Legume" },
      { name: "Chicken", category: "Meat" },
      { name: "Beef", category: "Meat" },
      { name: "Pork", category: "Meat" },
      { name: "Liver", category: "Meat" },
      { name: "Fish", category: "Seafood" },
      { name: "Shellfish", category: "Seafood" },
      { name: "Shrimp", category: "Seafood" },
      { name: "Prawns", category: "Seafood" },
      { name: "Mussels", category: "Seafood" },
      { name: "Squid", category: "Seafood" },
      { name: "Egg", category: "Egg" },
      { name: "Wheat", category: "Grain" },
      { name: "Gluten", category: "Grain" },
      { name: "Noodles", category: "Grain" },
      { name: "Wrappers", category: "Grain" },
      { name: "Breadcrumbs", category: "Grain" },
      { name: "Flour", category: "Grain" },
      { name: "Dairy", category: "Dairy" },
      { name: "Milk", category: "Dairy" },
      { name: "Condensed milk", category: "Dairy" },
      { name: "Cream", category: "Dairy" },
      { name: "Butter", category: "Dairy" },
      { name: "Coconut", category: "Other" },
      { name: "Corn", category: "Other" },
    ],
    []
  );

  const healthConditionOptions = useMemo(
    () => [
      "Diabetes",
      "High Blood Pressure",
      "Heart Disease",
      "Kidney Disease",
    ],
    []
  );
  const activityLevelOptions = useMemo(
    () => ["Sedentary", "Lightly Active", "Moderately Active", "Very Active"],
    []
  );
  const goalOptions = useMemo(
    () => [
      "Weight loss",
      "Improve physical health",
      "Boost energy",
      "Managing stress",
      "Optimized athletic performance",
      "Eating a balanced diet",
    ],
    []
  );
  const eatingStyleOptions = useMemo(
    () => ["Balanced", "Keto", "Low Carb", "High Protein"],
    []
  );

  // --- Fetch profile ---
  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return navigate("/login");

      const { data, error } = await supabase
        .from("health_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      if (error) console.error(error);
      else
        setProfile({
          ...data,
          health_conditions: Array.isArray(data?.health_conditions)
            ? data.health_conditions
            : data?.health_conditions?.split(",").map((h) => h.trim()) || [],
          allergens: Array.isArray(data?.allergens)
            ? data.allergens
            : data?.allergens?.split(",").map((a) => a.trim()) || [],
          goal: data?.goal ? data.goal.split(",").map((g) => g.trim()) : [],
        });
      setLoading(false);
    })();
  }, [navigate]);

  // --- Handlers ---
  const handleChange = (e) =>
    setProfile((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleMultiSelect = (name, value) =>
    setProfile((prev) => {
      const arr = prev[name] || [];
      return {
        ...prev,
        [name]: arr.includes(value)
          ? arr.filter((v) => v !== value)
          : [...arr, value],
      };
    });

  // --- Memoized BMI ---
  const bmi = useMemo(() => {
    if (!profile?.weight_kg || !profile?.height_cm) return null;
    const h = profile.height_cm / 100;
    return (profile.weight_kg / (h * h)).toFixed(1);
  }, [profile?.weight_kg, profile?.height_cm]);

  // --- Save ---
  const handleSave = async (e) => {
    e.preventDefault();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { gender, weight_kg, height_cm, age, activity_level, goal } = profile;
    const bmr = calculateBMR(weight_kg, height_cm, age, gender);
    const tdee = bmr * getActivityMultiplier(activity_level);
    const macros = calculateMacros(goal, tdee);

    const updatedProfile = {
      ...profile,
      goal: goal.join(","),
      calorie_needs: Math.round(macros.calories),
      protein_needed: Math.round(macros.protein),
      fats_needed: Math.round(macros.fat),
      carbs_needed: Math.round(macros.carbs),
      bmi,
    };

    const { error } = await supabase
      .from("health_profiles")
      .update(updatedProfile)
      .eq("user_id", user.id);
    if (error) console.error("Update failed:", error);
    else navigate("/personaldashboard");
  };

  if (loading)
    return (
      <div className="flex justify-center items-center min-h-screen bg-green-50 text-green-700 animate-pulse">
        Loading profile...
      </div>
    );
  if (!profile)
    return (
      <div className="text-center mt-10 text-red-500">No profile found</div>
    );

  // --- Reusable components ---
  const InputField = ({ label, name, type = "text", value }) => (
    <div>
      <label className="block text-sm font-semibold text-gray-700">
        {label}
      </label>
      <input
        type={type}
        name={name}
        value={value || ""}
        onChange={handleChange}
        className="w-full border border-gray-300 p-2.5 rounded-lg mt-1 focus:ring-2 focus:ring-green-400 focus:border-green-400 outline-none transition"
      />
    </div>
  );

  const SelectField = ({ label, name, value, options }) => (
    <div>
      <label className="block text-sm font-semibold text-gray-700">
        {label}
      </label>
      <select
        name={name}
        value={value || ""}
        onChange={handleChange}
        className="w-full border border-gray-300 p-2.5 rounded-lg mt-1 focus:ring-2 focus:ring-green-400 focus:border-green-400 outline-none transition"
      >
        <option value="">Select</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );

  const TagSelector = ({ options, selected, name, handleMultiSelect }) => {
    const groupedOptions = options.reduce((acc, opt) => {
      const isObject = typeof opt === "object";
      const category = isObject ? opt.category : "";
      if (!acc[category]) acc[category] = [];
      acc[category].push(isObject ? opt.name : opt);
      return acc;
    }, {});

    return (
      <div className="space-y-2">
        {Object.keys(groupedOptions).map((category) => (
          <div key={category}>
            {category && (
              <p className="text-xs font-semibold text-gray-500 mb-1">
                {category}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {groupedOptions[category].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleMultiSelect(name, value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    selected.includes(value)
                      ? "bg-lime-500 text-black shadow-sm"
                      : "bg-black text-white hover:bg-green-50"
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-100 via-white to-green-200 flex justify-center items-center px-4 py-8">
      <form
        onSubmit={handleSave}
        className="bg-white w-[375px] h-[700px] rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-green-100"
      >
        <div className="bg-black w-full h-[130px] rounded-t-3xl flex flex-col px-2 pt-2 relative">
          <div className="bg-black h-[60px] flex items-center justify-between px-5 rounded-t-3xl shadow-md">
            <button
              type="button"
              onClick={() => navigate("/personaldashboard")}
              className="flex items-center gap-1 text-white hover:opacity-80 transition"
            >
              <FiArrowLeft />
            </button>
            <div className="flex items-center gap-2 text-white font-semibold">
              Edit Profile
            </div>
            <button
              type="submit"
              className="flex items-center gap-1 text-white hover:opacity-80 transition"
            >
              <FiSave /> Save
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto hide-scrollbar bg-gradient-to-b from-white to-green-50">
          <InputField
            label="Full Name"
            name="full_name"
            value={profile.full_name}
          />
          <InputField
            label="Age"
            name="age"
            type="number"
            value={profile.age}
          />
          <SelectField
            label="Gender"
            name="gender"
            value={profile.gender}
            options={["Male", "Female"]}
          />
          <div className="flex gap-4">
            <InputField
              label="Height (cm)"
              name="height_cm"
              type="number"
              value={profile.height_cm}
            />
            <InputField
              label="Weight (kg)"
              name="weight_kg"
              type="number"
              value={profile.weight_kg}
            />
          </div>
          <InputField
            label="Birthday"
            name="birthday"
            type="date"
            value={profile.birthday}
          />
          <InputField
            label="Timeframe (days)"
            name="timeframe"
            value={profile.timeframe}
          />
          <SelectField
            label="Activity Level"
            name="activity_level"
            value={profile.activity_level}
            options={activityLevelOptions}
          />
          <SelectField
            label="Eating Style"
            name="eating_style"
            value={profile.eating_style}
            options={eatingStyleOptions}
          />
          <div className="border rounded-lg p-2">
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Goals
            </label>
            <TagSelector
              options={goalOptions}
              selected={profile.goal}
              name="goal"
              handleMultiSelect={handleMultiSelect}
            />
          </div>
          <div className="border rounded-2xl p-2">
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Allergens
            </label>
            <TagSelector
              options={allergenOptions}
              selected={profile.allergens}
              name="allergens"
              handleMultiSelect={handleMultiSelect}
            />
          </div>
          <div className="border rounded-lg p-2">
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Health Conditions
            </label>
            <TagSelector
              options={healthConditionOptions}
              selected={profile.health_conditions}
              name="health_conditions"
              handleMultiSelect={handleMultiSelect}
            />
          </div>
          {bmi && (
            <div className="mt-5 p-3 border rounded-xl bg-black text-white font-medium">
              Current BMI: {bmi}
            </div>
          )}
        </div>
      </form>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
