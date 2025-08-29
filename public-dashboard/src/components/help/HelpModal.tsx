import React from 'react';
import { XMarkIcon, InformationCircleIcon, CheckBadgeIcon } from '@heroicons/react/24/outline';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  topic?: 'categories' | 'badges' | 'search' | 'general';
}

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose, topic = 'general' }) => {
  if (!isOpen) return null;

  const getHelpContent = () => {
    switch (topic) {
      case 'categories':
        return {
          title: 'Understanding Stance Categories',
          content: (
            <div className="space-y-6">
              <div className="border-l-4 border-green-500 pl-4">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-2xl">🇨🇦</span>
                  <h3 className="text-lg font-semibold text-green-800">Pro Canada</h3>
                </div>
                <p className="text-sm text-gray-700 mb-3">
                  Politicians who have made clear public statements supporting Alberta remaining within Canada 
                  and working within the federal system to address provincial concerns.
                </p>
                <div className="text-xs text-gray-600">
                  <p className="font-medium mb-1">Examples of Pro Canada positions:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Supporting federal programs while advocating for Alberta's interests</li>
                    <li>Working within Confederation to improve equalization formulas</li>
                    <li>Promoting national unity while defending provincial rights</li>
                    <li>Explicitly stating opposition to Alberta separation</li>
                  </ul>
                </div>
              </div>

              <div className="border-l-4 border-red-500 pl-4">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-2xl">🏛️</span>
                  <h3 className="text-lg font-semibold text-red-800">Pro Separation</h3>
                </div>
                <p className="text-sm text-gray-700 mb-3">
                  Politicians who support Alberta independence or have expressed openness to separation. 
                  <strong> This also includes politicians who refuse to comment on the issue</strong>, 
                  as silence is considered tacit support for separation.
                </p>
                <div className="text-xs text-gray-600">
                  <p className="font-medium mb-1">Examples of Pro Separation positions:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Explicitly supporting Alberta independence or sovereignty</li>
                    <li>Advocating for referendum on Alberta's future in Canada</li>
                    <li>Promoting "Alberta First" policies that prioritize provincial over national interests</li>
                    <li>Refusing to answer direct questions about Alberta separation</li>
                    <li>Declining to participate in our survey or respond to our inquiries</li>
                  </ul>
                </div>
              </div>

              <div className="border-l-4 border-gray-500 pl-4">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-2xl">❓</span>
                  <h3 className="text-lg font-semibold text-gray-800">No Position</h3>
                </div>
                <p className="text-sm text-gray-700 mb-3">
                  Politicians whose stance on Alberta's place in Canada is unclear, unknown, or hasn't been 
                  sufficiently documented through public statements or our research efforts.
                </p>
                <div className="text-xs text-gray-600">
                  <p className="font-medium mb-1">Reasons for No Position classification:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>New politicians without sufficient public record on this issue</li>
                    <li>Politicians who focus primarily on municipal or non-constitutional issues</li>
                    <li>Insufficient data from news sources, social media, or public statements</li>
                    <li>Ambiguous statements that don't clearly indicate a position</li>
                  </ul>
                </div>
              </div>
            </div>
          ),
        };

      case 'badges':
        return {
          title: 'Pro Canada Badge Program',
          content: (
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <CheckBadgeIcon className="h-6 w-6 text-green-600" />
                  <h3 className="text-lg font-semibold text-green-800">What is the Pro Canada Badge?</h3>
                </div>
                <p className="text-sm text-gray-700 mb-4">
                  The Pro Canada Badge is a recognition system for politicians who have demonstrated consistent, 
                  strong support for keeping Alberta within Canada and working constructively within Confederation.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Badge Eligibility Criteria</h4>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Clear Public Stance</p>
                      <p className="text-xs text-gray-600">
                        Multiple public statements explicitly supporting Alberta remaining in Canada
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Consistency Over Time</p>
                      <p className="text-xs text-gray-600">
                        Maintained pro-Canada position across multiple statements and time periods
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">High Confidence Score</p>
                      <p className="text-xs text-gray-600">
                        AI classification confidence of 85% or higher based on statement analysis
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Current Office Holder</p>
                      <p className="text-xs text-gray-600">
                        Currently serving in elected office or running for re-election
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">How Badges Are Used</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Visual recognition on politician profiles</li>
                  <li>• Featured in Pro Canada category sections</li>
                  <li>• Helpful for voters seeking pro-unity candidates</li>
                  <li>• Updated regularly based on new statements and positions</li>
                </ul>
              </div>
            </div>
          ),
        };

      case 'search':
        return {
          title: 'How to Search Effectively',
          content: (
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Address vs Postal Code Search</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h5 className="font-medium text-blue-900 mb-2">📮 Postal Code Search</h5>
                    <p className="text-sm text-blue-800 mb-2">More accurate for most users</p>
                    <ul className="text-xs text-blue-700 space-y-1">
                      <li>• Format: A1A 1A1 (automatically formatted)</li>
                      <li>• Works best for residential addresses</li>
                      <li>• Uses official Canada Post boundaries</li>
                      <li>• Example: K1A 0A9 (Parliament Hill)</li>
                    </ul>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h5 className="font-medium text-green-900 mb-2">🏠 Full Address Search</h5>
                    <p className="text-sm text-green-800 mb-2">Best for specific locations</p>
                    <ul className="text-xs text-green-700 space-y-1">
                      <li>• Include street number, name, city, province</li>
                      <li>• More precise geographic matching</li>
                      <li>• Good for rural or complex addresses</li>
                      <li>• Example: 123 Main St, Calgary, AB</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Tips for Best Results</h4>
                <div className="space-y-2">
                  <div className="flex items-start space-x-2">
                    <span className="text-green-500 font-bold">✓</span>
                    <p className="text-sm text-gray-700">Use your home address for the most relevant results</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-green-500 font-bold">✓</span>
                    <p className="text-sm text-gray-700">Try the geolocation button for automatic detection</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-green-500 font-bold">✓</span>
                    <p className="text-sm text-gray-700">Double-check your postal code format if search fails</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-red-500 font-bold">✗</span>
                    <p className="text-sm text-gray-700">Don't use PO Box addresses - they won't work accurately</p>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-800 mb-2">Troubleshooting</h4>
                <p className="text-sm text-yellow-700 mb-2">If you're not getting results:</p>
                <ul className="text-xs text-yellow-700 space-y-1">
                  <li>• Verify your postal code is correct</li>
                  <li>• Try switching between address and postal code modes</li>
                  <li>• Check that you're searching for a Canadian location</li>
                  <li>• Some rural areas may have limited data coverage</li>
                </ul>
              </div>
            </div>
          ),
        };

      default:
        return {
          title: 'About CanadaWill',
          content: (
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Our Mission</h4>
                <p className="text-sm text-gray-700">
                  CanadaWill tracks where Alberta politicians stand on the critical question of Alberta's 
                  place in Canada. We believe citizens deserve clear, accessible information about their 
                  representatives' positions on this fundamental issue.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-3">How We Work</h4>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">1</div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Data Collection</p>
                      <p className="text-xs text-gray-600">
                        We monitor news sources, social media, and official statements for politician positions
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">2</div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">AI Classification</p>
                      <p className="text-xs text-gray-600">
                        Advanced AI analyzes statements to determine stance with confidence scoring
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">3</div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Regular Updates</p>
                      <p className="text-xs text-gray-600">
                        Information is updated regularly as new statements and positions emerge
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">Data Sources</h4>
                <p className="text-sm text-gray-700 mb-2">Our information comes from:</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• Major Canadian news outlets and publications</li>
                  <li>• Official government websites and press releases</li>
                  <li>• Social media posts and public statements</li>
                  <li>• Direct surveys sent to politicians</li>
                  <li>• The Represent API for official politician data</li>
                </ul>
              </div>
            </div>
          ),
        };
    }
  };

  const helpContent = getHelpContent();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <InformationCircleIcon className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">{helpContent.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md p-1"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {helpContent.content}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="btn-primary"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

export default HelpModal; 