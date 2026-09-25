import type { VirtualTourSceneKind } from "./types";

export interface Palette {
  wall: string;
  accent: string;
  ceiling: string;
  floor: string;
  floorLine: string;
  trim: string;
  warm: string;
}

export const PALETTES: Record<VirtualTourSceneKind, Palette> = {
  living: {
    wall: "#3b4152",
    accent: "#b0524a",
    ceiling: "#252a36",
    floor: "#6b4a32",
    floorLine: "#4d3626",
    trim: "#8f97a8",
    warm: "#e8c66e",
  },
  kitchen: {
    wall: "#39444a",
    accent: "#2c3b40",
    ceiling: "#222b31",
    floor: "#535a52",
    floorLine: "#3b413c",
    trim: "#93a5a2",
    warm: "#d9b96a",
  },
  bedroom: {
    wall: "#35414f",
    accent: "#2d4a4f",
    ceiling: "#212a35",
    floor: "#6b4a32",
    floorLine: "#4d3626",
    trim: "#92a5b5",
    warm: "#cfae6a",
  },
  bath: {
    wall: "#3a4150",
    accent: "#55647a",
    ceiling: "#242b39",
    floor: "#4f5666",
    floorLine: "#3a3f4d",
    trim: "#9aa4b5",
    warm: "#e0c07a",
  },
  balcony: {
    wall: "#303844",
    accent: "#2a313c",
    ceiling: "#1c222c",
    floor: "#5a5348",
    floorLine: "#443f37",
    trim: "#7f8a99",
    warm: "#f0d27e",
  },
};
