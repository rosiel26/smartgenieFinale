import { createContext, useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

export const DBStatusContext = createContext();

export const DBStatusProvider = ({ children }) => {
  const [dbStatus, setDbStatus] = useState(null); // null = loading
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkDB = async () => {
      try {
        const { error } = await supabase
          .from("health_profiles")
          .select("*")
          .limit(1);

        setDbStatus(error ? "maintenance" : "ok");
      } catch {
        setDbStatus("maintenance");
      } finally {
        setIsLoading(false); // stop loading after first check
      }
    };

    checkDB();
    const interval = setInterval(checkDB, 30000); // repeat every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <DBStatusContext.Provider value={{ dbStatus, isLoading }}>
      {children}
    </DBStatusContext.Provider>
  );
};
