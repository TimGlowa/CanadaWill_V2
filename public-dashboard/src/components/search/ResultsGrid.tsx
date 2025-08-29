import React from 'react';
import { Official } from '../../types/officials';
import { computeOfficialDistrict } from '../../utils/districtUtils';
import ResultsCard from './ResultsCard';

interface ResultsGridProps {
  officials: Official[];
  title: string;
}

const ResultsGrid: React.FC<ResultsGridProps> = ({ officials, title }) => {
  if (!officials || officials.length === 0) {
    return null;
  }

  return (
    <section className="mb-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">{title}</h2>
      
      {/* Desktop Table View - Hidden on mobile/tablet */}
      <div className="hidden lg:block">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
          <table className="w-full min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                  Official
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/12">
                  Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8">
                  Party
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                  District
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8">
                  Stance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8">
                  Next Election
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/12">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {officials.map((official) => (
                <tr key={official.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{official.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {official.level}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {official.party || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {title === "By-Election Candidates" ? "Battle River-Crowfoot" : computeOfficialDistrict(official)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {official.stance || 'TBD'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {official.running_next_election !== undefined 
                      ? (official.running_next_election ? 'Yes' : 'No') 
                      : 'TBD'
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => alert(`Email functionality for ${official.name} - Coming soon!`)}
                      className="text-blue-600 hover:text-blue-900 font-medium"
                    >
                      Email
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Mobile/Tablet Card View - Hidden on desktop */}
      <div className="lg:hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {officials.map((official) => (
            <ResultsCard key={official.id} official={official} title={title} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default ResultsGrid; 