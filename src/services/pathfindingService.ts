import hospitalGraphData from '../data/hospitalGraph.json';
import { getDepartment } from '../data/departments';

export interface GraphNode {
  id: string;
  name: string;
  nameKey: string;
  floor: number;
  category:
    | 'entrance'
    | 'service'
    | 'facility'
    | 'clinic'
    | 'corridor'
    | 'vertical'
    | 'waiting'
    | 'pillar';
  pillarCode?: string;
  departmentId?: string;
  roomNumber?: string;
  x: number;
  y: number;
  isLandmark?: boolean;
  landmark: string;
  landmarkKey?: string;
  bounds?: { x: number; y: number; width: number; height: number };
  icon?: string;
  mapTone?: string;
  facilityCategory?: string;
}

export interface GraphEdge {
  from: string;
  to: string;
  distance: number;
  type: 'corridor' | 'lift' | 'stairs';
  direction: 'straight' | 'left' | 'right' | 'up' | 'down';
  instruction: string;
  usesStairs?: boolean;
}

export interface GuidanceStep {
  stepNumber: number;
  fromNode: GraphNode;
  toNode: GraphNode;
  edge?: GraphEdge;
  icon:
    | 'arrow-up'
    | 'arrow-left'
    | 'arrow-right'
    | 'elevator'
    | 'stairs'
    | 'map-pin';
  templateKey: string;
  params: {
    landmark: string;
    distance?: number;
    floor?: number;
    room?: string;
    direction?: string;
  };
  floor: number;
}

export interface RouteResult {
  startNode: GraphNode;
  destinationNode: GraphNode;
  path: string[];
  nodes: GraphNode[];
  edges: GraphEdge[];
  steps: GuidanceStep[];
  totalDistance: number;
  estimatedMinutes: number;
  floorsTraversed: number[];
}

export interface PathfindingOptions {
  excludeStairs?: boolean;
}

// Typed graph container
const rawNodes = hospitalGraphData.nodes as GraphNode[];
const rawEdges = hospitalGraphData.edges as GraphEdge[];

// Build symmetric adjacency list
interface Neighbor {
  nodeId: string;
  distance: number;
  edge: GraphEdge;
}

const adjacencyMap = new Map<string, Neighbor[]>();

function initializeAdjacency() {
  adjacencyMap.clear();
  for (const node of rawNodes) {
    adjacencyMap.set(node.id, []);
  }

  for (const edge of rawEdges) {
    // Forward edge
    const fromList = adjacencyMap.get(edge.from);
    if (fromList) {
      fromList.push({
        nodeId: edge.to,
        distance: edge.distance,
        edge,
      });
    }

    // Inverted reverse edge
    const toList = adjacencyMap.get(edge.to);
    if (toList) {
      let revDir: GraphEdge['direction'] = 'straight';
      if (edge.direction === 'left') revDir = 'right';
      else if (edge.direction === 'right') revDir = 'left';
      else if (edge.direction === 'up') revDir = 'down';
      else if (edge.direction === 'down') revDir = 'up';

      toList.push({
        nodeId: edge.from,
        distance: edge.distance,
        edge: {
          from: edge.to,
          to: edge.from,
          distance: edge.distance,
          type: edge.type,
          direction: revDir,
          instruction: edge.instruction,
        },
      });
    }
  }
}

initializeAdjacency();

/**
 * Get all landmarks grouped by floor level (0, 1, 2)
 */
export function getLandmarksGrouped(
  query?: string
): { floor: number; landmarks: GraphNode[] }[] {
  const cleanQuery = query?.toLowerCase().trim() || '';
  const filtered = rawNodes.filter((node) => {
    // Only include meaningful landmarks or clinics or vertical cores
    if (node.category === 'corridor') return false;
    if (!cleanQuery) return true;
    return (
      node.name.toLowerCase().includes(cleanQuery) ||
      (node.pillarCode && node.pillarCode.toLowerCase().includes(cleanQuery)) ||
      (node.roomNumber && node.roomNumber.toLowerCase().includes(cleanQuery))
    );
  });

  const floors = [0, 1, 2];
  return floors.map((f) => ({
    floor: f,
    landmarks: filtered.filter((n) => n.floor === f),
  }));
}

/**
 * Find node by pillar code (case-insensitive, e.g. "F2-P7", "F0-P1")
 */
export function findNodeByPillarCode(code: string): GraphNode | undefined {
  const clean = code.trim().toLowerCase();
  return rawNodes.find(
    (n) =>
      (n.pillarCode && n.pillarCode.toLowerCase() === clean) ||
      n.id.toLowerCase() === clean ||
      (n.roomNumber && n.roomNumber.toLowerCase() === clean)
  );
}

/**
 * Find node by department ID (e.g. "opd-cardiology", "pharmacy")
 */
export function findNodeByDepartmentId(deptId: string): GraphNode | undefined {
  const department = getDepartment(deptId);
  return rawNodes.find(
    (n) => n.id === department?.nodeId || n.departmentId === deptId
  );
}

/**
 * Find node by node ID
 */
export function getNodeById(id: string): GraphNode | undefined {
  const aliases: Record<string, string> = {
    'opd-cardiology': 'opd-general-2',
    'opd-neuro': 'opd-general',
    'billing-f0': 'registration',
    canteen: 'registration',
    'lift-b-f0': 'lift-a-f0',
    'lift-b-f1': 'lift-a-f1',
    'lift-b-f2': 'lift-a-f2',
    'washroom-f1-acc': 'washroom-f1',
    'washroom-f2': 'washroom-f1',
    'water-f1': 'water-f0',
    'water-f2': 'water-f0',
    'waiting-f2': 'nurses-station',
    'pillar-f2-p7': 'nurses-station',
  };
  return rawNodes.find((n) => n.id === (aliases[id] || id));
}

/**
 * Deterministic Dijkstra route computation. The current graph's x/y values
 * are display coordinates, not measured distances, so an A* heuristic would
 * risk selecting a non-shortest route.
 */
export function computeRoute(
  startId: string,
  destId: string,
  options: PathfindingOptions = {}
): RouteResult | null {
  const startNode = getNodeById(startId);
  const destNode = getNodeById(destId);

  if (!startNode || !destNode) return null;
  startId = startNode.id;
  destId = destNode.id;

  if (startId === destId) {
    return {
      startNode,
      destinationNode: destNode,
      path: [startId],
      nodes: [startNode],
      edges: [],
      steps: [
        {
          stepNumber: 1,
          fromNode: startNode,
          toNode: destNode,
          icon: 'map-pin',
          templateKey: 'guidance.step_arrive',
          params: {
            landmark: destNode.name,
            room: destNode.roomNumber || 'Counter',
          },
          floor: destNode.floor,
        },
      ],
      totalDistance: 0,
      estimatedMinutes: 0,
      floorsTraversed: [startNode.floor],
    };
  }

  const distances = new Map<string, number>();
  const previous = new Map<
    string,
    { nodeId: string; edge: GraphEdge } | null
  >();
  const unvisited = new Set<string>();

  for (const node of rawNodes) {
    distances.set(node.id, Infinity);
    previous.set(node.id, null);
    unvisited.add(node.id);
  }

  distances.set(startId, 0);

  while (unvisited.size > 0) {
    // Pick the lowest known cost. Stable IDs resolve equal routes deterministically.
    let currentId: string | null = null;
    let lowestScore = Infinity;

    for (const id of unvisited) {
      const d = distances.get(id)!;
      const score = d;
      if (
        score < lowestScore ||
        (score === lowestScore && currentId !== null && id < currentId)
      ) {
        lowestScore = score;
        currentId = id;
      }
    }

    if (!currentId || distances.get(currentId) === Infinity) {
      break; // No path available
    }

    if (currentId === destId) {
      break; // Destination reached
    }

    unvisited.delete(currentId);

    const neighbors = adjacencyMap.get(currentId) || [];
    for (const neighbor of neighbors) {
      if (!unvisited.has(neighbor.nodeId)) continue;

      // Exclude stairs if requested for wheelchair/mobility accessibility
      if (options.excludeStairs && neighbor.edge.type === 'stairs') {
        continue;
      }

      const alt = distances.get(currentId)! + neighbor.distance;
      if (alt < distances.get(neighbor.nodeId)!) {
        distances.set(neighbor.nodeId, alt);
        previous.set(neighbor.nodeId, {
          nodeId: currentId,
          edge: neighbor.edge,
        });
      }
    }
  }

  // Reconstruct path
  const path: string[] = [];
  const edges: GraphEdge[] = [];
  let curr: string | null = destId;

  while (curr) {
    path.unshift(curr);
    const prevEntry = previous.get(curr);
    if (prevEntry) {
      edges.unshift(prevEntry.edge);
      curr = prevEntry.nodeId;
    } else {
      curr = null;
    }
  }

  // Check if destination was actually reached
  if (path[0] !== startId) {
    return null;
  }

  const nodes = path.map((id) => getNodeById(id)!);
  const totalDistance = edges.reduce((acc, e) => acc + e.distance, 0);
  const estimatedMinutes = Math.max(1, Math.round(totalDistance / 25));

  // Build human-friendly Guidance Steps
  const steps: GuidanceStep[] = [];
  let stepIndex = 1;

  for (let i = 0; i < edges.length; i++) {
    const fromNode = nodes[i];
    const toNode = nodes[i + 1];
    const edge = edges[i];

    let icon: GuidanceStep['icon'] = 'arrow-up';
    let templateKey = 'guidance.step_walk';
    let directionWord = 'straight';

    if (edge.type === 'lift') {
      icon = 'elevator';
      templateKey = 'guidance.step_lift';
    } else if (edge.type === 'stairs') {
      icon = 'stairs';
      templateKey = 'guidance.step_stairs';
    } else {
      // A turn is relative to the preceding corridor, rather than the
      // absolute left/right position of every point on a straight hall.
      const previousNode =
        i > 0 && edges[i - 1].type === 'corridor' ? nodes[i - 1] : null;
      const cross = previousNode
        ? (fromNode.x - previousNode.x) * (toNode.y - fromNode.y) -
          (fromNode.y - previousNode.y) * (toNode.x - fromNode.x)
        : 0;
      if (cross < 0) {
        icon = 'arrow-left';
        directionWord = 'left';
        templateKey = 'guidance.step_turn_walk';
      } else if (cross > 0) {
        icon = 'arrow-right';
        directionWord = 'right';
        templateKey = 'guidance.step_turn_walk';
      } else {
        icon = 'arrow-up';
        directionWord = 'straight';
        templateKey = 'guidance.step_walk';
      }
    }

    // The final walk still needs an instruction; arrival is confirmed by
    // the patient's "I have arrived" action, rather than before they walk it.
    if (i === edges.length - 1 && toNode.id === destId) {
      steps.push({
        stepNumber: stepIndex++,
        fromNode,
        toNode,
        edge,
        icon: 'map-pin',
        templateKey,
        params: {
          landmark: toNode.name,
          room: toNode.roomNumber || 'Counter',
          distance: edge.distance,
          floor: toNode.floor,
          direction: directionWord,
        },
        floor: fromNode.floor,
      });
    } else {
      steps.push({
        stepNumber: stepIndex++,
        fromNode,
        toNode,
        edge,
        icon,
        templateKey,
        params: {
          landmark: toNode.name,
          distance: edge.distance,
          floor: toNode.floor,
          direction: directionWord,
        },
        floor: fromNode.floor,
      });
    }
  }

  const floorsTraversed = Array.from(new Set(nodes.map((n) => n.floor)));

  return {
    startNode,
    destinationNode: destNode,
    path,
    nodes,
    edges,
    steps,
    totalDistance,
    estimatedMinutes,
    floorsTraversed,
  };
}

/**
 * Access the full graph data
 */
export function getHospitalGraph() {
  return hospitalGraphData;
}
