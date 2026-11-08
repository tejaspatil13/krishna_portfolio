/**
 * Deterministic "broken glass" shards covering a box, as % polygons.
 * A jittered grid split into triangles — reads as a frame breaking apart.
 */
export interface Shard {
  points: string; // CSS polygon() argument
  cx: number; // centroid in %
  cy: number;
}

function rand(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function makeShards(cols = 4, rows = 4, seed = 7): Shard[] {
  const r = rand(seed);
  const pts: [number, number][][] = [];
  for (let y = 0; y <= rows; y++) {
    pts.push([]);
    for (let x = 0; x <= cols; x++) {
      const edgeX = x === 0 || x === cols;
      const edgeY = y === 0 || y === rows;
      const jx = edgeX ? 0 : (r() - 0.5) * (70 / cols);
      const jy = edgeY ? 0 : (r() - 0.5) * (70 / rows);
      pts[y].push([(x / cols) * 100 + jx, (y / rows) * 100 + jy]);
    }
  }
  const shards: Shard[] = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const a = pts[y][x];
      const b = pts[y][x + 1];
      const c = pts[y + 1][x + 1];
      const d = pts[y + 1][x];
      const tris = r() > 0.5 ? [[a, b, c], [a, c, d]] : [[a, b, d], [b, c, d]];
      for (const t of tris) {
        shards.push({
          points: t.map(([px, py]) => `${px.toFixed(2)}% ${py.toFixed(2)}%`).join(", "),
          cx: (t[0][0] + t[1][0] + t[2][0]) / 3,
          cy: (t[0][1] + t[1][1] + t[2][1]) / 3,
        });
      }
    }
  }
  return shards;
}
