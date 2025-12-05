import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

const useWorkoutTypes = () => {
  const [workoutTypes, setWorkoutTypes] = useState([]);
  useEffect(() => {
    const fetchWorkoutTypes = async () => {
      const { data, error } = await supabase.from("workout_types").select("*");
      if (!error) setWorkoutTypes(data);
    };
    fetchWorkoutTypes();
  }, []);
  return workoutTypes;
};

export default useWorkoutTypes;
