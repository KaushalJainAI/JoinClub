import React, { useState } from 'react'
import { Navbar } from '../shared/Navbar'

import { Label } from '@radix-ui/react-label'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { CL_API_END_POINT } from '@/utils/constant'
import { toast } from 'sonner'
import { useDispatch } from 'react-redux'
import { setSingleCompany } from '@/redux/companySlice'

const CompanyCreate = () => {
    const navigate= useNavigate();
    const dispatch= useDispatch();
    
    const [clubName,setClubName]=useState("");
    const registerNewClub = async ()=>{
        console.log(clubName);
        try {
            const res= await axios.post(`${CL_API_END_POINT}/register`,{companyName:clubName},{
                headers:{
                    'Content-Type':'application/json'
    
                },
                withCredentials:true
            });
            
            if(res?.data?.success){
                dispatch(setSingleCompany(res.data.company));
                toast.success(res.data.message);
                const companyId= res?.data?.company?._id;   
                navigate(`/admin/companies/${companyId}`);
            }
        } catch (error) {
            console.log(error)
        }
    }
  return (
    <div>
        <Navbar></Navbar>
        <div className='max-w-4xl mx-auto'>
            <div className='my-10'>
            <h1 className='font-bold text-2xl'>Club Name</h1>
            <p className='text-gray-500'> discription</p>
            </div>
            <Label>Club Name</Label>
            <Input
            type="text"
            className="my-2"
            onChange={(e)=>setClubName(e.target.value)}
            />
            <div className='flex items-center gap-2 my-10'>
                <Button variant="outline" onClick={()=>navigate("/admin/companies")}>Cancel</Button>
                <Button onClick={registerNewClub}>Continue</Button>
            </div>
        </div>
    </div>
  )
}

export default CompanyCreate