import React from 'react';
import { Link } from 'react-router-dom';

interface NavbarProps {
  appName: string;
}

const Navbar: React.FC<NavbarProps> = ({ appName }) => {
  return (
    <nav className="bg-white shadow-sm rounded-lg mb-6 sticky top-0 z-10 w-full p-4 flex justify-between items-center flex-wrap gap-2 md:gap-0">
      <h1 className="text-2xl font-extrabold text-indigo-700 min-w-max">
        {appName}
      </h1>
      <div className="flex space-x-4">
        <Link 
          to="/" 
          className="text-gray-600 hover:text-indigo-600 transition-colors duration-200 font-medium px-3 py-1 rounded-md hover:bg-indigo-50"
        >
          Flashcards
        </Link>
        <Link 
          to="/add" 
          className="text-gray-600 hover:text-indigo-600 transition-colors duration-200 font-medium px-3 py-1 rounded-md hover:bg-indigo-50"
        >
          Add Word
        </Link>
        <Link 
          to="/suggest" 
          className="text-gray-600 hover:text-indigo-600 transition-colors duration-200 font-medium px-3 py-1 rounded-md hover:bg-indigo-50"
        >
          Suggest
        </Link>
      </div>
    </nav>
  );
};

export default Navbar;
