import React from "react";

const AlertModal = ({ message, onClose }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div className="bg-white p-6 rounded-xl text-center shadow-xl border border-green-100 max-w-sm w-full">
      <p className="text-gray-700 font-medium">{message}</p>
    </div>
  </div>
);

export default AlertModal;
