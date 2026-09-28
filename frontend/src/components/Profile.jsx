import React, { useState } from "react";
import { Navbar } from "./shared/Navbar";
import { Avatar, AvatarImage } from "@radix-ui/react-avatar";
import { Button } from "./ui/button";
import { Pen } from "lucide-react";
import AppliedClubsTable from "./AppliedClubsTable";
import UpdateProfileDialog from "./UpdateProfileDialog";
import { useSelector } from "react-redux";
import store from "@/redux/store";

const Profile = () => {
  const [open, setOpen]= useState(false);
  const {user}= useSelector(store=>store.auth)
  return (
    <div>
      <Navbar />
      <div className="max-w-2xl  shadow-xl border rounded-2xl border-gray-300  p-8 my-5  mx-auto">
        <div className="flex  justify-between ">
        <div className="flex gap-4 items-center p-5">
          <Avatar>
            <AvatarImage className="h-20 w-20" size="icon" src="logo.webp" />
          </Avatar>
          <div>
            <h1 className="text-xl font-medium">{user?.fullname}</h1>
            <p>{user?.email}</p>
            <p className="text-gray-600">{user?.role}</p>
            <p className="text-gray-600">{user?.phoneNumber}</p>
          </div>
          
        </div>
        {/* <Button onClick={()=>setOpen(true)} className="text-right" variant="outline"><Pen/></Button> */}
        </div>
        {/* <AppliedClubsTable/> */}
      </div>
      {/* <UpdateProfileDialog open={open} setOpen={setOpen}></UpdateProfileDialog> */}
    </div>
  );
};

export default Profile;
