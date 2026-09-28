import React from 'react'
import { Badge } from './ui/badge'

const LatestClubCard = ({job}) => {
  
  return (
    <div className='rounded-md shadow-xl mx-1 border border-gray-200 p-5 gap-3 cursor-pointer'>
      <div>
      <h1 className='font-medium text-lg '>{job?.company?.name}</h1>
      <p>{job?.location}</p>
      </div>
      <div >
        <h1 className='font-bold text-lg my-2'>{job?.title}</h1>
        <p className='text-sm'> {job?.discription}</p>
        <p className='text-sm'>
            Requirements: {job?.requirements?.join(', ')}
        </p>

      </div>
      <div className='flex items-center gap-2 mt-4'>
        <Badge  className="text-blue-700 font-bold gap-2" variant={"ghost"}>Salary : {job?.salary}</Badge>
        <Badge  className="text-red-700 font-bold" variant={"ghost"}> Part Time</Badge>
        {/* <Badge  className="text-purpel-700 font-bold" variant={"ghost"}> 24 LPA</Badge> */}
      </div>
    </div>
  )
}

export default LatestClubCard