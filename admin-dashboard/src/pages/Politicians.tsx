import React, { useState } from 'react';
import { MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline';

interface Politician {
  id: string;
  name: string;
  party: string;
  riding: string;
  province: string;
  level: string;
  email?: string;
  website?: string;
}

const Politicians: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterParty, setFilterParty] = useState('');
  const [filterLevel, setFilterLevel] = useState('');

  // Mock data - in a real app, this would come from API calls
  const politicians: Politician[] = [
    {
      id: '1',
      name: 'Justin Trudeau',
      party: 'Liberal',
      riding: 'Papineau',
      province: 'Quebec',
      level: 'federal',
      email: 'justin.trudeau@parl.gc.ca',
      website: 'https://www.liberal.ca'
    },
    {
      id: '2',
      name: 'Pierre Poilievre',
      party: 'Conservative',
      riding: 'Carleton',
      province: 'Ontario',
      level: 'federal',
      email: 'pierre.poilievre@parl.gc.ca',
      website: 'https://www.conservative.ca'
    },
    {
      id: '3',
      name: 'Jagmeet Singh',
      party: 'NDP',
      riding: 'Burnaby South',
      province: 'British Columbia',
      level: 'federal',
      email: 'jagmeet.singh@parl.gc.ca',
      website: 'https://www.ndp.ca'
    },
    {
      id: '4',
      name: 'Yves-François Blanchet',
      party: 'Bloc Québécois',
      riding: 'Beloeil—Chambly',
      province: 'Quebec',
      level: 'federal',
      email: 'yves-francois.blanchet@parl.gc.ca',
      website: 'https://www.blocquebecois.org'
    },
    {
      id: '5',
      name: 'Elizabeth May',
      party: 'Green',
      riding: 'Saanich—Gulf Islands',
      province: 'British Columbia',
      level: 'federal',
      email: 'elizabeth.may@parl.gc.ca',
      website: 'https://www.greenparty.ca'
    }
  ];

  const parties = [...new Set(politicians.map(p => p.party))];
  const levels = [...new Set(politicians.map(p => p.level))];

  const filteredPoliticians = politicians.filter(politician => {
    const matchesSearch = politician.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         politician.riding.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         politician.party.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesParty = !filterParty || politician.party === filterParty;
    const matchesLevel = !filterLevel || politician.level === filterLevel;
    
    return matchesSearch && matchesParty && matchesLevel;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Politicians</h1>
        <p className="text-gray-600">Manage and view politician data in the system</p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            {/* Search */}
            <div className="sm:col-span-2">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="form-input pl-10"
                  placeholder="Search by name, riding, or party..."
                />
              </div>
            </div>

            {/* Party Filter */}
            <div>
              <label htmlFor="party-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Party
              </label>
              <select
                id="party-filter"
                value={filterParty}
                onChange={(e) => setFilterParty(e.target.value)}
                className="form-input"
              >
                <option value="">All Parties</option>
                {parties.map(party => (
                  <option key={party} value={party}>{party}</option>
                ))}
              </select>
            </div>

            {/* Level Filter */}
            <div>
              <label htmlFor="level-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Level
              </label>
              <select
                id="level-filter"
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value)}
                className="form-input"
              >
                <option value="">All Levels</option>
                {levels.map(level => (
                  <option key={level} value={level}>{level.charAt(0).toUpperCase() + level.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Politicians ({filteredPoliticians.length})
            </h3>
            <button className="btn-primary">
              Add New Politician
            </button>
          </div>

          {filteredPoliticians.length === 0 ? (
            <div className="text-center py-12">
              <FunnelIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No politicians found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Try adjusting your search or filter criteria.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Party
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Riding
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Province
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Level
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPoliticians.map((politician) => (
                    <tr key={politician.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {politician.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {politician.party}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {politician.riding}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {politician.province}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                          {politician.level}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {politician.email && (
                          <div>
                            <a href={`mailto:${politician.email}`} className="text-blue-600 hover:text-blue-900">
                              {politician.email}
                            </a>
                          </div>
                        )}
                        {politician.website && (
                          <div>
                            <a href={politician.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-900">
                              Website
                            </a>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button className="text-blue-600 hover:text-blue-900 mr-3">
                          Edit
                        </button>
                        <button className="text-red-600 hover:text-red-900">
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Politicians; 