# Frontend Syntax Patterns (React + Redux + axios)

## 1. Slice
```js
import { createSlice } from "@reduxjs/toolkit";
const authSlice = createSlice({
  name: "auth",
  initialState: { loading: false, user: null },
  reducers: {
    setLoading: (state, action) => { state.loading = action.payload; },
    setUser: (state, action) => { state.user = action.payload; },
  },
});
export const { setLoading, setUser } = authSlice.actions;
export default authSlice.reducer;
```

## 2. Store (fixed import!)
```js
import { configureStore } from "@reduxjs/toolkit";
import authSlice from "./authSlice";
import clubSlice from "./clubSlice";
import companySlice from "./companySlice"; // was "./clubSlice" — bug
export default configureStore({ reducer: { auth: authSlice, club: clubSlice, company: companySlice } });
```

## 3. Fetch hook → dispatch
```js
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import axios from 'axios';
import { setallClubs } from '@/redux/clubSlice';
import { JOB_API_END_POINT } from '@/utils/constant';

const useGetAllClubs = () => {
  const dispatch = useDispatch();
  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${JOB_API_END_POINT}/getAllJobs`, { withCredentials: true });
        if (res.data.success) dispatch(setallClubs(res.data.jobs));
      } catch (e) { console.log(e); }
    })();
  }, [dispatch]);
};
```

## 4. Login submit
```js
const res = await axios.post(`${USER_API_END_POINT}/login`, { email, password, role }, { withCredentials: true });
if (res.data.success) { dispatch(setUser(res.data.user)); navigate('/'); toast.success(res.data.message); }
```

## 5. Endpoints file
```js
export const USER_API_END_POINT = "http://localhost:8000/api/v1/user";
// TODO: replace with `${import.meta.env.VITE_API_BASE}/api/v1/user`
```

## 6. Router + guard (adopt — none exists today)
```js
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
const RequireRole = ({ roles, children }) => {
  const { user } = useSelector(s => s.auth);
  if (!user) return <Navigate to="/login" />;
  return roles.includes(user.role) ? children : <Navigate to="/" />;
};
// { path: 'admin/companies', element: <RequireRole roles={['recruiter']}><Companies/></RequireRole> }
```
