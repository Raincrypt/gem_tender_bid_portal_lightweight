import { useEffect, useState } from 'react';

export default function SidebarArt({ className = '' }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkDark = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };

    checkDark();

    // Observe changes on <html> class attribute for real-time theme updates
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden rounded-xl border p-1 shadow-sm transition-colors duration-500 select-none h-[52px] ${
        isDark
          ? 'bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 border-indigo-500/30'
          : 'bg-gradient-to-r from-sky-200 via-blue-100 to-amber-100 border-sky-300/80'
      } ${className}`}
    >
      <svg
        viewBox="0 0 240 50"
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Day Sky Gradient */}
          <linearGradient id="daySky" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#7dd3fc" />
            <stop offset="60%" stopColor="#bae6fd" />
            <stop offset="100%" stopColor="#fef3c7" />
          </linearGradient>

          {/* Night Sky Gradient */}
          <linearGradient id="nightSky" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#090d16" />
            <stop offset="60%" stopColor="#1e1b4b" />
            <stop offset="100%" stopColor="#311042" />
          </linearGradient>

          {/* Day Buildings Gradient */}
          <linearGradient id="dayBuildings" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#475569" />
            <stop offset="100%" stopColor="#94a3b8" />
          </linearGradient>

          {/* Night Buildings Gradient */}
          <linearGradient id="nightBuildings" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>

          {/* Car Body Gradient */}
          <linearGradient id="carBodyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ea580c" />
            <stop offset="50%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>

          {/* Headlight Beam Gradient */}
          <linearGradient id="headlightBeam" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fef08a" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#fef08a" stopOpacity="0.0" />
          </linearGradient>

          {/* Taillight Glow Gradient */}
          <linearGradient id="taillightGlow" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Sky Background */}
        <rect x="0" y="0" width="240" height="42" fill={isDark ? 'url(#nightSky)' : 'url(#daySky)'} />

        {/* Celestial Body: Sun in Day / Moon in Night */}
        {!isDark ? (
          /* Day Sun & Clouds */
          <g>
            <circle cx="205" cy="11" r="6" fill="#f59e0b" />
            <circle cx="205" cy="11" r="10" fill="#fcd34d" opacity="0.3" />

            {/* Subtle Clouds */}
            <path d="M 20,12 Q 25,8 32,10 Q 38,7 44,11 Q 48,12 48,15 L 18,15 Z" fill="#ffffff" opacity="0.65" />
            <path d="M 140,14 Q 144,11 150,12 Q 155,9 160,13 L 138,13 Z" fill="#ffffff" opacity="0.5" />
          </g>
        ) : (
          /* Night Moon & Stars */
          <g>
            {/* Crescent Moon */}
            <path d="M 208,7 A 7 7 0 1 0 216,16 A 6 6 0 1 1 208,7 Z" fill="#fef08a" />
            {/* Stars */}
            <circle cx="25" cy="8" r="0.8" fill="#ffffff" opacity="0.9" />
            <circle cx="55" cy="13" r="0.6" fill="#ffffff" opacity="0.7" />
            <circle cx="90" cy="6" r="1" fill="#fef08a" opacity="0.8" />
            <circle cx="130" cy="10" r="0.7" fill="#ffffff" opacity="0.8" />
            <circle cx="165" cy="7" r="0.9" fill="#ffffff" opacity="0.9" />
            <circle cx="185" cy="14" r="0.6" fill="#ffffff" opacity="0.6" />
          </g>
        )}

        {/* Cityscape Background Layer (Silhouettes & Windows) */}
        <g fill={isDark ? 'url(#nightBuildings)' : 'url(#dayBuildings)'}>
          {/* Building 1 - Left Tower */}
          <rect x="4" y="14" width="14" height="28" rx="1" />
          {/* Building 2 - Spire */}
          <polygon points="26,8 27,4 28,8" fill={isDark ? '#312e81' : '#64748b'} />
          <rect x="22" y="8" width="12" height="34" rx="1" />
          {/* Building 3 - Medium Block */}
          <rect x="38" y="18" width="18" height="24" rx="1" />
          {/* Building 4 - Arch / Suspension Bridge structure */}
          <rect x="60" y="12" width="16" height="30" rx="1" />
          {/* Building 5 - Main Skyscraper */}
          <polygon points="86,6 88,2 90,6" fill={isDark ? '#4338ca' : '#475569'} />
          <rect x="81" y="6" width="16" height="36" rx="1" />
          {/* Building 6 */}
          <rect x="101" y="16" width="14" height="26" rx="1" />
          {/* Building 7 - Diagonal Roof */}
          <path d="M 120,10 L 134,16 L 134,42 L 120,42 Z" />
          {/* Building 8 - Glass Tower */}
          <rect x="138" y="11" width="15" height="31" rx="1" />
          {/* Building 9 */}
          <rect x="157" y="19" width="16" height="23" rx="1" />
          {/* Building 10 - Right Spire */}
          <rect x="177" y="8" width="14" height="34" rx="1" />
          <line x1="184" y1="8" x2="184" y2="3" stroke={isDark ? '#818cf8' : '#475569'} strokeWidth="1" />
          {/* Building 11 */}
          <rect x="195" y="15" width="18" height="27" rx="1" />
          {/* Building 12 */}
          <rect x="217" y="12" width="18" height="30" rx="1" />
        </g>

        {/* Building Window Lights */}
        <g fill={isDark ? '#fde047' : '#e0f2fe'} opacity={isDark ? 0.85 : 0.6}>
          {/* Windows on Spire (Bldg 2) */}
          <rect x="25" y="12" width="2" height="2" />
          <rect x="29" y="12" width="2" height="2" />
          <rect x="25" y="16" width="2" height="2" />
          <rect x="29" y="16" width="2" height="2" />
          <rect x="25" y="20" width="2" height="2" />

          {/* Windows on Main Skyscraper (Bldg 5) */}
          <rect x="84" y="10" width="3" height="2" />
          <rect x="91" y="10" width="3" height="2" />
          <rect x="84" y="14" width="3" height="2" />
          <rect x="91" y="14" width="3" height="2" />
          <rect x="84" y="18" width="3" height="2" />
          <rect x="91" y="18" width="3" height="2" />
          <rect x="84" y="22" width="3" height="2" />

          {/* Windows on Glass Tower (Bldg 8) */}
          <rect x="142" y="15" width="2" height="15" opacity="0.4" fill={isDark ? '#fde047' : '#bae6fd'} />
          <rect x="147" y="15" width="2" height="15" opacity="0.4" fill={isDark ? '#fde047' : '#bae6fd'} />

          {/* Windows on Right Spire (Bldg 10) */}
          <rect x="181" y="12" width="2" height="2" />
          <rect x="186" y="12" width="2" height="2" />
          <rect x="181" y="16" width="2" height="2" />
          <rect x="186" y="16" width="2" height="2" />
          <rect x="181" y="20" width="2" height="2" />
        </g>

        {/* Road Surface */}
        <rect x="0" y="41" width="240" height="9" fill={isDark ? '#020617' : '#334155'} />

        {/* Road Center Line (Dashed) */}
        <line
          x1="0"
          y1="45.5"
          x2="240"
          y2="45.5"
          stroke={isDark ? '#f59e0b' : '#fef08a'}
          strokeWidth="1"
          strokeDasharray="8 6"
        />

        {/* Car Group - Sleek Side View (Larger & Detailed) */}
        {/* Positioned on road at x = 70 to 155 */}
        <g>
          {/* Headlight Cone Beam (Night Mode extra light) */}
          {isDark && (
            <polygon points="148,37.5 210,31 210,48 148,41.5" fill="url(#headlightBeam)" />
          )}

          {/* Taillight Glow Beam */}
          <polygon points="76,38 50,36 50,44 76,41" fill="url(#taillightGlow)" />

          {/* Car Body Shadow on Road */}
          <ellipse cx="112" cy="44.5" rx="36" ry="2.5" fill="#000000" opacity={isDark ? 0.7 : 0.4} />

          {/* Main Car Body Shell */}
          {/* Front Bumper -> Hood -> Windshield -> Curved Roof -> Rear Window -> Trunk -> Rear Bumper */}
          <path
            d="
              M 76,39.5
              L 76,37.5
              C 76,35.5 77.5,34.5 79.5,34.5
              L 87,34.5
              C 91,34.5 96,31 101,27.5
              C 105,24.8 111,23.5 119,23.5
              L 128,23.5
              C 134,23.5 138,26 142,30
              L 146,34
              L 150,34.8
              C 152.5,35.2 154,36.5 154,38.5
              L 154,41
              L 76,41
              Z
            "
            fill="url(#carBodyGrad)"
            stroke={isDark ? '#7c2d12' : '#c2410c'}
            strokeWidth="0.5"
          />

          {/* Car Cabin Roof Accent / Trim */}
          <path
            d="
              M 99,28
              C 103.5,24.8 110,24 118,24
              L 127,24
              C 132.5,24 136,26.2 139.5,29.8
              Z
            "
            fill="#1e293b"
            opacity="0.3"
          />

          {/* Glass Windows (Front & Rear Side Windows) */}
          {/* Front Window */}
          <path
            d="
              M 118.5,24.8
              L 126.5,24.8
              C 131,24.8 134,26.8 137,30
              L 118.5,30
              Z
            "
            fill={isDark ? '#38bdf8' : '#7dd3fc'}
            opacity="0.85"
          />
          {/* Rear Window */}
          <path
            d="
              M 102,28.2
              C 105.5,25.8 110,24.8 116.5,24.8
              L 116.5,30
              L 99.5,30
              Z
            "
            fill={isDark ? '#38bdf8' : '#7dd3fc'}
            opacity="0.85"
          />

          {/* B-Pillar Divider between Windows */}
          <rect x="116.5" y="24.5" width="2" height="6" fill="#0f172a" />

          {/* Side Mirror */}
          <path d="M 125,29.5 L 128.5,29.5 L 127.5,31 L 124.5,31 Z" fill="#9a3412" />

          {/* Door Handle */}
          <rect x="110" y="32.5" width="3.5" height="1" rx="0.5" fill="#7c2d12" />

          {/* Body Character Line Accent */}
          <line x1="82" y1="35.5" x2="148" y2="35.5" stroke="#fcd34d" strokeWidth="0.6" opacity="0.8" />

          {/* Headlight Lens */}
          <path d="M 152,36.5 L 154,37.5 L 152,39 Z" fill={isDark ? '#fef08a' : '#ffffff'} />

          {/* Taillight Lens */}
          <rect x="76" y="36" width="2" height="3" rx="0.5" fill="#ef4444" />

          {/* Wheels (Larger, alloy wheel design) */}
          {/* Rear Wheel at x = 91 */}
          <g>
            {/* Wheel Arch cutout */}
            <path d="M 83.5,41 A 8 8 0 0 1 98.5,41 Z" fill={isDark ? '#020617' : '#334155'} />
            {/* Outer Tire */}
            <circle cx="91" cy="41" r="6.5" fill="#0f172a" stroke="#334155" strokeWidth="0.8" />
            {/* Rim */}
            <circle cx="91" cy="41" r="4.2" fill="#cbd5e1" />
            <circle cx="91" cy="41" r="2.5" fill="#475569" />
            {/* Alloy Spokes */}
            <line x1="91" y1="37" x2="91" y2="45" stroke="#ffffff" strokeWidth="0.8" />
            <line x1="87" y1="41" x2="95" y2="41" stroke="#ffffff" strokeWidth="0.8" />
            <circle cx="91" cy="41" r="1" fill="#f97316" />
          </g>

          {/* Front Wheel at x = 137 */}
          <g>
            {/* Wheel Arch cutout */}
            <path d="M 129.5,41 A 8 8 0 0 1 144.5,41 Z" fill={isDark ? '#020617' : '#334155'} />
            {/* Outer Tire */}
            <circle cx="137" cy="41" r="6.5" fill="#0f172a" stroke="#334155" strokeWidth="0.8" />
            {/* Rim */}
            <circle cx="137" cy="41" r="4.2" fill="#cbd5e1" />
            <circle cx="137" cy="41" r="2.5" fill="#475569" />
            {/* Alloy Spokes */}
            <line x1="137" y1="37" x2="137" y2="45" stroke="#ffffff" strokeWidth="0.8" />
            <line x1="133" y1="41" x2="141" y2="41" stroke="#ffffff" strokeWidth="0.8" />
            <circle cx="137" cy="41" r="1" fill="#f97316" />
          </g>
        </g>
      </svg>
    </div>
  );
}
