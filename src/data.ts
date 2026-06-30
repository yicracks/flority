import { FlowerType, VaseType } from './types';

export const BUILTIN_FLOWERS: FlowerType[] = [
  {
    id: 'flower_rose',
    name: '玫瑰',
    scientificName: 'Rosa',
    defaultColor: '#E11D48', // Crimson Red
    colors: ['#E11D48', '#FDA4AF', '#FDF2F8', '#F59E0B', '#7C3AED'], // Red, Pink, White, Amber/Yellow, Purple
    stemColor: '#166534', // Dark green
    headType: 'rose',
    defaultLength: 5.0,
    defaultScale: 1.0,
    description: '经典的爱情之花，花瓣层层叠叠，极富层次感，在花艺设计中多作焦点花材。',
    meaning: '热烈真挚的爱、美丽与纯洁。'
  },
  {
    id: 'flower_lily',
    name: '百合',
    scientificName: 'Lilium',
    defaultColor: '#FFFDF0', // Off-white
    colors: ['#FFFDF0', '#FCE7F3', '#FEF3C7'], // White, Pink, Light yellow
    stemColor: '#15803D',
    headType: 'lily',
    defaultLength: 6.0,
    defaultScale: 1.2,
    description: '姿态高雅，花冠呈喇叭形向外展开，带有修长的雄蕊，适合在中高位置展现。',
    meaning: '百年好合、高贵与纯洁。'
  },
  {
    id: 'flower_sunflower',
    name: '向日葵',
    scientificName: 'Helianthus',
    defaultColor: '#F59E0B', // Amber Yellow
    colors: ['#F59E0B', '#D97706'], // Yellow, Deep orange
    stemColor: '#166534',
    headType: 'sunflower',
    defaultLength: 5.5,
    defaultScale: 1.4,
    description: '明艳庞大的花盘，散发着生命力，粗壮的主茎直立，是夏秋季花艺的核心。',
    meaning: '信念、光辉、忠诚与默默的爱。'
  },
  {
    id: 'flower_tulip',
    name: '郁金香',
    scientificName: 'Tulipa',
    defaultColor: '#EA580C', // Orange
    colors: ['#EA580C', '#EC4899', '#FBBF24', '#8B5CF6', '#EF4444'], // Orange, Pink, Yellow, Purple, Red
    stemColor: '#16A34A',
    headType: 'tulip',
    defaultLength: 4.2,
    defaultScale: 0.9,
    description: '杯状花朵优雅内敛，茎杆柔韧有弹性，常在插花中展现柔美曼妙的弧度。',
    meaning: '博爱、高雅、富贵与永恒的祝福。'
  },
  {
    id: 'flower_chrysanthemum',
    name: '乒乓菊',
    scientificName: 'Chrysanthemum',
    defaultColor: '#FEF08A', // Light yellow
    colors: ['#FEF08A', '#FEE2E2', '#BBF7D0', '#FDBA74'], // Yellow, Pink, Light Green, Orange
    stemColor: '#15803D',
    headType: 'chrysanthemum',
    defaultLength: 4.8,
    defaultScale: 0.8,
    description: '花形浑圆可爱，像兵兵球一样。中式花艺中常用其增添禅意与圆满感。',
    meaning: '团圆美满、健康长寿、真诚。'
  },
  {
    id: 'flower_carnation',
    name: '康乃馨',
    scientificName: 'Dianthus caryophyllus',
    defaultColor: '#F472B6', // Pink
    colors: ['#F472B6', '#FDA4AF', '#FDBA74', '#FFF5F5'], // Pink, Peach, Orange, Cream White
    stemColor: '#16A34A',
    headType: 'carnation',
    defaultLength: 4.5,
    defaultScale: 0.95,
    description: '花瓣边缘带有精致的锯齿，重瓣丰富，质感温和，常作色块铺垫或主花。',
    meaning: '感恩、母亲的爱、真情与温馨。'
  },
  {
    id: 'flower_eucalyptus',
    name: '尤加利叶',
    scientificName: 'Eucalyptus',
    defaultColor: '#6B7280', // Dusty green-gray
    colors: ['#849280', '#607A66', '#A1B19E'], // Grays and greens
    stemColor: '#526D57',
    headType: 'eucalyptus',
    defaultLength: 6.5,
    defaultScale: 0.8,
    description: '自带高级灰色调的叶材，圆形叶片成对生长，是衬托鲜花、拉伸线条的绝佳配叶。',
    meaning: '恩赐、回忆、治愈与自然之美。'
  },
  {
    id: 'flower_lavender',
    name: '薰衣草',
    scientificName: 'Lavandula',
    defaultColor: '#8B5CF6', // Purple
    colors: ['#8B5CF6', '#A78BFA', '#6366F1'], // Deep purple, lavender, blue-indigo
    stemColor: '#16A34A',
    headType: 'lavender',
    defaultLength: 5.0,
    defaultScale: 0.7,
    description: '穗状花序，细小的紫蓝色花朵丛生，散发出独特的草本芬芳，为花艺增添浪漫的线条感。',
    meaning: '等待爱情、静谧、浪漫与和合。'
  },
  {
    id: 'flower_babys_breath',
    name: '满天星',
    scientificName: 'Gypsophila',
    defaultColor: '#F9FAFB', // Pure white
    colors: ['#F9FAFB', '#FCE7F3', '#E0F2FE'], // White, Soft Pink, Soft Blue
    stemColor: '#22C55E',
    headType: 'babys_breath',
    defaultLength: 5.5,
    defaultScale: 1.1,
    description: '极细小的白色花朵如繁星散落，蓬松轻盈，是烘托主花、营造梦幻与朦胧氛围的神器。',
    meaning: '配角、纯洁、守望爱情与梦境。'
  }
];

export const BUILTIN_VASES: VaseType[] = [
  {
    id: 'vase_celadon_cylinder',
    name: '青瓷高直筒瓶',
    type: 'cylinder',
    height: 5.5,
    rimRadius: 1.1,
    baseRadius: 1.2,
    maxRadius: 1.2,
    color: '#A7F3D0', // Celadon pale mint
    opacity: 0.95,
    roughness: 0.1,
    metalness: 0.1,
    description: '传统的直筒花瓶，胎质温润如玉，适合插高直的线状花材，能很好地支撑重茎。',
    supportedHolders: ['natural', 'foam']
  },
  {
    id: 'vase_amber_sphere',
    name: '琥珀球形玻璃瓶',
    type: 'spherical',
    height: 4.2,
    rimRadius: 0.9,
    baseRadius: 1.2,
    maxRadius: 2.1,
    color: '#F59E0B', // Amber
    opacity: 0.5, // High transparency
    roughness: 0.05,
    metalness: 0.2,
    description: '球形通透玻璃材质，折射出温暖的琥珀光泽，能清晰看到水中的根茎，别具质感。',
    supportedHolders: ['natural']
  },
  {
    id: 'vase_bronze_bowl',
    name: '禅意青铜浅盘',
    type: 'bowl',
    height: 1.6,
    rimRadius: 3.6,
    baseRadius: 3.2,
    maxRadius: 3.6,
    color: '#374151', // Dark bronze/charcoal
    opacity: 1.0,
    roughness: 0.7,
    metalness: 0.5,
    description: '中式/日式茶道花艺经典浅盘，必须配合剑山（Kenzan）使用，展现出极简孤高的线条美。',
    supportedHolders: ['kenzan']
  },
  {
    id: 'vase_geometric_clay',
    name: '现代极简几何粗陶瓶',
    type: 'geometric',
    height: 5.0,
    rimRadius: 1.2,
    baseRadius: 1.5,
    maxRadius: 1.7,
    color: '#78350F', // Terracotta brown
    opacity: 1.0,
    roughness: 0.8,
    metalness: 0.0,
    description: '粗砺颗粒感的红土烧制，带有雕塑般的棱角面，非常适合现代极简风格的花艺创作。',
    supportedHolders: ['natural', 'foam']
  },
  {
    id: 'vase_tall_neck_glass',
    name: '水晶细颈喇叭瓶',
    type: 'tall_neck',
    height: 6.2,
    rimRadius: 0.6,
    baseRadius: 1.5,
    maxRadius: 1.6,
    color: '#E0F2FE', // Ice blue glass
    opacity: 0.45,
    roughness: 0.02,
    metalness: 0.3,
    description: '颈部极其收细，瓶口微喇，通常只插1-3支优雅的花枝，勾勒高挑挺拔的美。',
    supportedHolders: ['natural']
  }
];
