import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type AppTheme = "light" | "dark";

type ThemeState = {
  mode: AppTheme;
};

const initialState: ThemeState = {
  mode: "dark",
};

const themeSlice = createSlice({
  name: "theme",
  initialState,
  reducers: {
    setTheme(state, action: PayloadAction<AppTheme>) {
      state.mode = action.payload;
    },
    toggleTheme(state) {
      state.mode = state.mode === "light" ? "dark" : "light";
    },
  },
});

export const { setTheme, toggleTheme } = themeSlice.actions;
export default themeSlice.reducer;
