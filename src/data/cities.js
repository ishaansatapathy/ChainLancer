/**
 * Payment corridor cities with real geographic coordinates.
 * These represent active freelancer/client hubs in the ChainLancer network.
 */
export const cities = [
  // India
  { name: 'Delhi', lat: 28.6139, lng: 77.2090, type: 'hub' },
  { name: 'Mumbai', lat: 19.0760, lng: 72.8777, type: 'hub' },
  { name: 'Bengaluru', lat: 12.9716, lng: 77.5946, type: 'hub' },
  { name: 'Hyderabad', lat: 17.3850, lng: 78.4867, type: 'hub' },
  { name: 'Kolkata', lat: 22.5726, lng: 88.3639, type: 'corridor' },
  { name: 'Chennai', lat: 13.0827, lng: 80.2707, type: 'corridor' },
  { name: 'Pune', lat: 18.5204, lng: 73.8567, type: 'corridor' },

  // Europe
  { name: 'London', lat: 51.5074, lng: -0.1278, type: 'hub' },
  { name: 'Berlin', lat: 52.5200, lng: 13.4050, type: 'hub' },
  { name: 'Amsterdam', lat: 52.3676, lng: 4.9041, type: 'hub' },
  { name: 'Paris', lat: 48.8566, lng: 2.3522, type: 'corridor' },
  { name: 'Zurich', lat: 47.3769, lng: 8.5417, type: 'corridor' },
  { name: 'Stockholm', lat: 59.3293, lng: 18.0686, type: 'corridor' },
  { name: 'Lisbon', lat: 38.7223, lng: -9.1393, type: 'corridor' },

  // North America
  { name: 'San Francisco', lat: 37.7749, lng: -122.4194, type: 'hub' },
  { name: 'New York', lat: 40.7128, lng: -74.0060, type: 'hub' },
  { name: 'Toronto', lat: 43.6532, lng: -79.3832, type: 'hub' },
  { name: 'Austin', lat: 30.2672, lng: -97.7431, type: 'corridor' },
  { name: 'Miami', lat: 25.7617, lng: -80.1918, type: 'corridor' },
  { name: 'Seattle', lat: 47.6062, lng: -122.3321, type: 'corridor' },
  { name: 'Vancouver', lat: 49.2827, lng: -123.1207, type: 'corridor' },

  // Asia Pacific
  { name: 'Singapore', lat: 1.3521, lng: 103.8198, type: 'hub' },
  { name: 'Tokyo', lat: 35.6762, lng: 139.6503, type: 'hub' },
  { name: 'Sydney', lat: -33.8688, lng: 151.2093, type: 'corridor' },
  { name: 'Seoul', lat: 37.5665, lng: 126.9780, type: 'corridor' },
  { name: 'Jakarta', lat: -6.2088, lng: 106.8456, type: 'corridor' },
  { name: 'Ho Chi Minh', lat: 10.8231, lng: 106.6297, type: 'corridor' },

  // Middle East & Africa
  { name: 'Dubai', lat: 25.2048, lng: 55.2708, type: 'hub' },
  { name: 'Tel Aviv', lat: 32.0853, lng: 34.7818, type: 'corridor' },
  { name: 'Lagos', lat: 6.5244, lng: 3.3792, type: 'corridor' },
  { name: 'Nairobi', lat: -1.2921, lng: 36.8219, type: 'corridor' },
  { name: 'Cape Town', lat: -33.9249, lng: 18.4241, type: 'corridor' },

  // South America
  { name: 'São Paulo', lat: -23.5505, lng: -46.6333, type: 'corridor' },
  { name: 'Buenos Aires', lat: -34.6037, lng: -58.3816, type: 'corridor' },
  { name: 'Medellín', lat: 6.2476, lng: -75.5658, type: 'corridor' },
];

/**
 * Payment corridors — lines between major hubs showing transaction flow
 */
export const corridors = [
  ['Delhi', 'San Francisco'],
  ['Mumbai', 'London'],
  ['Bengaluru', 'New York'],
  ['Berlin', 'Singapore'],
  ['Amsterdam', 'Dubai'],
  ['Toronto', 'Delhi'],
  ['London', 'Bengaluru'],
  ['San Francisco', 'Tokyo'],
  ['New York', 'London'],
  ['Singapore', 'Sydney'],
  ['Dubai', 'Mumbai'],
  ['Paris', 'São Paulo'],
];
