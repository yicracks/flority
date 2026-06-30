import { useState, useCallback, useEffect } from 'react';
import * as THREE from 'three';
import { 
  Flower, 
  HelpCircle, 
  Sparkles, 
  RotateCcw, 
  Layers, 
  Info,
  Maximize2,
  Minimize2,
  Droplets,
  FolderOpen
} from 'lucide-react';
import Sidebar from './components/Sidebar';
import ThreeCanvas from './components/ThreeCanvas';
import { FlowerType, VaseType, PlacedFlower, HolderType, SceneConfig } from './types';
import { BUILTIN_FLOWERS, BUILTIN_VASES } from './data';

export default function App() {
  const [currentVase, setCurrentVase] = useState<VaseType>(BUILTIN_VASES[0]); // Classic Cylinder
  const [currentHolder, setCurrentHolder] = useState<HolderType>('natural');
  const [flowers, setFlowers] = useState<PlacedFlower[]>([]);
  const [selectedFlowerId, setSelectedFlowerId] = useState<string | null>(null);
  const [waterLevel, setWaterLevel] = useState<number>(0.55);
  const [sceneConfig, setSceneConfig] = useState<SceneConfig>({
    backgroundType: 'wooden_tea_room',
    tableTexture: 'walnut',
    showGrid: false,
    showShadows: true,
    showKenzanMesh: true
  });
  
  // Floating onboarding help overlay
  const [showHelp, setShowHelp] = useState<boolean>(true);

  const selectedFlower = flowers.find(f => f.id === selectedFlowerId);

  // Initialize with a simple pre-placed flower so the user is greeted with something beautiful immediately
  useEffect(() => {
    // Let's spawn 3 matching flowers to begin with
    const initialFlowers: PlacedFlower[] = [
      {
        id: `initial_rose_1`,
        flowerType: BUILTIN_FLOWERS[0], // Rose
        color: '#E11D48', // Red
        length: 5.2,
        scale: 1.0,
        base: { x: -0.15, y: 1.8, z: 0.1 },
        head: { x: -0.8, y: 5.5, z: 0.2 },
        prevBase: { x: -0.15, y: 1.8, z: 0.1 },
        prevHead: { x: -0.8, y: 5.5, z: 0.2 },
        holderType: 'natural',
        isPinned: false,
        isGrabbed: false
      },
      {
        id: `initial_lily_1`,
        flowerType: BUILTIN_FLOWERS[1], // Lily
        color: '#FFFDF0', // White
        length: 6.2,
        scale: 1.15,
        base: { x: 0.1, y: 1.2, z: -0.1 },
        head: { x: 0.4, y: 6.2, z: -0.3 },
        prevBase: { x: 0.1, y: 1.2, z: -0.1 },
        prevHead: { x: 0.4, y: 6.2, z: -0.3 },
        holderType: 'natural',
        isPinned: false,
        isGrabbed: false
      },
      {
        id: `initial_eucalyptus_1`,
        flowerType: BUILTIN_FLOWERS[6], // Eucalyptus
        color: '#849280', // green
        length: 6.6,
        scale: 0.9,
        base: { x: 0.15, y: 1.5, z: 0.15 },
        head: { x: -0.3, y: 6.6, z: -0.5 },
        prevBase: { x: 0.15, y: 1.5, z: 0.15 },
        prevHead: { x: -0.3, y: 6.6, z: -0.5 },
        holderType: 'natural',
        isPinned: false,
        isGrabbed: false
      }
    ];
    setFlowers(initialFlowers);
  }, []);

  // Sync physics calculations back to React state when dragged
  const handleUpdateFlowerPhysics = useCallback((id: string, base: THREE.Vector3, head: THREE.Vector3) => {
    setFlowers(prev => prev.map(f => {
      if (f.id === id) {
        return {
          ...f,
          base: { x: base.x, y: base.y, z: base.z },
          head: { x: head.x, y: head.y, z: head.z }
        };
      }
      return f;
    }));
  }, []);

  const handleSelectFlower = useCallback((id: string | null) => {
    setSelectedFlowerId(id);
  }, []);

  // Add a new flower from the shop shelf
  const handleAddFlower = useCallback((ft: FlowerType) => {
    const id = `flower_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    
    // Spawn hovering slightly above the vase, let physics pull it down
    // Random offset so flowers don't stack perfectly on top of each other
    const rx = (Math.random() - 0.5) * 0.4;
    const rz = (Math.random() - 0.5) * 0.4;
    const len = ft.defaultLength;

    const baseHeight = currentVase.height + 0.8;
    const base = { x: rx, y: baseHeight, z: rz };
    const head = { x: rx * 1.5, y: baseHeight + len, z: rz * 1.5 };

    const newPlacedFlower: PlacedFlower = {
      id,
      flowerType: ft,
      color: ft.defaultColor,
      length: len,
      scale: ft.defaultScale,
      base,
      head,
      prevBase: { ...base },
      prevHead: { ...head },
      holderType: currentHolder,
      isPinned: currentHolder === 'kenzan' || currentHolder === 'foam',
      isGrabbed: false
    };

    setFlowers(prev => [...prev, newPlacedFlower]);
    setSelectedFlowerId(id); // focus on newly added flower
  }, [currentVase, currentHolder]);

  const handleRemoveFlower = useCallback((id: string) => {
    setFlowers(prev => prev.filter(f => f.id !== id));
    if (selectedFlowerId === id) {
      setSelectedFlowerId(null);
    }
  }, [selectedFlowerId]);

  const handleUpdateFlowerProps = useCallback((id: string, updates: Partial<PlacedFlower>) => {
    setFlowers(prev => prev.map(f => {
      if (f.id === id) {
        const updatedFlower = { ...f, ...updates };

        // If length changed, adjust head position to match the new length along current stem direction
        if (updates.length !== undefined) {
          const dir = new THREE.Vector3(f.head.x - f.base.x, f.head.y - f.base.y, f.head.z - f.base.z).normalize();
          const newHead = new THREE.Vector3(f.base.x, f.base.y, f.base.z).addScaledVector(dir, updates.length);
          updatedFlower.head = { x: newHead.x, y: newHead.y, z: newHead.z };
          updatedFlower.prevHead = { x: newHead.x, y: newHead.y, z: newHead.z };
        }

        return updatedFlower;
      }
      return f;
    }));
  }, []);

  const handleClearFlowers = useCallback(() => {
    setFlowers([]);
    setSelectedFlowerId(null);
  }, []);

  // Advanced arrangement: Spawn a beautiful preset mixed bouquet in real time
  const handleSpawnRandomBouquet = useCallback(() => {
    handleClearFlowers();

    // Define 3 color themes
    const themes = [
      {
        name: '浪漫粉黛 (Romantic Pastel)',
        flowersList: [
          { type: BUILTIN_FLOWERS[0], color: '#E11D48', count: 3 }, // Rose Red
          { type: BUILTIN_FLOWERS[0], color: '#FDA4AF', count: 2 }, // Rose Pink
          { type: BUILTIN_FLOWERS[1], color: '#FFFDF0', count: 2 }, // Lily White
          { type: BUILTIN_FLOWERS[5], color: '#F472B6', count: 2 }, // Carnation Pink
          { type: BUILTIN_FLOWERS[6], color: '#849280', count: 3 }, // Eucalyptus Green
          { type: BUILTIN_FLOWERS[8], color: '#F9FAFB', count: 3 }  // Baby's Breath White
        ]
      },
      {
        name: '夏日朝阳 (Sunny Glow)',
        flowersList: [
          { type: BUILTIN_FLOWERS[2], color: '#F59E0B', count: 3 }, // Sunflower Yellow
          { type: BUILTIN_FLOWERS[3], color: '#FBBF24', count: 3 }, // Tulip Yellow
          { type: BUILTIN_FLOWERS[4], color: '#FEF08A', count: 2 }, // Chrysanthemum Light Yellow
          { type: BUILTIN_FLOWERS[6], color: '#607A66', count: 3 }, // Eucalyptus Dark Green
          { type: BUILTIN_FLOWERS[8], color: '#E0F2FE', count: 2 }  // Baby's Breath Soft Blue
        ]
      },
      {
        name: '和气禅意 (Zen Calmness)',
        flowersList: [
          { type: BUILTIN_FLOWERS[1], color: '#FFFDF0', count: 2 }, // Lily White
          { type: BUILTIN_FLOWERS[7], color: '#A78BFA', count: 4 }, // Lavender Purple
          { type: BUILTIN_FLOWERS[4], color: '#BBF7D0', count: 3 }, // Chrysanthemum Light Green
          { type: BUILTIN_FLOWERS[6], color: '#A1B19E', count: 3 }  // Eucalyptus Pale Green
        ]
      }
    ];

    const chosenTheme = themes[Math.floor(Math.random() * themes.length)];
    const generatedFlowers: PlacedFlower[] = [];

    let count = 0;
    chosenTheme.flowersList.forEach(entry => {
      for (let i = 0; i < entry.count; i++) {
        const id = `bouquet_flower_${count}_${Date.now()}`;
        
        // Stagger spawn coordinates so they slide past each other and spread
        const rx = (Math.random() - 0.5) * 0.7;
        const rz = (Math.random() - 0.5) * 0.7;
        const len = entry.type.defaultLength + (Math.random() - 0.5) * 0.5; // slight length variety
        const scale = entry.type.defaultScale + (Math.random() - 0.5) * 0.15; // slight scale variety

        const spawnY = currentVase.height + 0.5 + Math.random() * 2.0; // staggered drops

        const base = { x: rx, y: spawnY, z: rz };
        const head = { 
          x: rx * 1.6 + (Math.random() - 0.5) * 0.2, 
          y: spawnY + len, 
          z: rz * 1.6 + (Math.random() - 0.5) * 0.2 
        };

        generatedFlowers.push({
          id,
          flowerType: entry.type,
          color: entry.color,
          length: len,
          scale,
          base,
          head,
          prevBase: { ...base },
          prevHead: { ...head },
          holderType: currentHolder,
          isPinned: currentHolder === 'kenzan' || currentHolder === 'foam',
          isGrabbed: false
        });

        count++;
      }
    });

    setFlowers(generatedFlowers);
  }, [currentVase, currentHolder]);

  // Adjust coordinates and holders when container vase is switched
  const handleSelectVase = useCallback((newVase: VaseType) => {
    setCurrentVase(newVase);
    
    // Check if current holder is supported in new vase, otherwise fallback to the first supported
    let newHolder = currentHolder;
    if (!newVase.supportedHolders.includes(currentHolder)) {
      newHolder = newVase.supportedHolders[0];
      setCurrentHolder(newHolder);
    }

    // Adapt existing flowers to the new vase dimensions!
    // Shift base heights so they align with the new floor/rim height
    setFlowers(prev => prev.map(f => {
      const isPinned = newHolder === 'kenzan' || newHolder === 'foam';
      
      let baseHeight = 0.12; // default natural floor
      if (newHolder === 'kenzan') baseHeight = 0.27; // kenzan plate floor
      if (newHolder === 'foam') baseHeight = newVase.height * 0.35; // halfway up foam

      const base = {
        x: Math.min(newVase.baseRadius * 0.6, Math.max(-newVase.baseRadius * 0.6, f.base.x)),
        y: baseHeight,
        z: Math.min(newVase.baseRadius * 0.6, Math.max(-newVase.baseRadius * 0.6, f.base.z))
      };

      // Recalculate head position based on current angle & new length
      const dir = new THREE.Vector3(f.head.x - f.base.x, f.head.y - f.base.y, f.head.z - f.base.z).normalize();
      // Ensure head is at least above vase neck
      if (dir.y < 0.2) dir.y = 0.7; // push upright
      dir.normalize();

      const head = {
        x: base.x + dir.x * f.length,
        y: base.y + dir.y * f.length,
        z: base.z + dir.z * f.length
      };

      return {
        ...f,
        base,
        head,
        prevBase: { ...base },
        prevHead: { ...head },
        holderType: newHolder,
        isPinned
      };
    }));
  }, [currentHolder]);

  const handleChangeHolder = useCallback((newHolder: HolderType) => {
    setCurrentHolder(newHolder);

    // If changing holder, let's update pinning on all currently placed flowers
    setFlowers(prev => prev.map(f => {
      const isPinned = newHolder === 'kenzan' || newHolder === 'foam';
      
      let baseHeight = 0.12;
      if (newHolder === 'kenzan') baseHeight = 0.27;
      if (newHolder === 'foam') baseHeight = currentVase.height * 0.35;

      const base = { ...f.base, y: baseHeight };
      
      // Keep direction, calculate head
      const dir = new THREE.Vector3(f.head.x - f.base.x, f.head.y - f.base.y, f.head.z - f.base.z).normalize();
      const head = {
        x: base.x + dir.x * f.length,
        y: base.y + dir.y * f.length,
        z: base.z + dir.z * f.length
      };

      return {
        ...f,
        base,
        head,
        prevBase: { ...base },
        prevHead: { ...head },
        holderType: newHolder,
        isPinned
      };
    }));
  }, [currentVase]);

  const handleUpdateSceneConfig = useCallback((updates: Partial<SceneConfig>) => {
    setSceneConfig(prev => ({ ...prev, ...updates }));
  }, []);

  return (
    <div className="flex flex-col md:flex-row h-screen w-screen bg-slate-950 overflow-hidden text-slate-100 font-sans" id="app-root">
      
      {/* 3D View Stage Main Area */}
      <div className="flex-1 relative flex flex-col h-[55vh] md:h-full overflow-hidden" id="stage-area">
        
        {/* Help Onboarding Dialog Toggle */}
        <button 
          onClick={() => setShowHelp(h => !h)}
          className="absolute top-4 left-4 z-10 p-2.5 bg-slate-900/80 hover:bg-slate-800 backdrop-blur-md rounded-xl border border-slate-700/80 shadow-lg text-slate-300 hover:text-white transition-all flex items-center gap-1.5 text-xs font-semibold"
          id="help-toggle-btn"
        >
          <HelpCircle className="w-4 h-4 text-rose-400" />
          {showHelp ? "收起指引" : "插花物理指引"}
        </button>

        {/* Onboarding Box */}
        {showHelp && (
          <div className="absolute top-16 left-4 z-10 max-w-sm bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-700/50 shadow-2xl p-4 text-slate-300 space-y-3 animate-fade-in" id="help-box">
            <h3 className="font-semibold text-xs text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-rose-400" />
              插花大师物理引擎指引
            </h3>
            <ul className="text-[11px] space-y-2 list-disc list-inside text-slate-400 leading-relaxed font-sans">
              <li>
                <strong className="text-slate-200">鼠标抓取拖拽：</strong>在3D画布中，点击并按住花朵的花盘（头部）或花茎（底部）可自由在三维空间中移动它。
              </li>
              <li>
                <strong className="text-slate-200">自然碰撞下落：</strong>在<span className="text-blue-400">“瓶口靠立”</span>模式下释放拖拽，花朵会受物理重力落入瓶中，在瓶底和瓶壁间发生滑动碰撞，自然斜依。
              </li>
              <li>
                <strong className="text-slate-200">剑山与花泥锁定：</strong>开启<span className="text-blue-400">“剑山”</span>或<span className="text-blue-400">“花泥”</span>底座。释放拖放时底座将牢牢插入锁死花枝下端，您可以自由调整它的倾斜绽放角度！
              </li>
              <li>
                <strong className="text-slate-200">全方位3D审视：</strong>按住鼠标左键旋转视图，右键平移，滚轮缩放，全方位打量您的艺术之作。
              </li>
            </ul>
            <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
              <span className="text-[10px] text-slate-500 font-mono">3D FLOWERS ARRANGEMENT v1.0</span>
              <button 
                onClick={() => setShowHelp(false)}
                className="text-[10.5px] text-rose-400 hover:text-rose-300 font-semibold"
              >
                我知道了
              </button>
            </div>
          </div>
        )}

        {/* Selected flower quick card on canvas overlay */}
        {selectedFlowerId && (
          <div className="absolute bottom-16 left-4 z-10 bg-slate-900/80 backdrop-blur-md px-4 py-3 rounded-2xl border border-slate-700/50 shadow-xl flex items-center gap-3 animate-slide-up" id="selected-overlay-card">
            <div className="w-7 h-7 rounded-full flex items-center justify-center border" style={{ borderColor: `${selectedFlower?.color}50`, backgroundColor: `${selectedFlower?.color}15` }}>
              <Flower className="w-4 h-4" style={{ color: selectedFlower?.color }} />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-white">已选中：{selectedFlower?.flowerType.name}</h4>
              <p className="text-[10px] text-slate-400 font-mono">
                修剪长度: {(selectedFlower?.length ?? 0) * 10}cm • 绽放度: {Math.round((selectedFlower?.scale ?? 1) * 100)}%
              </p>
            </div>
            <button
              onClick={() => setSelectedFlowerId(null)}
              className="text-[10px] text-slate-500 hover:text-white ml-2 font-mono"
            >
              [取消选择]
            </button>
          </div>
        )}

        {/* 3D WebGL Canvas Component */}
        <div className="w-full h-full flex-1" id="three-stage-wrapper">
          <ThreeCanvas 
            vase={currentVase}
            holderType={currentHolder}
            flowers={flowers}
            selectedFlowerId={selectedFlowerId}
            onSelectFlower={handleSelectFlower}
            onUpdateFlowerPhysics={handleUpdateFlowerPhysics}
            onRemoveFlower={handleRemoveFlower}
            sceneConfig={sceneConfig}
            waterLevel={waterLevel}
          />
        </div>
      </div>

      {/* Control Sidebar */}
      <Sidebar 
        currentVase={currentVase}
        onSelectVase={handleSelectVase}
        currentHolder={currentHolder}
        onChangeHolder={handleChangeHolder}
        flowers={flowers}
        selectedFlowerId={selectedFlowerId}
        onSelectFlower={handleSelectFlower}
        onAddFlower={handleAddFlower}
        onRemoveFlower={handleRemoveFlower}
        onUpdateFlowerProps={handleUpdateFlowerProps}
        onClearFlowers={handleClearFlowers}
        onSpawnRandomBouquet={handleSpawnRandomBouquet}
        waterLevel={waterLevel}
        onUpdateWaterLevel={setWaterLevel}
        sceneConfig={sceneConfig}
        onUpdateSceneConfig={handleUpdateSceneConfig}
      />
    </div>
  );
}
