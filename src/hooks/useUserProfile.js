import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

const useUserProfile = (userId) => {
  const [profile, setProfile] = useState(null);
  useEffect(() => {
    if (!userId) return;
    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from("health_profiles")
        .select(
          "goal, gender, age, weight_kg, height_cm, activity_level, health_conditions, full_name"
        )
        .eq("user_id", userId)
        .single();
      if (!error) setProfile(data);
    };
    fetchProfile();
  }, [userId]);
  return profile;
};

export default useUserProfile;
