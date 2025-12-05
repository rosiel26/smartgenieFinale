import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { BrowserRouter } from "react-router-dom";
import PersonalDashboard from "./PersonalDash";
import { supabase } from "../supabaseClient";

// Mocking supabase client
jest.mock("../supabaseClient", () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
          order: jest.fn(),
        })),
      })),
      insert: jest.fn(),
    })),
  },
}));

// Mocking child components
jest.mock("../components/FooterNav", () => () => <div>FooterNav</div>);
jest.mock(
  "../components/NutritionProtocolDisplay",
  () =>
    ({ dailyCalories, dailyProtein, dailyFats, dailyCarbs, nutritionAdvice }) =>
      (
        <div>
          NutritionProtocolDisplay
          <p>Calories: {dailyCalories}</p>
          <p>Protein: {dailyProtein}</p>
          <p>Fats: {dailyFats}</p>
          <p>Carbs: {dailyCarbs}</p>
          <div>
            {nutritionAdvice.map((advice, index) => (
              <p key={index}>{advice}</p>
            ))}
          </div>
        </div>
      )
);
jest.mock("../components/MyStatusDisplay", () => ({ profile }) => (
  <div>
    MyStatusDisplay
    <p>BMI: {profile.bmi}</p>
  </div>
));
jest.mock("../components/RecentMealAndWorkoutLogs", () => () => (
  <div>RecentMealAndWorkoutLogs</div>
));
jest.mock(
  "../components/TodaysExercise",
  () =>
    ({ workout, onAdd }) =>
      workout ? (
        <div>
          TodaysExercise
          <p>{workout.name}</p>
          <p>|| 30 mins</p>
          <button onClick={onAdd}>Log this Workout</button>
        </div>
      ) : null
);
jest.mock(
  "../components/AddWorkoutModal",
  () =>
    ({ show, onClose, onAdd, workout, profile }) =>
      show && workout ? (
        <div>
          AddWorkoutModal
          <p>{workout.name}</p>
          <button onClick={() => onAdd(workout.id, 30)}>Add Workout</button>
          <button onClick={onClose}>Close</button>
        </div>
      ) : null
);
jest.mock("../services/storeService", () => ({
  getBoholCities: jest.fn(),
  recommendStoresForIngredients: jest.fn(),
}));

const mockUser = { id: "user-id", email: "test@example.com" };
const mockProfile = {
  user_id: "user-id",
  full_name: "Test User",
  bmi: 22.5,
  health_conditions: [],
  calorie_needs: 2000,
  protein_needed: 150,
  fats_needed: 50,
  carbs_needed: 250,
  timeframe: 1,
};
const mockWorkouts = [
  { id: 1, name: "Walking", unsuitable_for: [] },
  { id: 2, name: "Running", unsuitable_for: ["knee pain"] },
];

describe("PersonalDashboard", () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Mock supabase calls for a logged-in user
    supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
    supabase
      .from()
      .select()
      .eq()
      .single.mockResolvedValue({ data: mockProfile, error: null });
    supabase.from().select().order.mockResolvedValue({ data: [], error: null }); // Mock meal_logs
    supabase.from.mockImplementation((tableName) => {
      if (tableName === "health_profiles") {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockProfile }),
        };
      }
      if (tableName === "workout_types") {
        return {
          select: jest.fn().mockResolvedValue({ data: mockWorkouts }),
        };
      }
      if (tableName === "workouts") {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          insert: jest.fn().mockResolvedValue({ error: null }),
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [] }),
        insert: jest.fn().mockResolvedValue({ error: null }),
      };
    });
  });

  test("renders the personal dashboard and today's suggested exercise", async () => {
    render(
      <BrowserRouter>
        <PersonalDashboard />
      </BrowserRouter>
    );

    // Wait for the dashboard to load
    await waitFor(() => {
      expect(screen.getByText("Hi Test User ,welcome!")).toBeInTheDocument();
    });

    // Check that "Today's Suggested Exercise" is rendered
    expect(screen.getByText("TodaysExercise")).toBeInTheDocument();
    // Since the workout is selected based on day of year, we expect one of the safe workouts.
    // For this test, 'Walking' is the only safe one.
    expect(screen.getByText("Walking")).toBeInTheDocument();
  });

  test("can log today's suggested exercise", async () => {
    render(
      <BrowserRouter>
        <PersonalDashboard />
      </BrowserRouter>
    );

    // Wait for the dashboard to load
    await waitFor(() => {
      expect(screen.getByText("Hi Test User ,welcome!")).toBeInTheDocument();
    });

    // Click the "Log this Workout" button
    fireEvent.click(screen.getByText("Log this Workout"));

    // The AddWorkoutModal should appear
    await waitFor(() => {
      expect(screen.getByText("AddWorkoutModal")).toBeInTheDocument();
    });

    // Click the "Add Workout" button in the modal
    fireEvent.click(screen.getByText("Add Workout"));

    // Check that the workout was inserted into the database
    await waitFor(() => {
      expect(supabase.from("workouts").insert).toHaveBeenCalledWith([
        {
          user_id: mockUser.id,
          workout_type_id: 1, // 'Walking'
          duration: 30,
        },
      ]);
    });

    // The modal should close after adding the workout
    expect(screen.queryByText("AddWorkoutModal")).not.toBeInTheDocument();
  });

  test("does not suggest a workout if there are no safe ones", async () => {
    // Modify profile to have health conditions that make all workouts unsafe
    const newMockProfile = {
      ...mockProfile,
      health_conditions: ["knee pain"],
    };
    supabase
      .from()
      .select()
      .eq()
      .single.mockResolvedValue({ data: newMockProfile, error: null });

    render(
      <BrowserRouter>
        <PersonalDashboard />
      </BrowserRouter>
    );

    // Wait for the dashboard to load
    await waitFor(() => {
      expect(screen.getByText("Hi Test User ,welcome!")).toBeInTheDocument();
    });

    // "Today's Suggested Exercise" should not be rendered
    expect(screen.queryByText("TodaysExercise")).not.toBeInTheDocument();
  });
});
