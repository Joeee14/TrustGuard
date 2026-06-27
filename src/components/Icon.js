import React from 'react';
import Svg, {
  Path,
  Circle,
  Rect,
  G,
} from 'react-native-svg';

export default function Icon({
  name,
  size = 18,
  color = '#0E2540',
  strokeWidth = 1.7,
}) {
  const p = {
    fill: 'none',
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };

  const icons = {
    link: (
      <>
        <Path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1.5 1.5" {...p} />
        <Path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1.5-1.5" {...p} />
      </>
    ),
    camera: (
      <>
        <Path d="M3 8.5a2 2 0 0 1 2-2h2l1.5-2h7L17 6.5h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" {...p} />
        <Circle cx="12" cy="13" r="3.5" {...p} />
      </>
    ),
    upload: (
      <>
        <Path d="M12 16V4M7 9l5-5 5 5M4 18v1a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1" {...p} />
      </>
    ),
    shield: (
      <Path d="M12 2 4 5v7c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V5z" {...p} />
    ),
    check: <Path d="M5 12.5l4.5 4.5L19 7" {...p} />,
    x: (
      <>
        <Path d="M6 6l12 12M18 6L6 18" {...p} />
      </>
    ),
    warn: (
      <>
        <Path d="M12 4 2 20h20z" {...p} />
        <Path d="M12 10v4M12 17.5v.2" {...p} />
      </>
    ),
    info: (
      <>
        <Circle cx="12" cy="12" r="9" {...p} />
        <Path d="M12 11v6M12 7.5v.2" {...p} />
      </>
    ),
    star: (
      <Path d="M12 3.5l2.7 5.5 6 .9-4.4 4.3 1 6.1L12 17.5l-5.4 2.8 1-6.1L3.3 9.9l6-.9z" {...p} />
    ),
    seller: (
      <>
        <Circle cx="12" cy="8" r="3.5" {...p} />
        <Path d="M5 20c0-3.5 3-6.5 7-6.5s7 3 7 6.5" {...p} />
      </>
    ),
    cert: (
      <>
        <Circle cx="12" cy="10" r="5" {...p} />
        <Path d="M9 14l-1.5 6 4.5-2 4.5 2L15 14" {...p} />
      </>
    ),
    price: (
      <>
        <Path d="M3 11V4h7l11 11-7 7z" {...p} />
        <Circle cx="8" cy="9" r="1.4" {...p} />
      </>
    ),
    chat: <Path d="M4 5h16v11H9l-5 4z" {...p} />,
    chevron: <Path d="M9 6l6 6-6 6" {...p} />,
    chevronDown: <Path d="M6 9l6 6 6-6" {...p} />,
    back: <Path d="M15 6l-6 6 6 6" {...p} />,
    close: (
      <>
        <Path d="M6 6l12 12M18 6L6 18" {...p} />
      </>
    ),
    search: (
      <>
        <Circle cx="11" cy="11" r="6.5" {...p} />
        <Path d="M16 16l4 4" {...p} />
      </>
    ),
    sparkle: (
      <Path d="M12 3v5M12 16v5M3 12h5M16 12h5M6 6l3 3M15 15l3 3M18 6l-3 3M6 18l3-3" {...p} />
    ),
    history: (
      <>
        <Path d="M4 12a8 8 0 1 0 3-6.2M4 4v5h5" {...p} />
        <Path d="M12 8v5l3 2" {...p} />
      </>
    ),
    settings: (
      <>
        <Circle cx="12" cy="12" r="3" {...p} />
        <Path
          d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"
          {...p}
        />
      </>
    ),
    flag: (
      <>
        <Path d="M5 3v18M5 4h12l-2 4 2 4H5" {...p} />
      </>
    ),
    bolt: <Path d="M13 2L4 14h7l-1 8 9-12h-7z" {...p} />,
    arrowRight: (
      <>
        <Path d="M5 12h14M13 6l6 6-6 6" {...p} />
      </>
    ),
    map: (
      <>
        <Path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z" {...p} />
        <Path d="M9 3v15M15 6v15" {...p} />
      </>
    ),
    box: (
      <>
        <Path d="M3 7l9-4 9 4-9 4z" {...p} />
        <Path d="M3 7v10l9 4 9-4V7" {...p} />
        <Path d="M12 11v10" {...p} />
      </>
    ),
    image: (
      <>
        <Rect x="3" y="4" width="18" height="16" rx="2" {...p} />
        <Circle cx="8.5" cy="10" r="1.5" {...p} />
        <Path d="M21 16l-5-5L5 20" {...p} />
      </>
    ),
    bookmark: <Path d="M6 3h12v18l-6-4-6 4z" {...p} />,
    refresh: (
      <>
        <Path d="M3 12a9 9 0 0 1 16-5l2 2M21 4v5h-5M21 12a9 9 0 0 1-16 5l-2-2M3 20v-5h5" {...p} />
      </>
    ),
    share: (
      <>
        <Path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" {...p} />
        <Path d="M16 6l-4-4-4 4M12 2v13" {...p} />
      </>
    ),
    trash: (
      <>
        <Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" {...p} />
      </>
    ),
  };

  const content = icons[name] || icons['info'];

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
    >
      {content}
    </Svg>
  );
}
