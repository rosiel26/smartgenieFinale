import React, { useEffect } from "react";

const SuccessModal = ({
  message = "Successfully added!",
  onClose,
  autoCloseDelay = 3000,
}) => {
  useEffect(() => {
    if (autoCloseDelay > 0) {
      const timer = setTimeout(() => {
        onClose && onClose();
      }, autoCloseDelay);
      return () => clearTimeout(timer);
    }
  }, [onClose, autoCloseDelay]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 shadow-lg max-w-sm text-center">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              ></path>
            </svg>
          </div>
          <p className="text-gray-700 text-lg font-semibold">{message}</p>
        </div>
      </div>
    </div>
  );
};

export default SuccessModal;
