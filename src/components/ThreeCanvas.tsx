import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FlowerType, VaseType, PlacedFlower, HolderType, SceneConfig } from '../types';

interface ThreeCanvasProps {
  vase: VaseType;
  holderType: HolderType;
  flowers: PlacedFlower[];
  selectedFlowerId: string | null;
  onSelectFlower: (id: string | null) => void;
  onUpdateFlowerPhysics: (id: string, base: THREE.Vector3, head: THREE.Vector3) => void;
  onRemoveFlower: (id: string) => void;
  sceneConfig: SceneConfig;
  waterLevel: number; // 0 (empty) to 1 (full to neck)
}

export default function ThreeCanvas({
  vase,
  holderType,
  flowers,
  selectedFlowerId,
  onSelectFlower,
  onUpdateFlowerPhysics,
  onRemoveFlower,
  sceneConfig,
  waterLevel
}: ThreeCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const discardingFlowersRef = useRef<Map<string, { progress: number; flower: PlacedFlower; mesh: THREE.Group }>>(new Map());

  // Keep references to values needed inside the requestAnimationFrame loop to avoid closures over stale props
  const stateRef = useRef({
    vase,
    holderType,
    flowers,
    selectedFlowerId,
    sceneConfig,
    waterLevel
  });

  useEffect(() => {
    stateRef.current = {
      vase,
      holderType,
      flowers,
      selectedFlowerId,
      sceneConfig,
      waterLevel
    };
  }, [vase, holderType, flowers, selectedFlowerId, sceneConfig, waterLevel]);

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    // --- 1. Scene Setup ---
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight || 600;

    const scene = new THREE.Scene();
    
    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 8, 12);

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true // Required for taking screenshots
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.05; // Don't go below table
    controls.minDistance = 3;
    controls.maxDistance = 25;
    controls.target.set(0, 2.5, 0);

    // --- 2. Lights & Environment ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // Spotlight for dramatic floral look
    const spotLight = new THREE.SpotLight(0xfffdf4, 1.8);
    spotLight.position.set(5, 12, 5);
    spotLight.angle = Math.PI / 4;
    spotLight.penumbra = 0.8;
    spotLight.castShadow = true;
    spotLight.shadow.mapSize.width = 2048;
    spotLight.shadow.mapSize.height = 2048;
    spotLight.shadow.camera.near = 0.5;
    spotLight.shadow.camera.far = 25;
    spotLight.shadow.bias = -0.001;
    scene.add(spotLight);

    // Fill light (soft blue)
    const fillLight = new THREE.DirectionalLight(0xe0f2fe, 0.4);
    fillLight.position.set(-6, 5, -2);
    scene.add(fillLight);

    // Soft backlight
    const backLight = new THREE.DirectionalLight(0xfff7ed, 0.3);
    backLight.position.set(0, 4, -8);
    scene.add(backLight);

    // --- 3. Persistent Scene Objects ---
    const tableGroup = new THREE.Group();
    scene.add(tableGroup);

    const vaseGroup = new THREE.Group();
    scene.add(vaseGroup);

    const flowersGroup = new THREE.Group();
    scene.add(flowersGroup);

    const discardGroup = new THREE.Group();
    scene.add(discardGroup);

    const helpersGroup = new THREE.Group();
    scene.add(helpersGroup);

    // Let's draw the table and backgrounds
    let tableMesh: THREE.Mesh | null = null;
    let roomMesh: THREE.Mesh | null = null;

    function buildEnvironment(bgType: string, textureType: string) {
      // Clear old table
      while (tableGroup.children.length > 0) {
        tableGroup.remove(tableGroup.children[0]);
      }

      // 1. Table
      let tableMat: THREE.Material;
      if (textureType === 'walnut') {
        tableMat = new THREE.MeshStandardMaterial({
          color: 0x271a11,
          roughness: 0.3,
          metalness: 0.1,
        });
      } else if (textureType === 'marble') {
        tableMat = new THREE.MeshStandardMaterial({
          color: 0xf5f5f5,
          roughness: 0.15,
          metalness: 0.05,
        });
      } else if (textureType === 'white') {
        tableMat = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          roughness: 0.4,
          metalness: 0.0,
        });
      } else { // oak
        tableMat = new THREE.MeshStandardMaterial({
          color: 0x8a6642,
          roughness: 0.4,
          metalness: 0.05,
        });
      }

      // Cylindrical table
      const tableGeo = new THREE.CylinderGeometry(5, 5.1, 0.4, 64);
      tableMesh = new THREE.Mesh(tableGeo, tableMat);
      tableMesh.position.y = -0.2;
      tableMesh.receiveShadow = true;
      tableGroup.add(tableMesh);

      // Simple Table stand
      const standGeo = new THREE.CylinderGeometry(0.8, 1.2, 5, 32);
      const standMesh = new THREE.Mesh(standGeo, new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.7 }));
      standMesh.position.y = -2.7;
      tableGroup.add(standMesh);

      // 2. Room/Background
      let wallColor = 0xf3f4f6;
      if (bgType === 'dark_zen') {
        wallColor = 0x111827; // deep slate gray
      } else if (bgType === 'wooden_tea_room') {
        wallColor = 0xd97706; // warm wood tone
      } else if (bgType === 'warm_studio') {
        wallColor = 0xfef3c7; // warm sandy cream
      }

      scene.background = new THREE.Color(wallColor);
      scene.fog = new THREE.FogExp2(wallColor, 0.03);

      // If zen or tea room, add a nice backing card/panel
      if (bgType === 'dark_zen') {
        // Add a giant circle behind to look like a zen window
        const panelGeo = new THREE.CircleGeometry(4, 32);
        const panelMat = new THREE.MeshBasicMaterial({ color: 0x1f2937, side: THREE.DoubleSide });
        const panel = new THREE.Mesh(panelGeo, panelMat);
        panel.position.set(0, 4, -4.5);
        tableGroup.add(panel);

        // Add a soft golden glow inside the window
        const glowGeo = new THREE.RingGeometry(3.9, 4.0, 64);
        const glowMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide });
        const glow = new THREE.Mesh(glowGeo, glowMat);
        glow.position.set(0, 4, -4.48);
        tableGroup.add(glow);
      } else if (bgType === 'wooden_tea_room') {
        // Add wooden shoji panels in the back
        const shojiGeo = new THREE.PlaneGeometry(16, 10);
        const shojiMat = new THREE.MeshStandardMaterial({
          color: 0xfefae0,
          roughness: 0.9,
          metalness: 0.0,
        });
        const shoji = new THREE.Mesh(shojiGeo, shojiMat);
        shoji.position.set(0, 4.5, -5.0);
        tableGroup.add(shoji);

        // Grid lines for shoji screen
        const gridHelper = new THREE.GridHelper(16, 12, 0x78350f, 0x78350f);
        gridHelper.rotation.x = Math.PI / 2;
        gridHelper.position.set(0, 4.5, -4.95);
        tableGroup.add(gridHelper);
      }
    }

    // --- 4. Vase Lathe Geometry Creator ---
    function buildVaseMesh(v: VaseType) {
      while (vaseGroup.children.length > 0) {
        vaseGroup.remove(vaseGroup.children[0]);
      }

      // Generate profile points for LatheGeometry
      const points: THREE.Vector2[] = [];
      const H = v.height;
      const baseR = v.baseRadius;
      const rimR = v.rimRadius;
      const maxR = v.maxRadius;

      // Draw the outer profile
      const steps = 30;
      const thickness = 0.12; // Wall thickness

      // 1. Outer profile (from bottom to rim)
      for (let i = 0; i <= steps; i++) {
        const y = (i / steps) * H;
        const r = getVaseRadiusAtHeight(y, v.type, H, baseR, maxR, rimR);
        points.push(new THREE.Vector2(r, y));
      }

      // 2. Inner profile (from rim down to inner bottom)
      for (let i = steps; i >= 0; i--) {
        const y = (i / steps) * H;
        // Inner radius is slightly smaller
        const outerR = getVaseRadiusAtHeight(y, v.type, H, baseR, maxR, rimR);
        // Ensure inner radius is non-negative and hollow
        const innerR = Math.max(0.02, outerR - thickness);
        
        // At the absolute bottom, close it off inside
        if (i === 0) {
          points.push(new THREE.Vector2(innerR, 0.12)); // inside bottom floor
          points.push(new THREE.Vector2(0, 0.12)); // close at center
        } else {
          points.push(new THREE.Vector2(innerR, y));
        }
      }

      // Also add the absolute outer bottom center
      points.unshift(new THREE.Vector2(0, 0));

      // Build Lathe
      // If geometric, use 6 or 8 segments for flat paneling. Else use smooth 48.
      const radialSegments = v.type === 'geometric' ? 8 : 48;
      const latheGeo = new THREE.LatheGeometry(points, radialSegments);
      
      // Material
      const isTransparent = v.opacity < 1.0;
      const vaseMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(v.color),
        roughness: v.roughness,
        metalness: v.metalness,
        transparent: isTransparent,
        opacity: v.opacity,
        side: THREE.DoubleSide,
        depthWrite: true,
        shadowSide: THREE.DoubleSide
      });

      const vaseMesh = new THREE.Mesh(latheGeo, vaseMat);
      vaseMesh.castShadow = true;
      vaseMesh.receiveShadow = true;
      vaseGroup.add(vaseMesh);

      // Add a water plane if it's transparent glass and water is enabled
      const waterLvl = stateRef.current.waterLevel;
      if (waterLvl > 0 && isTransparent) {
        const waterHeight = H * 0.75 * waterLvl;
        const waterRadius = getVaseRadiusAtHeight(waterHeight, v.type, H, baseR, maxR, rimR) - 0.05;
        
        const waterGeo = new THREE.CylinderGeometry(waterRadius, waterRadius - 0.05, waterHeight, 32);
        const waterMat = new THREE.MeshStandardMaterial({
          color: 0x60a5fa,
          transparent: true,
          opacity: 0.35,
          roughness: 0.05,
          metalness: 0.1,
          side: THREE.DoubleSide
        });
        const waterMesh = new THREE.Mesh(waterGeo, waterMat);
        waterMesh.position.y = waterHeight / 2 + 0.12;
        vaseGroup.add(waterMesh);
      }

      // Add Kenzan if selected holder is kenzan
      const curHolder = stateRef.current.holderType;
      if (curHolder === 'kenzan' && v.supportedHolders.includes('kenzan')) {
        buildKenzan(baseR * 0.9);
      }

      // Add Floral Foam if selected holder is foam
      if (curHolder === 'foam' && v.supportedHolders.includes('foam')) {
        buildFloralFoam(H * 0.5, baseR * 0.9);
      }
    }

    // Helper: calculate vase radius at a given height
    function getVaseRadiusAtHeight(y: number, type: string, H: number, baseR: number, maxR: number, rimR: number): number {
      if (y < 0) return baseR;
      if (y > H) return rimR;
      const t = y / H;
      switch (type) {
        case 'cylinder':
          return baseR + (rimR - baseR) * t;
        case 'spherical':
          return baseR + (maxR - baseR) * Math.sin(t * Math.PI) + (rimR - baseR) * t * t;
        case 'bowl':
          return baseR + (rimR - baseR) * Math.sqrt(t);
        case 'geometric':
          return baseR + (rimR - baseR) * t;
        case 'tall_neck':
          if (t < 0.7) {
            const t2 = t / 0.7;
            return baseR + (maxR - baseR) * Math.sin(t2 * Math.PI / 2);
          } else {
            const t2 = (t - 0.7) / 0.3;
            const neckR = 0.45;
            return neckR + (rimR - neckR) * t2;
          }
        default:
          return baseR;
      }
    }

    // Enforce rigid physical boundaries and length constraints for a single flower
    function resolveSingleFlowerCollisions(pf: any, containment: 'inside' | 'outside' | undefined, isDragged: boolean) {
      const v = stateRef.current.vase;
      const thickness = 0.12; // Vase wall thickness
      const stemRad = 0.04;   // Stem thickness

      function getFlowerHeadRadius(p: any): number {
        const scale = p.scale || 1.0;
        const defScale = p.flowerType?.defaultScale || 1.0;
        const totalScale = scale * defScale;

        const headType = p.flowerType?.headType || '';
        switch (headType) {
          case 'rose':
            return 0.52 * totalScale;
          case 'lily':
            return 0.45 * totalScale;
          case 'sunflower':
            return 0.95 * totalScale;
          case 'tulip':
            return 0.32 * totalScale;
          case 'chrysanthemum':
            return 0.38 * totalScale;
          case 'carnation':
            return 0.42 * totalScale;
          case 'eucalyptus':
            return 0.25 * totalScale;
          case 'lavender':
            return 0.20 * totalScale;
          default:
            return 0.35 * totalScale;
        }
      }
      
      // Determine if inside or outside vase footprint
      const baseDist = Math.sqrt(pf.base.x * pf.base.x + pf.base.z * pf.base.z);
      
      let insideVaseFootprint = false;
      if (containment === 'inside') {
        insideVaseFootprint = true;
      } else if (containment === 'outside') {
        insideVaseFootprint = false;
      } else {
        insideVaseFootprint = 
          pf.holderType === 'kenzan' || 
          pf.holderType === 'foam' || 
          (pf.holderType === 'natural' && pf.base.y < v.height + 0.05 && baseDist < Math.max(v.baseRadius, v.maxRadius) * 1.5);
      }

      // 1. Solve stem length constraint
      const baseVec = new THREE.Vector3(pf.base.x, pf.base.y, pf.base.z);
      const headVec = new THREE.Vector3(pf.head.x, pf.head.y, pf.head.z);
      
      const dir = headVec.clone().sub(baseVec);
      const curLen = dir.length();
      if (curLen > 0.01) {
        const diff = pf.length - curLen;
        
        if (isDragged) {
          // If grabbed, the grabbed part is anchored. Only the other part should move to satisfy length!
          const normalDir = dir.normalize();
          if (pf.grabPart === 'head') {
            pf.base.x = pf.head.x - normalDir.x * pf.length;
            pf.base.y = pf.head.y - normalDir.y * pf.length;
            pf.base.z = pf.head.z - normalDir.z * pf.length;
          } else {
            pf.head.x = pf.base.x + normalDir.x * pf.length;
            pf.head.y = pf.base.y + normalDir.y * pf.length;
            pf.head.z = pf.base.z + normalDir.z * pf.length;
          }
        } else {
          // Normal physics: either pinned or dual-free
          const percent = diff / curLen / 2;
          const correction = dir.multiplyScalar(percent);
          if (pf.isPinned) {
            // Pinned base: only head moves
            const finalHead = baseVec.clone().addScaledVector(dir.normalize(), pf.length);
            pf.head.x = finalHead.x;
            pf.head.y = finalHead.y;
            pf.head.z = finalHead.z;
          } else {
            // Dual-free: both shift
            pf.base.x -= correction.x;
            pf.base.y -= correction.y;
            pf.base.z -= correction.z;
            pf.head.x += correction.x;
            pf.head.y += correction.y;
            pf.head.z += correction.z;
          }
        }
      }

      // 2. Floor / table collisions
      const floorY = 0.12; // vase inner floor
      const baseRad = stemRad;
      const headRad = getFlowerHeadRadius(pf);

      const finalFloorY = insideVaseFootprint ? (floorY + baseRad) : 0.02; // tabletop is 0.02
      if (pf.base.y < finalFloorY) {
        pf.base.y = finalFloorY;
      }
      const finalHeadFloorY = insideVaseFootprint ? (floorY + headRad) : (0.02 + headRad);
      if (pf.head.y < finalHeadFloorY) {
        pf.head.y = finalHeadFloorY;
      }

       // 3. Vase Wall Collisions (sampled along stem)
      const sampleCount = 16; // high-resolution sampling to prevent all slip-throughs
      for (let i = 0; i <= sampleCount; i++) {
        const t = i / sampleCount;
        const px = pf.base.x + (pf.head.x - pf.base.x) * t;
        const py = pf.base.y + (pf.head.y - pf.base.y) * t;
        const pz = pf.base.z + (pf.head.z - pf.base.z) * t;

        let currentRad = stemRad;
        if (t > 0.8) {
          const headRad = getFlowerHeadRadius(pf);
          currentRad = stemRad + (headRad - stemRad) * ((t - 0.8) / 0.2);
        }

        // Keep segments from slipping below the relevant floor
        const minStemY = insideVaseFootprint ? (0.12 + currentRad) : (0.02 + currentRad);
        if (py < minStemY) {
          const diffY = minStemY - py;
          if (isDragged) {
            // Adjust the non-grabbed end
            if (pf.grabPart === 'head') {
              pf.base.y += diffY / (1 - t);
            } else {
              pf.head.y += diffY / t;
            }
          } else if (pf.isPinned) {
            pf.head.y += diffY;
          } else {
            const shiftBaseY = diffY * (1 - t);
            const shiftHeadY = diffY * t;
            pf.base.y += shiftBaseY;
            pf.head.y += shiftHeadY;
          }
          continue;
        }

        // Only collide if segment is within the vertical walls of the vase, OR if its physical sphere overlaps the vase walls
        if (py >= 0.12 && (py - currentRad) <= v.height) {
          const checkY = Math.min(v.height, py);
          const outerR = getVaseRadiusAtHeight(checkY, v.type, v.height, v.baseRadius, v.maxRadius, v.rimRadius);
          const innerR = Math.max(0.04, outerR - thickness);
          const d = Math.sqrt(px * px + pz * pz);

          if (d < 0.001) continue;

          if (insideVaseFootprint) {
            // Inside: must stay within the inner radius limit (avoid negative bounds with Math.max)
            const limit = Math.max(0.01, innerR - currentRad);
            if (d > limit) {
              const overlap = d - limit;
              const pushX = (px / d) * overlap;
              const pushZ = (pz / d) * overlap;

              if (isDragged) {
                // If dragged, we push both base and head to slide cleanly
                pf.base.x -= pushX * (1 - t);
                pf.base.z -= pushZ * (1 - t);
                pf.head.x -= pushX * t;
                pf.head.z -= pushZ * t;
              } else if (pf.isPinned) {
                // Rotate stem around base
                const activeT = Math.max(0.05, t);
                const dx = pf.head.x - pf.base.x;
                const dy = pf.head.y - pf.base.y;
                const dz = pf.head.z - pf.base.z;
                const d_new_x = dx - pushX / activeT;
                const d_new_z = dz - pushZ / activeT;
                const dir = new THREE.Vector3(d_new_x, dy, dz).normalize();

                pf.head.x = pf.base.x + dir.x * pf.length;
                pf.head.y = pf.base.y + dir.y * pf.length;
                pf.head.z = pf.base.z + dir.z * pf.length;
              } else {
                const shiftBaseX = pushX * (1 - t) * 0.9;
                const shiftBaseZ = pushZ * (1 - t) * 0.9;
                const shiftHeadX = pushX * t * 0.9;
                const shiftHeadZ = pushZ * t * 0.9;

                pf.base.x -= shiftBaseX;
                pf.base.z -= shiftBaseZ;
                pf.head.x -= shiftHeadX;
                pf.head.z -= shiftHeadZ;
              }
            }
          } else {
            // Outside: must stay outside the outer radius limit
            const limit = outerR + currentRad;
            if (d < limit) {
              const overlap = limit - d;
              const pushX = -(px / d) * overlap;
              const pushZ = -(pz / d) * overlap;

              if (isDragged) {
                // Push both base and head to slide cleanly outside
                pf.base.x -= pushX * (1 - t);
                pf.base.z -= pushZ * (1 - t);
                pf.head.x -= pushX * t;
                pf.head.z -= pushZ * t;
              } else if (pf.isPinned) {
                // Rotate stem around base
                const activeT = Math.max(0.05, t);
                const dx = pf.head.x - pf.base.x;
                const dy = pf.head.y - pf.base.y;
                const dz = pf.head.z - pf.base.z;
                const d_new_x = dx - pushX / activeT;
                const d_new_z = dz - pushZ / activeT;
                const dir = new THREE.Vector3(d_new_x, dy, dz).normalize();

                pf.head.x = pf.base.x + dir.x * pf.length;
                pf.head.y = pf.base.y + dir.y * pf.length;
                pf.head.z = pf.base.z + dir.z * pf.length;
              } else {
                const shiftBaseX = pushX * (1 - t) * 0.9;
                const shiftBaseZ = pushZ * (1 - t) * 0.9;
                const shiftHeadX = pushX * t * 0.9;
                const shiftHeadZ = pushZ * t * 0.9;

                pf.base.x -= shiftBaseX;
                pf.base.z -= shiftBaseZ;
                pf.head.x -= shiftHeadX;
                pf.head.z -= shiftHeadZ;
              }
            }
          }
        }
      }

      // 4. Vase Rim Contact checking (explicit check to prevent sliding through the top edge lip)
      if (pf.base.y < v.height && pf.head.y > v.height) {
        const t_rim = (v.height - pf.base.y) / (pf.head.y - pf.base.y);
        if (t_rim >= 0 && t_rim <= 1) {
          const px = pf.base.x + (pf.head.x - pf.base.x) * t_rim;
          const pz = pf.base.z + (pf.head.z - pf.base.z) * t_rim;
          const d = Math.sqrt(px * px + pz * pz);

          const outerR_rim = getVaseRadiusAtHeight(v.height, v.type, v.height, v.baseRadius, v.maxRadius, v.rimRadius);
          const innerR_rim = Math.max(0.04, outerR_rim - thickness);

          let currentRad_rim = stemRad;
          if (t_rim > 0.8) {
            const headRad = getFlowerHeadRadius(pf);
            currentRad_rim = stemRad + (headRad - stemRad) * ((t_rim - 0.8) / 0.2);
          }

          if (d > 0.001) {
            if (insideVaseFootprint) {
              const limit = Math.max(0.01, innerR_rim - currentRad_rim);
              if (d > limit) {
                const overlap = d - limit;
                const pushX = (px / d) * overlap;
                const pushZ = (pz / d) * overlap;

                if (isDragged) {
                  pf.base.x -= pushX * (1 - t_rim);
                  pf.base.z -= pushZ * (1 - t_rim);
                  pf.head.x -= pushX * t_rim;
                  pf.head.z -= pushZ * t_rim;
                } else if (pf.isPinned) {
                  const activeT = Math.max(0.05, t_rim);
                  const dx = pf.head.x - pf.base.x;
                  const dy = pf.head.y - pf.base.y;
                  const dz = pf.head.z - pf.base.z;
                  const d_new_x = dx - pushX / activeT;
                  const d_new_z = dz - pushZ / activeT;
                  const dir = new THREE.Vector3(d_new_x, dy, dz).normalize();

                  pf.head.x = pf.base.x + dir.x * pf.length;
                  pf.head.y = pf.base.y + dir.y * pf.length;
                  pf.head.z = pf.base.z + dir.z * pf.length;
                } else {
                  const shiftBaseX = pushX * (1 - t_rim) * 0.9;
                  const shiftBaseZ = pushZ * (1 - t_rim) * 0.9;
                  const shiftHeadX = pushX * t_rim * 0.9;
                  const shiftHeadZ = pushZ * t_rim * 0.9;

                  pf.base.x -= shiftBaseX;
                  pf.base.z -= shiftBaseZ;
                  pf.head.x -= shiftHeadX;
                  pf.head.z -= shiftHeadZ;
                }
              }
            } else {
              const limit = outerR_rim + currentRad_rim;
              if (d < limit) {
                const overlap = limit - d;
                const pushX = -(px / d) * overlap;
                const pushZ = -(pz / d) * overlap;

                if (isDragged) {
                  pf.base.x -= pushX * (1 - t_rim);
                  pf.base.z -= pushZ * (1 - t_rim);
                  pf.head.x -= pushX * t_rim;
                  pf.head.z -= pushZ * t_rim;
                } else if (pf.isPinned) {
                  const activeT = Math.max(0.05, t_rim);
                  const dx = pf.head.x - pf.base.x;
                  const dy = pf.head.y - pf.base.y;
                  const dz = pf.head.z - pf.base.z;
                  const d_new_x = dx - pushX / activeT;
                  const d_new_z = dz - pushZ / activeT;
                  const dir = new THREE.Vector3(d_new_x, dy, dz).normalize();

                  pf.head.x = pf.base.x + dir.x * pf.length;
                  pf.head.y = pf.base.y + dir.y * pf.length;
                  pf.head.z = pf.base.z + dir.z * pf.length;
                } else {
                  const shiftBaseX = pushX * (1 - t_rim) * 0.9;
                  const shiftBaseZ = pushZ * (1 - t_rim) * 0.9;
                  const shiftHeadX = pushX * t_rim * 0.9;
                  const shiftHeadZ = pushZ * t_rim * 0.9;

                  pf.base.x -= shiftBaseX;
                  pf.base.z -= shiftBaseZ;
                  pf.head.x -= shiftHeadX;
                  pf.head.z -= shiftHeadZ;
                }
              }
            }
          }
        }
      }
    }

    function buildKenzan(radius: number) {
      // Brass spike plate
      const plateGeo = new THREE.CylinderGeometry(radius, radius, 0.15, 32);
      const plateMat = new THREE.MeshStandardMaterial({
        color: 0xca8a04, // brass
        roughness: 0.2,
        metalness: 0.8
      });
      const plate = new THREE.Mesh(plateGeo, plateMat);
      plate.position.y = 0.15 / 2 + 0.12; // rest on vase floor
      plate.receiveShadow = true;
      vaseGroup.add(plate);

      // Add spikes!
      if (stateRef.current.sceneConfig.showKenzanMesh) {
        const spikeCount = 60;
        const spikeGeo = new THREE.ConeGeometry(0.02, 0.25, 4);
        const spikeMat = new THREE.MeshStandardMaterial({
          color: 0xeab308,
          metalness: 0.9,
          roughness: 0.1
        });

        // Scatter spikes inside radius
        for (let i = 0; i < spikeCount; i++) {
          const r = Math.sqrt(Math.random()) * radius * 0.9;
          const theta = Math.random() * Math.PI * 2;
          const x = r * Math.cos(theta);
          const z = r * Math.sin(theta);

          const spike = new THREE.Mesh(spikeGeo, spikeMat);
          spike.position.set(x, 0.15 + 0.25 / 2 + 0.12, z);
          vaseGroup.add(spike);
        }
      }
    }

    function buildFloralFoam(height: number, radius: number) {
      // Green foam cylinder
      const foamGeo = new THREE.CylinderGeometry(radius * 0.95, radius * 0.95, height, 32);
      const foamMat = new THREE.MeshStandardMaterial({
        color: 0x166534, // dark green foam
        roughness: 0.95,
        metalness: 0.0,
        transparent: true,
        opacity: 0.75
      });
      const foam = new THREE.Mesh(foamGeo, foamMat);
      foam.position.y = height / 2 + 0.12;
      foam.receiveShadow = true;
      vaseGroup.add(foam);
    }

    // --- 5. Procedural Flower Mesh Builder ---
    const flowerMeshesMap = new Map<string, THREE.Group>();

    function buildFlowerMesh(pf: PlacedFlower): THREE.Group {
      const group = new THREE.Group();
      group.name = pf.id;

      // Stem (Cylinder geometry)
      const stemRad = 0.04;
      const stemGeo = new THREE.CylinderGeometry(stemRad, stemRad, 1, 8);
      // Shift origin to bottom of stem so we can stretch it easily
      stemGeo.translate(0, 0.5, 0);

      const stemMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(pf.flowerType.stemColor),
        roughness: 0.6,
        metalness: 0.0
      });

      const stemMesh = new THREE.Mesh(stemGeo, stemMat);
      stemMesh.name = 'stem';
      stemMesh.castShadow = true;
      stemMesh.receiveShadow = true;
      group.add(stemMesh);

      // Create Head Mesh
      const headGroup = new THREE.Group();
      headGroup.name = 'head';
      headGroup.scale.setScalar(pf.scale * pf.flowerType.defaultScale);

      // Add flower parts based on headType
      const petalMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(pf.color),
        roughness: 0.45,
        metalness: 0.05,
        side: THREE.DoubleSide
      });

      const centerMat = new THREE.MeshStandardMaterial({
        color: 0x451a03, // Dark center
        roughness: 0.9,
        metalness: 0.0
      });

      switch (pf.flowerType.headType) {
        case 'rose': {
          // Receptacle (green base)
          const recGeo = new THREE.CylinderGeometry(0.12, 0.04, 0.25, 8);
          const recMat = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.8 });
          const rec = new THREE.Mesh(recGeo, recMat);
          rec.position.y = -0.12;
          headGroup.add(rec);

          // Small green sepals
          for (let i = 0; i < 4; i++) {
            const sepalGeo = new THREE.ConeGeometry(0.04, 0.2, 4);
            sepalGeo.rotateX(Math.PI / 4);
            const sepal = new THREE.Mesh(sepalGeo, recMat);
            sepal.position.set(0, -0.05, 0);
            sepal.rotation.y = (i * Math.PI) / 2;
            headGroup.add(sepal);
          }

          // Bud Core
          const budGeo = new THREE.SphereGeometry(0.25, 12, 12);
          budGeo.scale(1, 1.3, 1);
          const bud = new THREE.Mesh(budGeo, petalMat);
          bud.position.y = 0.1;
          headGroup.add(bud);

          // Outer Petals
          const petalLayers = [
            { count: 3, r: 0.2, rot: 0.2, scale: new THREE.Vector3(1.3, 1.2, 0.5) },
            { count: 5, r: 0.32, rot: 0.4, scale: new THREE.Vector3(1.6, 1.4, 0.5) },
            { count: 6, r: 0.45, rot: 0.6, scale: new THREE.Vector3(2.0, 1.7, 0.5) }
          ];

          petalLayers.forEach((layer, lIdx) => {
            for (let i = 0; i < layer.count; i++) {
              const petGeo = new THREE.SphereGeometry(0.18, 8, 8, 0, Math.PI); // Half sphere for petal cup
              petGeo.translate(0, 0.09, 0);
              const pet = new THREE.Mesh(petGeo, petalMat);
              
              const angle = (i * Math.PI * 2) / layer.count + lIdx * 0.5;
              pet.position.set(Math.cos(angle) * layer.r, 0.05 * lIdx, Math.sin(angle) * layer.r);
              pet.rotation.y = -angle + Math.PI / 2;
              pet.rotation.x = layer.rot;
              pet.scale.copy(layer.scale);
              
              headGroup.add(pet);
            }
          });
          break;
        }

        case 'lily': {
          // Green receptacle
          const recGeo = new THREE.CylinderGeometry(0.08, 0.04, 0.3, 8);
          const recMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.8 });
          const rec = new THREE.Mesh(recGeo, recMat);
          rec.position.y = -0.15;
          headGroup.add(rec);

          // Trumpet outer / 6 petals
          for (let i = 0; i < 6; i++) {
            const petalGeo = new THREE.ConeGeometry(0.18, 0.9, 4, 1, true); // Open cone
            petalGeo.translate(0, 0.45, 0);
            const pet = new THREE.Mesh(petalGeo, petalMat);
            
            const angle = (i * Math.PI * 2) / 6;
            pet.position.set(0, -0.05, 0);
            pet.rotation.z = Math.PI / 5; // Flare outward
            pet.rotation.y = angle;
            
            headGroup.add(pet);
          }

          // Stamens (Center filaments)
          const stamMat = new THREE.MeshStandardMaterial({ color: 0xca8a04, roughness: 0.5 });
          const pollenMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });
          for (let i = 0; i < 6; i++) {
            const fil = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.5, 4), stamMat);
            fil.position.y = 0.2;
            fil.rotation.z = Math.PI / 12;
            
            const pollen = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.02, 0.06), pollenMat);
            pollen.position.y = 0.45;
            
            const stamenGroup = new THREE.Group();
            stamenGroup.rotation.y = (i * Math.PI * 2) / 6;
            stamenGroup.add(fil);
            stamenGroup.add(pollen);
            headGroup.add(stamenGroup);
          }
          break;
        }

        case 'sunflower': {
          // Large brown seed disk
          const diskGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.08, 24);
          diskGeo.rotateX(Math.PI / 2); // Face forward/upward
          const disk = new THREE.Mesh(diskGeo, centerMat);
          headGroup.add(disk);

          // Yellow outer petals
          const yellowMat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(pf.color),
            roughness: 0.5,
            metalness: 0.0,
            side: THREE.DoubleSide
          });

          const petalCount = 20;
          const petGeo = new THREE.ConeGeometry(0.07, 0.45, 4);
          petGeo.rotateX(Math.PI / 2);
          petGeo.translate(0, 0, 0.2);

          for (let i = 0; i < petalCount; i++) {
            const pet = new THREE.Mesh(petGeo, yellowMat);
            const angle = (i * Math.PI * 2) / petalCount;
            pet.position.set(Math.cos(angle) * 0.45, Math.sin(angle) * 0.45, 0);
            pet.rotation.z = angle + Math.PI / 2;
            headGroup.add(pet);
          }
          
          // Outer green sepals
          const greenMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.8 });
          const sepGeo = new THREE.ConeGeometry(0.06, 0.3, 4);
          sepGeo.rotateX(Math.PI / 2);
          sepGeo.translate(0, 0, -0.05);
          for (let i = 0; i < petalCount; i++) {
            const sep = new THREE.Mesh(sepGeo, greenMat);
            const angle = (i * Math.PI * 2) / petalCount + 0.15;
            sep.position.set(Math.cos(angle) * 0.48, Math.sin(angle) * 0.48, -0.02);
            sep.rotation.z = angle + Math.PI / 2;
            headGroup.add(sep);
          }

          // Orient the sunflower face to stand proud
          headGroup.rotation.x = -Math.PI / 6; // slightly tilt up
          break;
        }

        case 'tulip': {
          // Closed egg shape composed of 3 overlapping oval shells
          const recGeo = new THREE.CylinderGeometry(0.06, 0.03, 0.15, 8);
          const rec = new THREE.Mesh(recGeo, new THREE.MeshStandardMaterial({ color: 0x16a34a }));
          rec.position.y = -0.08;
          headGroup.add(rec);

          const petalCount = 3;
          for (let i = 0; i < petalCount; i++) {
            const petGeo = new THREE.SphereGeometry(0.24, 12, 12, 0, Math.PI, 0, Math.PI * 0.8);
            petGeo.translate(0, 0.18, 0);
            const pet = new THREE.Mesh(petGeo, petalMat);
            
            const angle = (i * Math.PI * 2) / petalCount;
            pet.position.set(Math.cos(angle) * 0.08, 0, Math.sin(angle) * 0.08);
            pet.rotation.y = -angle + Math.PI / 2;
            pet.rotation.x = 0.15; // overlap inwards
            
            headGroup.add(pet);
          }
          break;
        }

        case 'chrysanthemum': {
          // Pom-pom ball! Clustered mini spheres to look textured and round
          const baseSphere = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 16), petalMat);
          headGroup.add(baseSphere);

          // Add small bumps for texture
          const bumpGeo = new THREE.SphereGeometry(0.08, 8, 8);
          const bumpCount = 45;
          for (let i = 0; i < bumpCount; i++) {
            const bump = new THREE.Mesh(bumpGeo, petalMat);
            // Fibonacci sphere distribution
            const phi = Math.acos(-1 + (2 * i) / bumpCount);
            const theta = Math.sqrt(bumpCount * Math.PI) * phi;
            
            const r = 0.31;
            bump.position.set(
              r * Math.sin(phi) * Math.cos(theta),
              r * Math.cos(phi),
              r * Math.sin(phi) * Math.sin(theta)
            );
            headGroup.add(bump);
          }
          break;
        }

        case 'carnation': {
          // Ruffled sheets stacked vertically and slightly offset
          const recGeo = new THREE.CylinderGeometry(0.08, 0.03, 0.15, 8);
          recGeo.translate(0, -0.07, 0);
          headGroup.add(new THREE.Mesh(recGeo, new THREE.MeshStandardMaterial({ color: 0x16a34a })));

          const layerCount = 6;
          for (let l = 0; l < layerCount; l++) {
            const ruffledDisk = new THREE.Group();
            
            // Build a layer with 5 small flat petals pointing out
            const petCount = 6;
            const petWidth = 0.14 + l * 0.04;
            const petGeo = new THREE.BoxGeometry(petWidth, 0.02, 0.15);
            petGeo.translate(0, 0, 0.07);

            for (let i = 0; i < petCount; i++) {
              const pet = new THREE.Mesh(petGeo, petalMat);
              const angle = (i * Math.PI * 2) / petCount + l * 0.3;
              pet.position.set(Math.cos(angle) * 0.05, 0, Math.sin(angle) * 0.05);
              pet.rotation.y = angle;
              pet.rotation.x = 0.4 + l * 0.1; // bend upwards
              ruffledDisk.add(pet);
            }
            
            ruffledDisk.position.y = l * 0.05;
            ruffledDisk.scale.setScalar(1.0 - l * 0.05);
            headGroup.add(ruffledDisk);
          }
          break;
        }

        case 'eucalyptus': {
          // No big head, instead pairs of round coin leaves along the stem
          // To implement this, we hide the traditional flower head, and build the leaves in the update loop!
          // But let's add a small branch at the top to mark the head
          const tinyLeafGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.01, 16);
          tinyLeafGeo.rotateX(Math.PI / 2);
          const leaf1 = new THREE.Mesh(tinyLeafGeo, petalMat);
          leaf1.position.set(0.1, 0, 0);
          leaf1.rotation.y = 0.5;
          const leaf2 = new THREE.Mesh(tinyLeafGeo, petalMat);
          leaf2.position.set(-0.1, 0, 0);
          leaf2.rotation.y = -0.5;
          headGroup.add(leaf1);
          headGroup.add(leaf2);
          break;
        }

        case 'lavender': {
          // Lavender spike flower. Purple flower rings on top third of stem.
          // Built procedurally here on the head group
          const flowerColor = new THREE.Color(pf.color);
          const lavMat = new THREE.MeshStandardMaterial({ color: flowerColor, roughness: 0.6 });
          
          const ringCount = 8;
          for (let r = 0; r < ringCount; r++) {
            const h = r * 0.15 - 0.4;
            const petalCount = 5;
            for (let i = 0; i < petalCount; i++) {
              const flowerBudGeo = new THREE.SphereGeometry(0.04, 8, 8);
              flowerBudGeo.scale(1, 1.6, 1);
              const bud = new THREE.Mesh(flowerBudGeo, lavMat);
              
              const angle = (i * Math.PI * 2) / petalCount + r * 0.4;
              bud.position.set(Math.cos(angle) * 0.08, h, Math.sin(angle) * 0.08);
              bud.rotation.z = Math.PI / 4;
              bud.rotation.y = angle;
              headGroup.add(bud);
            }
          }
          break;
        }

        case 'babys_breath': {
          // Clustered branching tiny cloud
          const bbPetalMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });
          const stemMat2 = new THREE.MeshStandardMaterial({ color: 0x4ade80, roughness: 0.6 });
          const branchingGroup = new THREE.Group();

          // 5 branched sprigs
          for (let b = 0; b < 5; b++) {
            const branch = new THREE.Group();
            
            // Sub stem
            const subStemGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.4, 8);
            subStemGeo.translate(0, 0.2, 0);
            const subStem = new THREE.Mesh(subStemGeo, stemMat2);
            branch.add(subStem);

            // Add 3 tiny white flower buds at the tip
            for (let t = 0; t < 3; t++) {
              const bud = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), bbPetalMat);
              const phi = Math.random() * Math.PI * 2;
              bud.position.set(
                Math.cos(phi) * 0.08,
                0.38 + Math.random() * 0.06,
                Math.sin(phi) * 0.08
              );
              branch.add(bud);
            }

            const angle = (b * Math.PI * 2) / 5;
            branch.rotation.z = 0.4 + Math.random() * 0.25;
            branch.rotation.y = angle;
            branchingGroup.add(branch);
          }
          headGroup.add(branchingGroup);
          break;
        }
      }

      // Add a selection ring (initially hidden)
      const ringGeo = new THREE.RingGeometry(0.7, 0.75, 32);
      ringGeo.rotateX(Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x3b82f6, side: THREE.DoubleSide, visible: false });
      const selectRing = new THREE.Mesh(ringGeo, ringMat);
      selectRing.name = 'selection_ring';
      selectRing.position.y = 0.3; // hover above head
      headGroup.add(selectRing);

      group.add(headGroup);

      // Save references in the group for updates
      group.userData = {
        id: pf.id,
        length: pf.length,
        scale: pf.scale,
        headType: pf.flowerType.headType,
        color: pf.color
      };

      return group;
    }

    // Update flower 3D mesh representation to match physical endpoints
    function updateFlowerMeshPositions(
      group: THREE.Group,
      base: THREE.Vector3,
      head: THREE.Vector3,
      pf: PlacedFlower
    ) {
      const stem = group.getObjectByName('stem') as THREE.Mesh;
      const headGroup = group.getObjectByName('head') as THREE.Group;
      const selectRing = group.getObjectByName('selection_ring') as THREE.Mesh;

      if (!stem || !headGroup) return;

      // 1. Position and orient the stem
      const direction = new THREE.Vector3().subVectors(head, base);
      const length = direction.length();
      
      const alignQuaternion = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        direction.clone().normalize()
      );

      // Position stem at base (since its geometry is shifted to start at Y=0)
      stem.position.copy(base);
      stem.quaternion.copy(alignQuaternion);
      stem.scale.set(1, length, 1);

      // 2. Position and orient the flower head at the top
      headGroup.position.copy(head);
      
      // Orient flower head along stem direction
      headGroup.quaternion.copy(alignQuaternion);

      // Keep selection ring parallel to ground or facing camera
      if (selectRing) {
        selectRing.visible = pf.id === stateRef.current.selectedFlowerId;
        selectRing.rotation.x = -headGroup.rotation.x; // counter-rotate to stay level
        selectRing.rotation.y = -headGroup.rotation.y;
        selectRing.rotation.z = -headGroup.rotation.z;
      }

      // If eucalyptus, generate leaves along the stem dynamically
      if (pf.flowerType.headType === 'eucalyptus') {
        let eucalyptusLeaves = group.getObjectByName('eucalyptus_leaves');
        if (!eucalyptusLeaves) {
          eucalyptusLeaves = new THREE.Group();
          eucalyptusLeaves.name = 'eucalyptus_leaves';
          group.add(eucalyptusLeaves);

          const leafGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.015, 16);
          leafGeo.rotateX(Math.PI / 2);
          const leafMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(pf.color), roughness: 0.8 });

          // Distribute leaves along the stem
          const stepSize = 0.5;
          const leafPairs = Math.floor(pf.length / stepSize) - 2;

          for (let l = 0; l < leafPairs; l++) {
            const hFraction = (l + 1) * stepSize;
            
            const pairGroup = new THREE.Group();
            pairGroup.name = `pair_${l}`;

            // Leaf A (left)
            const leafA = new THREE.Mesh(leafGeo, leafMat);
            leafA.position.x = 0.22;
            leafA.rotation.y = 0.3;
            leafA.castShadow = true;
            pairGroup.add(leafA);

            // Leaf B (right)
            const leafB = new THREE.Mesh(leafGeo, leafMat);
            leafB.position.x = -0.22;
            leafB.rotation.y = -0.3;
            leafB.castShadow = true;
            pairGroup.add(leafB);

            pairGroup.position.y = hFraction;
            // Alternating rotational offsets
            pairGroup.rotation.y = l * 1.1; 
            pairGroup.scale.setScalar(1.0 - (l / leafPairs) * 0.3); // leaves get slightly smaller near top

            eucalyptusLeaves.add(pairGroup);
          }
        }

        // Position & orient eucalyptus leaves group
        eucalyptusLeaves.position.copy(base);
        eucalyptusLeaves.quaternion.copy(alignQuaternion);
      }
    }

    // --- 6. Raycasting & Interaction ---
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let hoveredFlowerId: string | null = null;
    let grabbedFlowerId: string | null = null;
    let grabPart: 'head' | 'base' | 'stem' | null = null;
    let dragPlane = new THREE.Plane();
    let dragOffset = new THREE.Vector3();

    // Mouse events
    function onMouseMove(e: MouseEvent) {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      // Handle dragging
      if (grabbedFlowerId) {
        const pf = stateRef.current.flowers.find(f => f.id === grabbedFlowerId);
        if (pf) {
          // Cast ray to the dragging plane
          raycaster.setFromCamera(mouse, camera);
          const intersection = new THREE.Vector3();
          if (raycaster.ray.intersectPlane(dragPlane, intersection)) {
            // Updated point
            const newPoint = intersection.clone().sub(dragOffset);

            // Clamp vertical position so it doesn't sink beneath table
            if (newPoint.y < 0.02) newPoint.y = 0.02;

            // Initialize or transition dragContainment
            const v = stateRef.current.vase;
            if (pf.dragContainment === undefined) {
              const baseDist = Math.sqrt(pf.base.x * pf.base.x + pf.base.z * pf.base.z);
              const isInitiallyInside = 
                pf.holderType === 'kenzan' || 
                pf.holderType === 'foam' || 
                (pf.base.y < v.height + 0.05 && baseDist < Math.max(v.baseRadius, v.maxRadius) * 1.5);
              pf.dragContainment = isInitiallyInside ? 'inside' : 'outside';
            }

            // Dynamic transition based on entry/exit over the rim
            const r_rim = getVaseRadiusAtHeight(v.height, v.type, v.height, v.baseRadius, v.maxRadius, v.rimRadius);
            if (pf.base.y > v.height && pf.head.y > v.height) {
              pf.dragContainment = undefined; // free to cross above vase
            } else if (pf.dragContainment === undefined) {
              const enteringPt = pf.base.y < pf.head.y ? pf.base : pf.head;
              const enteringDist = Math.sqrt(enteringPt.x * enteringPt.x + enteringPt.z * enteringPt.z);
              if (enteringDist < r_rim) {
                pf.dragContainment = 'inside';
              } else {
                pf.dragContainment = 'outside';
              }
            }

            // Set candidate position for the grabbed part
            if (grabPart === 'head') {
              pf.head.x = newPoint.x;
              pf.head.y = newPoint.y;
              pf.head.z = newPoint.z;
            } else {
              pf.base.x = newPoint.x;
              pf.base.y = newPoint.y;
              pf.base.z = newPoint.z;
            }

            // Run collision solver multiple times on this single flower to resolve both length AND wall constraints rigidly!
            const solveSteps = 12; // high-quality iterations to completely avoid clipping
            for (let i = 0; i < solveSteps; i++) {
              resolveSingleFlowerCollisions(pf, pf.dragContainment, true);
            }

            // To prevent the mouse cursor from shifting/pulling through the wall,
            // we dynamically adjust the dragOffset based on the constrained output position!
            const constrainedGrabbedPt = grabPart === 'head' ? pf.head : pf.base;
            dragOffset.copy(intersection).sub(new THREE.Vector3(constrainedGrabbedPt.x, constrainedGrabbedPt.y, constrainedGrabbedPt.z));

            // Sync historical values to prevent physical velocity spikes on drag release
            pf.prevBase.x = pf.base.x; pf.prevBase.y = pf.base.y; pf.prevBase.z = pf.base.z;
            pf.prevHead.x = pf.head.x; pf.prevHead.y = pf.head.y; pf.prevHead.z = pf.head.z;

            // Sync with callback
            onUpdateFlowerPhysics(pf.id, new THREE.Vector3(pf.base.x, pf.base.y, pf.base.z), new THREE.Vector3(pf.head.x, pf.head.y, pf.head.z));
          }
        }
        return;
      }

      // Handle hover highlighting
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(flowersGroup.children, true);

      if (intersects.length > 0) {
        // Find top level flower group
        let obj: THREE.Object3D | null = intersects[0].object;
        while (obj && obj.parent !== flowersGroup) {
          obj = obj.parent;
        }

        if (obj && obj.name) {
          if (hoveredFlowerId !== obj.name) {
            hoveredFlowerId = obj.name;
            document.body.style.cursor = 'pointer';
          }
          return;
        }
      }

      if (hoveredFlowerId) {
        hoveredFlowerId = null;
        document.body.style.cursor = 'default';
      }
    }

    function onMouseDown(e: MouseEvent) {
      if (e.button !== 0) return; // Left click only

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(flowersGroup.children, true);

      if (intersects.length > 0) {
        let hitObj = intersects[0].object;
        let isHead = false;
        let isStem = false;

        // Traverse up to find which part was hit
        let tempObj: THREE.Object3D | null = hitObj;
        while (tempObj && tempObj.parent) {
          if (tempObj.name === 'head') isHead = true;
          if (tempObj.name === 'stem') isStem = true;
          tempObj = tempObj.parent;
        }

        // Find root flower group
        let rootObj: THREE.Object3D | null = hitObj;
        while (rootObj && rootObj.parent !== flowersGroup) {
          rootObj = rootObj.parent;
        }

        if (rootObj && rootObj.name) {
          const fid = rootObj.name;
          const pf = stateRef.current.flowers.find(f => f.id === fid);
          
          if (pf) {
            controls.enabled = false; // Disable orbit camera while dragging
            grabbedFlowerId = fid;
            pf.isGrabbed = true;

            // Determine if grabbed head or base/stem
            grabPart = isHead ? 'head' : 'base';
            pf.grabPart = grabPart;

            onSelectFlower(fid);

            // Establish plane parallel to camera, passing through the clicked point
            const hitPoint = intersects[0].point;
            const camDir = new THREE.Vector3();
            camera.getWorldDirection(camDir);
            dragPlane.setFromNormalAndCoplanarPoint(camDir.negate(), hitPoint);

            // Track dragging offset
            const anchorPoint = grabPart === 'head' 
              ? new THREE.Vector3(pf.head.x, pf.head.y, pf.head.z)
              : new THREE.Vector3(pf.base.x, pf.base.y, pf.base.z);
            dragOffset.copy(hitPoint).sub(anchorPoint);
          }
        }
      } else {
        // Deselect if clicking on background
        onSelectFlower(null);
      }
    }

    function onMouseUp() {
      if (grabbedFlowerId) {
        const pf = stateRef.current.flowers.find(f => f.id === grabbedFlowerId);
        if (pf) {
          pf.isGrabbed = false;
          pf.grabPart = undefined;
          pf.dragContainment = undefined;

          // SNAP logic when flower is released inside the vase / onto holder
          const v = stateRef.current.vase;
          const currentH = stateRef.current.holderType;
          
          const basePos = new THREE.Vector3(pf.base.x, pf.base.y, pf.base.z);
          const headPos = new THREE.Vector3(pf.head.x, pf.head.y, pf.head.z);
          const distFromAxis = Math.sqrt(basePos.x * basePos.x + basePos.z * basePos.z);

          // If released near the vase neck or vase body
          const isOverVase = basePos.y < v.height + 1.5 && distFromAxis < v.maxRadius + 1.0;

          if (isOverVase) {
            // Snaps into active holder system
            pf.holderType = currentH;
            
            if (currentH === 'kenzan') {
              // Snap to the plate bottom (Y=0.12 + 0.15)
              pf.base.y = 0.27;
              pf.isPinned = true;
              
              // Limit base horizontal position to stay on kenzan
              const maxKenzanRad = v.baseRadius * 0.85;
              const r = Math.sqrt(pf.base.x * pf.base.x + pf.base.z * pf.base.z);
              if (r > maxKenzanRad) {
                pf.base.x = (pf.base.x / r) * maxKenzanRad;
                pf.base.z = (pf.base.z / r) * maxKenzanRad;
              }

              // Re-constrain flower length
              const dir = new THREE.Vector3(pf.head.x - pf.base.x, pf.head.y - pf.base.y, pf.head.z - pf.base.z).normalize();
              pf.head.x = pf.base.x + dir.x * pf.length;
              pf.head.y = pf.base.y + dir.y * pf.length;
              pf.head.z = pf.base.z + dir.z * pf.length;

            } else if (currentH === 'foam') {
              // Lock into foam (Y between 0.12 and 0.12 + H_foam)
              const foamHeight = v.height * 0.5;
              pf.base.y = Math.min(foamHeight + 0.12, Math.max(0.12, pf.base.y));
              pf.isPinned = true;

              const maxFoamRad = v.baseRadius * 0.85;
              const r = Math.sqrt(pf.base.x * pf.base.x + pf.base.z * pf.base.z);
              if (r > maxFoamRad) {
                pf.base.x = (pf.base.x / r) * maxFoamRad;
                pf.base.z = (pf.base.z / r) * maxFoamRad;
              }

              const dir = new THREE.Vector3(pf.head.x - pf.base.x, pf.head.y - pf.base.y, pf.head.z - pf.base.z).normalize();
              pf.head.x = pf.base.x + dir.x * pf.length;
              pf.head.y = pf.base.y + dir.y * pf.length;
              pf.head.z = pf.base.z + dir.z * pf.length;

            } else {
              // Natural Vase: let physics take over! Set initial resting values
              pf.isPinned = false;
            }

            // Force full sync back to React state and reset Verlet histories to prevent explosive release
            pf.prevBase.x = pf.base.x; pf.prevBase.y = pf.base.y; pf.prevBase.z = pf.base.z;
            pf.prevHead.x = pf.head.x; pf.prevHead.y = pf.head.y; pf.prevHead.z = pf.head.z;

            onUpdateFlowerPhysics(pf.id, new THREE.Vector3(pf.base.x, pf.base.y, pf.base.z), new THREE.Vector3(pf.head.x, pf.head.y, pf.head.z));
          } else {
            // DISCARD/TRASH animation!
            const group = flowerMeshesMap.get(pf.id);
            if (group) {
              // Remove from standard flowersGroup, add to discardGroup
              flowersGroup.remove(group);
              discardGroup.add(group);

              discardingFlowersRef.current.set(pf.id, {
                progress: 1.0,
                flower: { ...pf },
                mesh: group
              });
              flowerMeshesMap.delete(pf.id);
            }
            onRemoveFlower(pf.id);
          }
        }
        grabbedFlowerId = null;
        controls.enabled = true;
      }
    }

    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);

    // --- 7. Real-Time Physics & Animation Loop ---
    let animationFrameId: number;
    const gravity = 0.025; // increased gravity to make flowers fall quickly
    const physicsSteps = 10; // slightly higher substeps to make constraints ultra stiff

    const tick = () => {
      const activeVase = stateRef.current.vase;
      const activeHolder = stateRef.current.holderType;
      const activeFlowers = stateRef.current.flowers;

      // 1. Rebuild or adjust Three.js objects to match React state structure
      // A. Build Environment (Vase, background, etc) on change
      buildEnvironment(stateRef.current.sceneConfig.backgroundType, stateRef.current.sceneConfig.tableTexture);
      buildVaseMesh(activeVase);

      // B. Manage Flower meshes (create new, remove deleted, update parameters)
      // Check for removed flowers
      for (const [id, mesh] of flowerMeshesMap.entries()) {
        if (!activeFlowers.find(f => f.id === id)) {
          flowersGroup.remove(mesh);
          flowerMeshesMap.delete(id);
        }
      }

      // Add or update flowers
      activeFlowers.forEach(pf => {
        let group = flowerMeshesMap.get(pf.id);
        if (!group) {
          group = buildFlowerMesh(pf);
          flowersGroup.add(group);
          flowerMeshesMap.set(pf.id, group);
        } else {
          // Check if petal color or length has been changed in sidebar, if so, rebuild head/stem
          const wasColor = group.userData.color;
          const wasLength = group.userData.length;
          const wasScale = group.userData.scale;
          if (wasColor !== pf.color || wasLength !== pf.length || wasScale !== pf.scale) {
            flowersGroup.remove(group);
            group = buildFlowerMesh(pf);
            flowersGroup.add(group);
            flowerMeshesMap.set(pf.id, group);
          }
        }
      });

      // Animate and render discarding flowers (smooth shrink & tumble-away)
      discardingFlowersRef.current.forEach((data, id) => {
        data.progress -= 0.05; // 20 frames to disappear
        if (data.progress <= 0) {
          discardGroup.remove(data.mesh);
          data.mesh.traverse((child: any) => {
            if (child.isMesh) {
              if (child.geometry) child.geometry.dispose();
              if (Array.isArray(child.material)) {
                child.material.forEach((m: any) => m.dispose());
              } else if (child.material) {
                child.material.dispose();
              }
            }
          });
          discardingFlowersRef.current.delete(id);
        } else {
          data.mesh.scale.setScalar(data.progress);
          data.mesh.position.y -= 0.06;
          data.mesh.rotation.x += 0.04;
          data.mesh.rotation.y += 0.03;
          data.mesh.rotation.z += 0.05;
        }
      });

      // 2. Physics simulation pass (only for non-pinned / natural vase flowers under gravity)
      activeFlowers.forEach(pf => {
        if (pf.isGrabbed) return;

        // Gravity affects natural / vase-resting stems
        if (pf.holderType === 'natural' && !pf.isPinned) {
          const baseVec = new THREE.Vector3(pf.base.x, pf.base.y, pf.base.z);
          const headVec = new THREE.Vector3(pf.head.x, pf.head.y, pf.head.z);
          
          const prevBaseVec = new THREE.Vector3(pf.prevBase.x, pf.prevBase.y, pf.prevBase.z);
          const prevHeadVec = new THREE.Vector3(pf.prevHead.x, pf.prevHead.y, pf.prevHead.z);

          // Verlet velocity (current - previous)
          const velBase = baseVec.clone().sub(prevBaseVec);
          const velHead = headVec.clone().sub(prevHeadVec);

          // Adaptive damping to settle natural flowers to rest without jitter
          let damping = 0.94; // high damping factor = very low friction, falls extremely fast!
          const speedSq = velBase.lengthSq() + velHead.lengthSq();
          if (speedSq < 0.01) {
            damping = 0.12; // heavy damping near rest to stop completely and avoid bouncing back
          }
          if (speedSq < 0.0001) {
            damping = 0.0; // sleep completely
          }

          velBase.multiplyScalar(damping);
          velHead.multiplyScalar(damping);

          // Store current as previous for next frame
          pf.prevBase.x = pf.base.x; pf.prevBase.y = pf.base.y; pf.prevBase.z = pf.base.z;
          pf.prevHead.x = pf.head.x; pf.prevHead.y = pf.head.y; pf.prevHead.z = pf.head.z;

          // Apply velocity
          pf.base.x += velBase.x; pf.base.y += velBase.y; pf.base.z += velBase.z;
          pf.head.x += velHead.x; pf.head.y += velHead.y; pf.head.z += velHead.z;

          // Gravity pulls flower head and base down.
          // Only pull down if not sleeping
          if (damping > 0) {
            pf.head.y -= gravity * 1.8; // accelerated gravity pull for heads
            pf.base.y -= gravity * 1.2; // base follows fast as well
          }
        } else if ((pf.holderType === 'kenzan' || pf.holderType === 'foam') && pf.isPinned) {
          // Pinned flower has base perfectly locked.
          const baseVec = new THREE.Vector3(pf.base.x, pf.base.y, pf.base.z);
          const headVec = new THREE.Vector3(pf.head.x, pf.head.y, pf.head.z);
          
          const prevHeadVec = new THREE.Vector3(pf.prevHead.x, pf.prevHead.y, pf.prevHead.z);
          const velHead = headVec.clone().sub(prevHeadVec);

          // Adaptive damping for pinned heads
          let damping = 0.78;
          const speedSq = velHead.lengthSq();
          if (speedSq < 0.005) {
            damping = 0.12;
          }
          if (speedSq < 0.0001) {
            damping = 0.0;
          }
          velHead.multiplyScalar(damping);
          
          pf.prevHead.x = pf.head.x; pf.prevHead.y = pf.head.y; pf.prevHead.z = pf.head.z;
          
          pf.head.x += velHead.x;
          pf.head.y += velHead.y;
          pf.head.z += velHead.z;

          // Gravity and tilt spring
          if (damping > 0) {
            // Pull of gravity on head
            pf.head.y -= gravity * 0.35;

            // Rotational spring: pull towards upright (or toward its current layout vector)
            const tiltResistance = 0.025; // increased slightly to settle quicker
            const idealUpright = new THREE.Vector3(pf.head.x - pf.base.x, pf.head.y - pf.base.y, pf.head.z - pf.base.z).normalize();
            idealUpright.y += 0.04; // pull slightly upward
            idealUpright.normalize();

            const targetHead = baseVec.clone().addScaledVector(idealUpright, pf.length);
            pf.head.x += (targetHead.x - pf.head.x) * tiltResistance;
            pf.head.y += (targetHead.y - pf.head.y) * tiltResistance;
            pf.head.z += (targetHead.z - pf.head.z) * tiltResistance;
          }
        }
      });

      // Solve collision and length constraints (Physics Sub-stepping)
      for (let step = 0; step < physicsSteps; step++) {
        activeFlowers.forEach(pf => {
          if (pf.isGrabbed) return;
          resolveSingleFlowerCollisions(pf, undefined, false);
        });

        // C. Inter-stem Repulsion (so stems spread out beautifully inside the vase)
        for (let i = 0; i < activeFlowers.length; i++) {
          for (let j = i + 1; j < activeFlowers.length; j++) {
            const fA = activeFlowers[i];
            const fB = activeFlowers[j];

            if (fA.isGrabbed || fB.isGrabbed) continue;

            // Simple base & mid-stem repulsion
            const bA = new THREE.Vector3(fA.base.x, fA.base.y, fA.base.z);
            const bB = new THREE.Vector3(fB.base.x, fB.base.y, fB.base.z);

            const dist = bA.distanceTo(bB);
            const minRepel = 0.14; // minimum stem clearance

            if (dist < minRepel && dist > 0.01) {
              const push = new THREE.Vector3().subVectors(bA, bB).normalize().multiplyScalar((minRepel - dist) * 0.04);
              // Only push horizontally
              push.y = 0;

              if (!fA.isPinned) {
                fA.base.x += push.x;
                fA.base.z += push.z;
              }
              if (!fB.isPinned) {
                fB.base.x -= push.x;
                fB.base.z -= push.z;
              }
            }
          }
        }
      }

      // 3. Update the visual position of all meshes in the scene
      activeFlowers.forEach(pf => {
        const group = flowerMeshesMap.get(pf.id);
        if (group) {
          const b = new THREE.Vector3(pf.base.x, pf.base.y, pf.base.z);
          const h = new THREE.Vector3(pf.head.x, pf.head.y, pf.head.z);
          updateFlowerMeshPositions(group, b, h, pf);
        }
      });

      // 4. Grid and Shadows helper toggling
      const wasGrid = helpersGroup.getObjectByName('grid_helper');
      if (stateRef.current.sceneConfig.showGrid && !wasGrid) {
        const grid = new THREE.GridHelper(10, 20, 0x9ca3af, 0xe5e7eb);
        grid.name = 'grid_helper';
        grid.position.y = 0.01;
        helpersGroup.add(grid);
      } else if (!stateRef.current.sceneConfig.showGrid && wasGrid) {
        helpersGroup.remove(wasGrid);
      }

      // Update spotLight shadow casting based on state
      spotLight.castShadow = stateRef.current.sceneConfig.showShadows;
      if (tableMesh) tableMesh.receiveShadow = stateRef.current.sceneConfig.showShadows;

      // Render scene
      controls.update();
      renderer.render(scene, camera);

      animationFrameId = requestAnimationFrame(tick);
    };

    // Initialize environment & vase
    buildEnvironment(stateRef.current.sceneConfig.backgroundType, stateRef.current.sceneConfig.tableTexture);
    buildVaseMesh(stateRef.current.vase);
    
    // Mount main groupings
    scene.add(tableGroup);
    scene.add(vaseGroup);
    scene.add(flowersGroup);
    scene.add(discardGroup);
    scene.add(helpersGroup);

    // Start loop
    tick();

    // Resize handler
    const handleResize = () => {
      if (!containerRef.current || !renderer || !camera) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight || 600;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      
      // Dispose geometry/materials
      scene.clear();
      renderer.dispose();
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full relative" id="canvas-container">
      <canvas ref={canvasRef} className="w-full h-full block" id="three-canvas" />
      
      {/* 3D Orbit Indicator */}
      <div className="absolute bottom-4 right-4 pointer-events-none bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-[11px] text-white/90 font-sans tracking-wide shadow-lg flex items-center gap-1.5" id="3d-orbit-indicator">
        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
        按住鼠标左键并拖拽旋转视图 | 滚轮缩放
      </div>
    </div>
  );
}
