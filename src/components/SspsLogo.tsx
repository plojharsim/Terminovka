import React from "react";

export const SspsLogo: React.FC<{ className?: string }> = ({ className = "h-9" }) => {
  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {/* SSPŠ Heraldic Shield Crest */}
      <svg
        viewBox="0 0 40 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-8 h-9 shrink-0 text-white"
      >
        {/* Shield Outline */}
        <path
          d="M20 2L37 7V22C37 32.5 29.5 41.5 20 46C10.5 41.5 3 32.5 3 22V7L20 2Z"
          fill="#0D0F26"
          stroke="currentColor"
          strokeWidth="2"
        />
        {/* Inner shield border */}
        <path
          d="M20 5L34 9V22C34 31 27.5 38.5 20 43C12.5 38.5 6 31 6 22V9L20 5Z"
          stroke="#DDA300"
          strokeWidth="1"
          strokeOpacity="0.7"
        />
        {/* Stylized Bohemian Lion Emblem in White */}
        <path
          d="M20 12C21.5 12 22.5 13 22.5 14.5C22.5 15.5 21.8 16.3 21 16.8V19H24C25 19 25.5 19.5 25.5 20.5C25.5 21.5 24.5 22 23.5 22H21.5V25H25C26 25 26.5 25.5 26.5 26.5C26.5 27.5 25.5 28 24.5 28H21.5V34C21.5 35 20.8 36 19.8 36C18.8 36 18.2 35 18.2 34V28H15.5C14.5 28 13.8 27.3 13.8 26.5C13.8 25.5 14.5 25 15.5 25H18.2V22H16C15 22 14.2 21.3 14.2 20.5C14.2 19.5 15 19 16 19H18.2V16.8C17.5 16.3 17 15.5 17 14.5C17 13 18 12 20 12Z"
          fill="currentColor"
        />
        {/* Crown on lion */}
        <path
          d="M17.5 11L18.5 13H21.5L22.5 11L21 12L20 10.5L19 12L17.5 11Z"
          fill="#DDA300"
        />
      </svg>

      {/* Official Typography from ssps.cz */}
      <div className="flex flex-col justify-center leading-tight">
        <span className="font-bold text-white text-xs sm:text-sm tracking-wide">
          Smíchovská
        </span>
        <span className="font-bold text-white text-xs sm:text-sm tracking-wide">
          střední
        </span>
      </div>
    </div>
  );
};
