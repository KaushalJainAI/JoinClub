import React from 'react'
import { Button } from './ui/button'
import { Search } from 'lucide-react'
import { Link } from 'react-router-dom'

const HeroSection = () => {
  return (
    <div className='text-center'>
        
        <Link to="/clubs"><span className='px-4 py-2 rounded-full bg-gray-100 text-red-600 font-medium'>Explore all clubs here</span></Link>
        <h1 className='text-5xl font-bold py-10 '>Search , Explore & <br/> Find Your <span className='text-blue-800 '>Perfect Club</span> </h1>
        <div className='flex w-[40%] shadow-lg border border-gray-200 pl-3 rounded-full items-center mx-auto'>
          <input
          type= "text"
          placeholder='Explore all clubs'
          className='outline-none border-none w-full'
          />
          <Button className=" rounded-r-full bg-blue-700">
            <Search className='h-5 w-5'/>
          </Button>
        </div>
    </div>
  )
}

export default HeroSection