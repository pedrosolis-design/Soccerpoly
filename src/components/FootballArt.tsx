import React from 'react';
import { LeagueId, TileKind } from '../types/game';

export const JerseyIcon: React.FC<{
  primary: string;
  secondary: string;
  number?: number;
  className?: string;
}> = ({ primary, secondary, number, className = 'w-14 h-14' }) => (
  <svg
    viewBox="0 0 80 80"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <path
      d="M24 14L10 24L16 36L24 31V66H56V31L64 36L70 24L56 14L48 18C43.2 20.4 36.8 20.4 32 18L24 14Z"
      fill={primary}
      stroke="#111111"
      strokeWidth="2.8"
      strokeLinejoin="round"
    />
    <path
      d="M32 16C35 22 45 22 48 16"
      stroke={secondary}
      strokeWidth="3"
      strokeLinecap="round"
    />
    <path d="M24 31L24 14" stroke={secondary} strokeWidth="2.5" />
    <path d="M56 31L56 14" stroke={secondary} strokeWidth="2.5" />
    <rect x="25" y="61" width="30" height="4" fill={secondary} opacity="0.9" />
    {number !== undefined && (
      <text
        x="40"
        y="49"
        textAnchor="middle"
        fill={
          primary.toLowerCase() === '#ffffff' ||
          primary.toLowerCase() === '#f8fafc' ||
          primary.toLowerCase() === '#faf9f5' ||
          primary.toLowerCase() === '#fde100'
            ? '#111111'
            : '#FFFFFF'
        }
        fontSize="19"
        fontWeight="800"
        fontFamily="Barlow Condensed, sans-serif"
      >
        {number}
      </text>
    )}
  </svg>
);

export const TileEmblem: React.FC<{
  kind: TileKind;
  leagueId?: LeagueId;
  className?: string;
}> = ({ kind, leagueId, className = 'w-7 h-7' }) => {
  if (kind === 'start') {
    return (
      <svg viewBox="0 0 36 36" fill="none" className={className} aria-hidden="true">
        <path d="M8 29V7M28 29V7" stroke="#111111" strokeWidth="2.2" strokeLinecap="round" />
        <path
          d="M8 8L19 11L19 20L8 17Z"
          fill="#CDE7DD"
          stroke="#111111"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M28 8L17 11L17 20L28 17Z"
          fill="#111111"
          fillOpacity="0.14"
          stroke="#111111"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (kind === 'challenge') {
    return (
      <svg viewBox="0 0 36 36" fill="none" className={className} aria-hidden="true">
        <circle cx="18" cy="18" r="11.5" fill="#F4D6DC" stroke="#111111" strokeWidth="2" />
        <polygon points="18,10.5 23,14.5 21,21 15,21 13,14.5" fill="#9F4D59" stroke="#111111" strokeWidth="1.2" />
        <path
          d="M18 10.5V6.5M23 14.5L28.5 12.5M21 21L24.5 26.5M15 21L11.5 26.5M13 14.5L7.5 12.5"
          stroke="#111111"
          strokeWidth="1.4"
        />
      </svg>
    );
  }

  if (kind === 'luck') {
    return (
      <svg viewBox="0 0 36 36" fill="none" className={className} aria-hidden="true">
        <circle cx="14" cy="13" r="4.8" fill="#CDE7DD" stroke="#111111" strokeWidth="1.7" />
        <circle cx="22" cy="13" r="4.8" fill="#CDE7DD" stroke="#111111" strokeWidth="1.7" />
        <circle cx="14" cy="21" r="4.8" fill="#B5DBC9" stroke="#111111" strokeWidth="1.7" />
        <circle cx="22" cy="21" r="4.8" fill="#B5DBC9" stroke="#111111" strokeWidth="1.7" />
        <path d="M18 22C18 26 20 29 23 30" stroke="#111111" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    );
  }

  if (kind === 'badluck') {
    return (
      <svg viewBox="0 0 36 36" fill="none" className={className} aria-hidden="true">
        <path
          d="M25 11V21H12"
          stroke="#111111"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M16 16L10 21L16 26"
          stroke="#9F4D59"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (kind === 'jail' || kind === 'gotojail') {
    return (
      <svg viewBox="0 0 36 36" fill="none" className={className} aria-hidden="true">
        <rect
          x="7"
          y="7"
          width="22"
          height="22"
          rx="4"
          fill={kind === 'jail' ? '#E4E2DC' : '#D6E7F2'}
          stroke="#111111"
          strokeWidth="2"
        />
        <path d="M13 7V29M18 7V29M23 7V29" stroke="#111111" strokeWidth="1.9" />
        <rect
          x="10"
          y="15"
          width="16"
          height="6"
          rx="1.5"
          fill="#FAF9F5"
          stroke="#111111"
          strokeWidth="1.5"
        />
      </svg>
    );
  }

  if (kind === 'discount') {
    return (
      <svg viewBox="0 0 36 36" fill="none" className={className} aria-hidden="true">
        <path
          d="M19 6H29V16L16 29L7 20L19 6Z"
          fill="#EDE0B8"
          stroke="#111111"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <circle cx="24" cy="11" r="2" fill="#111111" />
        <text
          x="16.5"
          y="21"
          textAnchor="middle"
          fill="#111111"
          fontSize="9"
          fontWeight="800"
          fontFamily="Barlow Condensed, sans-serif"
        >
          -50%
        </text>
      </svg>
    );
  }

  if (kind === 'legends') {
    return (
      <svg viewBox="0 0 36 36" fill="none" className={className} aria-hidden="true">
        <path
          d="M6 25L9 11L15 17L18 9L21 17L27 11L30 25H6Z"
          fill="#EDE0B8"
          stroke="#111111"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <rect x="7" y="26" width="22" height="3.5" rx="1.2" fill="#111111" />
      </svg>
    );
  }

  const badgeColorMap: Record<LeagueId, string> = {
    premier: '#6E6394',
    laliga: '#B0625B',
    seriea: '#4E7299',
    bundesliga: '#9C5252',
    ligue1: '#44505E',
    brasileirao: '#4F7D63',
    ligaarg: '#5A89A8',
    eredivisie: '#BF784E',
    legends: '#9E823D',
  };

  const color = leagueId ? badgeColorMap[leagueId] : '#44505E';

  return (
    <svg viewBox="0 0 36 36" fill="none" className={className} aria-hidden="true">
      <path
        d="M8 7H28V18C28 24 22.5 28.5 18 30C13.5 28.5 8 24 8 18V7Z"
        fill="#FFFFFF"
        stroke="#111111"
        strokeWidth="2"
      />
      <circle cx="18" cy="17" r="5" fill={color} stroke="#111111" strokeWidth="1.2" />
      <path d="M18 12V22M13 17H23" stroke="#FFFFFF" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
};

export const TrophyBadgeIcon: React.FC<{
  tier: 'copa' | 'liga' | 'ucl';
  unlocked: boolean;
  className?: string;
}> = ({ tier, unlocked, className = 'w-4 h-4' }) => {
  const fill = unlocked
    ? tier === 'copa'
      ? '#DFC57B'
      : tier === 'liga'
        ? '#9CC1DB'
        : '#B5A8D6'
    : '#E5E4DE';

  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M7 4H17V10C17 12.7614 14.7614 15 12 15C9.23858 15 7 12.7614 7 10V4Z"
        fill={fill}
        stroke={unlocked ? '#111111' : '#9CA3AF'}
        strokeWidth="1.7"
      />
      <path
        d="M7 6H4.5C4.5 9 5.5 10.5 7 11M17 6H19.5C19.5 9 18.5 10.5 17 11"
        stroke={unlocked ? '#111111' : '#9CA3AF'}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M12 15V19M9 19H15"
        stroke={unlocked ? '#111111' : '#9CA3AF'}
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
};

export const DiceFace: React.FC<{
  value: number;
  rolling?: boolean;
}> = ({ value, rolling = false }) => {
  const pipsByValue: Record<number, Array<[number, number]>> = {
    1: [[50, 50]],
    2: [
      [28, 28],
      [72, 72],
    ],
    3: [
      [28, 28],
      [50, 50],
      [72, 72],
    ],
    4: [
      [28, 28],
      [72, 28],
      [28, 72],
      [72, 72],
    ],
    5: [
      [28, 28],
      [72, 28],
      [50, 50],
      [28, 72],
      [72, 72],
    ],
    6: [
      [28, 24],
      [72, 24],
      [28, 50],
      [72, 50],
      [28, 76],
      [72, 76],
    ],
  };

  const pips = pipsByValue[value] || pipsByValue[1];

  return (
    <div
      className={`w-14 h-14 rounded-2xl bg-white border-2 border-[#111111] shadow-[3px_3px_0_#111111] flex items-center justify-center transition-transform duration-150 ${
        rolling ? 'rotate-12 scale-105' : 'rotate-0 scale-100'
      }`}
    >
      <svg viewBox="0 0 100 100" className="w-11 h-11" aria-label={`Dado ${value}`}>
        {pips.map(([cx, cy], idx) => (
          <circle
            key={idx}
            cx={cx}
            cy={cy}
            r={9}
            fill={value === 1 ? '#9F4D59' : '#111111'}
          />
        ))}
      </svg>
    </div>
  );
};
