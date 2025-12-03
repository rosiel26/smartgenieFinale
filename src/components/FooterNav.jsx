import React from "react";
import {
  FiHome,
  FiPlus,
  FiSettings,
  FiBookOpen,
  FiCalendar,
} from "react-icons/fi";
import { FaDumbbell } from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";

export default function FooterNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const isHome =
    location.pathname === "/personaldashboard" ||
    location.pathname === "/profile";
  const isJournal = location.pathname === "/journal";
  const isWorkout = location.pathname === "/workout";
  const isPlan = location.pathname === "/mealplan";
  const isProfile = location.pathname === "/settings";

  return (
    <div className="relative w-full bg-black/90 backdrop-blur-md border-t border-gray-200 rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.05)] h-[80px] flex items-center justify-around z-50">
      {/* Home */}
      <NavButton
        label="Home"
        icon={<FiHome size={22} />}
        active={isHome}
        onClick={() => navigate("/personaldashboard")}
      />

      {/* Journal */}
      <NavButton
        label="Journal"
        icon={<FiBookOpen size={22} />}
        active={isJournal}
        onClick={() => navigate("/journal")}
      />

      {/* Workout */}
      <NavButton
        label="Workout"
        icon={<FaDumbbell size={22} />}
        active={isWorkout}
        onClick={() => navigate("/workout")}
      />

      {/* Meal Plan */}
      <NavButton
        label="Plan"
        icon={<FiCalendar size={22} />}
        active={isPlan}
        onClick={() => navigate("/mealplan")}
      />

      {/* Settings */}
      <div className="relative">
        <NavButton
          label="Settings"
          icon={<FiSettings size={22} />}
          active={isProfile}
          onClick={() => navigate("/settings")}
        />
        {/* Floating Plus Button */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2">
          <label
            htmlFor="cameraUpload"
            className="bg-black text-lime-400 rounded-full shadow-xl w-14 h-14 flex items-center justify-center cursor-pointer transition-all duration-300 active:scale-95 border-4 border-white"
          >
            <FiPlus size={28} />
            <input
              id="cameraUpload"
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onloadend = () => {
                  const base64Image = reader.result;
                  navigate("/analyze", { state: { image: base64Image } });
                };
                reader.readAsDataURL(file);
              }}
            />
          </label>
        </div>
      </div>
    </div>
  );
}

function NavButton({ label, icon, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1 text-sm transition-all duration-200 ${
        active
          ? "text-lime-500 scale-105 font-medium"
          : "text-gray-500 hover:text-lime-500"
      }`}
    >
      {icon}
      <span className="text-[12px]">{label}</span>
    </button>
  );
}
