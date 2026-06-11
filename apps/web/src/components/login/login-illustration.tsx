export function LoginIllustration() {
  return (
    <svg
      viewBox="0 0 400 360"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="login-illustration-svg"
      aria-hidden
    >
      <defs>
        <linearGradient id="planetGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#A5C8FF" />
          <stop offset="100%" stopColor="#6B9FFF" />
        </linearGradient>
        <linearGradient id="rocketGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#E8EEFF" />
        </linearGradient>
        <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="8" stdDeviation="12" floodOpacity="0.12" />
        </filter>
      </defs>

      {/* orbit ring */}
      <ellipse
        cx="200"
        cy="200"
        rx="130"
        ry="36"
        stroke="#C4B5FD"
        strokeWidth="2"
        strokeDasharray="6 8"
        opacity="0.5"
      />

      {/* main planet */}
      <circle
        cx="200"
        cy="248"
        r="88"
        fill="url(#planetGrad)"
        filter="url(#softShadow)"
      />
      <ellipse
        cx="168"
        cy="228"
        rx="14"
        ry="10"
        fill="#8BB4FF"
        opacity="0.35"
      />
      <ellipse
        cx="230"
        cy="260"
        rx="18"
        ry="12"
        fill="#8BB4FF"
        opacity="0.25"
      />

      {/* rocket */}
      <g transform="translate(310, 118) rotate(25)">
        <ellipse cx="0" cy="28" rx="10" ry="22" fill="url(#rocketGrad)" />
        <path d="M-8 20 L0 -18 L8 20 Z" fill="#FFFFFF" />
        <circle cx="0" cy="4" r="5" fill="#8B5CF6" opacity="0.6" />
        <path d="M-8 22 L-14 34 L-6 28 Z" fill="#F59E0B" />
        <path d="M8 22 L14 34 L6 28 Z" fill="#F59E0B" />
      </g>

      {/* character body */}
      <g filter="url(#softShadow)">
        <ellipse cx="200" cy="210" rx="42" ry="10" fill="#000" opacity="0.06" />
        {/* legs */}
        <rect x="178" y="218" width="14" height="28" rx="7" fill="#7C3AED" />
        <rect x="208" y="218" width="14" height="28" rx="7" fill="#7C3AED" />
        <ellipse cx="185" cy="248" rx="10" ry="6" fill="#F97316" />
        <ellipse cx="215" cy="248" rx="10" ry="6" fill="#F97316" />
        {/* torso */}
        <rect x="172" y="168" width="56" height="54" rx="18" fill="#FACC15" />
        {/* arms */}
        <rect x="148" y="178" width="28" height="12" rx="6" fill="#FDE047" />
        <rect x="224" y="174" width="30" height="12" rx="6" fill="#FDE047" />
        {/* phone */}
        <rect x="138" y="172" width="14" height="22" rx="3" fill="#1E293B" />
        <rect
          x="140"
          y="175"
          width="10"
          height="14"
          rx="1"
          fill="#8B5CF6"
          opacity="0.5"
        />
        {/* head */}
        <circle cx="200" cy="148" r="28" fill="#FDBA74" />
        {/* cap */}
        <path
          d="M172 142 Q200 118 228 142 L228 152 Q200 138 172 152 Z"
          fill="#3B82F6"
        />
        <rect x="172" y="148" width="56" height="8" rx="4" fill="#2563EB" />
        {/* goggles */}
        <rect
          x="182"
          y="142"
          width="36"
          height="14"
          rx="7"
          fill="#60A5FA"
          opacity="0.85"
        />
        <circle cx="192" cy="149" r="4" fill="#1E40AF" opacity="0.5" />
        <circle cx="208" cy="149" r="4" fill="#1E40AF" opacity="0.5" />
      </g>

      {/* laptop */}
      <g transform="translate(228, 196)">
        <rect x="0" y="0" width="44" height="28" rx="4" fill="#E2E8F0" />
        <rect
          x="3"
          y="3"
          width="38"
          height="20"
          rx="2"
          fill="#8B5CF6"
          opacity="0.35"
        />
        <path d="M-4 28 H48 L44 34 H0 Z" fill="#CBD5E1" />
      </g>

      {/* mascot dog */}
      <g transform="translate(118, 128)">
        <ellipse cx="24" cy="36" rx="22" ry="20" fill="#FDE68A" />
        <circle cx="14" cy="18" r="10" fill="#FDE68A" />
        <circle cx="34" cy="18" r="10" fill="#FDE68A" />
        <circle cx="18" cy="32" r="4" fill="#1E293B" />
        <circle cx="30" cy="32" r="4" fill="#1E293B" />
        <ellipse cx="24" cy="40" rx="6" ry="4" fill="#F97316" />
        {/* headset */}
        <path
          d="M6 22 Q24 6 42 22"
          stroke="#3B82F6"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
        />
        <rect x="2" y="20" width="10" height="14" rx="5" fill="#3B82F6" />
        <rect x="36" y="20" width="10" height="14" rx="5" fill="#3B82F6" />
      </g>

      {/* sparkles */}
      <path
        d="M88 80 L90 86 L96 88 L90 90 L88 96 L86 90 L80 88 L86 86 Z"
        fill="#FBBF24"
      />
      <path
        d="M328 200 L330 204 L334 206 L330 208 L328 212 L326 208 L322 206 L326 204 Z"
        fill="#FBBF24"
      />
      <circle cx="340" cy="72" r="4" fill="#C4B5FD" opacity="0.8" />
      <circle cx="72" cy="260" r="6" fill="#DDD6FE" opacity="0.9" />
    </svg>
  );
}
