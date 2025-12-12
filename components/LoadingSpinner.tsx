import React from 'react';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center p-12 space-y-6">
      <div className="relative w-24 h-24 flex items-center justify-center">
        <div className="absolute w-full h-full border border-neutral-200 rotate-45"></div>
        <div className="absolute w-full h-full border border-fashion-accent/80 animate-[spin_10s_linear_infinite]"></div>
        <div className="w-16 h-16 bg-white shadow-lg flex items-center justify-center overflow-hidden">
           <span className="animate-pulse font-serif italic text-2xl text-fashion-accent">V</span>
        </div>
      </div>
      <div className="flex flex-col items-center space-y-2">
        <p className="text-fashion-text text-xs tracking-[0.3em] uppercase font-light">Atelier AI</p>
        <p className="text-fashion-subtext text-[10px] tracking-widest">DESIGNING YOUR LOOK</p>
      </div>
    </div>
  );
};

export default LoadingSpinner;