import React, { useState, useEffect, useRef } from "react";
import {
  FiHome,
  FiSettings,
  FiBookOpen,
  FiCalendar,
  FiPlus,
} from "react-icons/fi";
import { FaDumbbell } from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";

function DraggablePlusButton({ navigate, footerBounds }) {
  const [position, setPosition] = useState(() => {
    const saved = localStorage.getItem("plusButtonPos");
    return saved ? JSON.parse(saved) : { x: window.innerWidth / 2 - 28 };
  });

  const isDragging = useRef(false);
  const offset = useRef(0);
  const buttonRef = useRef(null);

  // The Y position is fixed to top border of footer
  const getFixedY = () => footerBounds.top - 40; // 32 for half of w-14/h-14

  const startDrag = (clientX) => {
    isDragging.current = true;
    const rect = buttonRef.current.getBoundingClientRect();
    offset.current = clientX - rect.left;
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    startDrag(e.clientX);
  };

  const handleTouchStart = (e) => {
    startDrag(e.touches[0].clientX);
  };

  const moveDrag = (clientX) => {
    if (!isDragging.current || !footerBounds) return;

    const rect = buttonRef.current.getBoundingClientRect();
    const btnWidth = rect.width;

    let newX = clientX - offset.current;

    const minX = footerBounds.left;
    const maxX = footerBounds.right - btnWidth;

    newX = Math.max(minX, Math.min(newX, maxX));

    setPosition({ x: newX });
  };

  const handleMouseMove = (e) => moveDrag(e.clientX);
  const handleTouchMove = (e) => moveDrag(e.touches[0].clientX);

  const endDrag = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    localStorage.setItem("plusButtonPos", JSON.stringify(position));
  };

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", endDrag);

    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", endDrag);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", endDrag);

      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", endDrag);
    };
  }, [position, footerBounds]);

  const handleCameraUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const r = new FileReader();
    r.onloadend = () => {
      navigate("/analyze", { state: { image: r.result } });
    };
    r.readAsDataURL(file);
  };

  return (
    <div
      ref={buttonRef}
      className="fixed z-50 cursor-grab"
      style={{
        left: position.x,
        top: footerBounds ? getFixedY() : -200,
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      <label
        htmlFor="cameraUpload"
        className="bg-black text-lime-400 rounded-full w-14 h-14 border-4 border-white shadow-xl flex items-center justify-center active:scale-95 transition"
      >
        <FiPlus size={28} />
        <input
          id="cameraUpload"
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleCameraUpload}
        />
      </label>
    </div>
  );
}

export default function FooterNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const footerRef = useRef(null);
  const [footerBounds, setFooterBounds] = useState(null);

  useEffect(() => {
    if (footerRef.current) {
      setFooterBounds(footerRef.current.getBoundingClientRect());
    }

    const onResize = () => {
      if (footerRef.current) {
        setFooterBounds(footerRef.current.getBoundingClientRect());
      }
    };

    window.addEventListener("resize", onResize);

    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <>
      <div
        ref={footerRef}
        className="relative w-full bg-black/90 backdrop-blur-md border-t border-gray-200 rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.05)] h-[80px] flex items-center justify-around z-50"
      >
        <NavButton
          label="Home"
          icon={<FiHome size={22} />}
          active={location.pathname === "/personaldashboard"}
          onClick={() => navigate("/personaldashboard")}
        />

        <NavButton
          label="Journal"
          icon={<FiBookOpen size={22} />}
          active={location.pathname === "/journal"}
          onClick={() => navigate("/journal")}
        />

        <NavButton
          label="Workout"
          icon={<FaDumbbell size={22} />}
          active={location.pathname === "/workout"}
          onClick={() => navigate("/workout")}
        />

        <NavButton
          label="Plan"
          icon={<FiCalendar size={22} />}
          active={location.pathname === "/mealplan"}
          onClick={() => navigate("/mealplan")}
        />

        <NavButton
          label="Settings"
          icon={<FiSettings size={22} />}
          active={location.pathname === "/settings"}
          onClick={() => navigate("/settings")}
        />
      </div>

      {footerBounds && (
        <DraggablePlusButton navigate={navigate} footerBounds={footerBounds} />
      )}
    </>
  );
}

function NavButton({ label, icon, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 text-sm ${
        active ? "text-lime-500 scale-105" : "text-gray-500"
      }`}
    >
      {icon}
      <span className="text-[12px]">{label}</span>
    </button>
  );
}
