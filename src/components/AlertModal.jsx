import React from "react";

const AlertModal = ({ show, message, onClose }) => {
  if (!show) return null;
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-white rounded-xl p-5 shadow-lg max-w-sm text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-gray-700 mb-4">{message}</p>
      </div>
    </div>
  );
};

export default AlertModal;