import React from 'react';

export const InputField = ({
  label,
  name,
  type = "text",
  value,
  disabled,
  onChange,
  min,
}) => (
  <div>
    <label className="block text-sm font-semibold text-gray-700">{label}</label>
    <input
      type={type}
      name={name}
      value={value || ""}
      min={min}
      onChange={onChange}
      disabled={disabled}
      className="w-full border border-gray-300 p-2.5 rounded-lg mt-1 focus:ring-2 focus:ring-green-400 focus:border-green-400 outline-none transition disabled:bg-gray-100 disabled:text-gray-500"
    />
  </div>
);

export const SelectField = ({ label, name, value, options, onChange }) => (
  <div>
    <label className="block text-sm font-semibold text-gray-700">{label}</label>
    <select
      name={name}
      value={value || ""}
      onChange={onChange}
      className="w-full border border-gray-300 p-2.5 rounded-lg mt-1 focus:ring-2 focus:ring-green-400 focus:border-green-400 outline-none transition"
    >
      <option value="">Select</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  </div>
);

export const TagSelector = ({ options, selected, name, handleMultiSelect }) => {
  const groupedOptions = options.reduce((acc, opt) => {
    const isObject = typeof opt === "object";
    const category = isObject ? opt.category : "";
    if (!acc[category]) acc[category] = [];
    acc[category].push(isObject ? opt.name : opt);
    return acc;
  }, {});

  return (
    <div className="space-y-2 max-h-[200px] overflow-y-auto hide-scrollbar">
      {Object.keys(groupedOptions).map((category) => (
        <div key={category}>
          {category ? (
            <p className="text-xs font-semibold text-gray-500 mb-1">
              {category}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {groupedOptions[category].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => handleMultiSelect(name, value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  selected.includes(value)
                    ? "bg-lime-500 text-black shadow-sm"
                    : "bg-black text-white hover:bg-lime-400"
                }`}
              >
                {value}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
