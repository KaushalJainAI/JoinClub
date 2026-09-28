import React from 'react'
import LatestClubCardf from './LatestClubCard';
import LatestClubCard from './LatestClubCard';
import { useSelector } from 'react-redux';

const randomClubs=[1,2,3,4,5,6,7,8];
const LatestClubs = () => {
  const {allClubs}= useSelector(store=>store.club);
  return (
    <div className='mx-auto my-20 max-w-7xl'>
        <h1 className='text-4xl font-bold'>Latest & Top<span className='text-blue-700 '> Clubs Openings</span></h1>
        <div className='grid grid-cols-3 my-10 mx-auto'>
        {
          allClubs.length<=0 ? <span>NO Openings</span> : allClubs.slice(0,9).map((job)=> <LatestClubCard key={job._id} job={job} />
        )}
        </div>
    </div>
  )
}

export default LatestClubs