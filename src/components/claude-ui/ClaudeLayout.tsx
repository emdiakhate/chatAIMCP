import React, { useState } from 'react';
import { Sidebar } from './Sidebar';

interface ClaudeLayoutProps {
  children: (toggleSidebar: () => void) => React.ReactNode;
}

export const ClaudeLayout: React.FC<ClaudeLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="flex h-screen bg-[#F5F5F0] overflow-hidden">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'w-[260px]' : 'w-0'
        } transition-all duration-300 ease-in-out overflow-hidden flex-shrink-0`}
      >
        <Sidebar isOpen={sidebarOpen} />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {children(toggleSidebar)}
      </div>
    </div>
  );
};
