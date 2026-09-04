/**
 * CHAINLANCER — Interactive 2D Dotted World Map
 * Canvas-based world map matching the exact WeMakeDevs implementation
 */
import worldDots from './data/world-dots.json';

// Coordinates mapping:
// x = ((lng + 180) / 360) * 100
// y = ((84 - lat) / 140) * 100
export const MAP_CITIES = [
  { id: 'sf', name: 'San Francisco', lat: 37.7749, lng: -122.4194, isHub: true, country: 'USA' },
  { id: 'nyc', name: 'New York', lat: 40.7128, lng: -74.0060, isHub: true, country: 'USA' },
  { id: 'london', name: 'London', lat: 51.5074, lng: -0.1278, isHub: true, country: 'UK' },
  { id: 'paris', name: 'Paris', lat: 48.8566, lng: 2.3522, isHub: false, country: 'France' },
  { id: 'amsterdam', name: 'Amsterdam', lat: 52.3676, lng: 4.9041, isHub: false, country: 'Netherlands' },
  { id: 'berlin', name: 'Berlin', lat: 52.5200, lng: 13.4050, isHub: false, country: 'Germany' },
  { id: 'dubai', name: 'Dubai', lat: 25.2048, lng: 55.2708, isHub: true, country: 'UAE' },
  { id: 'delhi', name: 'Delhi', lat: 28.6139, lng: 77.2090, isHub: true, country: 'India' },
  { id: 'mumbai', name: 'Mumbai', lat: 19.0760, lng: 72.8777, isHub: true, country: 'India' },
  { id: 'bengaluru', name: 'Bengaluru', lat: 12.9716, lng: 77.5946, isHub: true, country: 'India' },
  { id: 'hyderabad', name: 'Hyderabad', lat: 17.3850, lng: 78.4867, isHub: false, country: 'India' },
  { id: 'singapore', name: 'Singapore', lat: 1.3521, lng: 103.8198, isHub: true, country: 'Singapore' },
  { id: 'tokyo', name: 'Tokyo', lat: 35.6762, lng: 139.6503, isHub: true, country: 'Japan' },
  { id: 'sydney', name: 'Sydney', lat: -33.8688, lng: 151.2093, isHub: false, country: 'Australia' },
  { id: 'saopaulo', name: 'São Paulo', lat: -23.5505, lng: -46.6333, isHub: false, country: 'Brazil' },
  { id: 'nairobi', name: 'Nairobi', lat: -1.2921, lng: 36.8219, isHub: false, country: 'Kenya' },
];

function getCityXY(city) {
  const x = ((city.lng + 180) / 360);
  const y = ((84 - city.lat) / 140);
  return { x, y };
}

export function initWorldMap(container) {
  if (!container) return;

  container.innerHTML = '';
  container.style.position = 'relative';

  // Canvas element
  const canvas = document.createElement('canvas');
  canvas.className = 'world-map-canvas';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  container.appendChild(canvas);

  // Tooltip element
  const tooltip = document.createElement('div');
  tooltip.className = 'world-map-tooltip';
  tooltip.style.cssText = `
    position: absolute;
    transform: translate(-50%, -100%);
    margin-top: -12px;
    padding: 3px 8px;
    background: #0d1117;
    border: 1px solid rgba(0, 229, 117, 0.4);
    border-radius: 4px;
    color: #ffffff;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    font-weight: 500;
    pointer-events: none;
    white-space: nowrap;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5), 0 0 10px rgba(0, 229, 117, 0.2);
    transition: opacity 0.2s ease, left 0.3s ease, top 0.3s ease;
    opacity: 0;
    z-index: 10;
  `;
  container.appendChild(tooltip);

  const ctx = canvas.getContext('2d');
  let animationFrameId;
  let activeCityId = 'london';
  let pulsePhase = 0;

  function resize() {
    const rect = container.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
  }

  window.addEventListener('resize', resize);
  resize();

  // Animation loop
  function draw() {
    const rect = container.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    ctx.clearRect(0, 0, w, h);

    // 1. Draw subtle background continent dots
    ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
    const dotRadius = Math.max(1, w * 0.0016);

    for (let i = 0; i < worldDots.length; i++) {
      const [pctX, pctY] = worldDots[i];
      const px = (pctX / 100) * w;
      const py = (pctY / 100) * h;

      ctx.beginPath();
      ctx.arc(px, py, dotRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Draw corridor connecting arcs between key hubs
    const corridorPairs = [
      ['sf', 'nyc'],
      ['nyc', 'london'],
      ['london', 'delhi'],
      ['london', 'dubai'],
      ['delhi', 'singapore'],
      ['singapore', 'tokyo'],
      ['mumbai', 'bengaluru'],
    ];

    ctx.lineWidth = 1;
    for (const [id1, id2] of corridorPairs) {
      const c1 = MAP_CITIES.find(c => c.id === id1);
      const c2 = MAP_CITIES.find(c => c.id === id2);
      if (!c1 || !c2) continue;

      const p1 = getCityXY(c1);
      const p2 = getCityXY(c2);
      const x1 = p1.x * w, y1 = p1.y * h;
      const x2 = p2.x * w, y2 = p2.y * h;

      ctx.strokeStyle = 'rgba(0, 229, 117, 0.12)';
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      // Quadratic curve bending slightly upwards
      const midX = (x1 + x2) / 2;
      const midY = Math.min(y1, y2) - Math.abs(x2 - x1) * 0.15;
      ctx.quadraticCurveTo(midX, midY, x2, y2);
      ctx.stroke();
    }

    // 3. Draw cities
    pulsePhase += 0.035;

    let activePos = null;

    MAP_CITIES.forEach(city => {
      const { x, y } = getCityXY(city);
      const cx = x * w;
      const cy = y * h;
      const isActive = city.id === activeCityId;

      if (isActive) {
        activePos = { cx, cy, name: city.name };
      }

      if (city.isHub) {
        // Outer pulsing target rings
        const ringScale1 = (Math.sin(pulsePhase) + 1) / 2; // 0..1
        const ringScale2 = (Math.sin(pulsePhase + Math.PI / 2) + 1) / 2;

        const maxRadius = isActive ? 18 : 10;

        // Concentric ring 1
        ctx.strokeStyle = isActive
          ? `rgba(0, 229, 117, ${0.7 - ringScale1 * 0.5})`
          : `rgba(0, 229, 117, ${0.4 - ringScale1 * 0.3})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(cx, cy, 4 + ringScale1 * maxRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Concentric ring 2
        ctx.strokeStyle = isActive
          ? `rgba(0, 229, 117, ${0.5 - ringScale2 * 0.4})`
          : `rgba(0, 229, 117, ${0.25 - ringScale2 * 0.2})`;
        ctx.beginPath();
        ctx.arc(cx, cy, 3 + ringScale2 * (maxRadius * 0.6), 0, Math.PI * 2);
        ctx.stroke();

        // Core solid glowing green dot
        ctx.fillStyle = '#00E575';
        ctx.shadowColor = '#00E575';
        ctx.shadowBlur = isActive ? 12 : 6;
        ctx.beginPath();
        ctx.arc(cx, cy, isActive ? 3.5 : 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0; // reset
      } else {
        // Smaller subtle builder dot
        ctx.fillStyle = 'rgba(0, 229, 117, 0.6)';
        ctx.beginPath();
        ctx.arc(cx, cy, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Update tooltip position
    if (activePos) {
      tooltip.textContent = activePos.name;
      tooltip.style.left = `${activePos.cx}px`;
      tooltip.style.top = `${activePos.cy}px`;
      tooltip.style.opacity = '1';
    } else {
      tooltip.style.opacity = '0';
    }

    animationFrameId = requestAnimationFrame(draw);
  }

  draw();

  // Connect interactive tag pills underneath
  const tags = document.querySelectorAll('#world-map-tags .tag');
  tags.forEach(tag => {
    tag.addEventListener('mouseenter', () => {
      const targetCity = tag.getAttribute('data-city');
      if (targetCity) {
        activeCityId = targetCity;
        updateActiveTag(tag);
      }
    });
    tag.addEventListener('click', () => {
      const targetCity = tag.getAttribute('data-city');
      if (targetCity) {
        activeCityId = targetCity;
        updateActiveTag(tag);
      }
    });
  });

  function updateActiveTag(activeTagEl) {
    tags.forEach(t => t.classList.remove('tag--active'));
    activeTagEl.classList.add('tag--active');
  }

  return () => {
    window.removeEventListener('resize', resize);
    cancelAnimationFrame(animationFrameId);
  };
}
