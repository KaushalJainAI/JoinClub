import React, { useEffect } from 'react'
import { Navbar } from './shared/Navbar'
import HeroSection from './HeroSection'
import LatestClubs from './LatestClubs'
import Footer from './footer'
import useGetAllClubs from '@/hooks/useGetAllClubs'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'

const Home = () => {
  useGetAllClubs();
  const {user} = useSelector(store=>store.auth);
  const navigate= useNavigate();
  useEffect(()=>{
    if(user?.role=="recruiter"){
      navigate("/admin/companies");
    }
  },[])
  return (
    <div >
    <Navbar/>
    <HeroSection/>
    <LatestClubs/>
    <Footer/>
    </div>
  )
}

export default Home