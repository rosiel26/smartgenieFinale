import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";
import { supabase } from "../supabaseClient";
import { motion } from "framer-motion";
import { FaMars, FaVenus } from "react-icons/fa";

export default function CreateProfile() {
  const navigate = useNavigate();

  // --- Core UI & Flow ---
  const [step, setStep] = useState(1);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    fullName: "",
    gender: "",
    birthDate: "",
    age: null,
    heightUnit: "cm",
    heightCm: "",
    heightFt: "",
    heightIn: "",
    weightUnit: "kg",
    weight: "",
    activityLevel: "",
    mealsPerDay: 3,
    goalDays: 30,
    goals: [],
    selectedStyle: "",
    selectedAllergens: [],
    healthConditions: [],
    bmi: null,
    calorieNeeds: null,
    proteinNeeded: null,
    fatsNeeded: null,
    carbsNeeded: null,
  });

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // --- Eating Preferences ---
  const [eatingStyles] = useState([
    {
      name: "Balanced",
      description: "Carbs, protein, and fats in moderation.",
      breakdown: "Protein: 25%, Fat: 30%, Carbs: 45%",
    },
    {
      name: "Keto",
      description: "High fat, very low carb.",
      breakdown: "Protein: 20%, Fat: 75%, Carbs: 5%",
    },
    {
      name: "Low Carb",
      description: "Less carbs, more protein and fats.",
      breakdown: "Protein: 30%, Fat: 45%, Carbs: 25%",
    },
    {
      name: "High Protein",
      description: "Boost muscle with more protein.",
      breakdown: "Protein: 40%, Fat: 30%, Carbs: 30%",
    },
  ]);

  // --- Allergens ---
  const [allergenCategories] = useState([
    { name: "Meat", items: ["Beef", "Pork", "Chicken", "Turkey"] },
    {
      name: "Seafood",
      items: ["Fish", "Shellfish", "Shrimp", "Crab", "Squid", "Lobster"],
    },
    { name: "Dairy", items: ["Milk", "Cheese", "Butter", "Yogurt"] },
  ]);

  // --- Health Conditions ---
  const [healthOptions] = useState([
    "Diabetes",
    "High blood pressure",
    "Heart disease",
    "Kidney Disease",
  ]);

  // --- Activity Options ---
  const [activityOptions] = useState([
    "Sedentary",
    "Lightly active",
    "Moderately active",
    "Very active",
  ]);

  const [goalOptions] = useState([
    "Weight loss",
    "Improve physical health",
    "Boost energy",
    "Managing stress",
    "Optimized athletic performance",
    "Eating a balanced diet",
  ]);

  // ----------------- Utility Functions -----------------
  const toggleArrayItem = (field, item) => {
    const currentArray = formData[field];
    const newArray = currentArray.includes(item)
      ? currentArray.filter((i) => i !== item)
      : [...currentArray, item];
    handleInputChange(field, newArray);
  };

  const toggleAllergen = (item) => toggleArrayItem("selectedAllergens", item);
  
  const selectAllInCategory = (categoryName) => {
    const category = allergenCategories.find((c) => c.name === categoryName);
    if (!category) return;
    const allSelected = category.items.every((i) =>
      formData.selectedAllergens.includes(i)
    );
    if (allSelected) {
      handleInputChange(
        "selectedAllergens",
        formData.selectedAllergens.filter((i) => !category.items.includes(i))
      );
    } else {
      handleInputChange("selectedAllergens", [
        ...new Set([...formData.selectedAllergens, ...category.items]),
      ]);
    }
  };

  const getHeightInCm = () =>
    formData.heightUnit === "cm"
      ? parseFloat(formData.heightCm) || 0
      : (parseFloat(formData.heightFt) || 0) * 30.48 +
        (parseFloat(formData.heightIn) || 0) * 2.54;

  const getWeightInKg = () =>
    formData.weightUnit === "kg"
      ? parseFloat(formData.weight) || 0
      : (parseFloat(formData.weight) || 0) / 2.20462;

  const calculateBMR = (weightKg, heightCm, age, gender) =>
    gender === "male"
      ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
      : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;

  const getActivityMultiplier = (level) =>
    ({
      Sedentary: 1.2,
      "Lightly active": 1.375,
      "Moderately active": 1.55,
      "Very active": 1.725,
    }[level] || 1.2);

  const adjustMacros = (goalsList, baseCalories) => {
    let proteinPerc = 0.25,
      fatPerc = 0.3,
      carbPerc = 0.45,
      calories = baseCalories;
    goalsList.forEach((goal) => {
      switch (goal) {
        case "Weight loss":
          calories *= 0.9;
          proteinPerc += 0.05;
          fatPerc -= 0.05;
          break;
        case "Muscle gain":
          calories *= 1.1;
          proteinPerc += 0.05;
          carbPerc += 0.05;
          break;
        case "Boost energy":
          carbPerc += 0.05;
          fatPerc -= 0.05;
          break;
        case "Managing stress":
          fatPerc += 0.05;
          carbPerc -= 0.05;
          break;
        case "Improve physical health":
          fatPerc += 0.05;
          carbPerc -= 0.05;
          break;
        case "Eating a balanced diet":
          proteinPerc = 0.25;
          fatPerc = 0.3;
          carbPerc = 0.45;
          break;
      }
    });
    const total = proteinPerc + fatPerc + carbPerc;
    proteinPerc /= total;
    fatPerc /= total;
    carbPerc /= total;
    return {
      calories: Math.round(calories),
      protein: Math.round((calories * proteinPerc) / 4),
      fat: Math.round((calories * fatPerc) / 9),
      carbs: Math.round((calories * carbPerc) / 4),
    };
  };

  // ----------------- Fetch User -----------------
  useEffect(() => {
    const checkUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setUser(null);
          setLoading(false);
          return;
        }
        setUser(user);
        const { data: profile, error } = await supabase
          .from("health_profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();
        if (error) console.error(error.message);
        else if (profile) {
          navigate("/personaldashboard", { replace: true });
          return;
        }
        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };
    checkUser();
  }, [navigate]);

  // ----------------- Compute Age -----------------
  useEffect(() => {
    if (!formData.birthDate) {
      handleInputChange("age", null);
      return;
    }
    const birth = new Date(formData.birthDate);
    const today = new Date();
    let calculatedAge = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      calculatedAge--;
    }
    handleInputChange("age", calculatedAge);
  }, [formData.birthDate]);

  // ----------------- Compute Health Metrics -----------------
  useEffect(() => {
    if (!formData.age) {
      handleInputChange("bmi", null);
      handleInputChange("calorieNeeds", null);
      handleInputChange("proteinNeeded", null);
      handleInputChange("fatsNeeded", null);
      handleInputChange("carbsNeeded", null);
      return;
    }
    const heightCmValue = getHeightInCm();
    const weightKgValue = getWeightInKg();
    if (heightCmValue <= 0 || weightKgValue <= 0) return;

    const bmiValue = +(weightKgValue / (heightCmValue / 100) ** 2).toFixed(2);
    handleInputChange("bmi", bmiValue);

    const bmr = calculateBMR(
      weightKgValue,
      heightCmValue,
      formData.age,
      formData.gender
    );
    const tdee = bmr * getActivityMultiplier(formData.activityLevel);
    const macros = adjustMacros(formData.goals, tdee);

    handleInputChange("calorieNeeds", macros.calories);
    handleInputChange("proteinNeeded", macros.protein);
    handleInputChange("fatsNeeded", macros.fat);
    handleInputChange("carbsNeeded", macros.carbs);
  }, [
    formData.age,
    formData.heightCm,
    formData.heightFt,
    formData.heightIn,
    formData.heightUnit,
    formData.weight,
    formData.weightUnit,
    formData.gender,
    formData.activityLevel,
    formData.goals,
  ]);

  // ----------------- Step Validation -----------------
  const isStepValid = () => {
    switch (step) {
      case 1:
        return formData.fullName.trim() !== "";
      case 2:
        return formData.gender !== "";
      case 3:
        return formData.age !== null && formData.age >= 18;
      case 8:
        return formData.activityLevel !== "";
      case 9:
        return formData.heightUnit === "cm"
          ? formData.heightCm.trim() !== ""
          : formData.heightFt.trim() !== "" && formData.heightIn.trim() !== "";
      case 10:
        return formData.weight.trim() !== "";
      case 11:
        return formData.goalDays !== "";
      default:
        return true;
    }
  };

  const handleBack = () => (step > 1 ? setStep(step - 1) : navigate(-1));

  const handleContinue = async () => {
    if (!isStepValid()) {
      if (step === 3) alert("You must be at least 18 years old to continue.");
      return;
    }

    if (step < 11) {
      setStep(step + 1);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      alert("Please login first");
      navigate("/login");
      return;
    }

    const { data, error } = await supabase.from("health_profiles").insert([
      {
        user_id: user.id,
        full_name: formData.fullName,
        birthday: formData.birthDate,
        gender: formData.gender,
        height_cm: getHeightInCm(),
        weight_kg: getWeightInKg(),
        activity_level: formData.activityLevel,
        goal: formData.goals.join(", "),
        eating_style: formData.selectedStyle,
        meals_per_day: formData.mealsPerDay,
        allergens: formData.selectedAllergens,
        health_conditions: formData.healthConditions,
        age: formData.age,
        bmi: formData.bmi,
        calorie_needs: formData.calorieNeeds,
        protein_needed: formData.proteinNeeded,
        fats_needed: formData.fatsNeeded,
        carbs_needed: formData.carbsNeeded,
        timeframe: formData.goalDays,
      },
    ]);

    if (error) console.error("❌ Error inserting profile:", error.message);
    else navigate("/personaldashboard");
  };

  if (loading)
    return (
      <div
        className="flex flex-col items-center justify-center min-h-screen"
        style={{
          background:
            "linear-gradient(to bottom right, #ECFDF5,#ECFDF5,#D1FAE5)",
        }}
      >
        <div className="border-4 border-gray-200 border-t-emerald-600 rounded-full w-12 h-12 animate-spin"></div>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5 }}
          className="mt-4 px-4 py-2 bg-emerald-100 text-emerald-800 rounded-lg border border-emerald-200"
        >
          Checking Profile
        </motion.div>
      </div>
    );

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background:
          "linear-gradient(to bottom right, #ECFDF5, #ECFDF5, #D1FAE5)",
      }}
    >
      <div className="bg-white w-[375px] min-h-[667px] rounded-2xl shadow-2xl pt-5 px-4 pb-6 relative flex flex-col">
        <button
          onClick={handleBack}
          className="absolute top-4 left-4 text-emerald-600"
        >
          <FiArrowLeft size={24} />
        </button>

        <p className="text-sm text-gray-500 text-center mb-2">
          Step {step} of 11
        </p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          // key={step}
          className="mt-2 flex flex-col items-center flex-grow gap-4 w-full"
        >
          {/* Step 1: Name */}
          {step === 1 && (
            <>
              <h2 className="text-2xl font-bold text-center sans-serif">
                Hey there! What should we call you?
              </h2>
              <h4>What name would like to us to call you?</h4>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => handleInputChange("fullName", e.target.value)}
                className="pt-20 border-b-2 border-gray-300 focus:border-emerald-500 w-full text-center text-lg outline-none transition duration-200"
                placeholder="Enter your name"
              />
            </>
          )}

          {/* Step 2: Gender */}
          {step === 2 && (
            <div className="text-center">
              {/* Heading */}
              <br />
              <h2 className="text-2xl font-bold text-center sans-serif">
                What is your biological sex?
              </h2>
              <p className="mt-2 text-gray-600 text-sm max-w-sm mx-auto">
                Knowing your biological sex allows us to personalize your health
                and calorie recommendations.
              </p>

              {/* Buttons */}
              <div className="flex flex-col items-center gap-4 mt-8">
                {[
                  {
                    label: "Male",
                    icon: <FaMars className="text-blue-500 text-xl" />,
                  },
                  {
                    label: "Female",
                    icon: <FaVenus className="text-pink-500 text-xl" />,
                  },
                ].map((option) => (
                  <button
                    key={option.label}
                    onClick={() => handleInputChange("gender", option.label)}
                    className={`flex items-center justify-center gap-3 w-[220px] py-3 rounded-xl text-lg font-semibold transition-all duration-200 ${
                      formData.gender === option.label
                        ? "bg-emerald-100 text-emerald-700 shadow-md border-2 border-emerald-300"
                        : "bg-white border border-gray-300 text-gray-700 hover:bg-emerald-50"
                    }`}
                  >
                    {option.icon}
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Birthday */}
          {step === 3 && (
            <div className="animate-fadeIn flex flex-col items-center">
              {/* Title */}
              <h2 className="text-2xl font-extrabold text-green-700 text-center">
                When is your birthday?
              </h2>
              <p className="mt-2 text-gray-600 text-sm max-w-sm text-center">
                Your age helps us fine-tune your plan to match your metabolism.
              </p>

              <br />

              {/* Input Card */}
              <div className="w-full max-w-xs text-center">
                <label
                  htmlFor="birthday"
                  className="block text-sm font-semibold text-green-600 mb-3"
                >
                  Select your birth date
                </label>

                <input
                  type="date"
                  id="birthday"
                  value={formData.birthDate || ""}
                  onChange={(e) =>
                    handleInputChange("birthDate", e.target.value)
                  }
                  className="w-full px-4 py-3 rounded-xl border border-green-300 text-gray-700 
                            focus:outline-none focus:ring-2 focus:ring-green-400 
                            transition duration-200 cursor-pointer"
                />

                {/* Age Preview */}
                {formData.birthDate && (
                  <p className="mt-4 text-sm text-gray-600">
                    You are{" "}
                    <span
                      className={`font-semibold ${
                        formData.age < 18 ? "text-red-500" : "text-green-600"
                      }`}
                    >
                      {formData.age}
                    </span>{" "}
                    years old.
                    {formData.age < 18 && (
                      <span className="block text-red-500 mt-1 font-medium">
                        You must be at least 18 years old to continue.
                      </span>
                    )}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Goal */}
          {step === 4 && (
            <>
              <h2 className="text-xl font-bold text-center">
                What are you hoping to accomplish with your meals?
              </h2>
              <div className="flex flex-col gap-2 w-full">
                {goalOptions.map((g) => (
                  <div
                    key={g}
                    onClick={() => toggleArrayItem("goals", g)}
                    className={`p-4 rounded-xl cursor-pointer border ${
                      formData.goals.includes(g)
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-white border-gray-200 hover:bg-emerald-100"
                    }`}
                  >
                    {g}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Step 5: Eating style */}
          {step === 5 && (
            <>
              <h2 className="text-xl font-bold text-center">
                How would you describe your eating style?
              </h2>
              <div className="flex flex-col gap-2 w-full">
                {eatingStyles.map((style) => {
                  const isSelected = formData.selectedStyle === style.name;
                  return (
                    <button
                      key={style.name}
                      type="button"
                      onClick={() =>
                        handleInputChange(
                          "selectedStyle",
                          isSelected ? "" : style.name
                        )
                      }
                      className={`w-full text-left p-4 rounded-xl cursor-pointer border transition-all duration-200 focus:outline-none ${
                        isSelected
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-white border-gray-200 hover:bg-emerald-100"
                      }`}
                    >
                      <h3 className="font-semibold">{style.name}</h3>
                      <p className="text-xs">{style.description}</p>
                      <p className="text-xs">{style.breakdown}</p>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Step 6: Allergens */}
          {step === 6 && (
            <div className="text-center font-sans ">
              {/* Title */}
              <h2 className="text-2xl font-bold text-emerald-700">
                Let us know your allergens
              </h2>
              <p className="mt-2 text-gray-600 text-sm max-w-md mx-auto">
                Select any foods you are allergic to so we can tailor your
                experience.
              </p>

              {/* Allergens List */}
              <div className="flex flex-col gap-6 w-full max-h-[350px] overflow-y-auto mt-6 pr-2 scrollbar-hide">
                {allergenCategories.map((cat) => (
                  <div
                    key={cat.name}
                    className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100"
                  >
                    {/* Category Header */}
                    <div
                      className="flex justify-between items-center cursor-pointer mb-3"
                      onClick={() => selectAllInCategory(cat.name)}
                    >
                      <h3 className="font-semibold text-lg text-gray-800">
                        {cat.name}
                      </h3>
                      <span className="text-emerald-600 text-sm font-medium hover:underline">
                        {cat.items.every((i) =>
                          formData.selectedAllergens.includes(i)
                        )
                          ? "Deselect all"
                          : "Select all"}
                      </span>
                    </div>

                    {/* Items */}
                    <div className="grid grid-cols-2 gap-3">
                      {cat.items.map((item) => (
                        <label
                          key={item}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium shadow-sm transition-all duration-200 cursor-pointer ${
                            formData.selectedAllergens.includes(item)
                              ? "bg-emerald-100 border-emerald-300 text-emerald-700 shadow-md"
                              : "bg-white border-gray-200 text-gray-700 hover:bg-emerald-50 hover:border-emerald-300"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={formData.selectedAllergens.includes(item)}
                            onChange={() => toggleAllergen(item)}
                            className="accent-emerald-600 w-4 h-4"
                          />
                          {item}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 7: Health conditions */}
          {step === 7 && (
            <>
              <h2 className="text-xl font-bold text-center">
                Do you have any health conditions?
              </h2>
              <div className="flex flex-col gap-2 w-full">
                {healthOptions.map((cond) => (
                  <div
                    key={cond}
                    onClick={() => toggleArrayItem("healthConditions", cond)}
                    className={`p-4 rounded-xl cursor-pointer border ${
                      formData.healthConditions.includes(cond)
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-white border-gray-200 hover:bg-emerald-100"
                    }`}
                  >
                    {cond}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Step 8: Activity */}
          {step === 8 && (
            <>
              <h2 className="text-xl font-bold text-center">
                How active are you?
              </h2>
              <div className="flex flex-col gap-2 w-full">
                {activityOptions.map((lvl) => (
                  <div
                    key={lvl}
                    onClick={() => handleInputChange("activityLevel", lvl)}
                    className={`p-4 rounded-xl cursor-pointer border ${
                      formData.activityLevel === lvl
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-white border-gray-200 hover:bg-emerald-100"
                    }`}
                  >
                    {lvl}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Step 9: Height */}
          {step === 9 && (
            <>
              <h2 className="text-xl font-bold text-center">
                What's your height?
              </h2>
              <div className="flex justify-center gap-4 mt-4">
                <button
                  onClick={() => handleInputChange("heightUnit", "cm")}
                  className={`px-4 py-2 rounded-full border ${
                    formData.heightUnit === "cm"
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-white border-gray-300 hover:bg-emerald-100"
                  }`}
                >
                  cm
                </button>
                <button
                  onClick={() => handleInputChange("heightUnit", "ft")}
                  className={`px-4 py-2 rounded-full border ${
                    formData.heightUnit === "ft"
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-white border-gray-300 hover:bg-emerald-100"
                  }`}
                >
                  ft/in
                </button>
              </div>
              {formData.heightUnit === "cm" ? (
                <input
                  type="number"
                  value={formData.heightCm}
                  onChange={(e) =>
                    handleInputChange("heightCm", e.target.value)
                  }
                  placeholder="e.g., 170"
                  className="border-b-2 w-full text-center text-lg outline-none pt-20 mt-4"
                />
              ) : (
                <div className="flex gap-2 justify-center mt-4">
                  <input
                    type="number"
                    value={formData.heightFt}
                    onChange={(e) =>
                      handleInputChange("heightFt", e.target.value)
                    }
                    placeholder="ft"
                    className="w-20 border-b-2 text-center text-lg outline-none"
                  />
                  <input
                    type="number"
                    value={formData.heightIn}
                    onChange={(e) =>
                      handleInputChange("heightIn", e.target.value)
                    }
                    placeholder="in"
                    className="w-20 border-b-2 text-center text-lg outline-none"
                  />
                </div>
              )}
            </>
          )}

          {/* Step 10: Weight */}
          {step === 10 && (
            <>
              <h2 className="text-xl font-bold text-center">
                What's your weight?
              </h2>
              <div className="flex justify-center gap-4 mt-4">
                <button
                  onClick={() => handleInputChange("weightUnit", "kg")}
                  className={`px-4 py-2 rounded-full border ${
                    formData.weightUnit === "kg"
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-white border-gray-300 hover:bg-emerald-100"
                  }`}
                >
                  kg
                </button>
                <button
                  onClick={() => handleInputChange("weightUnit", "lbs")}
                  className={`px-4 py-2 rounded-full border ${
                    formData.weightUnit === "lbs"
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-white border-gray-300 hover:bg-emerald-100"
                  }`}
                >
                  lbs
                </button>
              </div>
              <input
                type="number"
                value={formData.weight}
                onChange={(e) => handleInputChange("weight", e.target.value)}
                placeholder={`e.g., ${
                  formData.weightUnit === "kg" ? "65" : "143"
                }`}
                className="border-b-2 w-full text-center text-lg outline-none pt-20 mt-4"
              />
            </>
          )}
          {step === 11 && (
            <>
              <h2 className="text-xl font-bold text-center text-gray-800">
                How many days for your goal?
              </h2>
              <p className="text-gray-600 text-sm text-center mb-4">
                Enter your desired timeframe.
              </p>
              <div className="flex items-center justify-center gap-4">
                <label className="font-medium">Timeframe (days):</label>
                <input
                  type="number"
                  min={1}
                  value={formData.goalDays || ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "" || value === "0") {
                      handleInputChange("goalDays", "");
                    } else {
                      handleInputChange("goalDays", Number(value));
                    }
                  }}
                  className="border rounded-lg px-2 py-1 w-20"
                />
              </div>
            </>
          )}
        </motion.div>

        <div className="mt-6">
          <button
            onClick={handleContinue}
            disabled={!isStepValid()}
            className={`mt-6 w-full py-3 rounded-xl font-semibold transition ${
              isStepValid()
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            {step < 11 ? "Continue" : "Finish"}
          </button>
        </div>
      </div>
    </div>
  );
}
