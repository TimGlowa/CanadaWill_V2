import React from 'react';
import { 
  InformationCircleIcon, 
  ShieldCheckIcon, 
  GlobeAltIcon,
  UserGroupIcon, 
} from '@heroicons/react/24/outline';

const About: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          About CanadaWill
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          A non-partisan information service helping Canadians understand 
          their elected officials' positions on key issues.
        </p>
      </div>

      {/* Mission Section */}
      <div className="card p-8 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Our Mission</h2>
        <p className="text-gray-700 mb-4">
          CanadaWill exists to provide Canadian citizens with clear, factual information 
          about their elected officials' positions on important issues affecting our nation's future. 
          We believe that an informed electorate is essential to a healthy democracy.
        </p>
        <p className="text-gray-700">
          Our platform tracks public statements, voting records, and official positions 
          to help you understand where your representatives stand on key issues, 
          particularly those related to national unity and provincial autonomy.
        </p>
      </div>

      {/* How We Work */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="card p-6">
          <div className="flex items-center mb-4">
            <ShieldCheckIcon className="h-6 w-6 text-blue-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">Non-Partisan Approach</h3>
          </div>
          <p className="text-gray-600 text-sm">
            We don't advocate for any particular political position. Our role is to 
            accurately report what politicians have said and done, allowing you to 
            make informed decisions based on facts.
          </p>
        </div>

        <div className="card p-6">
          <div className="flex items-center mb-4">
            <InformationCircleIcon className="h-6 w-6 text-green-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">Verified Information</h3>
          </div>
          <p className="text-gray-600 text-sm">
            All position classifications are based on public statements, interviews, 
            voting records, and official party platforms. We provide sources and 
            context for our classifications.
          </p>
        </div>

        <div className="card p-6">
          <div className="flex items-center mb-4">
            <GlobeAltIcon className="h-6 w-6 text-purple-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">Open Data</h3>
          </div>
          <p className="text-gray-600 text-sm">
            We use the Represent API by Open North to identify your representatives 
            based on postal code. This ensures accurate, up-to-date electoral information 
            from trusted civic data sources.
          </p>
        </div>

        <div className="card p-6">
          <div className="flex items-center mb-4">
            <UserGroupIcon className="h-6 w-6 text-orange-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">Community Driven</h3>
          </div>
          <p className="text-gray-600 text-sm">
            Citizens can contribute by submitting links to public statements, interviews, 
            or official positions. All submissions are verified before being included 
            in our database.
          </p>
        </div>
      </div>

      {/* Position Categories */}
      <div className="card p-8 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Position Categories</h2>
        <div className="space-y-6">
          <div className="border-l-4 border-green-500 pl-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              🇨🇦 Pro Canada
            </h3>
            <p className="text-gray-700 text-sm mb-2">
              Politicians who have publicly expressed support for maintaining their 
              province within Canada and working within the existing federal system 
              to address concerns.
            </p>
            <p className="text-xs text-gray-500">
              <strong>Examples:</strong> Statements supporting federalism, opposition to separation, 
              advocacy for working within Confederation
            </p>
          </div>

          <div className="border-l-4 border-red-500 pl-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              🏛️ Pro Separation
            </h3>
            <p className="text-gray-700 text-sm mb-2">
              Politicians who have expressed support for or openness to provincial 
              independence or separation from Canada. This includes those who avoid 
              taking a clear position when directly asked.
            </p>
            <p className="text-xs text-gray-500">
              <strong>Examples:</strong> Support for independence referendums, "no comment" 
              responses to direct questions about separation, conditional support
            </p>
          </div>

          <div className="border-l-4 border-gray-400 pl-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              ❓ No Position
            </h3>
            <p className="text-gray-700 text-sm mb-2">
              Politicians who have not made any public statements on issues related 
              to provincial autonomy, federalism, or separation, or whose position 
              cannot be determined from available public information.
            </p>
            <p className="text-xs text-gray-500">
              <strong>Note:</strong> This category is regularly reviewed as politicians 
              may clarify their positions over time
            </p>
          </div>
        </div>
      </div>

      {/* Data Sources */}
      <div className="card p-8 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Data Sources</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Primary Sources</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Official government websites and press releases</li>
              <li>• Hansard (official parliamentary records)</li>
              <li>• Political party platforms and policy documents</li>
              <li>• Campaign websites and materials</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Media Sources</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Print and broadcast news interviews</li>
              <li>• Social media posts (verified accounts)</li>
              <li>• Public debates and town halls</li>
              <li>• Legislative committee testimony</li>
            </ul>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-4">
          All sources are documented and available for review. We prioritize recent 
          statements but also consider historical positions for context.
        </p>
      </div>

      {/* Technical Information */}
      <div className="card p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Technical Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Built With</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• React with TypeScript</li>
              <li>• Tailwind CSS for styling</li>
              <li>• Azure Static Web Apps</li>
              <li>• Represent API integration</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Data Management</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Azure Blob Storage</li>
              <li>• Automated data validation</li>
              <li>• Regular updates and backups</li>
              <li>• Version controlled source data</li>
            </ul>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-4">
          This project is open source and contributions are welcome. 
          Visit our repository for technical documentation and contribution guidelines.
        </p>
      </div>
    </div>
  );
};

export default About; 