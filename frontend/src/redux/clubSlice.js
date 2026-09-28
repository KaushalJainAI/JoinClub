import {createSlice} from "@reduxjs/toolkit";

const clubSlice = createSlice({
    name:"club",
    initialState:{
        allClubs:[],
        singleClub:null
    },
    reducers:{
        setallClubs:(state,action)=>{
            state.allClubs=action.payload;
        },
        setsingleClub:(state,action)=>{
            state.singleClub=action.payload;
        }
    }
});

export const {setallClubs,setsingleClub}=clubSlice.actions;
export default clubSlice.reducer;