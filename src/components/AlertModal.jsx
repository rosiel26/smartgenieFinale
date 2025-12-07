import React from "react";

const AlertModal = ({ show, visible, message, onClose }) => {
  const isVisible =
    typeof show !== "undefined"
      ? show
      : typeof visible !== "undefined"
      ? visible
      : true;
  if (!isVisible) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={(e) => e.target === e.currentTarget && onClose && onClose()}
    >
      <div
        className="bg-white rounded-xl p-5 shadow-lg max-w-sm text-center relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-2 right-2 text-gray-400 hover:text-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <p className="text-gray-700 my-4">{message}</p>
      </div>
    </div>
  );
};

export default AlertModal;