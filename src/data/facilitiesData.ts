import hospitalGraph from './hospitalGraph.json';

/**
 * Facilities Metadata and Floor Map Pin Registry
 *
 * Each facility type has a distinct SHAPE + ICON + LABEL for non-color accessibility.
 */

export type FacilityCategory =
  | 'all'
  | 'washroom'
  | 'wheelchair'
  | 'lift'
  | 'ramp'
  | 'drinking_water'
  | 'prayer_room'
  | 'pharmacy';

export type PinShape =
  | 'rounded-square'
  | 'circle'
  | 'double-circle'
  | 'hexagon'
  | 'trapezoid'
  | 'diamond'
  | 'octagon'
  | 'cross';

export interface FacilityPin {
  id: string;
  category: FacilityCategory;
  name: string;
  nameKey: string;
  descriptionKey: string;
  floor: number;
  x: number;
  y: number;
  nodeId: string;
  shape: PinShape;
  iconName: string;
  shapeLabel: string;
  isAccessible: boolean;
  pillarCode?: string;
  bgColor: string;
  strokeColor: string;
}

const facilityStyles: Partial<
  Record<
    FacilityCategory,
    { shape: PinShape; iconName: string; bgColor: string; strokeColor: string }
  >
> = {
  wheelchair: {
    shape: 'rounded-square',
    iconName: 'Accessibility',
    bgColor: '#e1f3ed',
    strokeColor: '#087e69',
  },
  washroom: {
    shape: 'double-circle',
    iconName: 'Accessibility',
    bgColor: '#e1f3ed',
    strokeColor: '#087e69',
  },
  lift: {
    shape: 'hexagon',
    iconName: 'ArrowUpDown',
    bgColor: '#e8f0fc',
    strokeColor: '#2465ba',
  },
  ramp: {
    shape: 'trapezoid',
    iconName: 'TrendingUp',
    bgColor: '#e1f3ed',
    strokeColor: '#087e69',
  },
  drinking_water: {
    shape: 'diamond',
    iconName: 'Droplets',
    bgColor: '#e1f2f5',
    strokeColor: '#167c91',
  },
  pharmacy: {
    shape: 'cross',
    iconName: 'PlusSquare',
    bgColor: '#fff3d9',
    strokeColor: '#956217',
  },
};

// Pin positions and names are derived from the same places as routing.
export const FACILITY_PINS: FacilityPin[] = hospitalGraph.nodes.flatMap(
  (node) => {
    if (!('facilityCategory' in node) || !node.facilityCategory) return [];
    const category = node.facilityCategory as FacilityCategory;
    const style = facilityStyles[category];
    if (!style) return [];
    return [
      {
        id: node.id,
        category,
        name: node.name,
        nameKey: node.nameKey,
        descriptionKey: node.landmarkKey,
        floor: node.floor,
        x: node.x,
        y: node.y,
        nodeId: node.id,
        ...style,
        shapeLabel: node.name,
        isAccessible: true,
        pillarCode: 'pillarCode' in node ? node.pillarCode : undefined,
      },
    ];
  }
);

export const FACILITY_FILTER_OPTIONS: {
  id: FacilityCategory;
  labelKey: string;
  icon: string;
}[] = [
  { id: 'all', labelKey: 'facilities.filter_all', icon: 'Grid' },
  { id: 'washroom', labelKey: 'facilities.filter_washrooms', icon: 'Sparkles' },
  {
    id: 'wheelchair',
    labelKey: 'facilities.filter_wheelchair',
    icon: 'Accessibility',
  },
  { id: 'lift', labelKey: 'facilities.filter_lifts', icon: 'ChevronsUpDown' },
  { id: 'ramp', labelKey: 'facilities.filter_ramps', icon: 'TrendingUp' },
  {
    id: 'drinking_water',
    labelKey: 'facilities.filter_water',
    icon: 'Droplets',
  },
  {
    id: 'pharmacy',
    labelKey: 'facilities.filter_pharmacy',
    icon: 'PlusSquare',
  },
];
