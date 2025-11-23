// utils/DBStatusContext.jsx
import { createContext, useState, useEffect } from "react";
import { supabase } from "../supabaseClient"; // adjust path if needed

export const DBStatusContext = createContext();

export const DBStatusProvider = ({ children }) => {
  const [dbStatus, setDbStatus] = useState("loading"); // "ok" | "maintenance" | "loading"

  useEffect(() => {
    const checkDB = async () => {
      try {
        // Simple query to check DB
        const { error } = await supabase
          .from("health_profiles")
          .select("*")
          .limit(1);
        setDbStatus(error ? "maintenance" : "ok");
      } catch {
        setDbStatus("maintenance");
      }
    };

    checkDB();
    const interval = setInterval(checkDB, 30000); // check every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <DBStatusContext.Provider value={{ dbStatus }}>
      {children}
    </DBStatusContext.Provider>
  );
};
