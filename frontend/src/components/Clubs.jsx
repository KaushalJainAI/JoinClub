import React from "react";
import { Navbar } from "./shared/Navbar";
import LatestClubCard from "./LatestClubCard";
import LatestClubs from "./LatestClubs";
import Club from "./Club";
import Filtercard from "./Filtercard";
import { useSelector } from "react-redux";

const clubArray = [1, 2, 3, 4, 5, 6, 7, 8];
const Clubs = () => {
  const {allClubs} = useSelector(store => store.club);
  return (
    <div>
      <Navbar />
      <div className="max-w-7xl mx-auto mt-5">
        <div className="flex gap-5">
          {/* <div>
            <Filtercard />
          </div> */}
          {allClubs.length <= 0 ? (
            <span>Club Not Found</span>
          ) : (
            <div className="flex-1 h-[88vh] overflow-y-auto pb-5">
              <div className="grid grid-cols-3 gap-4">
                {allClubs.map((job) => (
                  <div key={job._id}>
                  <Club  job={job}/>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Clubs;
