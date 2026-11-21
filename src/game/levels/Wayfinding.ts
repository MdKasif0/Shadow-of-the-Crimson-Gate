import * as THREE from 'three';

/**
 * Wayfinding — Turns a level's route into "the way from here": the nearest
 * point on the route, then the rest of it. Before the boss falls the route
 * ends at the boss; after, it carries on to the gate.
 */
export function routeGuide(route: THREE.Vector3[], afterBoss: THREE.Vector3[]) {
  return (from: THREE.Vector3, isBossDefeated: boolean): THREE.Vector3[] => {
    const points = isBossDefeated ? [...route, ...afterBoss] : route;
    if (points.length < 2) return [from.clone(), ...points.map(p => p.clone())];
    let best = 0;
    let bestDistance = Infinity;
    let bestPoint = points[0].clone();
    const closest = new THREE.Vector3();
    const segment = new THREE.Line3();
    for (let i = 0; i < points.length - 1; i++) {
      segment.set(points[i], points[i + 1]);
      segment.closestPointToPoint(from, true, closest);
      const d = closest.distanceToSquared(from);
      if (d < bestDistance) {
        bestDistance = d;
        best = i;
        bestPoint = closest.clone();
      }
    }
    return [from.clone(), bestPoint, ...points.slice(best + 1).map(p => p.clone())];
  };
}

/** A path of points `spacing` apart along a polyline, up to `maxLength` from its start. */
export function samplePath(path: THREE.Vector3[], spacing: number, maxLength: number): { points: THREE.Vector3[]; length: number } {
  const length = Math.min(pathLength(path), maxLength);
  const points: THREE.Vector3[] = [];
  for (let d = 0; d <= length; d += spacing) points.push(pointAlong(path, d));
  return { points, length };
}

/** The point `distance` along a polyline, or its end. */
export function pointAlong(path: THREE.Vector3[], distance: number): THREE.Vector3 {
  let left = distance;
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    const length = Math.hypot(b.x - a.x, b.z - a.z);
    if (left <= length) return new THREE.Vector3().lerpVectors(a, b, length > 0 ? left / length : 0);
    left -= length;
  }
  return path[path.length - 1].clone();
}

export function pathLength(path: THREE.Vector3[]): number {
  let total = 0;
  for (let i = 0; i < path.length - 1; i++) total += Math.hypot(path[i + 1].x - path[i].x, path[i + 1].z - path[i].z);
  return total;
}
