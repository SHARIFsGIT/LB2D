import React from 'react';

const StarSVG = '0 0 784.11 815.53';
const StarPath = 'M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z';

const AnimatedStars: React.FC = () => {
  return (
    <>
      {/* Star 1 - Black - Top Left */}
      <div className="fixed w-5 h-5 top-[3%] left-[8%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-2400 ease-smooth pointer-events-none">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox={StarSVG} className="w-full h-full fill-black drop-shadow-[0_0_10px_rgba(0,0,0,0.8)]">
          <path d={StarPath} />
        </svg>
      </div>

      {/* Star 2 - Blue - Top Right */}
      <div className="fixed w-3 h-3 top-[12%] right-[7%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-1800 ease-smooth pointer-events-none">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox={StarSVG} className="w-full h-full fill-blue-800 drop-shadow-[0_0_8px_rgba(96,165,250,0.8)]">
          <path d={StarPath} />
        </svg>
      </div>

      {/* Star 3 - White - Top Center */}
      <div className="fixed w-4 h-4 top-[7%] left-[45%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-2800 ease-smooth pointer-events-none">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox={StarSVG} className="w-full h-full fill-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]">
          <path d={StarPath} />
        </svg>
      </div>

      {/* Star 4 - Orange - Middle Right */}
      <div className="fixed w-2 h-2 top-[45%] right-[5%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-2000 ease-smooth pointer-events-none">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox={StarSVG} className="w-full h-full fill-orange-500 drop-shadow-[0_0_7px_rgba(251,146,60,0.8)]">
          <path d={StarPath} />
        </svg>
      </div>

      {/* Star 5 - Cyan - Middle Left */}
      <div className="fixed w-3 h-3 top-[55%] left-[10%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-3200 ease-smooth pointer-events-none">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox={StarSVG} className="w-full h-full fill-cyan-600 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]">
          <path d={StarPath} />
        </svg>
      </div>

      {/* Star 6 - White - Bottom Right */}
      <div className="fixed w-4 h-4 bottom-[8%] right-[15%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-2600 ease-smooth pointer-events-none">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox={StarSVG} className="w-full h-full fill-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]">
          <path d={StarPath} />
        </svg>
      </div>

      {/* Star 7 - Red - Bottom Left */}
      <div className="fixed w-2 h-2 bottom-[15%] left-[12%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-2200 ease-smooth pointer-events-none">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox={StarSVG} className="w-full h-full fill-red-800 drop-shadow-[0_0_7px_rgba(248,113,113,0.8)]">
          <path d={StarPath} />
        </svg>
      </div>

      {/* Star 8 - Indigo - Middle Right Center */}
      <div className="fixed w-3 h-3 top-[38%] right-[25%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-1600 ease-smooth pointer-events-none">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox={StarSVG} className="w-full h-full fill-indigo-100 drop-shadow-[0_0_8px_rgba(129,140,248,0.8)]">
          <path d={StarPath} />
        </svg>
      </div>

      {/* Star 9 - Purple - Bottom Center */}
      <div className="fixed w-3 h-3 bottom-[6%] left-[50%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-2100 ease-smooth pointer-events-none">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox={StarSVG} className="w-full h-full fill-purple-500 drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]">
          <path d={StarPath} />
        </svg>
      </div>

      {/* Star 10 - Rose - Middle Left Center */}
      <div className="fixed w-2 h-2 top-[30%] left-[22%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-2400 ease-smooth pointer-events-none">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox={StarSVG} className="w-full h-full fill-rose-500 drop-shadow-[0_0_7px_rgba(251,113,133,0.8)]">
          <path d={StarPath} />
        </svg>
      </div>

      {/* Star 11 - Emerald - Bottom Far Right */}
      <div className="fixed w-3 h-3 bottom-[20%] right-[8%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-2800 ease-smooth pointer-events-none">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox={StarSVG} className="w-full h-full fill-emerald-600 drop-shadow-[0_0_8px_rgba(5,150,105,0.8)]">
          <path d={StarPath} />
        </svg>
      </div>

      {/* Star 12 - Lime - Top Far Right */}
      <div className="fixed w-2 h-2 top-[18%] right-[18%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-2000 ease-smooth pointer-events-none">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox={StarSVG} className="w-full h-full fill-lime-600 drop-shadow-[0_0_7px_rgba(163,230,53,0.8)]">
          <path d={StarPath} />
        </svg>
      </div>
    </>
  );
};

export default AnimatedStars;
