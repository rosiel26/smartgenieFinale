import React from "react";
import { FaSearch, FaUtensils } from "react-icons/fa";
import { BsCircleFill } from "react-icons/bs";

const SuggestedDishList = ({
  searchTerm,
  setSearchTerm,
  filteredDishes,
  setSelectedDish,
  setShowMealModal,
}) => {
  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="flex gap-2 mt-2">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search dish..."
          className="flex-1 px-4 py-2 border border-black rounded-xl transition-all duration-300 placeholder-lime-400"
        />
        <button className="bg-black text-white p-3 rounded-xl shadow-md flex items-center justify-center">
          <FaSearch size={20} className="text-lime-400" />
        </button>
      </div>
      {/* Suggested Dish List */}
      {filteredDishes.length === 0 ? (
        <p className="text-gray-500 italic text-center">No dishes found.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {filteredDishes.map((dish) => (
            <div
              key={dish.id}
              className={`bg-white rounded-2xl border border-black shadow-lg p-2 flex flex-col hover:shadow-lg transition-all duration-300 ${dish.recommended}`}
            >
              {/* Dish Image */}
              <div className="w-full h-36 bg-gray-100 flex items-center justify-center overflow-hidden rounded-full">
                {dish.image_url ? (
                  <img
                    src={dish.image_url}
                    alt={dish.name}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <span className="text-gray-400 text-xs">No Image</span>
                )}
              </div>

              {/* Dish Info */}
              <div className="flex-1 flex flex-col justify-between mt-2">
                <div>
                  <h3 className="font-semibold text-md text-gray-800">
                    {dish.name}
                  </h3>

                  <p className="text-xs text-gray-500 mt-1 flex items-center">
                    <BsCircleFill className="mr-1 text-yellow-400" size={10} />
                    {dish.eating_style}
                  </p>

                  {dish.positiveMatch && (
                    <p className="text-green-600 text-xs mt-1">
                      Suitable for your condition
                    </p>
                  )}
                </div>

                {/* Eat Button */}
                <button
                  onClick={() => {
                    setSelectedDish(dish);
                    setShowMealModal(true);
                  }}
                  className="bg-black text-lime-400 text-sm px-4 py-2 rounded-lg border border-lime-600 hover:bg-lime-700 transition self-start flex items-center gap-2 mt-2 b"
                >
                  <FaUtensils className="text-white" />
                  <span className="font-semibold text-white">Eat</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SuggestedDishList;
