import React from 'react';
import { FaFacebookF, FaTwitter, FaInstagram, FaLinkedinIn } from 'react-icons/fa';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white py-10">
      <div className="container mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* About Section */}
        <div>
          <h2 className="text-xl font-bold mb-4">About PEC Clubs</h2>
          <p>
            Explore the vibrant clubs at Punjab Engineering College (PEC). Connect with like-minded individuals, participate in exciting activities, and enhance your college experience.
          </p>
        </div>

        {/* Quick Links */}
        <div className='pl-8'>
          <h2 className="text-xl font-bold mb-4 ">Quick Links</h2>
          <ul className="space-y-2">
          <li><Link to="/"><a href="#" className="hover:text-blue-400">Home</a></Link> </li>
          <li><Link to="/clubs"><a href="#" className="hover:text-blue-400">Clubs</a></Link> </li>
            <li><a href="#" className="hover:text-blue-400">Contact Us</a></li>
          </ul>
        </div>

        {/* Contact Details */}
        <div>
          <h2 className="text-xl font-bold mb-4">Contact Us</h2>
          <p>Punjab Engineering College, Sector 12</p>
          <p>Chandigarh, 160012</p>
          <p>Email: contact@pecclubs.edu.in</p>
          <p>Phone: +91 1234567890</p>
        </div>

        {/* Social Media Links */}
        <div>
          <h2 className="text-xl font-bold mb-4">Follow Us</h2>
          <div className="flex space-x-4">
            <a href="https://www.facebook.com/pec.university.official/" className="text-2xl hover:text-blue-400"><FaFacebookF /></a>
            <a href="#" className="text-2xl hover:text-blue-400"><FaTwitter /></a>
            <a href="#" className="text-2xl hover:text-blue-400"><FaInstagram /></a>
            <a href="#" className="text-2xl hover:text-blue-400"><FaLinkedinIn /></a>
          </div>
        </div>
      </div>

      <div className="text-center mt-8">
        <p>&copy; {new Date().getFullYear()} PEC Clubs. All Rights Reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
