// Navigation symbols follow vhAstro's Tabler-style, stroke-only SVG artwork.
const paths = {
  home: [
    'M3 10l9-7 9 7v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
    'M9 15a3 3 0 0 0 6 0'
  ],
  search: ['M10 3a7 7 0 1 0 0 14a7 7 0 0 0 0-14', 'M15 15l6 6'],
  moon: ['M12 3a9 9 0 1 0 9 9a7 7 0 0 1-9-9'],
  sun: [
    'M12 8a4 4 0 1 0 0 8a4 4 0 0 0 0-8',
    'M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5'
  ],
  menu: ['M4 6h16M4 12h16M4 18h16'],
  close: ['M6 6l12 12M6 18L18 6'],
  user: [
    'M12 3a4 4 0 1 0 0 8a4 4 0 0 0 0-8',
    'M4 21v-2a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v2'
  ],
  link: [
    'M9 15l6-6',
    'M11 6l2-2a5 5 0 0 1 7 7l-2 2',
    'M13 18l-2 2a5 5 0 0 1-7-7l2-2'
  ],
  about: [
    'M8 11v5M8 8v.01M12 16v-5M16 16v-3a2 2 0 1 0-4 0',
    'M3 7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z'
  ],
  archive: ['M3 4h18v4H3zM5 8v12h14V8M10 12h4'],
  friends: [
    'M9 3a4 4 0 1 0 0 8a4 4 0 0 0 0-8',
    'M3 21v-2a6 6 0 0 1 12 0v2M16 3a4 4 0 0 1 0 8M21 21v-2a6 6 0 0 0-4-5.7'
  ],
  message: [
    'M4 3h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H8l-5 4V4a1 1 0 0 1 1-1',
    'M7 7h10M7 11h7'
  ],
  talking: [
    'M12 8a4 4 0 1 0 0 8a4 4 0 0 0 0-8',
    'M4 4v.01M12 3v.01M20 4v.01M21 12v.01M20 20v.01M12 21v.01M4 20v.01M3 12v.01'
  ],
  rss: ['M4 19v.01M4 11a8 8 0 0 1 8 8M4 3a16 16 0 0 1 16 16'],
  tags: ['M3 3h8l10 10-8 8L3 11zM7 7v.01'],
  up: ['M5 14l7-7 7 7'],
  calendar: ['M4 5h16v16H4zM8 3v4M16 3v4M4 11h16'],
  lock: ['M5 10h14v11H5zM8 10V7a4 4 0 0 1 8 0v3']
}

export default function Icon({ name = 'link', ...props }) {
  return (
    <svg
      width='20'
      height='20'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.8'
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden='true'
      {...props}
    >
      {(paths[name] || paths.link).map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  )
}
