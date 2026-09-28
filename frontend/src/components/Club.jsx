import React from "react";
import { Button } from "./ui/button";
import { Bookmark } from "lucide-react";
import { Avatar, AvatarImage } from "@radix-ui/react-avatar";
import { Navigate, useNavigate } from "react-router-dom";

const Club = ({job}) => {
  const navigate=useNavigate();
  const JobId = "1213";
  return (
    <div className="p-5 rounded-md shadow-xl bg-white border border-gray-100 mb-4 ml-4">
      <div className="flex items-center justify-between ">
        <p>{job?.title}</p>
        {/* <Button className="rounded-full" size="icon" variant="outline">
          <Bookmark></Bookmark>
        </Button> */}
      </div>
      <div className="flex items-center gap-2 my-2">
        <Button className="p-6" variant="outline" size="icon">
          <Avatar>
            <AvatarImage src="logof.jpg" />
          </Avatar>
        </Button>
        <div>
          <h1 className="text-xl font-bold">{job?.company?.name}</h1>
          <p className="text-md text-gray-600 font-serif">{job?.title}</p>
        </div>
        
      </div>
      <div className="text-sm text-gray-700">
        <p>{job?.discription}</p>
      </div>
      <div className="flex mt-4 gap-4">
          <Button onClick={()=>navigate(`/description/${job?._id}`)} variant="outline">Details</Button>
          {/* <Button className="bg-blue-600">Apply Now</Button> */}
        </div>
    </div>
  );
};

export default Club;
