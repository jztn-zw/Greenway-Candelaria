/** Canvas renderers need resolved colors; DOM and SVG can use CSS variables directly. */
export const readThemeColor = (token: string, styles = getComputedStyle(document.documentElement)) => {
  const value = styles.getPropertyValue(`--${token}`).trim();
  return value ? `hsl(${value})` : "transparent";
};
