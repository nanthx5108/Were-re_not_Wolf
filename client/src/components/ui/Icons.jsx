import React from 'react';

// ── Shared SVG line-icon set ─────────────────────────────────────────────
// stroke-only, currentColor เสมอ (สืบสีจาก parent) — ให้ทุกที่ที่ใช้ icon กล่องสี่เหลี่ยม
// ของ design system เดิมคุมสี/hover ได้จากภายนอกโดยไม่ต้องแก้ทีละไอคอน
const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

function Icon({ children, size = 20, width, height, ...props }) {
  return <svg {...base} width={width ?? size} height={height ?? size} {...props}>{children}</svg>;
}

export const IconCreate = (p) => (
  <Icon {...p}><path d="M12 5v14M5 12h14" /></Icon>
);
export const IconJoin = (p) => (
  <Icon {...p}><path d="M4 12h11M11 6l6 6-6 6M15 4v2M15 18v2" /></Icon>
);
export const IconBook = (p) => (
  <Icon {...p}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5V5.5Z" /><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20" /></Icon>
);
export const IconSettings = (p) => (
  <Icon {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.96 19.32a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.04H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.68 8.96a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1.04-1.56V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.04 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9a1.7 1.7 0 0 0 1.56 1.04H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.56 1.04Z" /></Icon>
);
export const IconArrow = (p) => (
  <Icon {...p}><path d="M5 12h14M13 6l6 6-6 6" /></Icon>
);
export const IconPin = (p) => (
  <Icon {...p}><path d="M12 21s-7-6.1-7-11a7 7 0 1 1 14 0c0 4.9-7 11-7 11Z" /><circle cx="12" cy="10" r="2.4" /></Icon>
);
export const IconLock = (p) => (
  <Icon {...p}><rect x="4.5" y="10.5" width="15" height="10" rx="2" /><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" /></Icon>
);
export const IconClock = (p) => (
  <Icon {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3.2 2" /></Icon>
);
export const IconLogin = (p) => (
  <Icon {...p}><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 8l4 4-4 4M14 12H3" /></Icon>
);
export const IconRegister = (p) => (
  <Icon {...p}><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" /><path d="M4 21c1-4 4.5-6 8-6s7 2 8 6" /><path d="M19 8v4M17 10h4" /></Icon>
);
export const IconDiscord = (p) => (
  <Icon {...p}><path d="M8 5.5c-2.6.5-4 1.6-4 1.6C2.6 10 2.2 13.4 2.4 16.7c0 0 1.6 1.6 4.6 1.8l.7-1.2M16 5.5c2.6.5 4 1.6 4 1.6 1.4 2.9 1.8 6.3 1.6 9.6 0 0-1.6 1.6-4.6 1.8l-.7-1.2" /><ellipse cx="9" cy="13" rx="1.3" ry="1.6" /><ellipse cx="15" cy="13" rx="1.3" ry="1.6" /></Icon>
);
export const IconFacebook = (p) => (
  <Icon {...p}><path d="M15 4h-2a3.5 3.5 0 0 0-3.5 3.5V10H7v3h2.5v7h3v-7H15l.5-3h-3V7.8c0-.7.4-1.1 1.1-1.1H15V4Z" /></Icon>
);
export const IconGlobe = (p) => (
  <Icon {...p}><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.4 2.4 3.5 5.4 3.5 8.5s-1.1 6.1-3.5 8.5c-2.4-2.4-3.5-5.4-3.5-8.5S9.6 5.9 12 3.5Z" /></Icon>
);
export const IconSearch = (p) => (
  <Icon {...p}><circle cx="10.5" cy="10.5" r="6.5" /><path d="M20 20l-4.8-4.8" /></Icon>
);
export const IconHouse = (p) => (
  <Icon {...p}><path d="M4 11.5 12 4l8 7.5" /><path d="M6 10v9.5h12V10" /></Icon>
);
export const IconGroup = (p) => (
  <Icon {...p}><circle cx="9" cy="8.5" r="3" /><path d="M2.5 20c.8-3.4 3.2-5 6.5-5s5.7 1.6 6.5 5" /><circle cx="17.5" cy="9.5" r="2.4" /><path d="M15.5 14.3c2.4.2 4.2 1.7 4.9 4.7" /></Icon>
);
export const IconBlock = (p) => (
  <Icon {...p}><circle cx="12" cy="12" r="8.5" /><path d="M6.3 6.3l11.4 11.4" /></Icon>
);
export const IconTrophy = (p) => (
  <Icon {...p}><path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" /><path d="M8 5H5a3 3 0 0 0 3 4.5M16 5h3a3 3 0 0 1-3 4.5" /><path d="M12 13v3M9 20h6M10 16.5h4l.5 3.5h-5l.5-3.5Z" /></Icon>
);