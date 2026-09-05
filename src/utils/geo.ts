import { Report, SeverityType, PriorityType, CategoryType } from '../types';

export function isValidCoordinate(lat: number, lng: number): boolean {
  return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

export interface GeolocationResult {
  lat: number;
  lng: number;
  accuracy?: number;
  source: 'gps-high' | 'gps-low' | 'ip' | 'fallback';
  cityName?: string;
  timestamp?: number;
}

export const TN_CITY_HUBS = [
  { name: 'Chennai', lat: 13.0827, lng: 80.2707, label: 'Chennai' },
  { name: 'Coimbatore', lat: 11.0168, lng: 76.9558, label: 'Coimbatore' },
  { name: 'Madurai', lat: 9.9252, lng: 78.1198, label: 'Madurai' },
  { name: 'Salem', lat: 11.6643, lng: 78.1460, label: 'Salem' },
  { name: 'Tiruchirappalli', lat: 10.7905, lng: 78.7047, label: 'Trichy' },
  { name: 'Erode', lat: 11.3410, lng: 77.7172, label: 'Erode' },
  { name: 'Tirunelveli', lat: 8.7139, lng: 77.7567, label: 'Tirunelveli' },
  { name: 'Vellore', lat: 12.9165, lng: 79.1325, label: 'Vellore' }
];

/**
 * Robust IP-based location fallback (doesn't require GPS hardware or permission prompts)
 */
export async function fetchIPLocation(): Promise<GeolocationResult | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch('https://ipwho.is/', { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.success && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
      if (isValidCoordinate(data.latitude, data.longitude)) {
        return {
          lat: data.latitude,
          lng: data.longitude,
          accuracy: 5000,
          source: 'ip',
          cityName: data.city || data.region || 'Network Location',
          timestamp: Date.now()
        };
      }
    }
  } catch (e) {
    console.warn('[Geolocation] IP location service failed or timed out:', e);
  }
  return null;
}

/**
 * Multi-tier geolocation resolver:
 * 1. High Accuracy GPS (Device satellite/hardware)
 * 2. Low Accuracy GPS / Network Triangulation (Cell/Wi-Fi/cache - high success rate on desktop)
 * 3. Network IP Location fallback
 * 4. Regional default fallback (Erode / Central Tamil Nadu)
 */
export async function getAccurateUserLocation(options?: {
  onStatus?: (msg: string) => void;
}): Promise<GeolocationResult> {
  // Step 1: High Accuracy GPS (with realistic 4.5s timeout)
  if (typeof navigator !== 'undefined' && navigator.geolocation) {
    options?.onStatus?.('Requesting device GPS coordinates...');
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 4500,
          maximumAge: 10000
        });
      });
      if (isValidCoordinate(pos.coords.latitude, pos.coords.longitude)) {
        return {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          source: 'gps-high',
          timestamp: pos.timestamp
        };
      }
    } catch (highErr) {
      console.warn('[Geolocation] High accuracy GPS unavailable, retrying with network/cached location...', highErr);
    }

    // Step 2: Low Accuracy Browser Geolocation (Wi-Fi / Cellular / Cached location)
    options?.onStatus?.('Acquiring Wi-Fi / network-assisted coordinates...');
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 7000,
          maximumAge: 120000
        });
      });
      if (isValidCoordinate(pos.coords.latitude, pos.coords.longitude)) {
        return {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          source: 'gps-low',
          timestamp: pos.timestamp
        };
      }
    } catch (lowErr) {
      console.warn('[Geolocation] Browser geolocation failed, trying IP fallback...', lowErr);
    }
  }

  // Step 3: IP Location Fallback
  options?.onStatus?.('Estimating location via network IP...');
  const ipLoc = await fetchIPLocation();
  if (ipLoc) {
    return ipLoc;
  }

  // Step 4: Tamil Nadu Central Hub Fallback
  return {
    lat: 11.3410,
    lng: 77.7172,
    accuracy: 10000,
    source: 'fallback',
    cityName: 'Erode (Central TN Hub)',
    timestamp: Date.now()
  };
}

/**
 * Continuous real-time location watch
 */
export function watchLivePosition(
  onUpdate: (result: GeolocationResult) => void,
  onError: (err: GeolocationPositionError | Error) => void
): () => void {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    onError(new Error('Geolocation not supported on this device or browser.'));
    return () => {};
  }

  const watchId = navigator.geolocation.watchPosition(
    (pos) => {
      if (isValidCoordinate(pos.coords.latitude, pos.coords.longitude)) {
        onUpdate({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          source: 'gps-high',
          timestamp: pos.timestamp
        });
      }
    },
    (err) => {
      onError(err);
    },
    {
      enableHighAccuracy: true,
      maximumAge: 4000,
      timeout: 12000
    }
  );

  return () => {
    navigator.geolocation.clearWatch(watchId);
  };
}

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error('Geocoding failed');
    const data = await res.json();
    const address = data.address;
    if (address) {
      return (
        address.neighbourhood ||
        address.suburb ||
        address.village ||
        address.town ||
        address.city ||
        address.municipality ||
        address.county ||
        (data.display_name ? data.display_name.split(',')[0] : 'Area detected')
      );
    }
    return data.display_name ? data.display_name.split(',')[0] : 'Area detected';
  } catch (error) {
    console.warn('Reverse geocode timeout or error, falling back:', error);
    // Find nearest regional hub if available
    let closestCity = 'Area detected';
    let minDistance = Infinity;
    for (const hub of TN_CITY_HUBS) {
      const dist = Math.hypot(hub.lat - lat, hub.lng - lng);
      if (dist < minDistance) {
        minDistance = dist;
        closestCity = minDistance < 0.6 ? `${hub.name} Area` : `${hub.name} Region`;
      }
    }
    return closestCity;
  }
}

export const COMPREHENSIVE_LOCAL_PLACES: Array<{ name: string; aliases: string[]; lat: number; lng: number; displayName: string }> = [
  // Major Capitals & Metros
  { name: 'Chennai', aliases: ['madras', 'chennai central', 'chennai city'], lat: 13.0827, lng: 80.2707, displayName: 'Chennai, Tamil Nadu, India' },
  { name: 'Anna Nagar', aliases: ['anna nagar chennai', 'anna arch'], lat: 13.0850, lng: 80.2101, displayName: 'Anna Nagar, Chennai, Tamil Nadu' },
  { name: 'T. Nagar', aliases: ['t nagar', 'thyagaraya nagar', 't.nagar'], lat: 13.0418, lng: 80.2341, displayName: 'T. Nagar, Chennai, Tamil Nadu' },
  { name: 'Guindy', aliases: ['guindy industrial estate', 'guindy chennai', 'kathipara'], lat: 13.0067, lng: 80.2026, displayName: 'Guindy, Chennai, Tamil Nadu' },
  { name: 'Velachery', aliases: ['velachery chennai', 'velachery bypass'], lat: 12.9815, lng: 80.2180, displayName: 'Velachery, Chennai, Tamil Nadu' },
  { name: 'OMR', aliases: ['omr', 'old mahabalipuram road', 'rajiv gandhi salai', 'sholinganallur'], lat: 12.9010, lng: 80.2279, displayName: 'OMR / Sholinganallur, Chennai, Tamil Nadu' },
  { name: 'Marina Beach', aliases: ['marina', 'marina beach chennai', 'kamarajar salai'], lat: 13.0500, lng: 80.2824, displayName: 'Marina Beach, Chennai, Tamil Nadu' },
  { name: 'Tambaram', aliases: ['tambaram chennai', 'tambaram sanatorium', 'tambaram railway'], lat: 12.9249, lng: 80.1000, displayName: 'Tambaram, Chennai, Tamil Nadu' },
  { name: 'Adyar', aliases: ['adyar chennai', 'adyar bridge'], lat: 13.0012, lng: 80.2565, displayName: 'Adyar, Chennai, Tamil Nadu' },
  { name: 'Mount Road', aliases: ['anna salai', 'mount road chennai', 'thousand lights'], lat: 13.0604, lng: 80.2496, displayName: 'Anna Salai (Mount Road), Chennai, Tamil Nadu' },
  
  // Western & Central Hubs
  { name: 'Erode', aliases: ['erode central', 'erode junction', 'erode town'], lat: 11.3410, lng: 77.7172, displayName: 'Erode, Tamil Nadu, India' },
  { name: 'Perundurai', aliases: ['perundurai erode', 'sipcot perundurai'], lat: 11.2750, lng: 77.5828, displayName: 'Perundurai, Erode, Tamil Nadu' },
  { name: 'Bhavani', aliases: ['bhavani erode', 'kooduthurai'], lat: 11.4485, lng: 77.6833, displayName: 'Bhavani, Erode, Tamil Nadu' },
  { name: 'Gobichettipalayam', aliases: ['gobi', 'gobichettipalayam erode'], lat: 11.4550, lng: 77.4380, displayName: 'Gobichettipalayam, Erode, Tamil Nadu' },
  { name: 'Coimbatore', aliases: ['kovai', 'coimbatore city', 'coimbatore junction'], lat: 11.0168, lng: 76.9558, displayName: 'Coimbatore, Tamil Nadu, India' },
  { name: 'Gandhipuram', aliases: ['gandhipuram coimbatore', 'gandhipuram bus stand'], lat: 11.0183, lng: 76.9688, displayName: 'Gandhipuram, Coimbatore, Tamil Nadu' },
  { name: 'RS Puram', aliases: ['rs puram coimbatore', 'r.s. puram'], lat: 11.0086, lng: 76.9485, displayName: 'R.S. Puram, Coimbatore, Tamil Nadu' },
  { name: 'Peelamedu', aliases: ['peelamedu coimbatore', 'coimbatore airport', 'tidel park coimbatore'], lat: 11.0311, lng: 77.0184, displayName: 'Peelamedu, Coimbatore, Tamil Nadu' },
  { name: 'Saravanampatti', aliases: ['saravanampatti coimbatore', 'it corridor coimbatore'], lat: 11.0805, lng: 76.9940, displayName: 'Saravanampatti, Coimbatore, Tamil Nadu' },
  { name: 'Tiruppur', aliases: ['tirupur', 'tiruppur city', 'knit city'], lat: 11.1085, lng: 77.3411, displayName: 'Tiruppur, Tamil Nadu, India' },
  { name: 'Salem', aliases: ['salem city', 'salem junction', 'shevapet', 'steel city salem'], lat: 11.6643, lng: 78.1460, displayName: 'Salem, Tamil Nadu, India' },
  { name: 'Yercaud', aliases: ['yercaud salem', 'yercaud hills'], lat: 11.7753, lng: 78.2093, displayName: 'Yercaud, Salem, Tamil Nadu' },
  { name: 'Namakkal', aliases: ['namakkal fort', 'namakkal town'], lat: 11.2189, lng: 78.1674, displayName: 'Namakkal, Tamil Nadu, India' },
  { name: 'Karur', aliases: ['karur textile', 'karur town'], lat: 10.9601, lng: 78.0766, displayName: 'Karur, Tamil Nadu, India' },
  { name: 'Dharmapuri', aliases: ['dharmapuri town', 'hogenakkal'], lat: 12.1211, lng: 78.1582, displayName: 'Dharmapuri, Tamil Nadu, India' },
  { name: 'Krishnagiri', aliases: ['krishnagiri dam', 'hosur road'], lat: 12.5186, lng: 78.2137, displayName: 'Krishnagiri, Tamil Nadu, India' },
  { name: 'Hosur', aliases: ['hosur industrial', 'sipcot hosur'], lat: 12.7409, lng: 77.8253, displayName: 'Hosur, Krishnagiri, Tamil Nadu' },

  // Southern Hubs & Heritage
  { name: 'Madurai', aliases: ['madurai city', 'madurai junction', 'meenakshi amman temple'], lat: 9.9252, lng: 78.1198, displayName: 'Madurai, Tamil Nadu, India' },
  { name: 'Tiruchirappalli', aliases: ['trichy', 'rockfort trichy', 'srirangam', 'trichy junction'], lat: 10.7905, lng: 78.7047, displayName: 'Tiruchirappalli, Tamil Nadu, India' },
  { name: 'Thanjavur', aliases: ['tanjore', 'brihadeeswarar temple', 'thanjavur big temple'], lat: 10.7870, lng: 79.1378, displayName: 'Thanjavur, Tamil Nadu, India' },
  { name: 'Dindigul', aliases: ['dindigul fort', 'dindigul lock'], lat: 10.3673, lng: 77.9803, displayName: 'Dindigul, Tamil Nadu, India' },
  { name: 'Tirunelveli', aliases: ['nellai', 'tirunelveli junction', 'palayamkottai'], lat: 8.7139, lng: 77.7567, displayName: 'Tirunelveli, Tamil Nadu, India' },
  { name: 'Tuticorin', aliases: ['thoothukudi', 'tuticorin port'], lat: 8.7642, lng: 78.1348, displayName: 'Thoothukudi, Tamil Nadu, India' },
  { name: 'Kanyakumari', aliases: ['cape comorin', 'vivekananda rock', 'kanyakumari beach'], lat: 8.0883, lng: 77.5385, displayName: 'Kanyakumari, Tamil Nadu, India' },
  { name: 'Nagercoil', aliases: ['nagercoil town', 'nagercoil junction'], lat: 8.1833, lng: 77.4119, displayName: 'Nagercoil, Kanyakumari, Tamil Nadu' },
  { name: 'Rameswaram', aliases: ['rameshwaram', 'pamban bridge', 'ramanathaswamy temple'], lat: 9.2876, lng: 79.3129, displayName: 'Rameswaram, Tamil Nadu, India' },
  { name: 'Vellore', aliases: ['vellore fort', 'cmc vellore', 'vit vellore'], lat: 12.9165, lng: 79.1325, displayName: 'Vellore, Tamil Nadu, India' },
  { name: 'Kanchipuram', aliases: ['kanchi', 'temple city kanchipuram', 'silk city'], lat: 12.8342, lng: 79.7036, displayName: 'Kanchipuram, Tamil Nadu, India' },
  { name: 'Cuddalore', aliases: ['cuddalore port', 'silver beach'], lat: 11.7480, lng: 79.7714, displayName: 'Cuddalore, Tamil Nadu, India' },
  { name: 'Villupuram', aliases: ['viluppuram', 'villupuram junction'], lat: 11.9401, lng: 79.4861, displayName: 'Villupuram, Tamil Nadu, India' },
  { name: 'Tiruvannamalai', aliases: ['thiruvannamalai', 'annamalaiyar temple', 'giri valam'], lat: 12.2253, lng: 79.0747, displayName: 'Tiruvannamalai, Tamil Nadu, India' },

  // Neighboring Capitals & States
  { name: 'Bengaluru', aliases: ['bangalore', 'bengaluru city', 'mg road bangalore', 'koramangala', 'whitefield', 'indiranagar'], lat: 12.9716, lng: 77.5946, displayName: 'Bengaluru, Karnataka, India' },
  { name: 'Mysuru', aliases: ['mysore', 'mysore palace'], lat: 12.2958, lng: 76.6394, displayName: 'Mysuru, Karnataka, India' },
  { name: 'Puducherry', aliases: ['pondicherry', 'pondy', 'white town pondicherry', 'auroville', 'promenade beach'], lat: 11.9416, lng: 79.8083, displayName: 'Puducherry, Union Territory, India' },
  { name: 'Tirupati', aliases: ['tirumala', 'tirupati temple', 'alipiri'], lat: 13.6288, lng: 79.4192, displayName: 'Tirupati, Andhra Pradesh, India' },
  { name: 'Kochi', aliases: ['cochin', 'ernakulam', 'fort kochi', 'marine drive kochi'], lat: 9.9312, lng: 76.2673, displayName: 'Kochi, Kerala, India' },
  { name: 'Kozhikode', aliases: ['calicut', 'calicut beach'], lat: 11.2588, lng: 75.7804, displayName: 'Kozhikode, Kerala, India' },
  { name: 'Thiruvananthapuram', aliases: ['trivandrum', 'kovalam'], lat: 8.5241, lng: 76.9366, displayName: 'Thiruvananthapuram, Kerala, India' },
  { name: 'Hyderabad', aliases: ['hyderabad city', 'charminar', 'hitec city', 'secunderabad'], lat: 17.3850, lng: 78.4867, displayName: 'Hyderabad, Telangana, India' }
];

export async function searchLocationQuery(rawQuery: string): Promise<{ lat: number; lng: number; displayName: string } | null> {
  const query = rawQuery.trim();
  if (!query) return null;

  const lower = query.toLowerCase();

  // 1. Instant local index lookup (Exact & Fuzzy Aliases)
  for (const place of COMPREHENSIVE_LOCAL_PLACES) {
    if (
      place.name.toLowerCase() === lower ||
      place.aliases.some((a) => a.toLowerCase() === lower || lower.includes(a.toLowerCase()) || a.toLowerCase().includes(lower))
    ) {
      return {
        lat: place.lat,
        lng: place.lng,
        displayName: place.displayName
      };
    }
  }

  // 2. Photon Geocoder (Fast, highly reliable OpenStreetMap search by Komoot)
  try {
    const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=1`;
    const pController = new AbortController();
    const pTimeout = setTimeout(() => pController.abort(), 3500);
    const pRes = await fetch(photonUrl, { signal: pController.signal });
    clearTimeout(pTimeout);

    if (pRes.ok) {
      const pData = await pRes.json();
      if (pData && pData.features && pData.features.length > 0) {
        const feat = pData.features[0];
        const [lon, lat] = feat.geometry.coordinates;
        if (isValidCoordinate(lat, lon)) {
          const props = feat.properties || {};
          const name = props.name || query;
          const city = props.city || props.county || props.state || '';
          const state = props.state || '';
          const country = props.country || '';
          const display = [name, city, state, country].filter(Boolean).join(', ');
          return {
            lat: parseFloat(lat),
            lng: parseFloat(lon),
            displayName: display || query
          };
        }
      }
    }
  } catch (photonErr) {
    console.warn('[Geocoding] Photon search skipped or timed out:', photonErr);
  }

  // 3. OpenStreetMap Nominatim with Regional Prioritization
  const searchTerms = [
    query.toLowerCase().includes('india') ? query : `${query}, Tamil Nadu, India`,
    query
  ];

  for (const term of searchTerms) {
    try {
      const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(term)}&limit=1&addressdetails=1`;
      const nController = new AbortController();
      const nTimeout = setTimeout(() => nController.abort(), 4000);
      const res = await fetch(nomUrl, {
        headers: {
          'Accept': 'application/json'
        },
        signal: nController.signal
      });
      clearTimeout(nTimeout);

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const item = data[0];
          const lat = parseFloat(item.lat);
          const lon = parseFloat(item.lon);
          if (isValidCoordinate(lat, lon)) {
            return {
              lat,
              lng: lon,
              displayName: item.display_name
            };
          }
        }
      }
    } catch (nomErr) {
      console.warn('[Geocoding] Nominatim query error:', nomErr);
    }
  }

  return null;
}

export function calculateSmartPriority(
  severity: SeverityType,
  category: CategoryType,
  lat: number,
  lng: number,
  existingReports: Report[] = []
): PriorityType {
  let score = 0;
  const severityScores: Record<SeverityType, number> = {
    Low: 1,
    Medium: 2,
    High: 3,
    Critical: 4
  };
  score += severityScores[severity] || 2;

  const categoryWeights: Record<string, number> = {
    'Pothole': 1.5,
    'Road Damage': 1.3,
    'Broken Streetlight': 1.4,
    'Water Leakage': 1.2,
    'Drainage Issue': 1.1,
    'Garbage Overflow': 0.9,
    'Damaged Public Facility': 1.2,
    'Other': 1.0
  };
  score *= categoryWeights[category] || 1.0;

  const list = Array.isArray(existingReports) ? existingReports : [];
  const nearbyReports = list.filter(r => {
    if (!r || typeof r.lat !== 'number' || typeof r.lng !== 'number') return false;
    const dist = Math.sqrt(Math.pow(r.lat - lat, 2) + Math.pow(r.lng - lng, 2));
    return dist < 0.005 && r.category === category;
  });
  score += nearbyReports.length * 0.5;

  if (score >= 6) return 'Critical';
  if (score >= 4) return 'High';
  if (score >= 2.5) return 'Medium';
  return 'Low';
}

export function simulateAIImageAnalysis(): {
  category: CategoryType;
  confidence: number;
  priority: PriorityType;
  severity: SeverityType;
  reason: string;
} {
  const categories: CategoryType[] = [
    'Pothole',
    'Road Damage',
    'Broken Streetlight',
    'Garbage Overflow',
    'Water Leakage'
  ];
  const category = categories[Math.floor(Math.random() * categories.length)];
  const confidence = Math.floor(Math.random() * 15) + 85;
  const priorities: PriorityType[] = ['Medium', 'High', 'Critical'];
  const priority = priorities[Math.floor(Math.random() * priorities.length)];
  const severities: SeverityType[] = ['Medium', 'High', 'Critical'];
  const severity = severities[Math.floor(Math.random() * severities.length)];

  const reasons: Record<string, string> = {
    'Pothole': 'Surface irregularity indicates a pothole causing potential vehicular danger.',
    'Road Damage': 'Road surface degradation detected with extensive cracking and asphalt loss.',
    'Broken Streetlight': 'Lighting infrastructure component damaged; area prone to low visibility hazards.',
    'Garbage Overflow': 'Waste accumulation detected outside standard municipal receptacles.',
    'Water Leakage': 'Pressurized water surface ponding identified indicating probable pipeline rupture.'
  };

  return {
    category,
    confidence,
    priority,
    severity,
    reason: reasons[category] || 'Infrastructure irregularity detected from visual analysis.'
  };
}
