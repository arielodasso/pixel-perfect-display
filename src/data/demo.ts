import type {
  Lead,
  Organization,
  Project,
  Typology,
  Unit,
  UnitStatus,
  VirtualTourConfig,
  VirtualTourFloorConfig,
} from "@/types/domain";

import heroImage from "@/assets/torre-horizonte-hero.jpg";
import galleryLiving from "@/assets/gallery-living.jpg";
import galleryAmenities from "@/assets/gallery-amenities.jpg";
import floorplan from "@/assets/floorplan-2amb.jpg";

export const projectImages = {
  hero: heroImage,
  living: galleryLiving,
  amenities: galleryAmenities,
  floorplan,
};

export const organization: Organization = {
  id: "org_horizonte",
  name: "Desarrolladora Horizonte",
  slug: "horizonte",
  email: "ventas@horizonte.com.ar",
  phone: "+54 249 444 1234",
  whatsapp: "5492494441234",
  brandColor: "#E2FC03",
};

export const typologies: Typology[] = [
  { id: "mono", name: "Monoambiente", rooms: 1, areaFrom: 30, areaTo: 34 },
  { id: "uno", name: "1 ambiente", rooms: 1, areaFrom: 40, areaTo: 44 },
  { id: "dos", name: "2 ambientes", rooms: 2, areaFrom: 55, areaTo: 62 },
  { id: "tres", name: "3 ambientes", rooms: 3, areaFrom: 74, areaTo: 82 },
];

export const project: Project = {
  id: "prj_torre_horizonte",
  orgId: organization.id,
  slug: "torre-horizonte",
  name: "Torre Horizonte",
  tagline: "Un nuevo proyecto para vivir en Tandil.",
  description:
    "Torre Horizonte es un edificio de 8 niveles emplazado a cinco cuadras del centro de Tandil, con vistas abiertas a las sierras. Materiales nobles, unidades luminosas y espacios comunes pensados para el uso diario: trabajo, descanso y encuentro.",
  city: "Tandil",
  province: "Buenos Aires",
  address: "Av. Avellaneda 1240, Tandil",
  coordinates: { lat: -37.3217, lng: -59.1332 },
  location: {
    address: "Av. Avellaneda 1240, Tandil",
    latitude: -37.3217,
    longitude: -59.1332,
    googleMapsUrl: "https://www.google.com/maps?q=-37.3217,-59.1332&hl=es",
  },
  type: "Edificio residencial",
  status: "En preventa",
  developer: organization.name,
  deliveryDate: "2028",
  priceFrom: 62000,
  currency: "USD",
  financing: {
    advance: "30% de anticipo",
    installments: "24 cuotas en pesos ajustables",
    balance: "Saldo contra posesión",
  },
  paymentMethods: ["Transferencia", "Financiación directa", "Permuta parcial"],
  amenities: [
    "Rooftop con pileta",
    "Coworking",
    "Gimnasio",
    "SUM",
    "Bicicletero",
    "Cocheras cubiertas",
    "Seguridad 24 h",
    "Parrillas",
  ],
  features: [
    "Estructura de hormigón visto",
    "Aberturas de aluminio con DVH",
    "Pisos de porcelanato rectificado",
    "Aire acondicionado preinstalado",
    "Ascensores de última generación",
    "Grupo electrógeno",
  ],
  heroImage,
  gallery: [
    { id: "g1", url: heroImage, caption: "Fachada sobre Av. Avellaneda", category: "Renders" },
    {
      id: "g2",
      url: galleryLiving,
      caption: "Living tipo — unidad 2 ambientes",
      category: "Renders",
    },
    {
      id: "g3",
      url: galleryAmenities,
      caption: "Rooftop con pileta y parrillas",
      category: "Amenities",
    },
    {
      id: "g4",
      url: galleryAmenities,
      caption: "Sector coworking de uso común",
      category: "Amenities",
    },
    {
      id: "g5",
      url: heroImage,
      caption: "Vista desde la vereda — Av. Avellaneda",
      category: "Obra",
    },
    {
      id: "g6",
      url: floorplan,
      caption: "Plano tipo de 2 ambientes — planta baja",
      category: "Obra",
    },
  ],
  virtualTourUrl: null,
  floors: 8,
  unitsPerFloor: 3,
  milestones: [
    {
      id: "m1",
      name: "Inicio de obra",
      status: "completado",
      date: "Mar 2026",
      progress: 100,
      description: "Movimiento de suelo, replanteo y cierre del perímetro de la obra.",
      images: [heroImage],
    },
    {
      id: "m2",
      name: "Fundaciones",
      status: "completado",
      date: "Jul 2026",
      progress: 100,
      description: "Plateas y núcleos de ascensor terminados en los tres módulos.",
      images: [heroImage, galleryAmenities],
    },
    {
      id: "m3",
      name: "Estructura",
      status: "en progreso",
      date: "En curso",
      progress: 68,
      description:
        "Hormigón armado avanzando por encima del nivel 5. Losa y columnas al día con el cronograma.",
      images: [galleryAmenities],
    },
    {
      id: "m4",
      name: "Cerramientos",
      status: "proximamente",
      date: "2027",
      progress: 0,
      description: "Mampostería exterior, aberturas de aluminio con DVH y paneles.",
    },
    {
      id: "m5",
      name: "Instalaciones",
      status: "proximamente",
      date: "2027",
      progress: 0,
      description: "Cloacas, electricidad, gas, agua y redes de datos por unidad.",
    },
    {
      id: "m6",
      name: "Terminaciones",
      status: "proximamente",
      date: "2028",
      progress: 0,
      description: "Pisos, revoques, pintura, carpintería y herrería interior.",
    },
    {
      id: "m7",
      name: "Amenities",
      status: "proximamente",
      date: "2028",
      progress: 0,
      description: "Rooftop con pileta, coworking, gimnasio y parrillas.",
    },
    {
      id: "m8",
      name: "Entrega",
      status: "proximamente",
      date: "2028",
      progress: 0,
      description: "Habilitaciones, recepción de unidad y entrega contra posesión.",
    },
  ],
  construction: {
    progress: 68,
    status: "En obra",
    updatedAt: "2026-09-12T10:00:00.000Z",
    estimatedCompletion: "Q1 2028",
    gallery: [
      {
        id: "ob1",
        url: galleryAmenities,
        caption: "Estructura — nivel 5 · septiembre 2026",
      },
      {
        id: "ob2",
        url: heroImage,
        caption: "Fachada y perímetro de obra",
      },
      {
        id: "ob3",
        url: floorplan,
        caption: "Detalle de tabiquería en unidades de 2 ambientes",
      },
    ],
  },
  pois: [
    { id: "p1", name: "Torre Horizonte", category: "Interés", distance: "—", x: 50, y: 50 },
    {
      id: "p2",
      name: "Parada Av. Avellaneda",
      category: "Transporte",
      distance: "120 m",
      x: 38,
      y: 40,
    },
    {
      id: "p3",
      name: "Terminal de ómnibus",
      category: "Transporte",
      distance: "1,4 km",
      x: 20,
      y: 72,
    },
    { id: "p4", name: "Supermercado", category: "Comercios", distance: "300 m", x: 64, y: 36 },
    { id: "p5", name: "Paseo del Centro", category: "Comercios", distance: "800 m", x: 72, y: 62 },
    { id: "p6", name: "Colegio San José", category: "Colegios", distance: "550 m", x: 34, y: 66 },
    { id: "p7", name: "UNICEN", category: "Colegios", distance: "2,1 km", x: 78, y: 22 },
    {
      id: "p8",
      name: "Parque Independencia",
      category: "Interés",
      distance: "1,1 km",
      x: 26,
      y: 24,
    },
  ],
  visits: 3184,
  leads: 46,
};

const orientations = ["Frente / Norte", "Contrafrente / Sur", "Lateral / Este"];
const typologyPlan: Record<number, string[]> = {
  1: ["dos", "mono", "uno"],
  2: ["dos", "uno", "tres"],
  3: ["dos", "mono", "tres"],
  4: ["dos", "uno", "tres"],
  5: ["dos", "mono", "tres"],
  6: ["dos", "uno", "tres"],
  7: ["tres", "dos", "uno"],
  8: ["tres", "dos", "dos"],
};

const statusPlan: Record<string, UnitStatus> = {
  "101": "vendida",
  "102": "vendida",
  "103": "reservada",
  "202": "reservada",
  "301": "vendida",
  "303": "reservada",
  "402": "vendida",
  "501": "reservada",
  "702": "reservada",
  "801": "vendida",
  "802": "vendida",
};

const viewsPlan: Record<string, number> = {
  "603": 142,
  "302": 98,
  "701": 76,
  "601": 71,
  "502": 64,
  "403": 58,
};

function areaFor(typologyId: string, index: number) {
  const t = typologies.find((item) => item.id === typologyId)!;
  const span = t.areaTo - t.areaFrom;
  return t.areaFrom + ((index * 2) % (span + 1));
}

function priceFor(area: number, floor: number, status: UnitStatus) {
  const base = 1480 + floor * 26 + (status === "vendida" ? 0 : 12);
  return Math.round((area * base) / 500) * 500;
}

export const units: Unit[] = Object.entries(typologyPlan).flatMap(([floorKey, plan]) => {
  const floor = Number(floorKey);
  return plan.map((typologyId, index) => {
    const number = `${floor}0${index + 1}`;
    const typology = typologies.find((t) => t.id === typologyId)!;
    const area = areaFor(typologyId, floor + index);
    const status = statusPlan[number] ?? "disponible";
    return {
      id: `unit_${number}`,
      projectId: project.id,
      code: `TH-${number}`,
      floor,
      number,
      typologyId,
      typology: typology.name,
      area,
      rooms: typology.rooms,
      orientation: orientations[index % orientations.length] ?? "Frente / Norte",
      price: priceFor(area, floor, status),
      currency: "USD" as const,
      status,
      views: viewsPlan[number] ?? 18 + ((floor * 7 + index * 11) % 34),
      floorplan,
      balcony: index !== 1,
      parking: typology.rooms >= 2,
    };
  });
});

/** Posiciones automáticas de unidades dentro del plano de una planta (en %). */
function tourUnitPositions(count: number, index: number, level: number) {
  let x = 50;
  let y = 50;
  if (count === 1) {
    x = 50;
    y = 50;
  } else if (count === 2) {
    x = index === 0 ? 38 : 62;
    y = 50;
  } else {
    const dx = ((level * 13) % 11) - 5;
    const ys = [25, 50, 75];
    y = ys[index] ?? 50;
    x = 50 + (index % 2 === 0 ? dx : -dx) * 0.4;
  }
  return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
}

function floorHotspots(level: number): VirtualTourFloorConfig["hotspots"] {
  if (level === 0) {
    return [
      { id: "hs_pb_acceso", label: "Acceso principal", x: 50, y: 50 },
      { id: "hs_pb_lobby", label: "Lobby y conserjería", x: 50, y: 74 },
    ];
  }
  if (level === 9) {
    return [
      { id: "hs_te_pileta", label: "Pileta", x: 32, y: 28 },
      { id: "hs_te_sum", label: "Parrillas y SUM", x: 68, y: 32 },
      { id: "hs_te_coworking", label: "Coworking", x: 32, y: 70 },
      { id: "hs_te_gym", label: "Gimnasio", x: 68, y: 70 },
    ];
  }
  return [{ id: `hs_core_${level}`, label: "Núcleo de ascensores", x: 90, y: 50 }];
}

function buildTourFloor(level: number, name: string): VirtualTourFloorConfig {
  const floorUnits = units.filter((u) => u.floor === level);
  return {
    id: `tf_${level === 0 ? "pb" : level === 9 ? "terraza" : `piso${level}`}`,
    name,
    level,
    unitPlacements: floorUnits.map((unit, index) => {
      const position = tourUnitPositions(floorUnits.length, index, level);
      return { unitId: unit.id, x: position.x, y: position.y };
    }),
    hotspots: floorHotspots(level),
  };
}

export const virtualTourConfig: VirtualTourConfig = {
  enabled: true,
  published: true,
  title: "Tour virtual de Torre Horizonte",
  description:
    "Recorré las plantas del edificio, explorá las unidades disponibles y conocé los espacios comunes como si ya estuviera terminado.",
  floors: [
    buildTourFloor(0, "PB"),
    ...Array.from({ length: 8 }, (_, index) => buildTourFloor(index + 1, `Piso ${index + 1}`)),
    buildTourFloor(9, "Terraza"),
  ],
};

// El tour necesita el dataset de unidades ya inicializado, así que se asigna
// después de construirlo (mismo valor que ya referencia el store).
project.virtualTour = virtualTourConfig;

export const leads: Lead[] = [
  {
    id: "lead_1",
    projectId: project.id,
    projectName: project.name,
    name: "Martina Rossi",
    email: "martina.rossi@gmail.com",
    phone: "+54 249 415 8890",
    unitCode: "TH-603",
    message: "Me interesa la unidad de 2 ambientes al frente. ¿Cómo es la financiación?",
    newsletter: true,
    status: "Nuevo",
    createdAt: "2026-09-15T14:20:00.000Z",
    source: "Showroom",
    activity: [
      { id: "a1", label: "Formulario enviado desde el showroom", date: "2026-09-15T14:20:00.000Z" },
      { id: "a2", label: "Vio el plano de la unidad 603", date: "2026-09-15T14:14:00.000Z" },
    ],
  },
  {
    id: "lead_2",
    projectId: project.id,
    projectName: project.name,
    name: "Julián Ferreyra",
    email: "jferreyra@outlook.com",
    phone: "+54 249 460 2211",
    unitCode: "TH-302",
    message: "Quiero saber si aceptan permuta por un lote en Sierra del Tigre.",
    newsletter: false,
    status: "Contactado",
    createdAt: "2026-09-14T11:05:00.000Z",
    source: "Showroom",
    activity: [
      { id: "a1", label: "Llamado realizado por Sofía", date: "2026-09-14T16:40:00.000Z" },
      { id: "a2", label: "Formulario enviado desde el showroom", date: "2026-09-14T11:05:00.000Z" },
    ],
  },
  {
    id: "lead_3",
    projectId: project.id,
    projectName: project.name,
    name: "Carla Méndez",
    email: "carla.mendez@estudiomz.com",
    phone: "+54 11 6423 7788",
    unitCode: "TH-801",
    message: "Busco inversión. ¿Tienen proyección de renta?",
    newsletter: true,
    status: "Calificado",
    createdAt: "2026-09-12T09:32:00.000Z",
    source: "Showroom",
    activity: [
      { id: "a1", label: "Propuesta comercial enviada", date: "2026-09-13T10:00:00.000Z" },
      { id: "a2", label: "Formulario enviado desde el showroom", date: "2026-09-12T09:32:00.000Z" },
    ],
  },
  {
    id: "lead_4",
    projectId: project.id,
    projectName: project.name,
    name: "Diego Arana",
    email: "diego.arana@gmail.com",
    phone: "+54 249 431 9002",
    unitCode: "TH-201",
    message: "¿Se puede visitar la obra un sábado?",
    newsletter: false,
    status: "Visita",
    createdAt: "2026-09-10T18:44:00.000Z",
    source: "Showroom",
    activity: [
      { id: "a1", label: "Visita agendada para el 20/09", date: "2026-09-11T12:00:00.000Z" },
      { id: "a2", label: "Formulario enviado desde el showroom", date: "2026-09-10T18:44:00.000Z" },
    ],
  },
  {
    id: "lead_5",
    projectId: project.id,
    projectName: project.name,
    name: "Familia Pérez Lardo",
    email: "perezlardo@hotmail.com",
    phone: "+54 249 405 1177",
    unitCode: "TH-703",
    message: "Nos interesa un 3 ambientes con cochera.",
    newsletter: true,
    status: "Reserva",
    createdAt: "2026-09-05T15:12:00.000Z",
    source: "Showroom",
    activity: [
      { id: "a1", label: "Reserva firmada", date: "2026-09-09T17:30:00.000Z" },
      { id: "a2", label: "Formulario enviado desde el showroom", date: "2026-09-05T15:12:00.000Z" },
    ],
  },
  {
    id: "lead_6",
    projectId: project.id,
    projectName: project.name,
    name: "Lucía Bravo",
    email: "lu.bravo@gmail.com",
    phone: "+54 249 478 3321",
    unitCode: null,
    message: "Quiero recibir la lista de precios completa.",
    newsletter: true,
    status: "Nuevo",
    createdAt: "2026-09-16T08:03:00.000Z",
    source: "Showroom",
    activity: [
      { id: "a1", label: "Formulario enviado desde el showroom", date: "2026-09-16T08:03:00.000Z" },
    ],
  },
  {
    id: "lead_7",
    projectId: project.id,
    projectName: project.name,
    name: "Ramiro Sosa",
    email: "ramiro@sosaprop.com",
    phone: "+54 249 412 6655",
    unitCode: "TH-402",
    message: "Trabajo con inversores de La Plata, quiero condiciones para 3 unidades.",
    newsletter: false,
    status: "Cerrado",
    createdAt: "2026-08-28T13:20:00.000Z",
    source: "Showroom",
    activity: [
      { id: "a1", label: "Operación cerrada — unidad 402", date: "2026-09-02T11:00:00.000Z" },
      { id: "a2", label: "Formulario enviado desde el showroom", date: "2026-08-28T13:20:00.000Z" },
    ],
  },
];

export const recentActivity = [
  {
    id: "act1",
    label: "Nuevo lead interesado en la Unidad 603",
    time: "Hace 12 min",
    kind: "lead" as const,
  },
  {
    id: "act2",
    label: "Unidad 201 marcada como reservada",
    time: "Hace 2 h",
    kind: "unit" as const,
  },
  { id: "act3", label: "Nuevo visitante en el showroom", time: "Hace 3 h", kind: "visit" as const },
  {
    id: "act4",
    label: "Lead solicitó información de financiación",
    time: "Hace 5 h",
    kind: "lead" as const,
  },
  { id: "act5", label: "Unidad 302 fue la más vista del día", time: "Ayer", kind: "unit" as const },
];

function seededVisits(dayIndex: number) {
  const wave = Math.sin(dayIndex / 3.1) * 22 + Math.sin(dayIndex / 1.4) * 9;
  return Math.max(24, Math.round(78 + wave + dayIndex * 1.6));
}

export const visitsSeries = Array.from({ length: 30 }).map((_, index) => {
  const date = new Date("2026-09-16T00:00:00.000Z");
  date.setUTCDate(date.getUTCDate() - (29 - index));
  const visits = seededVisits(index);
  return {
    date: date.toISOString().slice(0, 10),
    label: new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit" }).format(date),
    visits,
    leads: Math.max(0, Math.round(visits / 22 + (index % 4 === 0 ? 2 : 0)) - 1),
  };
});

export const analyticsSummary = {
  visitors: 2148,
  sessions: 3184,
  avgTime: "4 m 12 s",
  leads: 46,
  conversion: 2.1,
  reservations: 6,
};

export const funnel = [
  { id: "f1", label: "Visitantes", value: 2148 },
  { id: "f2", label: "Exploraron unidades", value: 1246 },
  { id: "f3", label: "Consultaron", value: 312 },
  { id: "f4", label: "Leads", value: 46 },
  { id: "f5", label: "Reservas", value: 6 },
];

export const typologyInterest = [
  { typology: "2 ambientes", views: 1284 },
  { typology: "3 ambientes", views: 742 },
  { typology: "1 ambiente", views: 486 },
  { typology: "Monoambiente", views: 268 },
];

export const aiInsights = [
  "Las unidades de 2 ambientes concentran el mayor interés.",
  "La Unidad 603 recibió un 34% más de visualizaciones que el promedio.",
  "Los visitantes consultan financiación antes de enviar sus datos.",
  "Los picos de visitas se dan entre las 20 y las 23 h.",
];
