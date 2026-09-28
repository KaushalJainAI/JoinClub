import { configureStore } from "@reduxjs/toolkit";
import auth from "./authSlice";

// Page data is fetched per page (see hooks/useFetch); only the session lives in Redux.
const store = configureStore({ reducer: { auth } });

export default store;
