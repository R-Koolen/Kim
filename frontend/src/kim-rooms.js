/* ============================================================================
 * kim-rooms.js — floor-plan geometry (static, not game state)
 * Coordinate space matches the SVG viewBox: 1080 x 560.
 * It's a friendly stylised version of the real "2de verdieping" plan.
 * ========================================================================== */

export const KIM_VB = { w: 1080, h: 560 };

// Each housemate has a bedroom — makes the map personal.
export const KIM_ROOMS = [
  // top band
  { id: "slk5", kind: "bed", code: "4.2.10.5", name: "Paul",  area: "15,1 m²", x: 32,  y: 32,  w: 232, h: 224 },
  { id: "bad",  kind: "bath", code: "", name: "Badkamer", area: "3,4 m²", x: 276, y: 32,  w: 120, h: 106 },
  { id: "tech", kind: "util", code: "", name: "Techniek",  area: "",       x: 276, y: 150, w: 120, h: 106 },
  { id: "sch1", kind: "shaft", code: "", name: "",          area: "",       x: 408, y: 32,  w: 60,  h: 106 },
  { id: "sch2", kind: "shaft", code: "", name: "",          area: "",       x: 480, y: 32,  w: 60,  h: 106 },
  { id: "berg", kind: "storage", code: "", name: "Berging", area: "1,3 m²", x: 552, y: 32,  w: 74,  h: 106 },
  { id: "wc",   kind: "wc",   code: "", name: "Wc",         area: "1,3 m²", x: 552, y: 150, w: 74,  h: 106 },
  { id: "entree", kind: "hall", code: "", name: "Entree",   area: "12,4 m²",x: 408, y: 150, w: 132, h: 106 },
  { id: "woon", kind: "living", code: "", name: "Woonkamer",area: "20,0 m²",x: 638, y: 32,  w: 378, h: 224 },
  { id: "balk", kind: "balcony", code: "", name: "Balkon",  area: "5,3 m²", x: 1016,y: 70,  w: 56,  h: 150 },
  // corridor
  { id: "gang", kind: "hall", code: "", name: "",           area: "",       x: 32,  y: 268, w: 984, h: 36 },
  // bottom band — bedrooms
  { id: "slk4", kind: "bed", code: "4.2.10.4", name: "Koen",  area: "13,9 m²", x: 32,  y: 316, w: 232, h: 226 },
  { id: "slk3", kind: "bed", code: "4.2.10.3", name: "Robin", area: "14,0 m²", x: 276, y: 316, w: 232, h: 226 },
  { id: "slk2", kind: "bed", code: "4.2.10.2", name: "Alex",  area: "14,1 m²", x: 520, y: 316, w: 232, h: 226 },
  { id: "slk1", kind: "bed", code: "4.2.10.1", name: "Ole",   area: "13,8 m²", x: 764, y: 316, w: 252, h: 226 },
];
