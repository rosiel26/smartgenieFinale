import React from "react";

const DeleteConfirmationModal = ({ confirmDelete, setConfirmDelete, handleConfirmDelete }) => {
  return (
    confirmDelete.show && (
      <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6 shadow-lg max-w-sm w-full text-center">
          <h2 className="text-lg font-semibold text-red-600 mb-3">
            Confirm Delete
          </h2>
          <p className="text-gray-600 mb-5">
            Are you sure you want to delete this {confirmDelete.type}?
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() =>
                setConfirmDelete({ show: false, type: null, id: null })
              }
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDelete}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    )
  );
};

export default DeleteConfirmationModal;