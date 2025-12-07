import React from "react";

const ConfirmationModal = ({
  show,
  message,
  onConfirm,
  onCancel,
  confirmText = "Confirm",
  cancelText = "Cancel",
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full text-center border-2 border-lime-200">
        <div className="mb-4">
          <div className="w-12 h-12 bg-lime-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg
              className="w-6 h-6 text-lime-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              ></path>
            </svg>
          </div>
          <h3 className="text-base font-bold text-gray-900 mb-2">
            Confirm Action
          </h3>
          <p className="text-gray-600 text-sm leading-relaxed">{message}</p>
        </div>
        <div className="flex justify-center gap-3">
          <button
            onClick={onCancel}
            className="bg-black text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-800 transition-all duration-200 transform hover:scale-105 shadow-md text-sm"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="bg-lime-500 text-black px-4 py-2 rounded-lg font-semibold hover:bg-lime-400 transition-all duration-200 transform hover:scale-105 shadow-md text-sm"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
