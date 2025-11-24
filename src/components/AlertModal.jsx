import React from "react";

const AlertModal = ({ message, onClose, type = "info", onConfirm }) => {
  let borderColor = "border-green-100";
  let textColor = "text-gray-700";

  if (type === "error") {
    borderColor = "border-red-400";
    textColor = "text-red-700";
  } else if (type === "warning" || type === "confirm") {
    borderColor = "border-yellow-400";
    textColor = "text-yellow-800";
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        className={`bg-white p-6 rounded-xl text-center shadow-xl border ${borderColor} max-w-sm w-full`}
      >
        <p className={`font-medium ${textColor} mb-4`}>{message}</p>
        {type === "confirm" ? (
          <div className="flex justify-center gap-4">
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="px-5 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
            >
              Yes
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition"
            >
              No
            </button>
          </div>
        ) : (
          <button
            onClick={onClose}
            className="px-5 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition"
          >
            Okay
          </button>
        )}
      </div>
    </div>
  );
};

export default AlertModal;
