export interface FlowerType {
  id: string;
  name: string;
  scientificName: string;
  defaultColor: string;
  colors: string[];
  stemColor: string;
  headType: 'rose' | 'lily' | 'sunflower' | 'tulip' | 'eucalyptus' | 'lavender' | 'chrysanthemum' | 'carnation' | 'babys_breath';
  defaultLength: number; // 3D units (e.g., 5.0 = 50cm)
  defaultScale: number;
  description: string;
  meaning: string; // 花语
}

export interface VaseType {
  id: string;
  name: string;
  type: 'cylinder' | 'spherical' | 'bowl' | 'geometric' | 'tall_neck';
  height: number;
  rimRadius: number;
  baseRadius: number;
  maxRadius: number;
  color: string;
  opacity: number;
  roughness: number;
  metalness: number;
  description: string;
  supportedHolders: ('natural' | 'kenzan' | 'foam')[];
}

export type HolderType = 'natural' | 'kenzan' | 'foam';

export interface PlacedFlower {
  id: string;
  flowerType: FlowerType;
  color: string;
  length: number;
  scale: number;
  
  // Physics representation
  base: { x: number; y: number; z: number };
  head: { x: number; y: number; z: number };
  prevBase: { x: number; y: number; z: number };
  prevHead: { x: number; y: number; z: number };
  
  // Placement/Fixation State
  holderType: HolderType;
  isPinned: boolean; // Locked in Kenzan or Foam
  pinOffset?: { x: number; y: number; z: number }; // Offset from the center of the holder
  pinDirection?: { x: number; y: number; z: number }; // Direction vector when pinned
  depthInFoam?: number; // How deep the stem is inserted into the foam
  
  // Dragging state
  isGrabbed: boolean;
  grabPart?: 'head' | 'base' | 'stem';
}

export interface SceneConfig {
  backgroundType: 'warm_studio' | 'dark_zen' | 'light_gallery' | 'wooden_tea_room';
  tableTexture: 'oak' | 'walnut' | 'marble' | 'white';
  showGrid: boolean;
  showShadows: boolean;
  showKenzanMesh: boolean;
}
