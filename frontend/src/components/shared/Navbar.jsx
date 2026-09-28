import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@radix-ui/react-popover";
import React from "react";
import { Button } from "../ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, User2 } from "lucide-react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import store from "@/redux/store";
import axios from "axios";
import { USER_API_END_POINT } from '@/utils/constant'

import { setUser } from "@/redux/authSlice";
import { toast } from "sonner";

export const Navbar = () => {
  const {user}= useSelector(store=>store.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const logoutHandler=async()=>{
    try {
      const res= await axios.get(`${USER_API_END_POINT}/logout`,{withCredentials:true});
      if(res.data.success){
        dispatch(setUser(null));
        navigate("/");
        toast.success(res.data.message);
      }
    } catch (error) {
      console.log(error);
      toast.error(error.response.data.message);
    }
  }
  

  return (
    <div className="bg-white">
      <div className="flex items-center justify-between mx-auto my-10 max-w-5xl h-15">
        <div>
          <h1 className="text-2xl font-bold">
            <Link to="/">ClubSpot<span className="text-2xl font-bold text-red-600">PEC</span></Link>
          </h1>
        </div>
        <div className="flex items-center gap-12">
          <ul className="flex  font-medium items-center gap-10">
          {
            
              user && user?.role=="recruiter" ? 
              <>
              <li><Link to="/admin/companies">Clubs</Link></li>
                
              </>
            :
            <>
            <li><Link to="/">Home</Link></li>
            <li><Link to="/clubs">Clubs</Link> </li>
            <li><Link to="/appliedclubs">Applications</Link> </li>
            </>
          }
            
          </ul>
          {
            !user? (
              <div className="flex gap-2">
              <Link to="/login"><Button variant="outline">LogIn</Button></Link>
              <Link to="/signup"><Button className="bg-[blue] hover:bg-[#050590]" >SignUp</Button></Link>
              </div>
            ) :(
          <Popover>
            <PopoverTrigger>
              <Avatar className="cursor-pointer">
                <AvatarImage src="https://github.com/shadcn.png"/> 
              </Avatar>
            </PopoverTrigger>
            <PopoverContent>
              <div className="  flex items-center gap-4 space-y-2">
                <Avatar className="cursor-pointer">
                  <AvatarImage src="https://github.com/shadcn.png"/>
                </Avatar>
                <div>
                  <h4 className="font-medium">{user?.fullname}</h4>
                  <p className="text-sm text-muted-foreground">{user?.role}</p>
                </div>
              </div>
              <div className="flex flex-col  text-gray-600">
                <div className="flex w-fit items-center gap-2 cursor-pointer">
                <User2/>
                <Link to = "/profile"><Button variant="link">View Profile</Button></Link>
                </div>
                
                <div className="flex w-fit items-center gap-2 cursor-pointer">
                <LogOut/>
                <Button onClick={logoutHandler} variant="link">Logout</Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
            )

          }
          
        </div>
      </div>
    </div>
  );
};
