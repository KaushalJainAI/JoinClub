import React, { useState } from "react";
import { Navbar } from "../shared/Navbar";
import { Button } from "../ui/button";
import { ArrowLeft } from "lucide-react";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { CL_API_END_POINT } from "@/utils/constant";

const CompanySetup = () => {
  const [input, setInput] = useState({
    name: "",
    description: "",
    file: null,
  });
  const [loading , setLoading] = useState(false);
  const params = useParams();
  const navigate=useNavigate();
  const changeEventHandler = (e) => {
    setInput({ ...input, [e.target.name]: e.target.value });
  };
  const changeFileHandler =(e)=>{
    const file = e.target.files?.[0];
    setInput({...input,file});
  }
  
  const submitHandler = async(e)=>{
    e.preventDefault();

    const formData= new FormData();
    formData.append("name",input.name);
    formData.append("description",input.description);
    if(input.file){
      formData.append("file",input.file);
    }
    
    try{
      const res= await axios.put(`${CL_API_END_POINT}/update/${params.id}`,formData,{
        headers:{
          'Content-Type': 'multipart/form-data'
        },
        withCredentials:true
      });
      console.log(res);
      if(res.data.success){
        toast.success(res.data.message);
        navigate("/admin/companies")
      }
    }
    
    catch(error){
      console.log(error);
      toast.error(error.response.data.message);
    }
    
  }
  return (
    <div>
      <Navbar />
      <div className="max-w-xl mx-auto my-10 ">
        <form onSubmit={submitHandler}>
          <div className="flex items-center gap-8 p-10">
            <Button onClick={()=> navigate("/admin/companies")} variant="outline">
              <ArrowLeft />
              <span>Back</span>
            </Button>
            <h1 className="text-xl font-bold">Enter Details Below:</h1>
          </div>
          <div className="grid grid-cols-2 gap-4 my-10">
            <div>
            <Label >Club Name</Label>
            <Input
              type="text"
              name="name"
              value={input.name}
              onChange={changeEventHandler}
            />
            </div>
            <div>
            <Label>Club Description</Label>
            <Input
              type="text"
              name="description"
              value={input.description}
              onChange={changeEventHandler}
            />
            </div>
            <div>
            <Label>Club File</Label>
            <Input
              type="file"
              
              onChange={changeFileHandler}
            />
            </div>
          </div>
          <Button type="submit" className="w-full mt-8">Update</Button>
        </form>
      </div>
    </div>
  );
};

export default CompanySetup;
