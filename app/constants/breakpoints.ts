/**
 * Design system: two columns become one, and NavPills collapse to the ☰ menu, under 900px.
 * CSS can't import this: keep --breakpoint-desktop in assets/css/main.css at the same value.
 */
export const DESKTOP_MIN_WIDTH_PX = 900;

/** Matches from the desktop breakpoint up (for window.matchMedia) */
export const DESKTOP_MEDIA_QUERY = `(min-width: ${DESKTOP_MIN_WIDTH_PX}px)`;
