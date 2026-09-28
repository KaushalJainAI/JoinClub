import { configureStore } from "@reduxjs/toolkit";
import authSlice from "./authSlice";
import clubSlice from "./clubSlice";
import companySlice from "./clubSlice";

const store = configureStore({
    reducer:{
        auth:authSlice,
        club:clubSlice,
        company:companySlice,
    }
});
export default store; 