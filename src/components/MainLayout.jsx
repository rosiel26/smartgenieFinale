import React from "react";
import Navbar from "./NavBar";
import FooterNav from "./FooterNav";

export default function MainLayout({ children }) {
  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center px-4 py-6">
      {/* Mobile container */}
      <div className="bg-white w-[375px] h-[700px] rounded-2xl shadow-2xl flex flex-col">
        {/* Fixed Navbar */}

        {/* Scrollable main content */}
        <main className="flex-1 overflow-y-auto p-4  scrollbar-hidden scrollbar-thin scrollbar-thumb-green-200 scrollbar-track-green-50">
          {children}
        </main>

        {/* Footer navigation */}

        <FooterNav />
      </div>
    </div>
  );
}
