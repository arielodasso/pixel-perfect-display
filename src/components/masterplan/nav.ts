import {
  Boxes,
  Building2,
  Home,
  Images,
  Layers,
  LayoutGrid,
  MessageCircle,
  Rotate3d,
  type LucideIcon,
} from "lucide-react";

export type ViewId =
  | "portada"
  | "proyecto"
  | "masterplan"
  | "plantas"
  | "unidades"
  | "recorrido"
  | "galeria"
  | "contacto";

export interface ViewDef {
  id: ViewId;
  label: string;
  hint: string;
  icon: LucideIcon;
}

export const VIEWS: ViewDef[] = [
  { id: "portada", label: "Portada", hint: "Presentación del proyecto", icon: Home },
  { id: "proyecto", label: "Proyecto", hint: "Arquitectura y amenities", icon: Building2 },
  { id: "masterplan", label: "Masterplan", hint: "Edificio 3D interactivo", icon: Boxes },
  { id: "plantas", label: "Plantas", hint: "Plano por piso", icon: Layers },
  { id: "unidades", label: "Unidades", hint: "Disponibilidad y precios", icon: LayoutGrid },
  { id: "recorrido", label: "Recorrido 360°", hint: "Tour inmersivo", icon: Rotate3d },
  { id: "galeria", label: "Galería", hint: "Renders del proyecto", icon: Images },
  { id: "contacto", label: "Contacto", hint: "Hablar con ventas", icon: MessageCircle },
];
