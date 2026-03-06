
import React from 'react';

const Footer: React.FC = () => {
  const buildVersion = process.env.NEXT_PUBLIC_BUILD_VERSION || "v0.0.0-dev";
  return (
    <footer className="bg-background border-t border-border px-4 sm:px-6 lg:px-8">
      <div className="py-4 flex items-center justify-between text-sm text-muted-foreground">
        <span>&copy; {new Date().getFullYear()} Propix Technologies Pvt. Ltd. All rights reserved.</span>
        <span className="font-mono text-xs">Build {buildVersion}</span>
      </div>
    </footer>
  );
};

export default Footer;