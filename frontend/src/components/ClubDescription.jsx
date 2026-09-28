import React, { useEffect, useState } from "react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { useParams } from "react-router-dom";
import axios from "axios";
import { JOB_API_END_POINT } from "@/utils/constant";
import { useDispatch, useSelector } from "react-redux";
import { setsingleClub } from "@/redux/clubSlice";
import { toast } from "sonner";
import { APPLICATION_API_END_POINT } from "@/utils/constant";

const ClubDescription = ({job}) => {
  const params = useParams();
  const jobId = params.id;
  const {user} = useSelector(store=>store.auth);
  const {singleClub}= useSelector(store=>store.club);
  const isInitialApplied = singleClub?.applications?.some(applications => applications.applicant ==user?._id) ? true : false;
  const [isApplied,setisApplied] = useState(isInitialApplied);
  const applyClubHandler= async ()=>{
    try {
      const res = await axios.get(`${APPLICATION_API_END_POINT}/apply/${jobId}`,{withCredentials:true});
      console.log(res);
      if(res.data.success){
        const updateSingleClub = {...singleClub,applications:[...singleClub.applications,{applicant:user?._id}]}
        dispatch(setsingleClub(updateSingleClub));
        setisApplied(true);
        toast.success(res.data.message); 
      }
    } catch (error) {
      
    }
  }

  const dispatch= useDispatch();
    useEffect(()=>{
      const fetchSingleClub = async ()=>{
        try {
          const res = await axios.get(`${JOB_API_END_POINT}/get/${jobId}`);
          console.log(res.data.job);
          if(res.data.success){
            dispatch(setsingleClub(res.data.job));
            setisApplied(res.data.job.applications.some(application=>application.applicant==user?._id))  //state sync with fech data
          }
        } catch (error) {
          console.log(error);
        }
      }
      fetchSingleClub();
    },[jobId,dispatch,user?._id]);
  return (
    <div className="max-w-7xl mx-auto my-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-bold text-xl ">{job?.company?.name} </h1>
          <div className="flex items-center gap-2">
            <Badge className=" text-blue-700 font-bold" variant={"ghost "}>
             {singleClub?.title}
            </Badge>
            {/* <Badge className=" text-blue-700 font-bold" variant={"ghost "}>
              12
            </Badge>
            <Badge className=" text-blue-700 font-bold" variant={"ghost "}>
              12
            </Badge> */}
          </div>
        </div>
        <Button
          onClick = { isApplied ?null : applyClubHandler}
          disabled={isApplied}
          className={`rounded-lg ${
            isApplied
              ? "bg-gray-800 cursor-not-allowed"
              : "bg-purple-700 hover:bg-purple-900"
          }`}
        >
          {" "}
          {isApplied ? "Already Applied" : "Apply Now"}{" "}
        </Button>
      </div>
      <h1 className="border-b-2 border-b-gray-300 font-medium py-4" >{singleClub?.discription}</h1>
      <div className="my-4 p-4">
        <h1 className="font-bold my-1 ">Requirements : <span className="font-normal text-gray-800 pl-4"> {singleClub?.requirements}</span></h1>
        <h1 className="font-bold my-1 ">Discription : <span className="font-normal text-gray-800 pl-4"> {singleClub?.discription}</span></h1>
        <h1 className="font-bold my-1 ">Location: <span className="font-normal text-gray-800 pl-4"> {singleClub?.location}</span></h1>
        <h1 className="font-bold my-1 ">Total Applied : <span className="font-normal text-gray-800 pl-4"> {singleClub?.applications?.length}</span></h1>
        <h1 className="font-bold my-1 ">Posted At : <span className="font-normal text-gray-800 pl-4"> {singleClub?.createdAt?.split("T")[0]}</span></h1>
        <h1 className="font-bold my-1 ">Club Detail 1 : <span className="font-normal text-gray-800 pl-4"> {singleClub?.requirements}</span></h1>
        <h1 className="font-bold my-1 ">Club Detail 1 : <span className="font-normal text-gray-800 pl-4"> {singleClub?.requirements}</span></h1>
        <h1 className="font-bold my-1 ">Club Detail 1 : <span className="font-normal text-gray-800 pl-4"> {singleClub?.requirements}</span></h1>
      </div>
    </div>
  );
};

export default ClubDescription;
