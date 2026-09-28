import { createSlice } from "@reduxjs/toolkit";

// `ready` is false until the first /auth/me check finishes, so guarded pages
// don't redirect to login during a page refresh.
const authSlice = createSlice({
  name: "auth",
  initialState: { user: null, ready: false },
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
      state.ready = true;
    },
    patchUser: (state, action) => {
      if (state.user) state.user = { ...state.user, ...action.payload };
    },
  },
});

export const { setUser, patchUser } = authSlice.actions;
export default authSlice.reducer;
