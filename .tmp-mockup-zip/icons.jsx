/* global React */
// Inline SVG icon library — stroke 1.75, currentColor
const { createElement: h } = React;

const Icon = ({ size = 16, stroke = 1.75, path, viewBox = "0 0 24 24", fill = "none" }) =>
  h("svg", {
    width: size, height: size, viewBox, fill,
    stroke: "currentColor", strokeWidth: stroke,
    strokeLinecap: "round", strokeLinejoin: "round",
    style: { flexShrink: 0 }
  }, path);

const I = {
  // nav
  layers: (p) => h(Icon, { ...p, path: [h("path", { key: 1, d: "M12 2 2 7l10 5 10-5-10-5z" }), h("path", { key: 2, d: "m2 17 10 5 10-5" }), h("path", { key: 3, d: "m2 12 10 5 10-5" })] }),
  folder: (p) => h(Icon, { ...p, path: h("path", { d: "M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z" }) }),
  maximize: (p) => h(Icon, { ...p, path: [h("path", { key: 1, d: "M8 3H5a2 2 0 0 0-2 2v3" }), h("path", { key: 2, d: "M21 8V5a2 2 0 0 0-2-2h-3" }), h("path", { key: 3, d: "M3 16v3a2 2 0 0 0 2 2h3" }), h("path", { key: 4, d: "M16 21h3a2 2 0 0 0 2-2v-3" })] }),
  megaphone: (p) => h(Icon, { ...p, path: [h("path", { key: 1, d: "M3 11l18-5v12L3 14v-3z" }), h("path", { key: 2, d: "M11.6 16.8a3 3 0 1 1-5.8-1.6" })] }),
  rocket: (p) => h(Icon, { ...p, path: [h("path", { key: 1, d: "M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" }), h("path", { key: 2, d: "M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" }), h("path", { key: 3, d: "M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" }), h("path", { key: 4, d: "M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" })] }),
  link2: (p) => h(Icon, { ...p, path: [h("path", { key: 1, d: "M9 17H7A5 5 0 0 1 7 7h2" }), h("path", { key: 2, d: "M15 7h2a5 5 0 1 1 0 10h-2" }), h("line", { key: 3, x1: 8, y1: 12, x2: 16, y2: 12 })] }),
  compass: (p) => h(Icon, { ...p, path: [h("circle", { key: 1, cx: 12, cy: 12, r: 10 }), h("polygon", { key: 2, points: "16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" })] }),
  arrowRight: (p) => h(Icon, { ...p, path: [h("line", { key: 1, x1: 5, y1: 12, x2: 19, y2: 12 }), h("polyline", { key: 2, points: "12 5 19 12 12 19" })] }),
  arrowUpRight: (p) => h(Icon, { ...p, path: [h("line", { key: 1, x1: 7, y1: 17, x2: 17, y2: 7 }), h("polyline", { key: 2, points: "7 7 17 7 17 17" })] }),
  check: (p) => h(Icon, { ...p, path: h("polyline", { points: "20 6 9 17 4 12" }) }),
  checkCircle: (p) => h(Icon, { ...p, path: [h("path", { key: 1, d: "M22 11.08V12a10 10 0 1 1-5.93-9.14" }), h("polyline", { key: 2, points: "22 4 12 14.01 9 11.01" })] }),
  x: (p) => h(Icon, { ...p, path: [h("line", { key: 1, x1: 18, y1: 6, x2: 6, y2: 18 }), h("line", { key: 2, x1: 6, y1: 6, x2: 18, y2: 18 })] }),
  upload: (p) => h(Icon, { ...p, path: [h("path", { key: 1, d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }), h("polyline", { key: 2, points: "17 8 12 3 7 8" }), h("line", { key: 3, x1: 12, y1: 3, x2: 12, y2: 15 })] }),
  download: (p) => h(Icon, { ...p, path: [h("path", { key: 1, d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }), h("polyline", { key: 2, points: "7 10 12 15 17 10" }), h("line", { key: 3, x1: 12, y1: 15, x2: 12, y2: 3 })] }),
  send: (p) => h(Icon, { ...p, path: [h("line", { key: 1, x1: 22, y1: 2, x2: 11, y2: 13 }), h("polygon", { key: 2, points: "22 2 15 22 11 13 2 9 22 2" })] }),
  sparkles: (p) => h(Icon, { ...p, path: [h("path", { key: 1, d: "M9.9 2.1 8.3 5.7 4.7 7.3l3.6 1.6L9.9 12.5l1.6-3.6L15.1 7.3l-3.6-1.6z" }), h("path", { key: 2, d: "M18 13l-.9 2.1-2.1.9 2.1.9.9 2.1.9-2.1 2.1-.9-2.1-.9z" })] }),
  shoppingBag: (p) => h(Icon, { ...p, path: [h("path", { key: 1, d: "M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" }), h("line", { key: 2, x1: 3, y1: 6, x2: 21, y2: 6 }), h("path", { key: 3, d: "M16 10a4 4 0 0 1-8 0" })] }),
  package: (p) => h(Icon, { ...p, path: [h("path", { key: 1, d: "m7.5 4.27 9 5.15" }), h("path", { key: 2, d: "M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" }), h("polyline", { key: 3, points: "3.29 7 12 12 20.71 7" }), h("line", { key: 4, x1: 12, y1: 22, x2: 12, y2: 12 })] }),
  image: (p) => h(Icon, { ...p, path: [h("rect", { key: 1, x: 3, y: 3, width: 18, height: 18, rx: 2, ry: 2 }), h("circle", { key: 2, cx: 8.5, cy: 8.5, r: 1.5 }), h("polyline", { key: 3, points: "21 15 16 10 5 21" })] }),
  settings: (p) => h(Icon, { ...p, path: [h("circle", { key: 1, cx: 12, cy: 12, r: 3 }), h("path", { key: 2, d: "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" })] }),
  plus: (p) => h(Icon, { ...p, path: [h("line", { key: 1, x1: 12, y1: 5, x2: 12, y2: 19 }), h("line", { key: 2, x1: 5, y1: 12, x2: 19, y2: 12 })] }),
  search: (p) => h(Icon, { ...p, path: [h("circle", { key: 1, cx: 11, cy: 11, r: 8 }), h("line", { key: 2, x1: 21, y1: 21, x2: 16.65, y2: 16.65 })] }),
  filter: (p) => h(Icon, { ...p, path: h("polygon", { points: "22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" }) }),
  moreH: (p) => h(Icon, { ...p, path: [h("circle", { key: 1, cx: 12, cy: 12, r: 1 }), h("circle", { key: 2, cx: 19, cy: 12, r: 1 }), h("circle", { key: 3, cx: 5, cy: 12, r: 1 })] }),
  moreV: (p) => h(Icon, { ...p, path: [h("circle", { key: 1, cx: 12, cy: 12, r: 1 }), h("circle", { key: 2, cx: 12, cy: 5, r: 1 }), h("circle", { key: 3, cx: 12, cy: 19, r: 1 })] }),
  chevronRight: (p) => h(Icon, { ...p, path: h("polyline", { points: "9 18 15 12 9 6" }) }),
  chevronDown: (p) => h(Icon, { ...p, path: h("polyline", { points: "6 9 12 15 18 9" }) }),
  chevronLeft: (p) => h(Icon, { ...p, path: h("polyline", { points: "15 18 9 12 15 6" }) }),
  user: (p) => h(Icon, { ...p, path: [h("path", { key: 1, d: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" }), h("circle", { key: 2, cx: 12, cy: 7, r: 4 })] }),
  logout: (p) => h(Icon, { ...p, path: [h("path", { key: 1, d: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" }), h("polyline", { key: 2, points: "16 17 21 12 16 7" }), h("line", { key: 3, x1: 21, y1: 12, x2: 9, y2: 12 })] }),
  sun: (p) => h(Icon, { ...p, path: [h("circle", { key: 1, cx: 12, cy: 12, r: 4 }), h("path", { key: 2, d: "M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" })] }),
  moon: (p) => h(Icon, { ...p, path: h("path", { d: "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" }) }),
  msg: (p) => h(Icon, { ...p, path: h("path", { d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" }) }),
  zap: (p) => h(Icon, { ...p, path: h("polygon", { points: "13 2 3 14 12 14 11 22 21 10 12 10 13 2" }) }),
  tag: (p) => h(Icon, { ...p, path: [h("path", { key: 1, d: "M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" }), h("line", { key: 2, x1: 7, y1: 7, x2: 7.01, y2: 7 })] }),
  key: (p) => h(Icon, { ...p, path: [h("path", { key: 1, d: "M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" })] }),
  users: (p) => h(Icon, { ...p, path: [h("path", { key: 1, d: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" }), h("circle", { key: 2, cx: 9, cy: 7, r: 4 }), h("path", { key: 3, d: "M23 21v-2a4 4 0 0 0-3-3.87" }), h("path", { key: 4, d: "M16 3.13a4 4 0 0 1 0 7.75" })] }),
  trash: (p) => h(Icon, { ...p, path: [h("polyline", { key: 1, points: "3 6 5 6 21 6" }), h("path", { key: 2, d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" })] }),
  copy: (p) => h(Icon, { ...p, path: [h("rect", { key: 1, x: 9, y: 9, width: 13, height: 13, rx: 2 }), h("path", { key: 2, d: "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" })] }),
  edit: (p) => h(Icon, { ...p, path: [h("path", { key: 1, d: "M12 20h9" }), h("path", { key: 2, d: "M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" })] }),
  play: (p) => h(Icon, { ...p, path: h("polygon", { points: "5 3 19 12 5 21 5 3" }) }),
  pause: (p) => h(Icon, { ...p, path: [h("rect", { key: 1, x: 6, y: 4, width: 4, height: 16 }), h("rect", { key: 2, x: 14, y: 4, width: 4, height: 16 })] }),
  refresh: (p) => h(Icon, { ...p, path: [h("polyline", { key: 1, points: "23 4 23 10 17 10" }), h("polyline", { key: 2, points: "1 20 1 14 7 14" }), h("path", { key: 3, d: "M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" })] }),
  loader: (p) => h(Icon, { ...p, path: [h("line", { key: 1, x1: 12, y1: 2, x2: 12, y2: 6 }), h("line", { key: 2, x1: 12, y1: 18, x2: 12, y2: 22 }), h("line", { key: 3, x1: 4.93, y1: 4.93, x2: 7.76, y2: 7.76 }), h("line", { key: 4, x1: 16.24, y1: 16.24, x2: 19.07, y2: 19.07 }), h("line", { key: 5, x1: 2, y1: 12, x2: 6, y2: 12 }), h("line", { key: 6, x1: 18, y1: 12, x2: 22, y2: 12 })] }),
  alert: (p) => h(Icon, { ...p, path: [h("circle", { key: 1, cx: 12, cy: 12, r: 10 }), h("line", { key: 2, x1: 12, y1: 8, x2: 12, y2: 12 }), h("line", { key: 3, x1: 12, y1: 16, x2: 12.01, y2: 16 })] }),
  eye: (p) => h(Icon, { ...p, path: [h("path", { key: 1, d: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" }), h("circle", { key: 2, cx: 12, cy: 12, r: 3 })] }),
  grid: (p) => h(Icon, { ...p, path: [h("rect", { key: 1, x: 3, y: 3, width: 7, height: 7 }), h("rect", { key: 2, x: 14, y: 3, width: 7, height: 7 }), h("rect", { key: 3, x: 14, y: 14, width: 7, height: 7 }), h("rect", { key: 4, x: 3, y: 14, width: 7, height: 7 })] }),
  list: (p) => h(Icon, { ...p, path: [h("line", { key: 1, x1: 8, y1: 6, x2: 21, y2: 6 }), h("line", { key: 2, x1: 8, y1: 12, x2: 21, y2: 12 }), h("line", { key: 3, x1: 8, y1: 18, x2: 21, y2: 18 }), h("line", { key: 4, x1: 3, y1: 6, x2: 3.01, y2: 6 }), h("line", { key: 5, x1: 3, y1: 12, x2: 3.01, y2: 12 }), h("line", { key: 6, x1: 3, y1: 18, x2: 3.01, y2: 18 })] }),
  pin: (p) => h(Icon, { ...p, path: [h("line", { key: 1, x1: 12, y1: 17, x2: 12, y2: 22 }), h("path", { key: 2, d: "M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24z" })] }),
  trending: (p) => h(Icon, { ...p, path: [h("polyline", { key: 1, points: "23 6 13.5 15.5 8.5 10.5 1 18" }), h("polyline", { key: 2, points: "17 6 23 6 23 12" })] }),
  play2: (p) => h(Icon, { ...p, path: h("polygon", { points: "5 3 19 12 5 21 5 3" }) }),
};

Object.assign(window, { Icon, I });
