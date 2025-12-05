import React, { useState, useEffect } from 'react';

const passwordValidationRules = [
  {
    regex: /.{8,}/,
    message: 'At least 8 characters',
  },
  {
    regex: /[A-Z]/,
    message: 'One uppercase letter',
  },
  {
    regex: /[a-z]/,
    message: 'One lowercase letter',
  },
  {
    regex: /[0-9]/,
    message: 'One number',
  },
  {
    regex: /[@$!%*?&]/,
    message: 'One special character (@$!%*?&)',
  },
];

const ConfirmOldPasswordModal = ({ visible, onConfirm, onCancel, confirmLoading }) => {
  const [oldPassword, setOldPassword] = useState('');
  const [validationStatus, setValidationStatus] = useState(
    passwordValidationRules.map(() => false)
  );
  const [isPasswordValid, setIsPasswordValid] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // To toggle password visibility

  useEffect(() => {
    if (visible) {
      setOldPassword('');
      setValidationStatus(passwordValidationRules.map(() => false));
      setIsPasswordValid(false);
    }
  }, [visible]);

  const validatePassword = (password) => {
    const newValidationStatus = passwordValidationRules.map((rule) =>
      rule.regex.test(password)
    );
    setValidationStatus(newValidationStatus);
    const allValid = newValidationStatus.every((status) => status);
    setIsPasswordValid(allValid);
    return allValid;
  };

  const handlePasswordChange = (e) => {
    const password = e.target.value;
    setOldPassword(password);
    validatePassword(password);
  };

  const handleConfirm = () => {
    if (validatePassword(oldPassword)) {
      onConfirm(oldPassword);
    }
  };

  if (!visible) return null; // Render nothing if not visible

  return (
    // Mimicking the structure and styling of other modals in Account.jsx
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-80 p-6 text-center space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">
          Confirm Old Password
        </h3>
        <p className="text-sm text-gray-600">
          Please enter your old password to proceed.
        </p>
        <div className="relative flex items-center">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Old Password"
            value={oldPassword}
            onChange={handlePasswordChange}
            onKeyPress={(e) => { // Handle Enter key press
              if (e.key === 'Enter') {
                handleConfirm();
              }
            }}
            className="w-full border border-gray-300 p-2 rounded-lg pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 text-gray-500"
          >
            {showPassword ? "👁️" : "🙈"} {/* Replaced icons with emojis */}
          </button>
        </div>
        <div className="text-left text-sm space-y-1">
          {passwordValidationRules.map((rule, index) => (
            <p
              key={index}
              className={`${validationStatus[index] ? 'text-green-600' : 'text-red-600'} flex items-center gap-2`}
            >
              {validationStatus[index] ? '✅' : '❌'} {rule.message}
            </p>
          ))}
        </div>
        <div className="flex justify-center gap-3 mt-4">
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isPasswordValid || confirmLoading}
            className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {confirmLoading ? "Confirming..." : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmOldPasswordModal;
