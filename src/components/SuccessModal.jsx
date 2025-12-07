import React, { useEffect } from "react";

const SuccessModal = ({
  message = "Successfully added!",
  onClose,
  autoCloseDelay = 2000,
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
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-black rounded-2xl p-8 shadow-2xl w-72 text-center border-2 border-lime-500">
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 bg-lime-500 rounded-full flex items-center justify-center mb-6 shadow-lg">
            <svg
              className="w-10 h-10 text-black"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              ></path>
            </svg>
          </div>
          <h2 className="text-lime-400 text-2xl font-bold mb-4">Success</h2>
          <p className="text-white text-lg leading-relaxed whitespace-pre-line">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
};

export default SuccessModal;
