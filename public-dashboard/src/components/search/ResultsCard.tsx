import React from 'react';
import { Official } from '../../types/officials';
import { computeOfficialDistrict } from '../../utils/districtUtils';

interface ResultsCardProps {
  official: Official;
  title: string;
}

const ResultsCard: React.FC<ResultsCardProps> = ({ official, title }) => {
  const handleEmailClick = () => {
    // Placeholder: In a real implementation, this would open an email client
    // or redirect to a contact form
    alert(`Email functionality for ${official.name} - Coming soon!`);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-100 hover:shadow-md transition-shadow duration-200">
      <div className="flex flex-col space-y-3">
        {/* Level Badge */}
        <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 self-start">
          {official.level}
        </div>
        
        {/* Name */}
        <h3 className="text-xl font-semibold text-gray-900 leading-tight">
          {official.name}
        </h3>
        
        {/* Party */}
        {official.party && (
          <div className="text-sm text-gray-600">
            <span className="font-medium text-gray-700">Party:</span>
            <span className="ml-2">{official.party}</span>
          </div>
        )}
        
        {/* District */}
        <div className="text-sm text-gray-500">
          <span className="font-medium text-gray-900">District:</span>{' '}
          {title === "By-Election Candidates" ? "Battle River-Crowfoot" : computeOfficialDistrict(official)}
        </div>
        
        {/* Stance - Placeholder */}
        <div className="text-sm">
          <span className="font-medium text-gray-700">Stance:</span>
          <span className="ml-2 text-gray-600">{official.stance || 'TBD'}</span>
        </div>
        
        {/* Running in next election - Placeholder */}
        <div className="text-sm">
          <span className="font-medium text-gray-700">Running in next election:</span>
          <span className="ml-2 text-gray-600">
            {official.running_next_election !== undefined ? (official.running_next_election ? 'Yes' : 'No') : 'TBD'}
          </span>
        </div>
        
        {/* Email Button */}
        <button
          onClick={handleEmailClick}
          className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:bg-blue-800"
        >
          Email this official
        </button>
      </div>
    </div>
  );
};

export default ResultsCard; 