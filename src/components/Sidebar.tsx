import { useState } from 'react';
import { 
  Flower, 
  Droplets, 
  Trash2, 
  Sparkles, 
  RotateCcw, 
  Camera, 
  Info, 
  Check, 
  Sliders, 
  Eye, 
  Paintbrush, 
  Layers, 
  Maximize2,
  ChevronDown,
  ExternalLink,
  Scissors
} from 'lucide-react';
import { FlowerType, VaseType, PlacedFlower, HolderType, SceneConfig } from '../types';
import { BUILTIN_FLOWERS, BUILTIN_VASES } from '../data';

interface SidebarProps {
  currentVase: VaseType;
  onSelectVase: (v: VaseType) => void;
  
  currentHolder: HolderType;
  onChangeHolder: (h: HolderType) => void;
  
  flowers: PlacedFlower[];
  selectedFlowerId: string | null;
  onSelectFlower: (id: string | null) => void;
  onAddFlower: (f: FlowerType) => void;
  onRemoveFlower: (id: string) => void;
  onUpdateFlowerProps: (id: string, updates: Partial<PlacedFlower>) => void;
  onClearFlowers: () => void;
  onSpawnRandomBouquet: () => void;
  
  waterLevel: number;
  onUpdateWaterLevel: (l: number) => void;
  
  sceneConfig: SceneConfig;
  onUpdateSceneConfig: (updates: Partial<SceneConfig>) => void;
}

export default function Sidebar({
  currentVase,
  onSelectVase,
  currentHolder,
  onChangeHolder,
  flowers,
  selectedFlowerId,
  onSelectFlower,
  onAddFlower,
  onRemoveFlower,
  onUpdateFlowerProps,
  onClearFlowers,
  onSpawnRandomBouquet,
  waterLevel,
  onUpdateWaterLevel,
  sceneConfig,
  onUpdateSceneConfig
}: SidebarProps) {
  const [activeTab, setActiveTab] = useState<'vases' | 'flowers' | 'adjust' | 'env'>('flowers');
  const [showPhotoMode, setShowPhotoMode] = useState(false);

  const selectedFlower = flowers.find(f => f.id === selectedFlowerId);

  // Take screenshot of the threeJS canvas
  const handleTakeScreenshot = () => {
    const canvas = document.getElementById('three-canvas') as HTMLCanvasElement;
    if (!canvas) return;

    // Trigger download
    const link = document.createElement('a');
    link.download = `我的插花艺术-${new Date().toLocaleDateString()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="w-full md:w-96 bg-slate-900 border-l border-slate-800 flex flex-col h-full text-slate-100 shadow-2xl" id="sidebar">
      {/* App Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between" id="app-header">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-rose-500/10 rounded-xl border border-rose-500/20 text-rose-400">
            <Flower className="w-5 h-5 animate-spin-slow" />
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight text-white">3D插花艺术</h1>
            <p className="text-[10px] text-slate-400 font-mono">3D FLOWER ARRANGEMENT STUDIO</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button 
            onClick={handleTakeScreenshot}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors border border-transparent hover:border-slate-700"
            title="保存插花作品截图"
          >
            <Camera className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-slate-800 text-xs font-medium" id="tabs-selector">
        <button
          onClick={() => setActiveTab('vases')}
          className={`flex-1 py-3 text-center border-b-2 transition-all ${
            activeTab === 'vases' 
              ? 'border-rose-500 text-rose-400 bg-rose-950/10' 
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
          }`}
        >
          容器底座
        </button>
        <button
          onClick={() => setActiveTab('flowers')}
          className={`flex-1 py-3 text-center border-b-2 transition-all ${
            activeTab === 'flowers' 
              ? 'border-rose-500 text-rose-400 bg-rose-950/10' 
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
          }`}
        >
          花材工坊
        </button>
        <button
          onClick={() => setActiveTab('adjust')}
          className={`flex-1 py-3 text-center border-b-2 relative transition-all ${
            activeTab === 'adjust' 
              ? 'border-rose-500 text-rose-400 bg-rose-950/10' 
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
          }`}
        >
          细节调整
          {selectedFlowerId && (
            <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('env')}
          className={`flex-1 py-3 text-center border-b-2 transition-all ${
            activeTab === 'env' 
              ? 'border-rose-500 text-rose-400 bg-rose-950/10' 
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
          }`}
        >
          环境特效
        </button>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5" id="tab-content-scroll">
        
        {/* TAB 1: VASES & HOLDERS */}
        {activeTab === 'vases' && (
          <div className="space-y-5 animate-fade-in">
            {/* Vase Catalog */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-rose-400" />
                第一步：选择花器容器
              </h3>
              
              <div className="grid grid-cols-1 gap-2.5">
                {BUILTIN_VASES.map(v => {
                  const isSelected = currentVase.id === v.id;
                  return (
                    <button
                      key={v.id}
                      onClick={() => {
                        onSelectVase(v);
                        // Auto-select supported holder
                        if (!v.supportedHolders.includes(currentHolder)) {
                          onChangeHolder(v.supportedHolders[0]);
                        }
                      }}
                      className={`text-left p-3 rounded-xl border transition-all relative ${
                        isSelected 
                          ? 'bg-rose-950/20 border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.08)]' 
                          : 'bg-slate-800/40 border-slate-800 hover:border-slate-700 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-xs text-white flex items-center gap-1.5">
                            {v.name}
                            {isSelected && <span className="text-[10px] bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded">当前</span>}
                          </h4>
                          <p className="text-[10.5px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                            {v.description}
                          </p>
                        </div>
                      </div>

                      {/* Display specs */}
                      <div className="mt-2.5 flex flex-wrap gap-2 text-[10px] font-mono text-slate-500">
                        <span>高度: {(v.height * 10).toFixed(0)}cm</span>
                        <span>•</span>
                        <span>口径: {(v.rimRadius * 20).toFixed(0)}cm</span>
                        <span>•</span>
                        <span>材质: {v.opacity < 1 ? '水晶玻璃' : '精烧粗陶'}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Holder Fixation Settings */}
            <div className="p-3.5 bg-slate-800/30 rounded-xl border border-slate-800/80 space-y-3">
              <h3 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-blue-400" />
                第二步：设定插花固定底座
              </h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                不同的固定方式会改变花朵的物理堆叠和直立机制。
              </p>

              <div className="grid grid-cols-3 gap-2 pt-1">
                {/* Natural */}
                <button
                  disabled={!currentVase.supportedHolders.includes('natural')}
                  onClick={() => onChangeHolder('natural')}
                  className={`py-2 px-1 text-center rounded-lg border text-xs flex flex-col items-center gap-1.5 transition-all ${
                    !currentVase.supportedHolders.includes('natural')
                      ? 'opacity-30 cursor-not-allowed border-slate-900 bg-slate-900/50 text-slate-600'
                      : currentHolder === 'natural'
                        ? 'bg-blue-500/15 border-blue-500/50 text-blue-400 font-medium'
                        : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                  }`}
                >
                  <div className="text-base">🏺</div>
                  <span>瓶口靠立</span>
                </button>

                {/* Kenzan */}
                <button
                  disabled={!currentVase.supportedHolders.includes('kenzan')}
                  onClick={() => onChangeHolder('kenzan')}
                  className={`py-2 px-1 text-center rounded-lg border text-xs flex flex-col items-center gap-1.5 transition-all ${
                    !currentVase.supportedHolders.includes('kenzan')
                      ? 'opacity-30 cursor-not-allowed border-slate-900 bg-slate-900/50 text-slate-600'
                      : currentHolder === 'kenzan'
                        ? 'bg-blue-500/15 border-blue-500/50 text-blue-400 font-medium'
                        : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                  }`}
                >
                  <div className="text-base">🧲</div>
                  <span>剑山固定</span>
                </button>

                {/* Foam */}
                <button
                  disabled={!currentVase.supportedHolders.includes('foam')}
                  onClick={() => onChangeHolder('foam')}
                  className={`py-2 px-1 text-center rounded-lg border text-xs flex flex-col items-center gap-1.5 transition-all ${
                    !currentVase.supportedHolders.includes('foam')
                      ? 'opacity-30 cursor-not-allowed border-slate-900 bg-slate-900/50 text-slate-600'
                      : currentHolder === 'foam'
                        ? 'bg-blue-500/15 border-blue-500/50 text-blue-400 font-medium'
                        : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                  }`}
                >
                  <div className="text-base">🧱</div>
                  <span>花泥固定</span>
                </button>
              </div>

              {/* Holder Info Text */}
              <div className="p-2.5 bg-slate-950/30 rounded-lg text-[10.5px] text-slate-400 font-mono leading-relaxed mt-2 border border-slate-900/50 flex gap-2">
                <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  {currentHolder === 'natural' && "瓶口靠立：花朵在重力作用下自然滑入瓶底，并依靠瓶口边缘斜斜立住，最真实的物理靠墙体验。"}
                  {currentHolder === 'kenzan' && "剑山固定：中式花道精髓，底部有数百根黄铜尖针。把花拖近底部时会自动插定在针盘上，保持角度站立。"}
                  {currentHolder === 'foam' && "花泥固定：吸水花泥，可以把茎杆以任意深度、任意倾斜角度垂直或斜插在绿色软块上，纹丝不动。"}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: FLOWER SHOP */}
        {activeTab === 'flowers' && (
          <div className="space-y-5 animate-fade-in">
            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-2" id="quick-actions">
              <button
                onClick={onSpawnRandomBouquet}
                className="py-2.5 px-3 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-rose-950/20"
              >
                <Sparkles className="w-3.5 h-3.5" />
                一键生成捧花
              </button>
              <button
                onClick={onClearFlowers}
                disabled={flowers.length === 0}
                className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-300 disabled:opacity-40 disabled:pointer-events-none rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border border-slate-700"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                清空重置
              </button>
            </div>

            {/* Flower Grid Shelf */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Flower className="w-3.5 h-3.5 text-rose-400" />
                  点击鲜花：添加入瓶
                </span>
                <span className="text-[10px] font-mono text-slate-500">已放入: {flowers.length} 枝</span>
              </h3>

              <div className="grid grid-cols-1 gap-2.5">
                {BUILTIN_FLOWERS.map(f => {
                  return (
                    <button
                      key={f.id}
                      onClick={() => onAddFlower(f)}
                      className="text-left p-3 rounded-xl bg-slate-800/40 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/60 transition-all flex gap-3 group relative overflow-hidden"
                    >
                      {/* Flower icon preview */}
                      <div className="w-11 h-11 rounded-lg shrink-0 flex items-center justify-center border border-slate-700/50 shadow-inner group-hover:scale-105 transition-transform" style={{ backgroundColor: `${f.defaultColor}15` }}>
                        <Flower className="w-6 h-6 group-hover:rotate-12 transition-transform" style={{ color: f.defaultColor }} />
                      </div>

                      {/* Text info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between">
                          <h4 className="font-semibold text-xs text-white group-hover:text-rose-300 transition-colors">
                            {f.name}
                          </h4>
                          <span className="text-[9.5px] font-mono text-slate-500 italic">
                            {f.scientificName}
                          </span>
                        </div>
                        <p className="text-[10.5px] text-slate-400 mt-1 line-clamp-1 leading-normal">
                          {f.description}
                        </p>
                        <div className="mt-1.5 flex items-center justify-between">
                          <span className="text-[10px] text-rose-400/90 italic font-sans flex items-center gap-1">
                            <span className="text-[9px] bg-rose-950/30 text-rose-400/80 px-1 py-0.2 rounded font-mono">花语</span>
                            “ {f.meaning} ”
                          </span>
                        </div>
                      </div>

                      {/* Beautiful background hover indicator */}
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-rose-500/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-rose-400 text-xs font-bold">+</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: FINE TUNING CONTROLS */}
        {activeTab === 'adjust' && (
          <div className="space-y-4 animate-fade-in">
            {selectedFlower ? (
              <div className="space-y-5" id="tuning-panel">
                {/* Header of selected */}
                <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center border border-slate-700/50" style={{ backgroundColor: `${selectedFlower.color}15` }}>
                      <Flower className="w-5 h-5" style={{ color: selectedFlower.color }} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-xs text-white">
                        已选：{selectedFlower.flowerType.name}
                      </h4>
                      <p className="text-[9px] font-mono text-slate-500 uppercase">
                        {selectedFlower.holderType === 'natural' ? '壶口自由靠立' : selectedFlower.holderType === 'kenzan' ? '针盘剑山固定' : '深层花泥固定'}
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => onRemoveFlower(selectedFlower.id)}
                    className="p-1.5 bg-red-950/20 border border-red-900/30 text-red-400 hover:bg-red-900/30 hover:border-red-500/50 rounded-lg transition-all"
                    title="修剪删除此支花"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Color swatches */}
                <div className="space-y-2">
                  <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                    <Paintbrush className="w-3.5 h-3.5 text-rose-400" />
                    花瓣颜色选择
                  </span>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {selectedFlower.flowerType.colors.map(color => {
                      const isSelected = selectedFlower.color === color;
                      return (
                        <button
                          key={color}
                          onClick={() => onUpdateFlowerProps(selectedFlower.id, { color })}
                          className={`w-6 h-6 rounded-full border relative transition-transform ${
                            isSelected 
                              ? 'scale-110 ring-2 ring-rose-500 ring-offset-2 ring-offset-slate-900 border-white' 
                              : 'border-slate-800 hover:scale-105'
                          }`}
                          style={{ backgroundColor: color }}
                        >
                          {isSelected && (
                            <Check className="w-3.5 h-3.5 text-white absolute inset-0 m-auto" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Length Modifier */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-medium text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Scissors className="w-3.5 h-3.5 text-rose-400" />
                      修剪枝杆长度
                    </span>
                    <span className="text-[11px] font-mono text-slate-300">{(selectedFlower.length * 10).toFixed(0)} cm</span>
                  </div>
                  <input
                    type="range"
                    min="3.0"
                    max="8.0"
                    step="0.1"
                    value={selectedFlower.length}
                    onChange={(e) => {
                      const len = parseFloat(e.target.value);
                      onUpdateFlowerProps(selectedFlower.id, { length: len });
                    }}
                    className="w-full accent-rose-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] font-mono text-slate-500">
                    <span>短枝 30cm</span>
                    <span>长枝 80cm</span>
                  </div>
                </div>

                {/* Head Scale Modifier */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-medium text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Maximize2 className="w-3.5 h-3.5 text-rose-400" />
                      花朵花盘绽放大小
                    </span>
                    <span className="text-[11px] font-mono text-slate-300">{Math.round(selectedFlower.scale * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="1.8"
                    step="0.05"
                    value={selectedFlower.scale}
                    onChange={(e) => {
                      const sc = parseFloat(e.target.value);
                      onUpdateFlowerProps(selectedFlower.id, { scale: sc });
                    }}
                    className="w-full accent-rose-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] font-mono text-slate-500">
                    <span>紧致含苞 50%</span>
                    <span>繁茂怒放 180%</span>
                  </div>
                </div>

                {/* Tilt Rotation (Only for pinned Kenzan / Foam flowers) */}
                {selectedFlower.isPinned && (
                  <div className="space-y-2.5 p-3.5 bg-slate-800/30 rounded-xl border border-slate-800/80">
                    <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-blue-400" />
                      底座插定偏斜角度
                    </span>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      由于此花已插定在底座中，您可以通过鼠标拖拽花盘，或者通过下方精细旋转参数来调整它的倾斜方向。
                    </p>
                    
                    <button
                      onClick={() => {
                        // Reset head position directly above base
                        const headY = selectedFlower.base.y + selectedFlower.length;
                        onUpdateFlowerProps(selectedFlower.id, {
                          head: { x: selectedFlower.base.x, y: headY, z: selectedFlower.base.z },
                          prevHead: { x: selectedFlower.base.x, y: headY, z: selectedFlower.base.z }
                        });
                      }}
                      className="mt-1 w-full py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs rounded-lg border border-slate-700 text-center font-semibold"
                    >
                      重置为完全垂直
                    </button>
                  </div>
                )}

                <div className="text-[10.5px] text-slate-500 font-mono italic leading-relaxed pt-2 border-t border-slate-800/50">
                  💡 技巧提示：在右侧3D视窗中，可以直接用鼠标拖拽花盘/花茎，在容器中自由晃动并寻找最完美的平衡角度。
                </div>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-slate-800/10 rounded-xl border border-dashed border-slate-800">
                <Flower className="w-10 h-10 text-slate-600 mb-3" />
                <h4 className="text-slate-400 font-medium text-xs">暂无选定花枝</h4>
                <p className="text-[10.5px] text-slate-500 max-w-xs mt-1.5 leading-relaxed">
                  在右侧3D画布中点击任意花枝，或者在此处管理其花瓣颜色、修剪长度和绽放度。
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: ENVIRONMENT & EXTRAS */}
        {activeTab === 'env' && (
          <div className="space-y-5 animate-fade-in">
            {/* Water Control */}
            <div className="p-3.5 bg-slate-800/30 rounded-xl border border-slate-800/80 space-y-3">
              <h3 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Droplets className="w-3.5 h-3.5 text-blue-400" />
                花器储水量
              </h3>
              
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={waterLevel}
                  onChange={(e) => onUpdateWaterLevel(parseFloat(e.target.value))}
                  className="flex-1 accent-blue-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
                <span className="text-xs font-mono text-slate-300 w-12 text-right">
                  {Math.round(waterLevel * 100)}%
                </span>
              </div>
              <p className="text-[10.5px] text-slate-400 leading-relaxed font-sans">
                增加水深。对于琥珀瓶和高细颈喇叭瓶，水面的波纹以及淹没在水中的根部阴影将产生绝美折射！
              </p>
            </div>

            {/* Atmosphere Presets */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                🛋️ 室内空间环境
              </h3>
              
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'warm_studio', name: '暖色摄影棚', icon: '🔆' },
                  { id: 'dark_zen', name: '禅意静谧黑', icon: '🌑' },
                  { id: 'light_gallery', name: '极简白展厅', icon: '🏛️' },
                  { id: 'wooden_tea_room', name: '和风茶室', icon: '🎋' }
                ].map(item => {
                  const isSelected = sceneConfig.backgroundType === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onUpdateSceneConfig({ backgroundType: item.id as any })}
                      className={`p-3 text-left rounded-xl border text-xs flex flex-col gap-1 transition-all ${
                        isSelected 
                          ? 'bg-rose-950/20 border-rose-500/50 text-white font-medium shadow-md shadow-rose-950/10' 
                          : 'bg-slate-800/30 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      <span className="text-base">{item.icon}</span>
                      <span>{item.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Table textures */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                🪵 展示案台材质
              </h3>
              
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'oak', name: '经典橡木' },
                  { id: 'walnut', name: '复古胡桃木' },
                  { id: 'marble', name: '爵士白大理石' },
                  { id: 'white', name: '纯净无瑕白' }
                ].map(item => {
                  const isSelected = sceneConfig.tableTexture === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onUpdateSceneConfig({ tableTexture: item.id as any })}
                      className={`p-2.5 rounded-xl border text-xs text-center transition-all ${
                        isSelected 
                          ? 'bg-rose-950/20 border-rose-500/50 text-white font-medium' 
                          : 'bg-slate-800/30 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      {item.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Settings Toggles */}
            <div className="p-3 bg-slate-800/30 rounded-xl border border-slate-800/80 space-y-2.5">
              <h3 className="text-xs font-semibold text-slate-300">功能开关</h3>
              
              {/* Show Shadows */}
              <label className="flex items-center justify-between text-xs text-slate-400 cursor-pointer select-none hover:text-slate-200 py-1">
                <span>逼真柔和阴影渲染</span>
                <input
                  type="checkbox"
                  checked={sceneConfig.showShadows}
                  onChange={(e) => onUpdateSceneConfig({ showShadows: e.target.checked })}
                  className="w-4 h-4 accent-rose-500 bg-slate-900 border-slate-700 rounded"
                />
              </label>

              {/* Show Grid */}
              <label className="flex items-center justify-between text-xs text-slate-400 cursor-pointer select-none hover:text-slate-200 py-1">
                <span>辅助网格线参考</span>
                <input
                  type="checkbox"
                  checked={sceneConfig.showGrid}
                  onChange={(e) => onUpdateSceneConfig({ showGrid: e.target.checked })}
                  className="w-4 h-4 accent-rose-500 bg-slate-900 border-slate-700 rounded"
                />
              </label>

              {/* Show Kenzan Spikes */}
              {currentHolder === 'kenzan' && (
                <label className="flex items-center justify-between text-xs text-slate-400 cursor-pointer select-none hover:text-slate-200 py-1">
                  <span>显示剑山尖针实体</span>
                  <input
                    type="checkbox"
                    checked={sceneConfig.showKenzanMesh}
                    onChange={(e) => onUpdateSceneConfig({ showKenzanMesh: e.target.checked })}
                    className="w-4 h-4 accent-rose-500 bg-slate-900 border-slate-700 rounded"
                  />
                </label>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Branding */}
      <div className="p-4 border-t border-slate-800 text-center text-[10px] text-slate-500 font-mono tracking-wider flex items-center justify-center gap-1.5" id="sidebar-footer">
        <span>© 3D FLOWER ARRANGEMENT STUDIO</span>
      </div>
    </div>
  );
}
