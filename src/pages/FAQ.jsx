import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiChevronDown, FiChevronUp, FiArrowLeft } from "react-icons/fi";

const faqs = [
  {
    question: "What is SmartGenie and what does it do?",
    answer:
      "SmartGenie is a smart meal-planning and fitness system that suggests recipes, tracks your macros, logs workouts, and recommends stores based on your location. It provides meal details, ingredients, serving size adjustments, and personalized recommendations based on your goals.",
  },
  {
    question: "How does SmartGenie calculate nutrition and serving sizes?",
    answer:
      "Nutrition is calculated using ingredient-based data. When you change serving sizes, SmartGenie automatically recalculates calories, protein, carbs, and fats. Some dishes may show estimated values due to variations in ingredient weight or cooking methods.",
  },
  {
    question: "Can I filter meals and get store suggestions?",
    answer:
      "Yes! You can filter meals by dietary preferences or restrictions, and SmartGenie can show recommended stores based on your selected city and store type for easier ingredient shopping.",
  },
  {
    question: "Does SmartGenie support workouts and activity logs?",
    answer:
      "Yes. You can log workouts such as cardio, strength, or yoga, and view their details in a clean, organized layout. Logs can also be deleted or updated as needed.",
  },
  {
    question: "Is SmartGenie free, and what devices does it support?",
    answer:
      "SmartGenie is free to use with optional premium features. It works on most modern browsers and devices. Older browser versions may work but could have limited support for newer web features.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(null);
  const navigate = useNavigate();

  const toggleFAQ = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-100 via-white to-green-200 flex items-center justify-center px-4 py-6">
      <div className="bg-white w-[380px] h-[720px] rounded-3xl shadow-2xl overflow-auto flex flex-col border border-green-100">
        {/* Header */}
        <div className="bg-green-600 p-5 rounded-t-3xl text-white shadow-lg flex items-center justify-between">
          <button
            onClick={() => navigate("/settings")}
            className="text-white text-lg p-1 hover:bg-green-500 rounded transition"
          >
            <FiArrowLeft />
          </button>
          <div className="font-bold text-lg">FAQ</div>
          <div className="w-6"></div>
        </div>

        {/* FAQ Content */}
        <div className="p-5 flex-1 overflow-auto space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="bg-green-50 border border-green-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition"
            >
              <button
                className="w-full flex justify-between items-center font-medium text-green-900 focus:outline-none"
                onClick={() => toggleFAQ(index)}
              >
                <span>{faq.question}</span>
                <span className="text-green-600 text-xl">
                  {openIndex === index ? <FiChevronUp /> : <FiChevronDown />}
                </span>
              </button>
              {openIndex === index && (
                <p className="mt-3 text-green-800 text-sm leading-relaxed">
                  {faq.answer}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
