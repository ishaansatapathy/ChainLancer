const fs = require('fs');
const path = require('path');

const geojsonPath = path.join(__dirname, '..', 'public', 'world.geojson');
const raw = fs.readFileSync(geojsonPath, 'utf8');
const geojson = JSON.parse(raw);

// Point in polygon test (ray-casting)
function pointInPolygon(point, vs) {
  const x = point[0], y = point[1];
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][0], yi = vs[i][1];
    const xj = vs[j][0], yj = vs[j][1];
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointInFeature(point, feature) {
  const geom = feature.geometry;
  if (!geom) return false;
  if (geom.type === 'Polygon') {
    // Check exterior ring first
    if (pointInPolygon(point, geom.coordinates[0])) {
      // Check holes
      for (let i = 1; i < geom.coordinates.length; i++) {
        if (pointInPolygon(point, geom.coordinates[i])) return false;
      }
      return true;
    }
  } else if (geom.type === 'MultiPolygon') {
    for (const poly of geom.coordinates) {
      if (pointInPolygon(point, poly[0])) {
        let inHole = false;
        for (let i = 1; i < poly.length; i++) {
          if (pointInPolygon(point, poly[i])) {
            inHole = true;
            break;
          }
        }
        if (!inHole) return true;
      }
    }
  }
  return false;
}

// Bounding box filter for quick rejection
const featuresWithBbox = geojson.features.map(f => {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  function updateBounds(coords) {
    for (const c of coords) {
      if (Array.isArray(c[0])) {
        updateBounds(c);
      } else {
        if (c[0] < minX) minX = c[0];
        if (c[0] > maxX) maxX = c[0];
        if (c[1] < minY) minY = c[1];
        if (c[1] > maxY) maxY = c[1];
      }
    }
  }
  if (f.geometry && f.geometry.coordinates) {
    updateBounds(f.geometry.coordinates);
  }
  return { feature: f, bbox: [minX, minY, maxX, maxY] };
});

function isLand(lng, lat) {
  const pt = [lng, lat];
  for (const { feature, bbox } of featuresWithBbox) {
    if (lng < bbox[0] || lng > bbox[2] || lat < bbox[1] || lat > bbox[3]) continue;
    if (pointInFeature(pt, feature)) return true;
  }
  return false;
}

console.log('Generating grid dots...');
const dots = [];

// Grid step size:
// Lng from -180 to 180 (step: 2.0 or 1.8)
// Lat from -58 to 82 (step: 2.0 or 1.8)
const step = 1.8;

for (let lat = 80; lat >= -56; lat -= step) {
  for (let lng = -178; lng <= 178; lng += step) {
    if (isLand(lng, lat)) {
      // Normalize to percentage 0..100 for 2D map
      // Using Equirectangular or Robinson-like mapping
      // X: -180 to 180 => 0% to 100%
      const x = ((lng + 180) / 360) * 100;
      // Y: 84 to -56 => 0% to 100%
      const y = ((84 - lat) / 140) * 100;
      dots.push([Number(x.toFixed(2)), Number(y.toFixed(2))]);
    }
  }
}

console.log(`Generated ${dots.length} dots!`);
const outPath = path.join(__dirname, '..', 'src', 'data', 'world-dots.json');
fs.writeFileSync(outPath, JSON.stringify(dots));
console.log('Saved to src/data/world-dots.json');
