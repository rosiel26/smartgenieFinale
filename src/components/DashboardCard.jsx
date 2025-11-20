import React from "react";

export default function DashboardCard({ title, icon, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      <div className="flex items-center mb-4">
        {icon && <div className="mr-3 text-green-500">{icon}</div>}
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
      </div>
      <div>{children}</div>
    </div>
  );
}
