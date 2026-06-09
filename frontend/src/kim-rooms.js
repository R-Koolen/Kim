/* ============================================================================
 * kim-rooms.js — floor-plan geometry (static, not game state)
 * Coordinate space matches the SVG viewBox: 1080 x 560.
 * Mirrors the real "2de verdieping" plan (IMG-20221217-WA0001):
 *   top-left bedroom = Alex; bottom row L→R = Paul, Robin, Ole, Koen;
 *   bathroom beside Alex, wc across from Ole, living room top-right.
 *
 * `furniture` is an optional per-room array of pieces in ROOM-RELATIVE coords
 * ({ t, x, y, w, h }, x/y measured from the room's top-left corner). It mirrors
 * each room's real layout. Pieces are drawn line-only (no color) in kim-map.jsx;
 * each type carries a small distinguishing detail. Types:
 *   bed · cabinet · desk · sofa · counter
 * ========================================================================== */

export const KIM_VB = { w: 1080, h: 560 };

// Each housemate has a bedroom — makes the map personal.
export const KIM_ROOMS = [
  // top band
  { id: "slk5", kind: "bed", code: "4.2.10.5", name: "Alex", area: "15,1 m²", x: 32, y: 32, w: 232, h: 224,
    furniture: [
      { t: "desk",    x: 14,  y: 14,  w: 70, h: 24 },
      { t: "bed",     x: 120, y: 18,  w: 96, h: 60 },
      { t: "cabinet", x: 14,  y: 110, w: 40, h: 78 },
    ] },
  { id: "bad",  kind: "bath", code: "", name: "Badkamer", area: "3,4 m²", x: 276, y: 32,  w: 120, h: 106 },
  { id: "tech", kind: "util", code: "", name: "Techniek",  area: "",       x: 276, y: 150, w: 120, h: 106 },
  { id: "sch1", kind: "shaft", code: "", name: "",          area: "",       x: 408, y: 32,  w: 60,  h: 106 },
  { id: "sch2", kind: "shaft", code: "", name: "",          area: "",       x: 480, y: 32,  w: 60,  h: 106 },
  { id: "berg", kind: "storage", code: "", name: "Berging", area: "1,3 m²", x: 552, y: 32,  w: 74,  h: 106 },
  { id: "wc",   kind: "wc",   code: "", name: "Wc",         area: "1,3 m²", x: 552, y: 150, w: 74,  h: 106 },
  { id: "entree", kind: "hall", code: "", name: "Entree",   area: "12,4 m²",x: 408, y: 150, w: 132, h: 106 },
  { id: "woon", kind: "living", code: "", name: "Woonkamer",area: "20,0 m²",x: 638, y: 32,  w: 378, h: 224,
    furniture: [
      { t: "counter", x: 14,  y: 12,  w: 350, h: 36 },
      { t: "cabinet", x: 16,  y: 108, w: 40,  h: 78 },
      { t: "desk",    x: 196, y: 120, w: 76,  h: 44 },
      { t: "sofa",    x: 22,  y: 158, w: 130, h: 48 },
    ] },
  { id: "balk", kind: "balcony", code: "", name: "Balkon",  area: "5,3 m²", x: 1016,y: 70,  w: 56,  h: 150 },
  // corridor
  { id: "gang", kind: "hall", code: "", name: "",           area: "",       x: 32,  y: 268, w: 984, h: 36 },
  // bottom band — bedrooms, left → right: Paul, Robin, Ole, Koen
  { id: "slk4", kind: "bed", code: "4.2.10.4", name: "Paul",  area: "13,9 m²", x: 32,  y: 316, w: 232, h: 226,
    furniture: [
      { t: "cabinet", x: 14,  y: 14,  w: 70, h: 28 },
      { t: "bed",     x: 68,  y: 86,  w: 96, h: 60 },
      { t: "cabinet", x: 14,  y: 184, w: 70, h: 28 },
    ] },
  { id: "slk3", kind: "bed", code: "4.2.10.3", name: "Robin", area: "14,0 m²", x: 276, y: 316, w: 232, h: 226,
    furniture: [
      { t: "cabinet", x: 14,  y: 14,  w: 60, h: 26 },
      { t: "bed",     x: 68,  y: 86,  w: 96, h: 60 },
      { t: "cabinet", x: 14,  y: 184, w: 70, h: 28 },
    ] },
  { id: "slk2", kind: "bed", code: "4.2.10.2", name: "Ole",   area: "14,1 m²", x: 520, y: 316, w: 232, h: 226,
    furniture: [
      { t: "cabinet", x: 14,  y: 14,  w: 60, h: 26 },
      { t: "bed",     x: 68,  y: 92,  w: 96, h: 60 },
    ] },
  { id: "slk1", kind: "bed", code: "4.2.10.1", name: "Koen",  area: "13,8 m²", x: 764, y: 316, w: 252, h: 226,
    furniture: [
      { t: "cabinet", x: 14,  y: 14,  w: 70, h: 28 },
      { t: "bed",     x: 78,  y: 86,  w: 96, h: 60 },
      { t: "cabinet", x: 208, y: 150, w: 34, h: 62 },
    ] },
];
