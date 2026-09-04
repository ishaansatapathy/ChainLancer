/**
 * CHAINLANCER — Interactive Globe
 * High-performance COBE 3D WebGL Globe
 * - 16,000 Fibonacci sphere map samples
 * - Luminous dark theme with amber/orange corridor hubs
 * - Authentic landmasses with crisp brightness differentiation
 * - Smooth pointer drag & auto-rotation
 * - HTML concentric ring markers and glassmorphic city badges
 */
import createGlobe from 'cobe';

// Primary hub cities (concentric ring markers + badges)
export const hubCities = [
  { name: 'San Francisco', location: [37.774929, -122.419418] },
  { name: 'New York', location: [40.712776, -74.005974] },
  { name: 'London', location: [51.507351, -0.127758] },
  { name: 'Delhi', location: [28.704060, 77.102493] },
  { name: 'Bangalore', location: [12.971599, 77.594566] },
  { name: 'Mumbai', location: [19.075983, 72.877655] },
  { name: 'Kolkata', location: [22.572645, 88.363892] },
  { name: 'Hyderabad', location: [17.385044, 78.486671] },
  { name: 'Dubai', location: [25.2048, 55.2708] },
  { name: 'Singapore', location: [1.3521, 103.8198] },
  { name: 'Tokyo', location: [35.6762, 139.6503] },
  { name: 'Berlin', location: [52.520008, 13.404954] },
  { name: 'Paris', location: [48.856613, 2.352222] },
  { name: 'Amsterdam', location: [52.370216, 4.895168] },
];

// Builder & Freelancer global network nodes (orange particle dots across the globe)
export const networkNodes = [
  // North America
  [47.6062, -122.3321], [30.2672, -97.7431], [42.3601, -71.0589], [41.8781, -87.6298],
  [34.0522, -118.2437], [39.7392, -104.9903], [33.7490, -84.3880], [43.6532, -79.3832],
  [49.2827, -123.1207], [25.7617, -80.1918],
  // India / South Asia
  [13.0827, 80.2707], [18.5204, 73.8567], [23.0225, 72.5714], [26.9124, 75.7873],
  [11.0168, 76.9558], [15.2993, 74.1240], [22.7196, 75.8577], [21.1458, 79.0882],
  // East & Southeast Asia
  [39.9042, 116.4074], [31.2304, 121.4737], [22.5431, 114.0579], [30.2741, 120.1551],
  [34.6937, 135.5023], [37.5665, 126.9780], [25.0330, 121.5654], [14.5995, 120.9842],
  [10.8231, 106.6297], [-6.2088, 106.8456],
  // Australia
  [-33.8688, 151.2093], [-37.8136, 144.9631], [-27.4698, 153.0251], [-31.9505, 115.8605],
  // Europe
  [53.4808, -2.2426], [52.2053, 0.1218], [55.9533, -3.1883], [53.3498, -6.2603],
  [48.1351, 11.5820], [50.1109, 8.6821], [45.7640, 4.8357], [51.4416, 5.4697],
  [59.3293, 18.0686], [60.1699, 24.9384], [55.6761, 12.5683], [47.3769, 8.5417],
  [41.3874, 2.1686], [38.7223, -9.1393], [40.4168, -3.7038], [41.9028, 12.4964],
  // Middle East & Africa
  [32.0853, 34.7818], [24.7136, 46.6753], [6.5244, 3.3792], [-1.2921, 36.8219],
  [-33.9249, 18.4241], [-26.2041, 28.0473], [30.0444, 31.2357], [36.8065, 10.1815],
  // South America
  [-23.5505, -46.6333], [-34.6037, -58.3816], [-33.4489, -70.6693], [4.7110, -74.0721],
  [-12.0464, -77.0428]
];

const GOLD = [0.788, 0.659, 0.298]; // #c9a84c (ishaandev.co.in signature champagne gold)

export function initGlobe(container) {
  if (!container) return;

  container.innerHTML = '';
  container.style.position = 'relative';

  // Wrapper with square aspect ratio to ensure complete unclipped sphere
  const wrapper = document.createElement('div');
  wrapper.className = 'cobe-globe-wrapper';
  wrapper.style.cssText = `
    position: relative;
    width: 100%;
    max-width: 600px;
    aspect-ratio: 1;
    margin: 0 auto;
    user-select: none;
  `;
  container.appendChild(wrapper);

  // Canvas element
  const canvas = document.createElement('canvas');
  canvas.className = 'cobe-globe-canvas';
  canvas.style.cssText = `
    width: 100%;
    height: 100%;
    display: block;
    cursor: grab;
    opacity: 0;
    transition: opacity 0.8s ease-out;
  `;
  wrapper.appendChild(canvas);

  // HTML Markers & Labels overlay container
  const labelsOverlay = document.createElement('div');
  labelsOverlay.className = 'cobe-labels-overlay';
  labelsOverlay.style.cssText = `
    position: absolute;
    inset: 0;
    pointer-events: none;
    overflow: hidden;
  `;
  wrapper.appendChild(labelsOverlay);

  // Create marker elements
  const labelNodes = [];
  hubCities.forEach((city) => {
    const item = document.createElement('div');
    item.className = 'cobe-marker-item';
    item.style.cssText = `
      position: absolute;
      left: 0;
      top: 0;
      will-change: transform, opacity;
      opacity: 0;
      pointer-events: none;
    `;

    // Concentric ring matching WeMakeDevs
    const ring = document.createElement('span');
    ring.className = 'cobe-marker-ring';
    ring.style.cssText = `
      position: absolute;
      left: 0;
      top: 0;
      width: 13px;
      height: 13px;
      transform: translate(-50%, -50%);
      border-radius: 50%;
      border: 1.5px solid #c9a84c;
      background: rgba(201, 168, 76, 0.2);
      box-shadow: 0 0 10px rgba(201, 168, 76, 0.5);
    `;
    item.appendChild(ring);

    // Frosted black pill badge matching ishaandev.co.in
    const badge = document.createElement('span');
    badge.className = 'cobe-marker-badge';
    badge.textContent = city.name;
    badge.style.cssText = `
      position: absolute;
      left: 0;
      top: 0;
      transform: translate(-50%, calc(-100% - 10px));
      white-space: nowrap;
      border-radius: 9999px;
      background: rgba(12, 12, 12, 0.9);
      padding: 3px 10px;
      font-family: 'Inter', ui-sans-serif, system-ui, sans-serif;
      font-size: 11px;
      font-weight: 500;
      letter-spacing: 0.02em;
      color: #fafaf9;
      border: 1px solid rgba(255, 255, 255, 0.12);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.6);
    `;
    item.appendChild(badge);

    labelsOverlay.appendChild(item);
    labelNodes.push({ city, el: item });
  });

  // State
  let phi = 0;
  const theta = 0.3; // Natural 17° orbital tilt
  let pointerInteracting = null;
  let pointerInteractionMovement = 0;
  let currentWidth = wrapper.offsetWidth || 550;

  // Responsive resize handler
  const handleResize = () => {
    currentWidth = wrapper.offsetWidth || 550;
  };
  window.addEventListener('resize', handleResize);

  // Drag interaction handlers
  canvas.addEventListener('pointerdown', (e) => {
    pointerInteracting = e.clientX - pointerInteractionMovement;
    canvas.style.cursor = 'grabbing';
  });

  window.addEventListener('pointerup', () => {
    pointerInteracting = null;
    canvas.style.cursor = 'grab';
  });

  canvas.addEventListener('pointerout', () => {
    pointerInteracting = null;
    canvas.style.cursor = 'grab';
  });

  window.addEventListener('pointermove', (e) => {
    if (pointerInteracting !== null) {
      const delta = e.clientX - pointerInteracting;
      pointerInteractionMovement = delta;
    }
  });

  canvas.addEventListener('touchmove', (e) => {
    if (pointerInteracting !== null && e.touches[0]) {
      const delta = e.touches[0].clientX - pointerInteracting;
      pointerInteractionMovement = delta;
    }
  }, { passive: true });

  // Update HTML labels positions using WeMakeDevs exact 3D spherical projection
  function updateLabels(currentPhi) {
    const a = currentPhi;
    const w = currentWidth;
    const h = currentWidth; // Square aspect

    labelNodes.forEach(({ city, el }) => {
      const lat = city.location[0];
      const lng = city.location[1];

      const s = lat * Math.PI / 180;
      const c = lng * Math.PI / 180 - Math.PI;
      const d = -Math.cos(s) * Math.cos(c) * 0.85;
      const p = 0.85 * Math.sin(s);
      const u = Math.cos(s) * Math.sin(c) * 0.85;
      const y = Math.cos(theta);
      const tH = Math.sin(theta);

      const x = ((Math.cos(a) * d + Math.sin(a) * u + 1) / 2);
      const yPos = (-(Math.sin(a) * tH * d + y * p - Math.cos(a) * tH * u) + 1) / 2;
      const depth = -Math.sin(a) * y * d + tH * p + Math.cos(a) * y * u;

      // Visibility based on sphere depth (fade out smoothly when occluded)
      const visibility = Math.max(0, Math.min(1, depth / 0.25));

      el.style.opacity = `${visibility}`;
      el.style.transform = `translate(${x * w}px, ${yPos * h}px)`;
    });
  }

  // Markers array for COBE (hub markers + builder particle dots)
  const cobeMarkers = [
    ...hubCities.map(c => ({ location: c.location, size: 0.02, color: GOLD })),
    ...networkNodes.map(c => ({ location: c, size: 0.012, color: GOLD }))
  ];

  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  // Initialize COBE Globe
  const globe = createGlobe(canvas, {
    phi: 0,
    theta,
    dark: 1,
    diffuse: 1.2,
    scale: 1,
    mapSamples: 16000,
    mapBrightness: 2.5,
    mapBaseBrightness: 0.1,
    baseColor: [0.5, 0.5, 0.5],
    markerColor: GOLD,
    glowColor: [0.15, 0.14, 0.10],
    markers: cobeMarkers,
    width: currentWidth * dpr,
    height: currentWidth * dpr,
    devicePixelRatio: dpr,
  });

  // Animation Loop: updates rotation & label projections every frame
  let animId;
  function animate() {
    if (pointerInteracting === null) {
      phi += 0.002;
    }
    const currentPhi = phi + pointerInteractionMovement / 200;
    globe.update({
      phi: currentPhi,
      width: currentWidth * dpr,
      height: currentWidth * dpr,
    });
    updateLabels(currentPhi);
    animId = requestAnimationFrame(animate);
  }
  animId = requestAnimationFrame(animate);

  // Fade canvas in once rendered
  requestAnimationFrame(() => {
    canvas.style.opacity = '1';
  });

  return () => {
    cancelAnimationFrame(animId);
    window.removeEventListener('resize', handleResize);
    globe.destroy();
  };
}
