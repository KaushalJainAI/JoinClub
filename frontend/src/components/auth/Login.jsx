import React, { useState } from "react";
import { Navbar } from "../shared/Navbar";
import { Label } from "@radix-ui/react-label";
import { Input } from "../ui/input";
import { RadioGroup, RadioGroupItem } from "@radix-ui/react-radio-group";
import { Button } from "../ui/button";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { USER_API_END_POINT } from "@/utils/constant";
import { toast } from "sonner";
import { setUser } from "@/redux/authSlice";
import { useDispatch } from "react-redux";

const Login = () => {
  
  const [input,setInput]= useState({
    email:"",
    password:"",
    role:"",
  });
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const changeEventHandler = (e)=>{
    setInput({...input,[e.target.name]:e.target.value});
  }
  const submitHandler= async (e) =>{
    e.preventDefault();
    try {
      const res = await axios.post(`${USER_API_END_POINT}/login`,input,{
        headers:{
          "content-Type":"application/json"
        },
        withCredentials:true,
      });
      if(res.data.success){
      dispatch(setUser(res.data.user));
        navigate("/");
        
      }
      toast.success(res.data.message);
    } catch (error) {
      if (error.response) {
        // Server responded with a status other than 2xx
        toast.error(error.response.data.message || "Login failed. Please try again.");
      } else {
        // Something else happened while setting up the request
        toast.error("An error occurred. Please try again.");
      }
    }
  }
  return (
    <div>
      <Navbar />
      <div className="flex items-center justify-center max-w-7xl mx-auto">
        <form
          onSubmit={submitHandler}
          className="w-1/2 border border-gray-200 rounded-md p-10 my-10"
        >
          <h1 className="text-xl font-bold mb-12  text-center ">Login</h1>
          
          <div className="my-2">
            <Label>Email</Label>
            <Input className="my-2 "type="email" value={input.email}  name="email" onChange={changeEventHandler} placeholder="Bhupesh@email.com" />
          </div>
          
          <div className="my-2">
            <Label>Password</Label>
            <Input className="my-2 " type="password" value={input.password}  name="password" onChange={changeEventHandler}placeholder="Password" />
          </div>
          <div >
            <RadioGroup className="flex items-center space-x-2">
              <div className="flex items-center space-x-2">
                <Input 
                type="radio"
                name="role"
                value="student"
                checked={input.role==='student'}
                onChange={changeEventHandler}
                className="cursor-pointer"
                />
                <Label className=" font-medium " htmlFor="r1">Student</Label>
              </div>
              <div className="flex items-center space-x-2">
              <Input 
                type="radio"
                name="role"
                value="recruiter"
                checked={input.role==='recruiter'}
                onChange={changeEventHandler}
                />
                <RadioGroupItem value="comfortable" id="r2" />
                <Label className=" font-medium " htmlFor="r2">Recruiter</Label>
              </div>

            </RadioGroup>
            
          </div>
          <Button type="submit" className="w-full my-4">Login</Button>
          <span className="text-sm">Not Registered ? <Link to="/signup" className="text-blue-600">Signup</Link></span>
        </form>
      </div>
    </div>
  );
};

export default Login;
