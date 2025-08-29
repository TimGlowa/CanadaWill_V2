import React from 'react';

const TestResponsive: React.FC = () => {
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Tailwind Responsive Test</h2>
      
      {/* Test responsive visibility */}
      <div className="mb-4">
        <div className="bg-red-500 text-white p-2 mb-2 lg:hidden">
          🔴 MOBILE ONLY - This should be hidden on desktop (lg+)
        </div>
        <div className="bg-green-500 text-white p-2 mb-2 hidden lg:block">
          🟢 DESKTOP ONLY - This should be hidden on mobile
        </div>
      </div>
      
      {/* Test responsive grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="bg-blue-500 text-white p-4 rounded">
          Column 1 - Full width on mobile, 1/3 on desktop
        </div>
        <div className="bg-purple-500 text-white p-4 rounded">
          Column 2 - Full width on mobile, 1/3 on desktop
        </div>
        <div className="bg-orange-500 text-white p-4 rounded">
          Column 3 - Full width on mobile, 1/3 on desktop
        </div>
      </div>
      
      {/* Test responsive text sizes */}
      <div className="mb-4">
        <p className="text-sm lg:text-lg">
          This text should be small on mobile and large on desktop
        </p>
      </div>
      
      {/* Test responsive spacing */}
      <div className="mb-4">
        <div className="bg-gray-200 p-2 lg:p-8 rounded">
          This box should have small padding on mobile and large padding on desktop
        </div>
      </div>
      
      {/* Test responsive flexbox */}
      <div className="flex flex-col lg:flex-row gap-2 lg:gap-4 mb-4">
        <div className="bg-yellow-500 text-black p-2 rounded flex-1">
          Flex item 1
        </div>
        <div className="bg-pink-500 text-white p-2 rounded flex-1">
          Flex item 2
        </div>
      </div>
    </div>
  );
};

export default TestResponsive; 