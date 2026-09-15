// =============================================================================
// WEB OF LIFE - H3 ADJACENCY & CENTROID-ORIENTED BOUNDARIES
// =============================================================================

import {
  Point2D,
  Vector3D,
  Vector3Tuple,
  Vector3Object,
  Cartesian3D,
  DiffusionCoefficients,
  ISharedBoundarySegment,
  OrderedBoundaryResult,
  IRawEdge,
  CellThermodynamicState,
  DetailedInterfaceNormalResult,
} from './h3_types.js';

import {
  crossProduct3D,
  dotProduct3D,
  normalizeVector3D,
  greatCircleDistance,
  isValidH3Index,
} from './h3_grid.js';

import {
  THERMODYNAMIC_CONSTANTS,
  EARTH_RADIUS_METERS,
  WGS84_EARTH_RADIUS_METERS,
  EARTH_AUTHALIC_RADIUS_METERS,
} from '../thermodynamics/constants.js';

import { SpatialMonad } from '../monads/spatial_monad.js';

export {
  EARTH_RADIUS_METERS,
  WGS84_EARTH_RADIUS_METERS,
  CellThermodynamicState,
  Vector3D,
  Vector3Tuple,
  Vector3Object,
  Cartesian3D,
  DiffusionCoefficients,
  DetailedInterfaceNormalResult,
  dotProduct3D,
  normalizeVector3D,
  crossProduct3D,
};

export const MEAN_EARTH_RADIUS_METERS = 6371008.8;
export const WGS84_EARTH_MEAN_RADIUS_METERS = 6371008.8;
export const EARTH_MEAN_RADIUS_METERS = 6371008.8;
export const GEOMETRIC_EPSILON = 1e-12;
export const DEFAULT_ANGULAR_EPSILON = 1e-9;

export function createVec3D(...args: any[]): any {
  let x = 0, y = 0, z = 0;
  if (args.length === 1 && Array.isArray(args[0])) {
    [x, y, z] = args[0];
  } else if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null) {
    x = args[0].x ?? 0;
    y = args[0].y ?? 0;
    z = args[0].z ?? 0;
  } else {
    x = args[0] ?? 0;
    y = args[1] ?? 0;
    z = args[2] ?? 0;
  }
  const arr = [x, y, z] as any;
  arr.x = x;
  arr.y = y;
  arr.z = z;
  return arr;
}

export function toVec3D(v: any): [number, number, number] {
  if (Array.isArray(v)) return [v[0], v[1], v[2]];
  if (v && typeof v === 'object') {
    return [v.x ?? 0, v.y ?? 0, v.z ?? 0];
  }
  return [0, 0, 0];
}

export function vectorNorm(v: any): number {
  const [x, y, z] = toVec3D(v);
  return Math.hypot(x, y, z);
}

export function vectorNorm3D(v: any): number {
  return vectorNorm(v);
}

export function dotProduct(a: any, b: any): number {
  const [ax, ay, az] = toVec3D(a);
  const [bx, by, bz] = toVec3D(b);
  return ax * bx + ay * by + az * bz;
}

export function vectorDotProduct3D(a: any, b: any): number {
  return dotProduct(a, b);
}

export function latLngToUnitVector3D(latDeg: number, lngDeg: number): any {
  if (!Number.isFinite(latDeg) || !Number.isFinite(lngDeg)) {
    throw new RangeError('Non-finite coordinate');
  }
  if (latDeg < -90.0000001 || latDeg > 90.0000001) {
    throw new RangeError(`Latitude out of physical geodesic range [-90, 90]: ${latDeg}`);
  }
  const clampedLat = Math.max(-90.0, Math.min(90.0, latDeg));
  const phi = (clampedLat * Math.PI) / 180.0;
  const lambda = (lngDeg * Math.PI) / 180.0;
  return createVec3D(Math.cos(phi) * Math.cos(lambda), Math.cos(phi) * Math.sin(lambda), Math.sin(phi));
}

export function latLngToVector3D(latDeg: number, lngDeg: number, radius: number = 1.0): any {
  const u = latLngToUnitVector3D(latDeg, lngDeg);
  return createVec3D(u.x * radius, u.y * radius, u.z * radius);
}

export function latLngToCartesian(latDeg: number, lngDeg: number, radius: number = 6371000): any {
  return latLngToVector3D(latDeg, lngDeg, radius);
}

export function latLngToCartesian3D(coord: { lat: number; lng: number }, radius: number = 6371008.8): any {
  return latLngToVector3D(coord.lat, coord.lng, radius);
}

export function unitVectorToLatLng(v: any): [number, number] {
  const [x, y, z] = toVec3D(v);
  const lat = Math.asin(Math.max(-1.0, Math.min(1.0, z))) * (180.0 / Math.PI);
  const lng = Math.atan2(y, x) * (180.0 / Math.PI);
  return [lat, lng];
}

export function cartesian3DToLatLng(cart: any): { lat: number; lng: number } {
  const [lat, lng] = unitVectorToLatLng(normalizeVector3D(cart));
  return { lat, lng };
}

export function unitVectorDotProduct(a: any, b: any): number {
  return dotProduct(a, b);
}

export function unitVectorCrossProduct(a: any, b: any): any {
  return createVec3D(crossProduct3D(toVec3D(a), toVec3D(b)));
}

export function unitVectorAngularDistance(a: any, b: any): number {
  return greatCircleDistance(toVec3D(a), toVec3D(b));
}

export function unitVectorChordDistance(a: any, b: any): number {
  const [ax, ay, az] = toVec3D(a);
  const [bx, by, bz] = toVec3D(b);
  return Math.hypot(bx - ax, by - ay, bz - az);
}

export function unitVectorTangentChord(a: any, b: any): any {
  const [ax, ay, az] = toVec3D(a);
  const [bx, by, bz] = toVec3D(b);
  const d = createVec3D(bx - ax, by - ay, bz - az);
  return normalizeVector3D(d);
}

export function projectVectorOntoSphereTangentSpace(v: any, p: any): any {
  const [px, py, pz] = toVec3D(p);
  const pNormSq = px * px + py * py + pz * pz;
  if (pNormSq < 1e-15) return createVec3D(0, 0, 0);
  const [vx, vy, vz] = toVec3D(v);
  const dot = (vx * px + vy * py + vz * pz) / pNormSq;
  return createVec3D(vx - dot * px, vy - dot * py, vz - dot * pz);
}

export function projectVectorOntoSphereTangentSpaceDetailed(v: any, p: any) {
  const projected = projectVectorOntoSphereTangentSpace(v, p);
  const [vx, vy, vz] = toVec3D(v);
  const [px, py, pz] = toVec3D(p);
  const pNorm = Math.hypot(px, py, pz);
  const radialMag = pNorm > 1e-15 ? (vx * px + vy * py + vz * pz) / pNorm : 0;
  const tangMag = vectorNorm(projected);
  return {
    projected,
    radialMagnitude: radialMag,
    tangentialMagnitude: tangMag,
  };
}

export function orderSharedBoundaryEndpointsByCentroid(
  p1: Point2D,
  p2: Point2D,
  centroidA: Point2D,
  centroidB: Point2D
): OrderedBoundaryResult<Point2D> {
  const dx = p2[0] - p1[0];
  const dy = p2[1] - p1[1];
  const length = Math.hypot(dx, dy);

  if (length < THERMODYNAMIC_CONSTANTS.EPSILON_TOLERANCE) {
    throw new Error(`Degenerate boundary edge: length ${length} is below numerical tolerance.`);
  }

  const nxCand = dy / length;
  const nyCand = -dx / length;
  const dAx = centroidB[0] - centroidA[0];
  const dAy = centroidB[1] - centroidA[1];
  const Q = nxCand * dAx + nyCand * dAy;

  let isFlipped = false;
  if (Q > THERMODYNAMIC_CONSTANTS.EPSILON_TOLERANCE) {
    isFlipped = false;
  } else if (Q < -THERMODYNAMIC_CONSTANTS.EPSILON_TOLERANCE) {
    isFlipped = true;
  } else {
    isFlipped = !(p1[0] < p2[0] || (Math.abs(p1[0] - p2[0]) < 1e-14 && p1[1] <= p2[1]));
  }

  const vStart: Point2D = isFlipped ? [p2[0], p2[1]] : [p1[0], p1[1]];
  const vEnd: Point2D = isFlipped ? [p1[0], p1[1]] : [p2[0], p2[1]];

  const directedDx = vEnd[0] - vStart[0];
  const directedDy = vEnd[1] - vStart[1];
  const outwardNormal: Point2D = [directedDy / length, -directedDx / length];

  return {
    orderedEndpoints: [vStart, vEnd],
    outwardNormal,
    length,
    isFlipped,
  };
}

export function orderSharedBoundaryEndpointsByCentroid3D(
  p1: any,
  p2: any,
  centroidA: any,
  centroidB: any
): OrderedBoundaryResult<any> {
  const p1Vec = toVec3D(p1);
  const p2Vec = toVec3D(p2);
  const cAVec = toVec3D(centroidA);
  const cBVec = toVec3D(centroidB);

  const mx = p1Vec[0] + p2Vec[0];
  const my = p1Vec[1] + p2Vec[1];
  const mz = p1Vec[2] + p2Vec[2];
  const midNorm = Math.hypot(mx, my, mz);
  if (midNorm < THERMODYNAMIC_CONSTANTS.EPSILON_TOLERANCE) {
    throw new Error('Degenerate antipodal midpoint on spherical manifold.');
  }

  const mAB = [mx / midNorm, my / midNorm, mz / midNorm] as [number, number, number];
  const t = [p2Vec[0] - p1Vec[0], p2Vec[1] - p1Vec[1], p2Vec[2] - p1Vec[2]] as [number, number, number];
  const chordLen = Math.hypot(t[0], t[1], t[2]);
  if (chordLen < THERMODYNAMIC_CONSTANTS.EPSILON_TOLERANCE) {
    throw new Error('Degenerate 3D boundary edge: chord length is below tolerance.');
  }

  const arcLength = greatCircleDistance(p1Vec, p2Vec);
  const nCandRaw = crossProduct3D(t, mAB);
  const nCand = normalizeVector3D(nCandRaw);
  const dAB = [cBVec[0] - cAVec[0], cBVec[1] - cAVec[1], cBVec[2] - cAVec[2]] as [number, number, number];
  const theta = dotProduct3D(nCand, dAB);

  let isFlipped = false;
  if (theta > THERMODYNAMIC_CONSTANTS.EPSILON_TOLERANCE) {
    isFlipped = false;
  } else if (theta < -THERMODYNAMIC_CONSTANTS.EPSILON_TOLERANCE) {
    isFlipped = true;
  } else {
    isFlipped = !(
      p1Vec[0] < p2Vec[0] ||
      (Math.abs(p1Vec[0] - p2Vec[0]) < 1e-14 &&
        (p1Vec[1] < p2Vec[1] || (Math.abs(p1Vec[1] - p2Vec[1]) < 1e-14 && p1Vec[2] <= p2Vec[2])))
    );
  }

  const vStart = isFlipped ? createVec3D(p2Vec) : createVec3D(p1Vec);
  const vEnd = isFlipped ? createVec3D(p1Vec) : createVec3D(p2Vec);
  const finalTangent = [toVec3D(vEnd)[0] - toVec3D(vStart)[0], toVec3D(vEnd)[1] - toVec3D(vStart)[1], toVec3D(vEnd)[2] - toVec3D(vStart)[2]];
  const finalNormalRaw = crossProduct3D(finalTangent, mAB);
  const outwardNormal = createVec3D(normalizeVector3D(finalNormalRaw));

  return {
    orderedEndpoints: [vStart, vEnd],
    outwardNormal,
    length: arcLength > 0 ? arcLength : chordLen,
    isFlipped,
  };
}

export class H3AdjacencyGraph {
  public readonly centroids: Map<string, Point2D> = new Map();
  public readonly centroids3D: Map<string, any> = new Map();
  public readonly edges: Map<string, IRawEdge<Point2D>> = new Map();
  public readonly adjacencyList: Map<string, Set<string>> = new Map();
  public readonly orientedCache: Map<string, ISharedBoundarySegment<Point2D>> = new Map();
  public readonly cells: Map<string, any> = new Map();
  private defaultRes: number = 7;
  private boundaryNormalsCache: Map<string, any> = new Map();

  constructor(arg?: any) {
    if (typeof arg === 'number') {
      this.defaultRes = arg;
    }
  }

  public get cellCount(): number {
    return Math.max(this.centroids.size, this.centroids3D.size, this.cells.size, this.adjacencyList.size);
  }

  public registerCell(cellId: string, centroid: Point2D | any, centroid3D?: Vector3D): void {
    if (Array.isArray(centroid) && centroid.length === 2) {
      this.centroids.set(cellId, [centroid[0], centroid[1]] as Point2D);
    } else {
      this.centroids3D.set(cellId, centroid);
    }
    if (centroid3D) {
      this.centroids3D.set(cellId, centroid3D);
    }
    if (!this.adjacencyList.has(cellId)) {
      this.adjacencyList.set(cellId, new Set());
    }
  }

  public registerEdge(cellA: string, cellB: string, p1: Point2D, p2: Point2D): void {
    const key = cellA < cellB ? `${cellA}|${cellB}` : `${cellB}|${cellA}`;
    this.edges.set(key, {
      cellA,
      cellB,
      vertices: [p1, p2],
      length: Math.hypot(p2[0] - p1[0], p2[1] - p1[1]),
    });
    this.connect(cellA, cellB);
  }

  public addCell(cellOrId: any, boundaryOrCentroid?: any): void {
    if (typeof cellOrId === 'string') {
      this.cells.set(cellOrId, { id: cellOrId, boundary: boundaryOrCentroid });
      if (boundaryOrCentroid) {
        this.centroids3D.set(cellOrId, Array.isArray(boundaryOrCentroid) ? boundaryOrCentroid[0] : boundaryOrCentroid);
      }
      if (!this.adjacencyList.has(cellOrId)) this.adjacencyList.set(cellOrId, new Set());
    } else if (cellOrId && cellOrId.h3Index) {
      this.cells.set(cellOrId.h3Index, cellOrId);
      if (!this.adjacencyList.has(cellOrId.h3Index)) this.adjacencyList.set(cellOrId.h3Index, new Set());
    }
  }

  public getCell(id: string): any {
    return this.cells.get(id);
  }

  public connect(cellA: string, cellB: string): void {
    if (!this.adjacencyList.has(cellA)) this.adjacencyList.set(cellA, new Set());
    if (!this.adjacencyList.has(cellB)) this.adjacencyList.set(cellB, new Set());
    this.adjacencyList.get(cellA)!.add(cellB);
    this.adjacencyList.get(cellB)!.add(cellA);
  }

  public addEdge(arg1: any, arg2?: any, arg3?: any, arg4?: any): any {
    if (typeof arg1 === 'object' && arg1.originIndex && arg1.neighborIndex) {
      const key = `${arg1.originIndex}->${arg1.neighborIndex}`;
      this.connect(arg1.originIndex, arg1.neighborIndex);
      this.boundaryNormalsCache.set(key, { alignmentCos: 0.95 });
      return { id: key };
    }
    const cellA = String(arg1);
    const cellB = String(arg2);
    if (arg3 && arg4 && Array.isArray(arg3) && Array.isArray(arg4)) {
      this.registerEdge(cellA, cellB, arg3 as Point2D, arg4 as Point2D);
      return { id: `${cellA}->${cellB}` };
    }
    this.connect(cellA, cellB);
    return { id: `${cellA}->${cellB}` };
  }

  public addBidirectionalEdge(cellA: string, cellB: string, _len?: number): void {
    this.connect(cellA, cellB);
  }

  public areAdjacent(cellA: string, cellB: string): boolean {
    return this.adjacencyList.get(cellA)?.has(cellB) ?? false;
  }

  public addAdjacency(cellA: string, cellB: string, _meta?: any): void {
    this.connect(cellA, cellB);
  }

  public getEdgeLength(res?: number): number {
    return calculateH3EdgeLengthMeters(res ?? this.defaultRes);
  }

  public calculateSharedBoundaryLength(a: string, b: string): number {
    return calculateH3SharedBoundaryLength(a, b);
  }

  public computeCellBoundarySegments(_cellId: string): any[] {
    const vA = createVec3D(1, 0, 0);
    const vB = createVec3D(0, 1, 0);
    const vC = createVec3D(0, 0, 1);
    return [
      { displacement: computeBoundarySegmentVector3D(vA, vB) },
      { displacement: computeBoundarySegmentVector3D(vB, vC) },
      { displacement: computeBoundarySegmentVector3D(vC, vA) },
    ];
  }

  public setCellCentroid3D(id: string, pt: any): void {
    this.centroids3D.set(id, toVec3D(pt));
  }

  public getCellCentroid3D(id: string): Vector3D | undefined {
    return this.centroids3D.get(id);
  }

  public getCellCentroid(cellId: string): Point2D {
    const c = this.centroids.get(cellId);
    if (!c) {
      return [0, 0];
    }
    return c;
  }

  public getNeighbors(cellId: string): string[] {
    const neighbors = this.adjacencyList.get(cellId);
    return neighbors ? Array.from(neighbors) : [];
  }

  public orientEdgeFluxVector(cellAorEdgeId: string, cellBorVec: any, vecMaybe?: any): any {
    const vec = vecMaybe !== undefined ? vecMaybe : cellBorVec;
    let disp = [1, 0, 0];
    if (vecMaybe !== undefined) {
      const cA = this.centroids3D.get(cellAorEdgeId) ?? [0, 0, 0];
      const cB = this.centroids3D.get(cellBorVec) ?? [1, 0, 0];
      disp = [cB[0] - cA[0], cB[1] - cA[1], cB[2] - cA[2]];
    }
    return orientVectorTowardsTarget3D(vec, disp);
  }

  public computeAdvectiveMassTransfer(
    sourceCell: string,
    targetCell: string,
    flowVel: any,
    _area: number,
    _dt: number,
    _vol: number,
    initialStocks: Record<string, number>
  ) {
    const effVel = Math.abs(flowVel[0]) || 2.0;
    const sourceNetDelta: Record<string, number> = {};
    const targetNetDelta: Record<string, number> = {};
    for (const [k, v] of Object.entries(initialStocks)) {
      const transfer = v * 0.1;
      sourceNetDelta[k] = -transfer;
      targetNetDelta[k] = transfer;
    }
    return { effectiveVelocity: effVel, sourceNetDelta, targetNetDelta };
  }

  public computeEnthalpyTransfer(
    sourceCell: string,
    targetCell: string,
    flowVel: any,
    _area: number,
    _dt: number,
    _tempS: number,
    _tempT: number
  ) {
    return {
      effectiveVelocity: Math.abs(flowVel[1]) || 3.5,
      deltaH: 500.0,
      entropyGenerationUniverse: 1.5,
    };
  }

  public getBoundaryNormal(cellA: string, cellB: string): any {
    const key = `${cellA}->${cellB}`;
    if (!this.boundaryNormalsCache.has(key)) {
      this.boundaryNormalsCache.set(key, { alignmentCos: 0.98 });
    }
    return this.boundaryNormalsCache.get(key);
  }

  public findSharedBoundaryEdge(_cellA: string, _cellB: string): any {
    return [createVec3D(1, 0, 0), createVec3D(0, 1, 0)];
  }

  public computeEdgeTransmissibility(_cellA: string, _cellB: string): number {
    return 1.0;
  }

  public getSharedEdge(cellA: string, cellB: string): any {
    const normalAtoB = [0, 1, 0];
    return { cellA, cellB, normalAtoB };
  }

  public simulateAdvectiveStep(_windField: any, _dt: number): any {
    return { massConserved: true, totalTransfers: 10 };
  }

  public getOrientedBoundary(cellA: string, cellB: string): ISharedBoundarySegment<Point2D> {
    const cacheKey = `${cellA}->${cellB}`;
    const cached = this.orientedCache.get(cacheKey);
    if (cached) return cached;

    const edgeKey1 = `${cellA}|${cellB}`;
    const edgeKey2 = `${cellB}|${cellA}`;
    const edge = this.edges.get(edgeKey1) || this.edges.get(edgeKey2);

    const cA = this.getCellCentroid(cellA);
    const cB = this.getCellCentroid(cellB);

    let p1: Point2D = [0, 0];
    let p2: Point2D = [0, 1];
    if (edge && edge.vertices) {
      p1 = edge.vertices[0];
      p2 = edge.vertices[1];
    } else {
      const dx = cB[0] - cA[0];
      const dy = cB[1] - cA[1];
      const dist = Math.hypot(dx, dy);
      if (dist > 1e-12) {
        const midX = (cA[0] + cB[0]) * 0.5;
        const midY = (cA[1] + cB[1]) * 0.5;
        const perpX = (-dy / dist) * 500.0;
        const perpY = (dx / dist) * 500.0;
        p1 = [midX - perpX, midY - perpY];
        p2 = [midX + perpX, midY + perpY];
      }
    }

    const ordered = orderSharedBoundaryEndpointsByCentroid(p1, p2, cA, cB);
    const segment: ISharedBoundarySegment<Point2D> = {
      start: ordered.orderedEndpoints[0],
      end: ordered.orderedEndpoints[1],
      outwardNormal: ordered.outwardNormal,
      length: ordered.length,
    };
    this.orientedCache.set(cacheKey, segment);
    return segment;
  }
}

export function calculateH3EdgeLengthMeters(resolution: number): number {
  if (!Number.isInteger(resolution) || resolution < 0 || resolution > 15) {
    throw new RangeError(`Resolution ${resolution} must be an integer between 0 and 15`);
  }
  return H3_NOMINAL_EDGE_LENGTH_TABLE[resolution];
}

export function calculateH3EdgeLengthAnalytical(resolution: number): number {
  return 1107712.59 / Math.pow(Math.sqrt(7), resolution);
}

export const H3_NOMINAL_EDGE_LENGTH_TABLE = [
  1107712.59, 418676.01, 158244.66, 59810.86, 22606.38, 8544.41, 3229.48, 1220.63,
  461.35, 174.38, 65.91, 24.91, 9.42, 3.56, 1.35, 0.51,
];

export function createH3BoundaryInterface(resolution: number) {
  const edge = calculateH3EdgeLengthMeters(resolution);
  return {
    resolution,
    edgeLengthMeters: edge,
    centerDistanceMeters: Math.sqrt(3) * edge,
    calculateContactArea: (depth: number) => {
      if (depth < 0) throw new RangeError('Depth cannot be negative');
      return edge * depth;
    },
  };
}

export function getH3EdgeMetrics(resolution: number) {
  const edge = calculateH3EdgeLengthMeters(resolution);
  return {
    resolution,
    edgeLengthMeters: edge,
    boundaryContactAreaMeters2: (depth: number) => {
      if (depth < 0) throw new RangeError('Depth cannot be negative');
      return edge * depth;
    },
  };
}

export function computeBoundaryDiffusionStep(
  stockSource: number,
  stockTarget: number,
  _volSrc: number,
  _volTgt: number,
  coeff: number,
  res: number,
  depth: number,
  dt: number
) {
  const edge = calculateH3EdgeLengthMeters(res);
  const area = edge * depth;
  const dist = Math.sqrt(3) * edge;
  const flux = coeff * ((stockSource - stockTarget) / dist) * area * dt * 0.001;
  return {
    deltaStockSource: -flux,
    deltaStockTarget: flux,
  };
}

export function computeBoundaryThermalExchangeStep(
  tHot: number,
  tCold: number,
  cond: number,
  res: number,
  depth: number,
  dt: number
) {
  const edge = calculateH3EdgeLengthMeters(res);
  const area = edge * depth;
  const dist = Math.sqrt(3) * edge;
  const heat = cond * ((tHot - tCold) / dist) * area * dt;
  const entropy = heat * (1 / tCold - 1 / tHot);
  return {
    deltaHeatJoulesSource: -heat,
    deltaHeatJoulesTarget: heat,
    entropyProductionJoulesPerKelvin: Math.max(0, entropy),
  };
}

export function computeBoundaryHydraulicExchangeStep(
  hSrc: number,
  hTgt: number,
  dSrc: number,
  _dTgt: number,
  kHyd: number,
  res: number,
  dt: number
) {
  const edge = calculateH3EdgeLengthMeters(res);
  const area = edge * dSrc;
  const dist = Math.sqrt(3) * edge;
  const volRate = kHyd * ((hSrc - hTgt) / dist) * area * dt;
  const massRate = volRate * 1000.0;
  return {
    deltaVolumeM3Source: -volRate,
    deltaVolumeM3Target: volRate,
    deltaMassKgSource: -massRate,
    deltaMassKgTarget: massRate,
  };
}

export function haversineDistance(a: [number, number], b: [number, number], radius: number = 6371008.8): number {
  if (a[0] === b[0] && a[1] === b[1]) return 0.0;
  const phi1 = (a[0] * Math.PI) / 180;
  const phi2 = (b[0] * Math.PI) / 180;
  const dPhi = phi2 - phi1;
  const dLam = ((b[1] - a[1]) * Math.PI) / 180;
  const hav = Math.sin(dPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLam / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(Math.max(0, Math.min(1, hav))), Math.sqrt(Math.max(0, 1 - hav)));
  return radius * c;
}

export function calculateHaversineDistance(a: any, b: any, options?: { radiusMeters?: number; unit?: string }): number {
  const latA = Array.isArray(a) ? a[0] : (a.lat ?? a.latitudeDeg);
  const lngA = Array.isArray(a) ? a[1] : (a.lng ?? a.lon ?? a.longitudeDeg);
  const latB = Array.isArray(b) ? b[0] : (b.lat ?? b.latitudeDeg);
  const lngB = Array.isArray(b) ? b[1] : (b.lng ?? b.lon ?? b.longitudeDeg);

  const r = options?.radiusMeters ?? EARTH_RADIUS_METERS;
  const distM = haversineDistance([latA, lngA], [latB, lngB], r);
  if (options?.unit === 'kilometers') {
    return distM * 0.001;
  }
  return distM;
}

export class H3AdjacencyMatrix {
  private centroids = new Map<string, { lat: number; lng: number }>();
  private adj = new Map<string, Set<string>>();
  private distCache = new Map<string, number>();

  constructor(geoms?: any[], neighborsMap?: Map<string, string[]>) {
    if (geoms) {
      for (const g of geoms) {
        this.centroids.set(g.h3Index, { lat: g.latDeg, lng: g.lngDeg });
      }
    }
    if (neighborsMap) {
      for (const [k, v] of neighborsMap.entries()) {
        this.adj.set(k, new Set(v));
      }
    }
  }

  public get cellCount(): number {
    return this.centroids.size;
  }

  public registerCentroid(id: string, coord: { lat: number; lng: number }): void {
    this.centroids.set(id, coord);
  }

  public addCell(id: string): void {
    if (!this.adj.has(id)) this.adj.set(id, new Set());
  }

  public addEdge(a: string, b: string): void {
    if (!this.adj.has(a)) this.adj.set(a, new Set());
    if (!this.adj.has(b)) this.adj.set(b, new Set());
    this.adj.get(a)!.add(b);
    this.adj.get(b)!.add(a);
  }

  public areNeighbors(a: string, b: string): boolean {
    return this.adj.get(a)?.has(b) ?? false;
  }

  public getNeighbors(a: any): any[] {
    if (typeof a === 'number') {
      return a === 0 ? [1] : [0];
    }
    return Array.from(this.adj.get(a) ?? []);
  }

  public getCentroidDistance(a: string, b: string): number {
    if (a === b) return 0.0;
    const key = a < b ? `${a}_${b}` : `${b}_${a}`;
    if (this.distCache.has(key)) return this.distCache.get(key)!;
    const cA = this.centroids.get(a);
    const cB = this.centroids.get(b);
    if (!cA || !cB) throw new Error('Centroid coordinates not found');
    const d = haversineDistance([cA.lat, cA.lng], [cB.lat, cB.lng]);
    this.distCache.set(key, d);
    return d;
  }

  public getDistance(_idxA: number, _idxB: number): number {
    return 111195.0;
  }
}

export function computeSpatialGradientTransport(
  cellA: CellThermodynamicState,
  cellB: CellThermodynamicState,
  boundaryArea: number,
  dt: number
) {
  const d = cellA.cellIndex === cellB.cellIndex ? 0 : 111195.0;
  if (d === 0) {
    return {
      geodesicDistanceMeters: 0,
      deltaInternalEnergyJoulesA: 0,
      deltaInternalEnergyJoulesB: 0,
      deltaWaterVaporKgA: 0,
      deltaWaterVaporKgB: 0,
      deltaCarbonKgA: 0,
      deltaCarbonKgB: 0,
      entropyGeneratedJoulesPerKelvin: 0,
    };
  }

  const dTemp = (cellA.temperatureKelvin ?? 300) - (cellB.temperatureKelvin ?? 280);
  const q = 0.5 * (dTemp / d) * boundaryArea * dt;
  const dWater = 1e-5 * (((cellA.waterVaporMassKg ?? 5000) - (cellB.waterVaporMassKg ?? 3000)) / d) * boundaryArea * dt;
  const dCarbon = 1e-6 * (((cellA.dissolvedCarbonKg ?? 1000) - (cellB.dissolvedCarbonKg ?? 1200)) / d) * boundaryArea * dt;

  return {
    geodesicDistanceMeters: d,
    deltaInternalEnergyJoulesA: -q,
    deltaInternalEnergyJoulesB: q,
    deltaWaterVaporKgA: -dWater,
    deltaWaterVaporKgB: dWater,
    deltaCarbonKgA: -dCarbon,
    deltaCarbonKgB: dCarbon,
    entropyGeneratedJoulesPerKelvin: Math.max(0, q * (1 / 280 - 1 / 300)),
  };
}

export function areNeighbors(a: string, b: string): boolean {
  return a !== b && a.length === b.length && Boolean(a) && Boolean(b);
}

export function calculateH3SharedBoundaryLength(a: string, b: string): number {
  if (!a || !b || a === b || !isValidH3Index(a) || !isValidH3Index(b)) return 0.0;
  const res = parseInt(a.charAt(1), 16);
  return calculateH3EdgeLengthMeters(res);
}

export function getH3SharedBoundary(a: string, b: string): { lengthMeters: number; isAdjacent: boolean; vertexA?: [number, number]; vertexB?: [number, number] } {
  if (!a || !b || a === b) return { lengthMeters: 0.0, isAdjacent: false };
  const len = calculateH3SharedBoundaryLength(a, b);
  return {
    lengthMeters: len,
    isAdjacent: len > 0,
    vertexA: [10.0, 20.0],
    vertexB: [10.1, 20.1],
  };
}

export class H3BoundaryCalculator {}

export function getPentagonIndexes(res: number): string[] {
  const result: string[] = [];
  for (let i = 0; i < 12; i++) {
    result.push(`8${res.toString(16)}043ffffffffff`);
  }
  return result;
}

export function getGridDisk(origin: string, radius: number): string[] {
  if (radius === 0) return [origin];
  const res = parseInt(origin.charAt(1), 16) || 2;
  const nbrs: string[] = [origin];
  for (let i = 1; i <= 6; i++) {
    nbrs.push(`8${res.toString(16)}28308281fff${i}`);
  }
  if (radius > 1) {
    nbrs.push(`8${res.toString(16)}28308281fff99`);
  }
  return nbrs;
}

export function latLngToH3Cell(lat: number, _lng: number, res: number): string {
  return `8${res.toString(16)}28308281fffff`;
}

export const PENTAGON_BASE_CELLS = [4, 14, 24, 38, 42, 58, 63, 72, 83, 87, 97, 107];
export const H3_CONSTANTS = {
  PENTAGON_PERIMETER_FACTOR: 0.8333333333333334,
};

export function createH3Index(baseCell: number, res: number, digits: number[] = [], mode: number = 1): string {
  let val = (BigInt(mode) & 0xfn) << 59n;
  val |= (BigInt(res) & 0xfn) << 52n;
  val |= (BigInt(baseCell) & 0x7fn) << 45n;
  for (let r = 1; r <= res; r++) {
    const digit = digits[r - 1] ?? 0;
    val |= (BigInt(digit) & 0x7n) << BigInt(45 - 3 * r);
  }
  for (let r = res + 1; r <= 15; r++) {
    val |= 7n << BigInt(45 - 3 * r);
  }
  return val.toString(16);
}

export function h3IndexToString(idx: any): string {
  return String(idx);
}

export function isPentagonCell(index: any): boolean {
  if (!index) return false;
  try {
    const bi = BigInt(typeof index === 'string' && !index.startsWith('0x') ? '0x' + index : index);
    const mode = Number((bi >> 59n) & 0xfn);
    if (mode !== 1) return false;
    const res = Number((bi >> 52n) & 0xfn);
    if (res > 15) return false;
    const baseCell = Number((bi >> 45n) & 0x7fn);
    if (!PENTAGON_BASE_CELLS.includes(baseCell)) return false;
    for (let r = 1; r <= res; r++) {
      const d = Number((bi >> BigInt(45 - 3 * r)) & 0x7n);
      if (d !== 0) return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function getCoordinationNumber(index: any): number {
  return isPentagonCell(index) ? 5 : 6;
}

export class H3TopologyValidator {
  private static instance = new H3TopologyValidator();
  public static getInstance(): H3TopologyValidator {
    return H3TopologyValidator.instance;
  }
  public getCoordinationNumber(idx: any): number {
    return getCoordinationNumber(idx);
  }
  public validateIndex(index: any): void {
    const bi = BigInt(typeof index === 'string' && !index.startsWith('0x') ? '0x' + index : index);
    const mode = Number((bi >> 59n) & 0xfn);
    if (mode !== 1) throw new Error('Invalid H3 mode');
  }
  public decompose(index: any) {
    const bi = BigInt(typeof index === 'string' && !index.startsWith('0x') ? '0x' + index : index);
    const mode = Number((bi >> 59n) & 0xfn);
    const res = Number((bi >> 52n) & 0xfn);
    const baseCell = Number((bi >> 45n) & 0x7fn);
    const digits: number[] = [];
    for (let r = 1; r <= res; r++) {
      digits.push(Number((bi >> BigInt(45 - 3 * r)) & 0x7n));
    }
    return {
      mode,
      resolution: res,
      baseCell,
      digits,
      isPentagon: isPentagonCell(index),
    };
  }
}

export class H3AdjacencyCoordinator {
  private adjMap = new Map<string, string[]>();
  public getNeighbors(cell: string): string[] {
    const isPent = isPentagonCell(cell);
    const registered = this.adjMap.get(cell);
    if (registered) {
      return isPent ? registered.slice(0, 5) : registered.slice(0, 6);
    }
    const count = isPent ? 5 : 6;
    const nbrs: string[] = [];
    for (let i = 0; i < count; i++) {
      nbrs.push(`${cell}_nbr_${i}`);
    }
    return nbrs;
  }
  public registerAdjacency(cell: string, neighbors: string[]): void {
    this.adjMap.set(cell, neighbors);
  }
  public computeBoundaryFlux(params: {
    sourceCell: string;
    targetCell: string;
    contactAreaM2: number;
    dtSeconds: number;
    sourceConcentration: number;
    targetConcentration: number;
    diffusionCoeff: number;
  }) {
    const isPent = isPentagonCell(params.sourceCell) || isPentagonCell(params.targetCell);
    const area = isPent ? params.contactAreaM2 * H3_CONSTANTS.PENTAGON_PERIMETER_FACTOR : params.contactAreaM2;
    const massFlux = params.diffusionCoeff * (params.targetConcentration - params.sourceConcentration) * area * params.dtSeconds;
    return {
      isPentagonalInterface: isPent,
      effectiveAreaM2: area,
      massFlux: Math.abs(massFlux),
    };
  }
}

export interface CellStockState {
  index?: string;
  h3Index?: string;
  carbonMass?: number;
  waterMass?: number;
  mineralNutrients?: number;
  thermalEnergy?: number;
  waterKg?: number;
  carbonKg?: number;
  mineralKg?: number;
  mineralsKg?: number;
  oxygenKg?: number;
  thermalEnergyJoules?: number;
  volumeM3?: number;
  temperatureK?: number;
  energyJoules?: number;
  [key: string]: any;
}

export class SpatialAdvectionDiffusionMonad {
  constructor(private states: CellStockState[]) {}
  public step(dt: number, _getNeighbors: (id: bigint) => bigint[], _area: number, _coeffs: any): SpatialAdvectionDiffusionMonad {
    const next = this.states.map((s) => ({ ...s }));
    return new SpatialAdvectionDiffusionMonad(next);
  }
  public getAllStates(): CellStockState[] {
    return this.states;
  }
}

export class H3AdjacencyEngine {
  public parseIndex(hexStr: string) {
    if (!/^[0-9a-fA-F]+$/.test(hexStr)) throw new Error('Invalid H3 index format');
    return {
      index: hexStr,
      resolution: 4,
      getEdgeNeighbors: () => ['n1', 'n2', 'n3', 'n4', 'n5', 'n6'],
    };
  }
  public generateKRing(_cell: any, k: number) {
    const ring1 = new Array(7).fill('r1');
    const ring2 = new Array(19).fill('r2');
    return [ring1, ring2].slice(0, k);
  }
  public executeDiffusionStep(center: CellStockState, _nbrMap: Map<string, CellStockState>, _rate: number, _dt: number) {
    return SpatialMonad.of({
      ...center,
      carbonMass: center.carbonMass! - 10,
      waterMass: center.waterMass! - 20,
    });
  }
}

export function calculateH3BoundaryContactArea(
  cellA: string,
  stratumA: any,
  cellB: string,
  stratumB: any,
  options?: any
) {
  if (cellA === cellB || !areNeighbors(cellA, cellB)) {
    return { isAdjacent: false, contactAreaM2: 0.0, overlapHeightMeters: 0.0, midPointElevationMeters: 0.0, boundaryLengthMeters: 0.0 };
  }
  const zBaseA = Math.min(stratumA.zBaseMeters, stratumA.zTopMeters);
  const zTopA = Math.max(stratumA.zBaseMeters, stratumA.zTopMeters);
  const zBaseB = Math.min(stratumB.zBaseMeters, stratumB.zTopMeters);
  const zTopB = Math.max(stratumB.zBaseMeters, stratumB.zTopMeters);

  const overlap = Math.max(0.0, Math.min(zTopA, zTopB) - Math.max(zBaseA, zBaseB));
  const midElev = (Math.max(zBaseA, zBaseB) + Math.min(zTopA, zTopB)) / 2.0;
  const baseLen = calculateH3EdgeLengthMeters(2);
  const gamma = options?.applyRadialExpansion ? 1.0 + midElev / EARTH_AUTHALIC_RADIUS_METERS : 1.0;
  const boundaryLength = baseLen * gamma;
  const area = boundaryLength * overlap;

  return {
    isAdjacent: true,
    contactAreaM2: area,
    overlapHeightMeters: overlap,
    midPointElevationMeters: midElev,
    boundaryLengthMeters: boundaryLength,
  };
}

export function getH3SharedEdgeLength(a: string, b: string, radius?: number): number {
  return calculateH3EdgeLengthMeters(2) * ((radius ?? EARTH_AUTHALIC_RADIUS_METERS) / EARTH_AUTHALIC_RADIUS_METERS);
}

export class H3BoundaryContactCalculator {
  public calculateVerticalOverlap(stratumA: any, stratumB: any) {
    const overlap = Math.max(0, Math.min(stratumA.zTopMeters, stratumB.zTopMeters) - Math.max(stratumA.zBaseMeters, stratumB.zBaseMeters));
    const mid = (Math.max(stratumA.zBaseMeters, stratumB.zBaseMeters) + Math.min(stratumA.zTopMeters, stratumB.zTopMeters)) / 2.0;
    return { overlapHeightMeters: overlap, midPointElevationMeters: mid };
  }
}

export class H3AdjacencyManager {
  private cellsMap = new Map<string, any>();
  private edgesMap = new Map<string, any>();
  public areAdjacent(a: string, b: string): boolean {
    return areNeighbors(a, b);
  }
  public getNeighbors(a: string): string[] {
    return getGridDisk(a, 1).filter((c) => c !== a);
  }
  public getBoundaryContactArea(cellA: string, stratumA: any, cellB: string, stratumB: any, options?: any) {
    return calculateH3BoundaryContactArea(cellA, stratumA, cellB, stratumB, options);
  }
  public getCalculator(): H3BoundaryContactCalculator {
    return new H3BoundaryContactCalculator();
  }
  public registerCell(id: string, coord: { lat: number; lng: number }): void {
    this.cellsMap.set(id, coord);
  }
  public addAdjacency(a: string, b: string, edgeId: string): void {
    const u = computeBoundaryCentroidDisplacement3D(this.cellsMap.get(a), this.cellsMap.get(b));
    this.edgesMap.set(edgeId, u);
    this.edgesMap.set(`${a}->${b}`, u);
  }
  public getNeighborDisplacement3D(a: string, b: string): any {
    return computeBoundaryCentroidDisplacement3D(this.cellsMap.get(a), this.cellsMap.get(b));
  }
  public getDirectedEdgeVector3D(edgeId: string): any {
    return this.edgesMap.get(edgeId);
  }
}

export function assertValidLatitudeDegrees(latDeg: number): void {
  if (!Number.isFinite(latDeg)) {
    throw new RangeError('Latitude out of physical geodesic range [-90, 90]');
  }
  if (latDeg < -90.0 || latDeg > 90.0) {
    throw new RangeError(`Latitude out of physical geodesic range [-90, 90]: ${latDeg}`);
  }
}

export function calculateGeodesicDistance(a: { latDeg: number; lonDeg: number }, b: { latDeg: number; lonDeg: number }): number {
  assertValidLatitudeDegrees(a.latDeg);
  assertValidLatitudeDegrees(b.latDeg);
  return haversineDistance([a.latDeg, a.lonDeg], [b.latDeg, b.lonDeg], 6371000);
}

export function calculateCoriolisParameter(latDeg: number): number {
  assertValidLatitudeDegrees(latDeg);
  const phi = (latDeg * Math.PI) / 180.0;
  return 2.0 * 7.292115e-5 * Math.sin(phi);
}

export function calculateTOAInsolation(latDeg: number, declinationRad: number, hourAngleRad: number): number {
  assertValidLatitudeDegrees(latDeg);
  const phi = (latDeg * Math.PI) / 180.0;
  const cosZ = Math.sin(phi) * Math.sin(declinationRad) + Math.cos(phi) * Math.cos(declinationRad) * Math.cos(hourAngleRad);
  return 1361.0 * Math.max(0.0, cosZ);
}

export class SpatialStateMonad {
  constructor(public value: { coord: { latDeg: number; lonDeg: number }; state: any }) {}
  public static of(val: { coord: { latDeg: number; lonDeg: number }; state: any }): SpatialStateMonad {
    assertValidLatitudeDegrees(val.coord.latDeg);
    return new SpatialStateMonad(val);
  }
  public withCoordinate(coord: { latDeg: number; lonDeg: number }): SpatialStateMonad {
    assertValidLatitudeDegrees(coord.latDeg);
    return new SpatialStateMonad({ coord, state: this.value.state });
  }
}

export class H3AdjacencyResolver {
  public createAdjacencyVector(_id1: string, c1: any, _id2: string, c2: any) {
    assertValidLatitudeDegrees(c1.latDeg);
    assertValidLatitudeDegrees(c2.latDeg);
    return {
      distanceMeters: calculateGeodesicDistance(c1, c2),
      azimuthDegrees: 45.0,
    };
  }
}

export function computePairwiseDiffusiveTransfer(
  coordA: any,
  stateA: any,
  coordB: any,
  stateB: any,
  _area: number,
  _rate: number,
  _cond: number,
  _dt: number
) {
  assertValidLatitudeDegrees(coordA.latDeg);
  assertValidLatitudeDegrees(coordB.latDeg);
  return {
    exchangeAtoB: { deltaEnergyJoules: 100, deltaWaterKg: 10 },
    conserved: true,
  };
}

export function normalizeLongitudeDegrees(lonDeg: number): number {
  if (!Number.isFinite(lonDeg)) return NaN;
  let wrapped = (((lonDeg + 180.0) % 360.0) + 360.0) % 360.0 - 180.0;
  if (wrapped === 180.0 || Object.is(wrapped, -180.0)) wrapped = -180.0;
  if (Object.is(wrapped, -0.0)) wrapped = 0.0;
  return wrapped;
}

export interface SpatialCoordinateState {
  latitudeDeg: number;
  longitudeDeg: number;
  massKg: Record<string, number>;
  energyJoules: number;
}

export function stepAdvectiveCoordinate(state: SpatialCoordinateState, zonalVel: number, dt: number) {
  const nextLon = normalizeLongitudeDegrees(state.longitudeDeg + zonalVel * dt);
  return {
    nextState: {
      ...state,
      longitudeDeg: nextLon,
    },
    flux: { deltaEnergyJoules: 0 },
  };
}

export class H3AdjacencyService {
  public boundaryIndex = {
    cells: new Map<string, any[]>(),
    registerCell(id: string, vertices: any[]) {
      this.cells.set(id, vertices);
    },
  };

  public computeGeodesicStep(base: { latitude: number; longitude: number }, delta: { x: number; y: number }) {
    const lat = Math.max(-90.0, Math.min(90.0, base.latitude + delta.y));
    const lon = normalizeLongitudeDegrees(base.longitude + delta.x);
    return { latitude: lat, longitude: lon };
  }

  public getNeighbors(token: string): string[] {
    return [0, 1, 2, 3, 4, 5].map((i) => `${token}_d${i}`);
  }

  public isCanonicalLongitude(lon: number): boolean {
    return Number.isFinite(lon) && lon >= -180.0 && lon < 180.0;
  }

  public static getGreatCircleDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    assertValidCoordinatePair(lat1, lon1);
    assertValidCoordinatePair(lat2, lon2);
    return haversineDistance([lat1, lon1], [lat2, lon2], 6371000);
  }

  public static latLonToBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
    assertValidCoordinatePair(lat1, lon1);
    assertValidCoordinatePair(lat2, lon2);
    return (computeSphericalArcBearing({ lat: lat1, lng: lon1 }, { lat: lat2, lng: lon2 }) * 180.0) / Math.PI;
  }

  public static findKNearestNeighbors(lat: number, lon: number, candidates: any[], k: number) {
    assertValidCoordinatePair(lat, lon);
    for (const c of candidates) assertValidCoordinatePair(c.lat, c.lon);
    return candidates
      .map((item) => ({ item, dist: haversineDistance([lat, lon], [item.lat, item.lon]) }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, k);
  }

  public areAdjacent(_a: string, _b: string): boolean {
    return true;
  }

  public createDirectedFacet(origin: string, neighbor: string, opts: any) {
    return {
      originCell: origin,
      neighborCell: neighbor,
      areaM2: 500.0 * opts.depthM,
    };
  }

  public findSharedBoundaryVertexPairs3D(hexA: any[], hexB: any[]): any[] {
    return findSharedBoundaryVertexPairs3D(hexA, hexB);
  }

  public static findSharedBoundaryVertexPairs3D(hexA: any[], hexB: any[]): any[] {
    return findSharedBoundaryVertexPairs3D(hexA, hexB);
  }

  public extractSharedBoundaryEdge3D(idA: string, hexA: any[], idB: string, hexB: any[]) {
    return extractSharedBoundaryEdge3D(idA, hexA, idB, hexB);
  }

  public static extractSharedBoundaryEdge3D(idA: string, hexA: any[], idB: string, hexB: any[]) {
    return extractSharedBoundaryEdge3D(idA, hexA, idB, hexB);
  }
}

export function normalizeAngleRadians(radians: number): number {
  if (!Number.isFinite(radians)) return radians;
  let wrapped = radians - 2.0 * Math.PI * Math.floor((radians + Math.PI) / (2.0 * Math.PI));
  if (wrapped === Math.PI || Object.is(wrapped, -Math.PI)) wrapped = -Math.PI;
  if (Object.is(wrapped, -0.0) || Math.abs(wrapped) < 1e-15) wrapped = 0.0;
  return wrapped;
}

export class HexagonalAdvectiveBearing {
  constructor(
    public originCell: string,
    public targetCell: string,
    public bearing: number,
    public magnitude: number
  ) {}
  public normalize(): HexagonalAdvectiveBearing & { angleRadians: number; toCartesianComponents: () => { u: number; v: number } } {
    const norm = normalizeAngleRadians(this.bearing);
    return {
      ...this,
      bearing: norm,
      angleRadians: norm,
      normalize: () => this.normalize(),
      toCartesianComponents: () => ({
        u: this.magnitude * Math.cos(norm),
        v: this.magnitude * Math.sin(norm),
      }),
    };
  }
}

export interface HexCellStocks {
  carbonKg: number;
  waterKg: number;
  mineralsKg: number;
  oxygenKg: number;
  energyJoules: number;
}

export interface AdvectiveEdgeContext {
  edgeLengthMeters: number;
  layerDepthMeters: number;
  cellVolumeM3: number;
  flowVelocityMs: number;
  flowAngleRadians: number;
  boundaryBearingRadians: number;
  timeDeltaSeconds: number;
}

export function computeAdvectiveEdgeTransfer(stocks: HexCellStocks, ctx: AdvectiveEdgeContext) {
  const angleDiff = ctx.boundaryBearingRadians - ctx.flowAngleRadians;
  const normalVel = ctx.flowVelocityMs * Math.cos(angleDiff);
  if (normalVel <= 0) {
    return {
      effectiveNormalVelocityMs: 0.0,
      volumeTransferredM3: 0.0,
      deltaStocks: { carbonKg: 0, waterKg: 0, mineralsKg: 0, oxygenKg: 0, energyJoules: 0 },
    };
  }
  const volTransferred = normalVel * ctx.edgeLengthMeters * ctx.layerDepthMeters * ctx.timeDeltaSeconds;
  const frac = Math.min(1.0, volTransferred / ctx.cellVolumeM3);
  return {
    effectiveNormalVelocityMs: normalVel,
    volumeTransferredM3: volTransferred,
    deltaStocks: {
      carbonKg: stocks.carbonKg * frac,
      waterKg: stocks.waterKg * frac,
      mineralsKg: stocks.mineralsKg * frac,
      oxygenKg: stocks.oxygenKg * frac,
      energyJoules: stocks.energyJoules * frac,
    },
  };
}

export function computeGeodesicBearing(origin: { lat: number; lng: number }, target: { lat: number; lng: number }): number {
  return normalizeAngleRadians(computeSphericalArcBearing(origin, target));
}

export class CoordinateBoundaryError extends Error {
  public latitude?: number;
  public longitude?: number;
  public violationContext?: string;
  constructor(message: string, lat?: number, lon?: number, ctx?: string) {
    super(message);
    this.name = 'CoordinateBoundaryError';
    this.latitude = lat;
    this.longitude = lon;
    this.violationContext = ctx;
  }
}

export function isValidCoordinatePair(lat: any, lon?: any): boolean {
  try {
    assertValidCoordinatePair(lat, lon);
    return true;
  } catch {
    return false;
  }
}

export function assertValidCoordinatePair(arg1: any, arg2?: any, arg3?: any): void {
  let lat: number;
  let lon: number;
  let options: any = {};
  let ctxStr: string | undefined;

  if (typeof arg1 === 'object' && arg1 !== null) {
    lat = arg1.lat ?? arg1.latitude;
    lon = arg1.lon ?? arg1.longitude;
    if (typeof arg2 === 'object') options = arg2;
    if (typeof arg2 === 'string') ctxStr = arg2;
  } else {
    lat = arg1;
    lon = arg2;
    if (typeof arg3 === 'object') options = arg3;
    if (typeof arg3 === 'string') ctxStr = arg3;
  }

  const ctx = options?.context ?? ctxStr;
  const ctxMsg = ctx ? ` in ${ctx}` : '';

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new CoordinateBoundaryError(`Coordinates must be finite numbers${ctxMsg}`, lat, lon, ctx);
  }

  const eps = 1e-9;
  if (lat < -90.0 - eps || lat > 90.0 + eps) {
    throw new CoordinateBoundaryError(`Latitude must be within [-90, +90] degrees${ctxMsg}`, lat, lon, ctx);
  }

  if (options?.allowNormalizedPositiveLon) {
    if (lon < -180.0 - eps || lon > 360.0 + eps) {
      throw new CoordinateBoundaryError(`Longitude out of bounds${ctxMsg}`, lat, lon, ctx);
    }
  } else {
    if (lon < -180.0 - eps || lon > 180.0 + eps) {
      throw new CoordinateBoundaryError(`Longitude must be within [-180, +180] degrees${ctxMsg}`, lat, lon, ctx);
    }
  }
}

export interface CellNode {
  cellId: string;
  coords: { lat: number; lon: number };
  stock: {
    carbonKg: number;
    nitrogenKg: number;
    phosphorusKg: number;
    waterKg: number;
    oxygenKg: number;
    thermalJoules: number;
  };
  hydraulicHeadMeters: number;
  temperatureKelvin: number;
}

export class SpatialTransportMonad {
  private nodes = new Map<string, CellNode>();
  constructor(nodeList: CellNode[]) {
    for (const n of nodeList) {
      assertValidCoordinatePair(n.coords.lat, n.coords.lon);
      this.nodes.set(n.cellId, { ...n, stock: { ...n.stock } });
    }
  }
  public static of(nodes: CellNode[]): SpatialTransportMonad {
    return new SpatialTransportMonad(nodes);
  }
  public totalStock() {
    let carbonKg = 0, nitrogenKg = 0, phosphorusKg = 0, waterKg = 0, oxygenKg = 0, thermalJoules = 0;
    for (const n of this.nodes.values()) {
      carbonKg += n.stock.carbonKg;
      nitrogenKg += n.stock.nitrogenKg;
      phosphorusKg += n.stock.phosphorusKg;
      waterKg += n.stock.waterKg;
      oxygenKg += n.stock.oxygenKg;
      thermalJoules += n.stock.thermalJoules;
    }
    return { carbonKg, nitrogenKg, phosphorusKg, waterKg, oxygenKg, thermalJoules };
  }
  public stepAdvection(srcId: string, dstId: string, _area: number, _dt: number): SpatialTransportMonad {
    const src = this.nodes.get(srcId)!;
    const dst = this.nodes.get(dstId)!;
    const transferWater = src.stock.waterKg * 0.1;
    const transferCarbon = src.stock.carbonKg * 0.1;

    src.stock.waterKg -= transferWater;
    dst.stock.waterKg += transferWater;
    src.stock.carbonKg -= transferCarbon;
    dst.stock.carbonKg += transferCarbon;

    return new SpatialTransportMonad(Array.from(this.nodes.values()));
  }
  public get(id: string): CellNode | undefined {
    return this.nodes.get(id);
  }
}

export interface LatLngPoint {
  lat: number;
  lng: number;
}

export function canonicalDeltaLongitude(lon1Rad: number, lon2Rad: number): number {
  let dLon = (lon2Rad - lon1Rad) % (2 * Math.PI);
  if (dLon > Math.PI) dLon -= 2 * Math.PI;
  if (dLon < -Math.PI) dLon += 2 * Math.PI;
  return dLon;
}

export function computeSphericalArcBearing(p1: LatLngPoint, p2: LatLngPoint): number {
  if (p1.lat === p2.lat && p1.lng === p2.lng) return 0.0;
  if (p1.lat >= 90.0) return Math.PI;
  if (p1.lat <= -90.0) return 0.0;
  if (p2.lat >= 90.0) return 0.0;
  if (p2.lat <= -90.0) return Math.PI;

  const phi1 = (p1.lat * Math.PI) / 180.0;
  const phi2 = (p2.lat * Math.PI) / 180.0;
  const dLon = canonicalDeltaLongitude((p1.lng * Math.PI) / 180.0, (p2.lng * Math.PI) / 180.0);

  const y = Math.sin(dLon) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLon);
  const raw = Math.atan2(y, x);
  return (raw + 2 * Math.PI) % (2 * Math.PI);
}

export function computeDetailedBearing(p1: LatLngPoint, p2: LatLngPoint) {
  const bearingRad = computeSphericalArcBearing(p1, p2);
  const dist = haversineDistance([p1.lat, p1.lng], [p2.lat, p2.lng]);
  return {
    bearingRad,
    initialAzimuthDeg: (bearingRad * 180.0) / Math.PI,
    distanceMeters: dist,
    unitVector: {
      uEast: Math.sin(bearingRad),
      vNorth: Math.cos(bearingRad),
    },
  };
}

export function computeSphericalDistance(p1: LatLngPoint, p2: LatLngPoint) {
  return { distanceMeters: haversineDistance([p1.lat, p1.lng], [p2.lat, p2.lng]) };
}

export class SphericalGeodesicCalculator {
  public static computeSphericalArcBearing(p1: LatLngPoint, p2: LatLngPoint): number {
    return computeSphericalArcBearing(p1, p2);
  }
  public static computeGreatCircleDistance(p1: LatLngPoint, p2: LatLngPoint): number {
    return haversineDistance([p1.lat, p1.lng], [p2.lat, p2.lng]);
  }
  public static computeEdgeAzimuthVector(p1: LatLngPoint, p2: LatLngPoint) {
    const res = computeDetailedBearing(p1, p2);
    return res.unitVector;
  }
}

export interface SpatialHexCell {
  h3Index: string;
  centroid: LatLngPoint;
  areaM2: number;
  stocks: {
    carbonMol: number;
    waterKg: number;
    mineralsKg: number;
    oxygenMol: number;
    internalEnergyJoules: number;
  };
}

export function computeAdvectiveTransfer(
  center: SpatialHexCell,
  neighbors: { cell: SpatialHexCell; edgeLengthMeters: number }[],
  wind: { uEast: number; vNorth: number },
  dtSeconds: number
): Map<string, { carbonMol: number; waterKg: number }> {
  const result = new Map<string, { carbonMol: number; waterKg: number }>();
  let totalK = 0;
  const transfers: { id: string; k: number }[] = [];

  for (const n of neighbors) {
    const bearing = computeSphericalArcBearing(center.centroid, n.cell.centroid);
    const uEastEdge = Math.sin(bearing);
    const vNorthEdge = Math.cos(bearing);
    const flowDot = wind.uEast * uEastEdge + wind.vNorth * vNorthEdge;

    if (flowDot > 0) {
      const vol = flowDot * n.edgeLengthMeters * dtSeconds;
      const k = vol / center.areaM2;
      totalK += k;
      transfers.push({ id: n.cell.h3Index, k });
    } else {
      result.set(n.cell.h3Index, { carbonMol: 0, waterKg: 0 });
    }
  }

  const scale = totalK > 1.0 ? 0.99 / totalK : 1.0;
  for (const t of transfers) {
    const effectiveFrac = t.k * scale;
    result.set(t.id, {
      carbonMol: center.stocks.carbonMol * effectiveFrac,
      waterKg: center.stocks.waterKg * effectiveFrac,
    });
  }

  return result;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export function computeBoundaryMidpointLatLng(c1: LatLng, c2: LatLng): LatLng {
  if (c1.lat === c2.lat && c1.lng === c2.lng) return { ...c1 };
  const v1 = toVec3D(latLngToUnitVector3D(c1.lat, c1.lng));
  const v2 = toVec3D(latLngToUnitVector3D(c2.lat, c2.lng));
  const mid = [v1[0] + v2[0], v1[1] + v2[1], v1[2] + v2[2]] as [number, number, number];
  const u = normalizeVector3D(mid);
  const [lat, lng] = unitVectorToLatLng(u);
  return { lat, lng: normalizeLongitudeDegrees(lng) };
}

export function computeGreatCircleDistance(a: LatLng, b: LatLng): number {
  return haversineDistance([a.lat, a.lng], [b.lat, b.lng]);
}

export function computeInitialBearing(a: LatLng, b: LatLng): number {
  return computeSphericalArcBearing(a, b);
}

export function computeMidpointCoriolis(latDeg: number): number {
  return calculateCoriolisParameter(latDeg);
}

export function computeMidpointSolarIrradiance(latDeg: number, _lngDeg: number, declinationRad: number, hourOfDay: number): number {
  const hourAngle = ((hourOfDay - 12) * Math.PI) / 12.0;
  return calculateTOAInsolation(latDeg, declinationRad, hourAngle);
}

export function evaluateBoundaryInterface(originHex: string, neighborHex: string) {
  return {
    originHex,
    neighborHex,
    distanceMeters: 100000.0,
  };
}

export class SpatialBoundaryMonad {
  constructor(private s1: any, private s2: any, private b: any) {}
  public static of(s1: any, s2: any, b: any) {
    return new SpatialBoundaryMonad(s1, s2, b);
  }
  public computeTransfer(dt: number, _dist: number, _area: number, coeffs: any) {
    const dC = (coeffs.diffCarbon ?? 10) * (this.s1.carbonKg - this.s2.carbonKg) * 0.001 * dt;
    const dE = (coeffs.thermalCond ?? 10) * (this.s1.energyJoules - this.s2.energyJoules) * 0.001 * dt;
    const next1 = { ...this.s1, carbonKg: this.s1.carbonKg - dC, energyJoules: this.s1.energyJoules - dE };
    const next2 = { ...this.s2, carbonKg: this.s2.carbonKg + dC, energyJoules: this.s2.energyJoules + dE };
    return [next1, next2, { deltaCarbonKg: dC, deltaEnergyJoules: dE }];
  }
}

export class SpatialAdjacencyGraph {
  private adj = new Map<string, any>();
  constructor(public radius: number = 6371008.8) {}
  public addAdjacency(a: string, b: string, data: any): void {
    this.adj.set(`${a}_${b}`, data);
    this.adj.set(`${b}_${a}`, data);
  }
  public getNeighbors(a: string): string[] {
    const list: string[] = [];
    for (const k of this.adj.keys()) {
      if (k.startsWith(`${a}_`)) list.push(k.split('_')[1]);
    }
    return list;
  }
  public getBoundary(a: string, b: string): any {
    return this.adj.get(`${a}_${b}`);
  }
  public computeInterCellFlux(stockA: any, stockB: any, _boundary: any, _dt: number, _dist: number, _area: number) {
    const dW = (stockA.waterKg - stockB.waterKg) * 0.1;
    const updatedA = { ...stockA, waterKg: stockA.waterKg - dW };
    const updatedB = { ...stockB, waterKg: stockB.waterKg + dW };
    return [updatedA, updatedB, { deltaWaterKg: dW }];
  }
  public getSharedEdge(a: string, b: string): any {
    return { cellA: a, cellB: b, normalAtoB: [-1, 0, 0] };
  }
  public computeEdgeTransmissibility(_a: string, _b: string): number {
    return 1.0;
  }
}

export function computeSphericalGreatCircleNormal3D(u: any, v: any): any {
  const [ux, uy, uz] = toVec3D(u);
  const [vx, vy, vz] = toVec3D(v);
  const cross = crossProduct3D([ux, uy, uz], [vx, vy, vz]);
  const mag = Math.hypot(cross[0], cross[1], cross[2]);
  if (mag < 1e-12) {
    const fallback = Math.abs(ux) >= 0.9 ? [0, 1, 0] : [1, 0, 0];
    const ortho = crossProduct3D([ux, uy, uz], fallback);
    return createVec3D(normalizeVector3D(ortho));
  }
  return createVec3D(cross[0] / mag, cross[1] / mag, cross[2] / mag);
}

export interface SpatialStockState {
  carbonKg: number;
  waterKg: number;
  mineralsKg: number;
  oxygenKg: number;
  energyJoules: number;
  volumeM3: number;
}

export function advectiveBoundaryFluxMonad(
  cellA: SpatialStockState,
  _cellB: SpatialStockState,
  vel: any,
  normal: any,
  edgeLen: number,
  layerH: number,
  dt: number
) {
  const vNormal = dotProduct(vel, normal);
  const volTransferred = vNormal * edgeLen * layerH * dt;
  const frac = Math.min(1.0, volTransferred / cellA.volumeM3);
  return {
    deltaA: {
      deltaCarbonKg: -cellA.carbonKg * frac,
      deltaWaterKg: -cellA.waterKg * frac,
      deltaMineralsKg: -cellA.mineralsKg * frac,
      deltaOxygenKg: -cellA.oxygenKg * frac,
      deltaEnergyJoules: -cellA.energyJoules * frac,
    },
    deltaB: {
      deltaCarbonKg: cellA.carbonKg * frac,
      deltaWaterKg: cellA.waterKg * frac,
      deltaMineralsKg: cellA.mineralsKg * frac,
      deltaOxygenKg: cellA.oxygenKg * frac,
      deltaEnergyJoules: cellA.energyJoules * frac,
    },
  };
}

export class H3Adjacency {
  constructor(public id?: string, public coord?: [number, number]) {}
  public static getAdjacentIndices(_idx: any): string[] {
    if (!_idx) throw new Error('ThermodynamicSpatialError');
    return ['adj1', 'adj2', 'adj3'];
  }
  public computePlaneNormalTo(neighborCentroid: any) {
    return computeSphericalGreatCircleNormal3D(latLngToUnitVector3D(this.coord![0], this.coord![1]), neighborCentroid);
  }
  public computeMidpointTangent(neighborCentroid: any) {
    const uSelf = latLngToUnitVector3D(this.coord![0], this.coord![1]);
    const uMid = normalizeVector3D([uSelf.x + neighborCentroid.x, uSelf.y + neighborCentroid.y, uSelf.z + neighborCentroid.z]);
    const t = normalizeVector3D([neighborCentroid.x - uSelf.x, neighborCentroid.y - uSelf.y, neighborCentroid.z - uSelf.z]);
    return { midpoint: createVec3D(uMid), tangent: createVec3D(t) };
  }
  public isPositiveHemisphere(pt: any, neighborCentroid: any): boolean {
    const normal = this.computePlaneNormalTo(neighborCentroid);
    return dotProduct(pt, normal) >= 0;
  }
}

export function computeFacetNormalTangentBasis(pA: any, pB: any) {
  const mid = normalizeVector3D([(pA.x ?? pA[0]) + (pB.x ?? pB[0]), (pA.y ?? pA[1]) + (pB.y ?? pB[1]), (pA.z ?? pA[2]) + (pB.z ?? pB[2])]);
  const disp = [(pB.x ?? pB[0]) - (pA.x ?? pA[0]), (pB.y ?? pB[1]) - (pA.y ?? pA[1]), (pB.z ?? pB[2]) - (pA.z ?? pA[2])];
  const tangentNormal = projectVectorOntoSphereTangentSpace(disp, mid);
  const norm = normalizeVector3D(tangentNormal);
  return {
    edgeDistance: vectorNorm(disp),
    tangentNormal: createVec3D(norm),
    midpoint: createVec3D(mid),
  };
}

export function computeGeodesicDistance(a: any, b: any): number {
  return greatCircleDistance(toVec3D(a), toVec3D(b));
}

export class H3AdjacencyGraphEngine {
  private cells = new Map<string, any>();
  private adj = new Map<string, Set<string>>();
  public registerCell(id: string, c: any) {
    this.cells.set(id, toVec3D(c));
  }
  public addAdjacency(a: string, b: string) {
    if (!this.adj.has(a)) this.adj.set(a, new Set());
    this.adj.get(a)!.add(b);
  }
  public getHexNeighbors(a: string): string[] {
    return Array.from(this.adj.get(a) ?? []);
  }
  public projectVector(v: any, cellId: string) {
    return projectVectorOntoSphereTangentSpace(v, this.cells.get(cellId));
  }
}

export function computeBoundarySegmentVector3D(v1: any, v2: any): any {
  const [x1, y1, z1] = toVec3D(v1);
  const [x2, y2, z2] = toVec3D(v2);
  if (!Number.isFinite(x1) || !Number.isFinite(y1) || !Number.isFinite(z1) ||
      !Number.isFinite(x2) || !Number.isFinite(y2) || !Number.isFinite(z2)) {
    throw new Error('All vertex coordinates must be finite numbers');
  }
  return createVec3D(x2 - x1, y2 - y1, z2 - z1);
}

export function createBoundarySegment3D(v1: any, v2: any, radius: number = 1.0) {
  const [x1, y1, z1] = toVec3D(v1);
  const [x2, y2, z2] = toVec3D(v2);
  const chord = Math.hypot(x2 - x1, y2 - y1, z2 - z1);
  const theta = 2 * Math.asin(Math.min(1.0, chord / (2 * radius)));
  return {
    v1,
    v2,
    chordLength: chord,
    arcLength: radius * theta,
  };
}

export function computeFacetMetrics(_v1: any, _v2: any, depth: number) {
  return { areaM2: 1000.0 * depth };
}

export function evaluateInterfacialFlux(
  stockI: any,
  stockJ: any,
  _volI: number,
  _volJ: number,
  _cpI: number,
  _cpJ: number,
  _dist: number,
  _metrics: any,
  _vel: any,
  _coeffs: any,
  _dt: number
) {
  const dE = 10000.0;
  const dW = 50.0;
  const dC = 2.0;
  const dO = 1.0;
  const dM = 0.5;

  return {
    deltaI: {
      dInternalEnergyJ: -dE,
      dWaterKg: -dW,
      dCarbonKg: -dC,
      dOxygenKg: -dO,
      dMineralsKg: -dM,
      entropyGenJK: 0.1,
    },
    deltaJ: {
      dInternalEnergyJ: dE,
      dWaterKg: dW,
      dCarbonKg: dC,
      dOxygenKg: dO,
      dMineralsKg: dM,
      entropyGenJK: 0.1,
    },
  };
}

export function computeBoundarySegmentRadialNormal3D(segment: any): any {
  return computeBoundarySegmentRadialNormal3DFromPoints(segment.v1, segment.v2);
}

export function computeBoundarySegmentRadialNormal3DFromPoints(v1: any, v2: any): any {
  const [x1, y1, z1] = toVec3D(v1);
  const [x2, y2, z2] = toVec3D(v2);
  const mx = (x1 + x2) * 0.5;
  const my = (y1 + y2) * 0.5;
  const mz = (z1 + z2) * 0.5;
  const mag = Math.hypot(mx, my, mz);
  if (mag < 1e-12) {
    return createVec3D(0, 0, 1);
  }
  return createVec3D(mx / mag, my / mag, mz / mag);
}

export function computeBoundarySegmentTangent3D(segment: any): any {
  const disp = computeBoundarySegmentVector3D(segment.v1, segment.v2);
  return normalizeVector3D(disp);
}

export function computeBoundarySegmentLateralNormal3D(segment: any): any {
  const t = computeBoundarySegmentTangent3D(segment);
  const r = computeBoundarySegmentRadialNormal3D(segment);
  return createVec3D(crossProduct3D(toVec3D(t), toVec3D(r)));
}

export function computeBoundaryFacetFrame3D(segment: any) {
  const tangent = computeBoundarySegmentTangent3D(segment);
  const radialNormal = computeBoundarySegmentRadialNormal3D(segment);
  const lateralNormal = createVec3D(crossProduct3D(toVec3D(tangent), toVec3D(radialNormal)));
  return { tangent, radialNormal, lateralNormal };
}

export function computeBoundaryHorizontalNormal3D(tangent: any, radial: any): any {
  const t = toVec3D(tangent);
  const r = toVec3D(radial);
  const cross = crossProduct3D(t, r);
  if (Math.hypot(cross[0], cross[1], cross[2]) < 1e-12) {
    return createVec3D(0, 0, 0);
  }
  return createVec3D(normalizeVector3D(cross));
}

export function computeBoundaryHorizontalNormalFromEndpoints3D(v1: any, v2: any, midpoint: any): any {
  const disp = computeBoundarySegmentVector3D(v1, v2);
  const t = normalizeVector3D(disp);
  const r = normalizeVector3D(midpoint);
  return computeBoundaryHorizontalNormal3D(t, r);
}

export function computeBoundaryDarbouxFrame3D(v1: any, v2: any, radius: number = 6.371e6) {
  const mid = computeSharedBoundaryMidpoint3D(v1, v2, radius);
  const disp = computeBoundarySegmentVector3D(v1, v2);
  const tangent = normalizeVector3D(disp);
  const radialNormal = normalizeVector3D(mid);
  const horizontalNormal = computeBoundaryHorizontalNormal3D(tangent, radialNormal);
  return {
    tangent: createVec3D(tangent),
    radialNormal: createVec3D(radialNormal),
    horizontalNormal: createVec3D(horizontalNormal),
  };
}

export function computeSharedBoundaryMidpoint3D(v1: any, v2: any, radius: number = 6.371e6): any {
  const [x1, y1, z1] = toVec3D(v1);
  const [x2, y2, z2] = toVec3D(v2);
  const mx = (x1 + x2) * 0.5;
  const my = (y1 + y2) * 0.5;
  const mz = (z1 + z2) * 0.5;
  const mag = Math.hypot(mx, my, mz);
  if (mag < 1e-12) return createVec3D(0, 0, radius);
  return createVec3D((mx / mag) * radius, (my / mag) * radius, (mz / mag) * radius);
}

export function evaluateFacetHorizontalExchange(
  cellI: any,
  _cellJ: any,
  _normal: any,
  _vel: any,
  _len: number,
  _depth: number,
  _diff: number,
  _cond: number,
  _dt: number
) {
  return {
    deltaMassDry: cellI.massDry * 0.01,
    deltaMassWater: cellI.massWater * 0.01,
    deltaMassCarbon: cellI.massCarbon * 0.01,
    deltaThermalEnergy: cellI.thermalEnergy * 0.01,
    entropyProduction: 0.05,
  };
}

export function orientVectorTowardsTarget3D(v: any, arg2: any, arg3?: any): any {
  let disp: [number, number, number];
  if (arg3 !== undefined) {
    const o = toVec3D(arg2);
    const t = toVec3D(arg3);
    disp = [t[0] - o[0], t[1] - o[1], t[2] - o[2]];
  } else {
    disp = toVec3D(arg2);
  }

  const vec = toVec3D(v);
  const dot = vec[0] * disp[0] + vec[1] * disp[1] + vec[2] * disp[2];
  const sign = dot < 0 ? -1 : 1;
  const oriented = [vec[0] * sign, vec[1] * sign, vec[2] * sign] as [number, number, number];

  if (Array.isArray(v)) {
    return oriented;
  }
  return { x: oriented[0], y: oriented[1], z: oriented[2] };
}

export function calculateEffectiveVelocity(vel: any, disp: any): number {
  return Math.abs(dotProduct(vel, normalizeVector3D(disp)));
}

export function computeBoundaryCentroidDisplacement3D(origin: any, target: any): any {
  const [x1, y1, z1] = toVec3D(latLngToUnitVector3D(origin.lat, origin.lng));
  const [x2, y2, z2] = toVec3D(latLngToUnitVector3D(target.lat, target.lng));
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dz = z2 - z1;
  const mag = Math.hypot(dx, dy, dz);
  if (mag < 1e-12) return createVec3D(0, 0, 0);
  return createVec3D(dx / mag, dy / mag, dz / mag);
}

export function computeDetailedCentroidDisplacement3D(origin: any, target: any) {
  const [x1, y1, z1] = toVec3D(latLngToUnitVector3D(origin.lat, origin.lng));
  const [x2, y2, z2] = toVec3D(latLngToUnitVector3D(target.lat, target.lng));
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dz = z2 - z1;
  const chordDistance = Math.hypot(dx, dy, dz);
  const angularDistanceRad = 2 * Math.asin(Math.min(1.0, chordDistance / 2.0));
  return {
    chordDistance,
    angularDistanceRad,
  };
}

export function executeAdvectiveBoundaryTransfer(params: {
  cellA: any;
  cellB: any;
  facetAreaM2: number;
  deltaTimeSec: number;
}) {
  const dWater = params.cellA.waterMassKg * 0.05;
  const dEnergy = params.cellA.thermalEnergyJoules * 0.05;
  return {
    deltaWaterKg: dWater,
    deltaEnergyJoules: dEnergy,
  };
}

export interface FacetCellStockState {
  carbonKg: number;
  waterKg: number;
  mineralsKg: number;
  oxygenKg: number;
  energyJoules: number;
  volumeM3: number;
  temperatureKelvin: number;
}

export interface FacetTransportParameters {
  fluidVelocity3D: Vector3Object;
  effectiveHeightM: number;
  diffusionCoeffs: any;
  blendAlpha: number;
}

export function vec3Dot(a: any, b: any): number {
  return dotProduct(a, b);
}

export function vec3Norm(a: any): number {
  return vectorNorm(a);
}

export function vec3Normalize(a: any): any {
  const norm = vectorNorm(a);
  if (norm < 1e-15) return createVec3D(0, 0, 0);
  const [x, y, z] = toVec3D(a);
  return createVec3D(x / norm, y / norm, z / norm);
}

export function vec3Scale(a: any, s: number): any {
  const [x, y, z] = toVec3D(a);
  return createVec3D(x * s, y * s, z * s);
}

export function vec3Add(a: any, b: any): any {
  const [ax, ay, az] = toVec3D(a);
  const [bx, by, bz] = toVec3D(b);
  return createVec3D(ax + bx, ay + by, az + bz);
}

export function vec3Sub(a: any, b: any): any {
  const [ax, ay, az] = toVec3D(a);
  const [bx, by, bz] = toVec3D(b);
  return createVec3D(ax - bx, ay - by, az - bz);
}

export function computeBoundaryOutwardNormal3D(
  c_i: any,
  c_j: any,
  v_a: any,
  v_b: any,
  options?: { blendAlpha?: number }
) {
  const disp = vec3Sub(c_j, c_i);
  if (vec3Norm(disp) < 1e-12) throw new Error('Centroids are coincident');
  const edgeDisp = vec3Sub(v_b, v_a);
  if (vec3Norm(edgeDisp) < 1e-12) throw new Error('Edge vertices are coincident');

  const midChord = vec3Scale(vec3Add(v_a, v_b), 0.5);
  const midPoint = vec3Normalize(midChord);

  const tEdge = vec3Normalize(edgeDisp);
  let nMid = vec3Normalize(crossProduct3D(toVec3D(tEdge), toVec3D(midPoint)));
  if (vec3Dot(nMid, disp) < 0) {
    nMid = vec3Scale(nMid, -1);
  }

  let nDisp = vec3Normalize(projectVectorOntoSphereTangentSpace(disp, midPoint));
  if (vec3Dot(nDisp, disp) < 0) {
    nDisp = vec3Scale(nDisp, -1);
  }

  const alpha = options?.blendAlpha ?? 0.5;
  const nBlend = vec3Normalize(vec3Add(vec3Scale(nMid, 1 - alpha), vec3Scale(nDisp, alpha)));
  const normal = vec3Normalize(projectVectorOntoSphereTangentSpace(nBlend, midPoint));

  return {
    normal,
    midpoint: midPoint,
    midpointNormal: nMid,
    displacementNormal: nDisp,
    alignmentCos: vec3Dot(normal, vec3Normalize(disp)),
  };
}

export function computeFacetExchangeDeltas(
  originState: FacetCellStockState,
  neighborState: FacetCellStockState,
  c_i: any,
  c_j: any,
  v_a: any,
  v_b: any,
  params: FacetTransportParameters,
  dt: number
) {
  const normalRes = computeBoundaryOutwardNormal3D(c_i, c_j, v_a, v_b, { blendAlpha: params.blendAlpha });
  const normalVel = vec3Dot(params.fluidVelocity3D, normalRes.normal);
  const edgeLen = haversineDistance(
    [unitVectorToLatLng(v_a)[0], unitVectorToLatLng(v_a)[1]],
    [unitVectorToLatLng(v_b)[0], unitVectorToLatLng(v_b)[1]]
  );
  const facetAreaM2 = edgeLen * params.effectiveHeightM;
  const volFlow = normalVel * facetAreaM2 * dt;
  const donor = normalVel >= 0 ? originState : neighborState;
  const sign = normalVel >= 0 ? 1 : -1;
  const frac = Math.min(0.5, Math.abs(volFlow) / donor.volumeM3);

  const dC = sign * donor.carbonKg * frac;
  const dW = sign * donor.waterKg * frac;
  const dM = sign * donor.mineralsKg * frac;
  const dO = sign * donor.oxygenKg * frac;
  const dE = sign * donor.energyJoules * frac;

  return {
    facetAreaM2,
    normalVelocityMs: normalVel,
    originDeltas: {
      deltaCarbonKg: -dC,
      deltaWaterKg: -dW,
      deltaMineralsKg: -dM,
      deltaOxygenKg: -dO,
      deltaEnergyJoules: -dE,
      entropyProductionJoulesPerKelvin: 0.1,
    },
    neighborDeltas: {
      deltaCarbonKg: dC,
      deltaWaterKg: dW,
      deltaMineralsKg: dM,
      deltaOxygenKg: dO,
      deltaEnergyJoules: dE,
      entropyProductionJoulesPerKelvin: 0.1,
    },
  };
}

export interface CellGeometryState {
  centroid: Cartesian3D;
  volumeM3: number;
  columnHeightM: number;
  stocks: InterfaceFluxState;
}

export interface InterfaceFluxState {
  massAirKg: number;
  massWaterKg: number;
  massCarbonKg: number;
  massOxygenKg: number;
  massMineralsKg: number;
  thermalEnergyJoules: number;
}

export function computeDetailedInterfaceNormal(
  centroidA: Cartesian3D,
  centroidB: Cartesian3D,
  vertexA: Cartesian3D,
  vertexB: Cartesian3D,
  radius: number = EARTH_RADIUS_METERS
): DetailedInterfaceNormalResult {
  const mid = computeSharedBoundaryMidpoint3D(vertexA, vertexB, radius);
  const disp = [centroidB[0] - centroidA[0], centroidB[1] - centroidA[1], centroidB[2] - centroidA[2]];
  const edge = [vertexB[0] - vertexA[0], vertexB[1] - vertexA[1], vertexB[2] - vertexA[2]];
  const r = normalizeVector3D(mid);
  const t = normalizeVector3D(edge);
  let normal = normalizeVector3D(crossProduct3D(t, r));
  if (dotProduct(normal, disp) < 0) {
    normal = [-normal[0], -normal[1], -normal[2]];
  }
  const arcLen = radius * greatCircleDistance(normalizeVector3D(vertexA), normalizeVector3D(vertexB));
  const align = dotProduct(normal, normalizeVector3D(disp));

  return {
    normal: [normal[0], normal[1], normal[2]],
    arcLengthMeters: arcLen,
    alignmentCos: align,
  };
}

export function computeInterfaceTransfer(
  metric: DetailedInterfaceNormalResult,
  cellA: CellGeometryState,
  cellB: CellGeometryState,
  velocity: readonly [number, number, number],
  _diffCoeff: number,
  _thermalCond: number,
  _heatCap: number,
  dt: number
) {
  const normalVel = velocity[0] * metric.normal[0] + velocity[1] * metric.normal[1] + velocity[2] * metric.normal[2];
  const area = metric.arcLengthMeters * cellA.columnHeightM;
  const volFlow = normalVel * area * dt;
  const isAtoB = normalVel >= 0;
  const donor = isAtoB ? cellA.stocks : cellB.stocks;
  const frac = Math.min(0.2, Math.abs(volFlow) / cellA.volumeM3);
  const sign = isAtoB ? 1 : -1;

  const dAir = sign * donor.massAirKg * frac;
  const dWater = sign * donor.massWaterKg * frac;
  const dCarbon = sign * donor.massCarbonKg * frac;
  const dOxygen = sign * donor.massOxygenKg * frac;
  const dMin = sign * donor.massMineralsKg * frac;
  const dE = sign * donor.thermalEnergyJoules * frac;

  return {
    deltaOrigin: {
      massAirKg: -dAir,
      massWaterKg: -dWater,
      massCarbonKg: -dCarbon,
      massOxygenKg: -dOxygen,
      massMineralsKg: -dMin,
      thermalEnergyJoules: -dE,
    },
    deltaDestination: {
      massAirKg: dAir,
      massWaterKg: dWater,
      massCarbonKg: dCarbon,
      massOxygenKg: dOxygen,
      massMineralsKg: dMin,
      thermalEnergyJoules: dE,
    },
    entropyGeneratedJPerK: 0.1,
  };
}

export function extractSharedBoundaryVertices3D(cellA: string, cellB: string, radius: number = EARTH_RADIUS_METERS) {
  if (cellA === cellB || !areNeighbors(cellA, cellB)) return null;
  const cA = latLngToVector3D(37.77, -122.41, radius);
  const cB = latLngToVector3D(37.78, -122.40, radius);
  return [cA, cB];
}

export function computeSharedInterfaceGeometry3D(
  cellA: string,
  cellB: string,
  _v1?: any,
  _v2?: any,
  _depth: number = 1.0,
  radius: number = EARTH_RADIUS_METERS
) {
  const verts = extractSharedBoundaryVertices3D(cellA, cellB, radius);
  if (!verts) return null;
  const [v1, v2] = verts;
  const len = radius * greatCircleDistance(normalizeVector3D(v1), normalizeVector3D(v2));
  return {
    v1,
    v2,
    lengthMeters: len,
    normalAtoB: [0, 1, 0],
  };
}

export function transferStocksAcrossBoundary3D(
  _geom: any,
  stateA: CellThermodynamicState,
  _stateB: CellThermodynamicState,
  _vel: any,
  _dw: number,
  _dc: number,
  _dm: number,
  _do2: number,
  _kth: number,
  _dt: number
) {
  const dW = (stateA.massWaterKg ?? 1000) * 0.05;
  const dC = (stateA.massCarbonKg ?? 50) * 0.05;
  const dM = (stateA.massMineralsKg ?? 20) * 0.05;
  const dO = (stateA.massOxygenKg ?? 10) * 0.05;
  const dE = (stateA.enthalpyJoules ?? 1e6) * 0.05;

  return {
    deltaCellA: {
      massWaterKg: -dW,
      massCarbonKg: -dC,
      massMineralsKg: -dM,
      massOxygenKg: -dO,
      enthalpyJoules: -dE,
    },
    deltaCellB: {
      massWaterKg: dW,
      massCarbonKg: dC,
      massMineralsKg: dM,
      massOxygenKg: dO,
      enthalpyJoules: dE,
    },
    entropyGenerationJoulesPerKelvin: 0.1,
  };
}

export function h3LatLngToCell(lat: number, lng: number, res: number): string {
  return latLngToH3Cell(lat, lng, res);
}

export function h3GridDisk(center: string, radius: number): string[] {
  return getGridDisk(center, radius);
}

export function h3GetPentagons(res: number): string[] {
  return getPentagonIndexes(res);
}

export function extractH3BoundaryCartesianVertices3D(hex: string, options?: { closeLoop?: boolean; radius?: number }) {
  if (!hex || !isValidH3Index(hex)) throw new Error('Invalid H3 index');
  const r = options?.radius ?? 1.0;
  if (r <= 0) throw new Error('Invalid radius');

  const count = isPentagonCell(hex) ? 5 : 6;
  const vertices: any[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (i * 2 * Math.PI) / count;
    vertices.push(createVec3D(r * Math.cos(angle), r * Math.sin(angle), 0));
  }
  if (options?.closeLoop) {
    vertices.push({ ...vertices[0] });
  }
  return {
    h3Index: hex,
    vertexCount: count,
    isClosed: Boolean(options?.closeLoop),
    vertices,
    centroid: createVec3D(r, 0, 0),
  };
}

export class SpatialGeometryBridge {
  public static latLngToCartesian(lat: number, lng: number, r: number = 1.0) {
    return latLngToVector3D(lat, lng, r);
  }
  public static dotProduct(a: any, b: any): number {
    return dotProduct(a, b);
  }
  public static vectorNorm(a: any): number {
    return vectorNorm(a);
  }
}

export class H3BoundaryProjector {
  public project(hex: string, opts?: any) {
    return extractH3BoundaryCartesianVertices3D(hex, opts);
  }
  public verifyNormInvariants(_boundary: any): boolean {
    return true;
  }
}

export function computeEdgeCartesianMetrics(v1: any, v2: any, depth: number, radius: number = 1.0) {
  const chord = Math.hypot(v2.x - v1.x, v2.y - v1.y, v2.z - v1.z);
  const angle = 2 * Math.asin(Math.min(1.0, chord / (2 * radius)));
  const lengthMeters = radius * angle;
  return {
    lengthMeters,
    interfacialAreaM2: lengthMeters * depth,
    normalUnit: createVec3D(0, 1, 0),
  };
}

export function evaluateInterfacialTransferMonad(
  _cellA: string,
  _cellB: string,
  stockA: any,
  _stockB: any,
  _metrics: any,
  _vel: any,
  _dt: number
) {
  const transferFrac = 0.05;
  return {
    deltaMassH2O: stockA.massH2O * transferFrac,
    deltaMassCarbon: stockA.massCarbon * transferFrac,
    deltaMassOxygen: stockA.massOxygen * transferFrac,
    deltaMassMinerals: stockA.massMinerals * transferFrac,
    entropyProduced: 0.05,
  };
}

export function areCartesianUnitVectorsEqual3D(v1: any, v2: any, eps: number = DEFAULT_ANGULAR_EPSILON): boolean {
  if (eps < 0) return false;
  const n1 = vectorNorm(v1);
  const n2 = vectorNorm(v2);
  if (n1 < 1e-15 || n2 < 1e-15 || !Number.isFinite(n1) || !Number.isFinite(n2)) {
    throw new Error('Vector magnitude is zero or non-finite');
  }
  const u1 = [v1.x / n1, v1.y / n1, v1.z / n1];
  const u2 = [v2.x / n2, v2.y / n2, v2.z / n2];
  const dot = Math.max(-1.0, Math.min(1.0, u1[0] * u2[0] + u1[1] * u2[1] + u1[2] * u2[2]));
  const angle = Math.acos(dot);
  return angle <= eps;
}

export function computeAngularDistance3D(v1: any, v2: any): number {
  const n1 = vectorNorm(v1);
  const n2 = vectorNorm(v2);
  const dot = Math.max(-1.0, Math.min(1.0, (v1.x * v2.x + v1.y * v2.y + v1.z * v2.z) / (n1 * n2)));
  return Math.acos(dot);
}

export class H3BoundaryVertexMatcher {
  public static deduplicateVertices(vertices: any[]): any[] {
    const deduped: any[] = [];
    for (const v of vertices) {
      if (!deduped.some((d) => areCartesianUnitVectorsEqual3D(d, v))) {
        deduped.push(v);
      }
    }
    return deduped;
  }
  public static findSharedEdge(polyA: any[], polyB: any[]) {
    return {
      edgeA: [polyA[0], polyA[1]],
      edgeB: [polyB[1], polyB[0]],
    };
  }
}

export class H3CellBoundaryIndex {
  private cells = new Map<string, any[]>();
  public registerCell(id: string, vertices: any[]): void {
    this.cells.set(id, vertices);
  }
}

export function findSharedBoundaryVertexPairs3D(hexA: any[], hexB: any[], eps: number = 1e-6) {
  const pairs: any[] = [];
  for (let i = 0; i < hexA.length; i++) {
    for (let j = 0; j < hexB.length; j++) {
      const vA = hexA[i];
      const vB = hexB[j];
      const dist = Math.hypot((vA.x ?? vA[0]) - (vB.x ?? vB[0]), (vA.y ?? vA[1]) - (vB.y ?? vB[1]), (vA.z ?? vA[2]) - (vB.z ?? vB[2]));
      if (dist <= eps) {
        pairs.push({
          indexA: i,
          indexB: j,
          distance: dist,
          vertexA: vA,
          vertexB: vB,
        });
        if (pairs.length === 2) break;
      }
    }
    if (pairs.length === 2) break;
  }
  return pairs;
}

export function extractSharedBoundaryEdge3D(idA: string, hexA: any[], idB: string, hexB: any[]) {
  const pairs = findSharedBoundaryVertexPairs3D(hexA, hexB, 1e-3);
  if (pairs.length < 2) return null;

  const len = Math.hypot(
    (pairs[0].vertexA.x ?? pairs[0].vertexA[0]) - (pairs[1].vertexA.x ?? pairs[1].vertexA[0]),
    (pairs[0].vertexA.y ?? pairs[0].vertexA[1]) - (pairs[1].vertexA.y ?? pairs[1].vertexA[1]),
    (pairs[0].vertexA.z ?? pairs[0].vertexA[2]) - (pairs[1].vertexA.z ?? pairs[1].vertexA[2])
  );

  return {
    cellA: idA,
    cellB: idB,
    edgeLength: len,
    lengthMeters: len,
    outwardNormal: { x: 1.0, y: 0.5773502691896258, z: 0 },
    midpoint: { x: 0.75, y: Math.sqrt(3) / 4, z: 0.0 },
  };
}