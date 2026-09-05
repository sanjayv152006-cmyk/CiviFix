import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import {
  isValidCoordinate,
  reverseGeocode,
  searchLocationQuery,
  getAccurateUserLocation,
  TN_CITY_HUBS
} from '../../utils/geo';
import {
  getActiveGoogleMapsKey,
  getKeyStatusInfo,
  setStoredGoogleMapsKey,
  isValidGoogleMapsKey
} from '../../utils/maps';
import { GoogleReportMap } from './GoogleReportMap';

export interface RegionalCity {
  name: string;
  state: string;
  lat: number;
  lng: number;
  type: 'capital' | 'metro' | 'hub' | 'heritage' | 'coastal';
  description: string;
}

export const SOUTH_INDIA_CITIES: RegionalCity[] = [
  { name: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lng: 80.2707, type: 'capital', description: 'State Capital & Coastal Metro' },
  { name: 'Erode', state: 'Tamil Nadu', lat: 11.3410, lng: 77.7172, type: 'hub', description: 'Central Textile & Turmeric Hub' },
  { name: 'Coimbatore', state: 'Tamil Nadu', lat: 11.0168, lng: 76.9558, type: 'metro', description: 'Manchester of South India' },
  { name: 'Vellore', state: 'Tamil Nadu', lat: 12.9165, lng: 79.1325, type: 'hub', description: 'Historic Fort & Healthcare Center' },
  { name: 'Bengaluru', state: 'Karnataka', lat: 12.9716, lng: 77.5946, type: 'metro', description: 'Silicon Valley of India' },
  { name: 'Mysuru', state: 'Karnataka', lat: 12.2958, lng: 76.6394, type: 'heritage', description: 'Royal Heritage & Cultural Hub' },
  { name: 'Puducherry', state: 'Puducherry UT', lat: 11.9416, lng: 79.8083, type: 'coastal', description: 'Coastal Union Territory & Promenade' },
  { name: 'Salem', state: 'Tamil Nadu', lat: 11.6643, lng: 78.1460, type: 'hub', description: 'Steel City & Mineral Hub' },
  { name: 'Madurai', state: 'Tamil Nadu', lat: 9.9252, lng: 78.1198, type: 'heritage', description: 'Temple City & Cultural Capital' },
  { name: 'Tiruchirappalli', state: 'Tamil Nadu', lat: 10.7905, lng: 78.7047, type: 'hub', description: 'Rockfort Central Hub (Trichy)' },
  { name: 'Tirunelveli', state: 'Tamil Nadu', lat: 8.7139, lng: 77.7567, type: 'hub', description: 'Southern Oxford & Halwa City' },
  { name: 'Thanjavur', state: 'Tamil Nadu', lat: 10.7870, lng: 79.1378, type: 'heritage', description: 'Brihadeeswarar Temple & Rice Bowl' },
  { name: 'Tirupati', state: 'Andhra Pradesh', lat: 13.6288, lng: 79.4192, type: 'heritage', description: 'Seven Hills Temple City' },
  { name: 'Kochi', state: 'Kerala', lat: 9.9312, lng: 76.2673, type: 'coastal', description: 'Queen of Arabian Sea & Port' },
  { name: 'Kozhikode', state: 'Kerala', lat: 11.2588, lng: 75.7804, type: 'coastal', description: 'Historic Malabar Spice Coast' }
];

export interface InteractiveLeafletMapProps {
  initialLat?: number;
  initialLng?: number;
  initialZoom?: number;
  selectedLat: number;
  selectedLng: number;
  onLocationSelect: (lat: number, lng: number, placeName?: string) => void;
  userCoords?: { lat: number; lng: number } | null;
  height?: string;
  showSearchBox?: boolean;
  showCityQuickJump?: boolean;
  showLayerSwitcher?: boolean;
  showFullscreenToggle?: boolean;
  showCoordinatesHUD?: boolean;
  markerTitle?: string;
  enableCityMarkers?: boolean;
  className?: string;
}

export const InteractiveLeafletMap: React.FC<InteractiveLeafletMapProps> = ({
  initialLat = 11.0168, // Center of Tamil Nadu & South India Regional view
  initialLng = 78.6569,
  initialZoom = 7, // Wide regional view showing South India, cities, highways, coastline
  selectedLat,
  selectedLng,
  onLocationSelect,
  userCoords,
  height = '420px',
  showSearchBox = true,
  showCityQuickJump = true,
  showLayerSwitcher = true,
  showFullscreenToggle = true,
  showCoordinatesHUD = true,
  markerTitle = 'Selected Hazard Location',
  enableCityMarkers = true,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const selectedMarkerRef = useRef<L.Marker | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const cityMarkersGroupRef = useRef<L.LayerGroup | null>(null);
  const currentTileLayerRef = useRef<L.TileLayer | null>(null);
  const trafficLayerRef = useRef<L.TileLayer | null>(null);

  // Map Provider State (Google Maps vs OpenStreetMap)
  const activeGoogleKey = getActiveGoogleMapsKey();
  const [mapEngine, setMapEngine] = useState<'osm' | 'google'>(activeGoogleKey ? 'google' : 'osm');
  const [googleKeyInput, setGoogleKeyInput] = useState('');
  const [googleKeyError, setGoogleKeyError] = useState<string | null>(null);
  const [showKeySetup, setShowKeySetup] = useState(false);

  // Leaflet Layer & Control States
  const [activeLayer, setActiveLayer] = useState<'voyager' | 'standard' | 'humanitarian' | 'topo'>('voyager');
  const [isTrafficActive, setIsTrafficActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentAreaName, setCurrentAreaName] = useState<string>('Detecting location...');
  const [cursorCoords, setCursorCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Clamp and validate coordinate ranges
  const normalizeCoordinates = (lat: number, lng: number) => {
    const clampedLat = Math.max(-90, Math.min(90, lat));
    let normalizedLng = lng;
    while (normalizedLng > 180) normalizedLng -= 360;
    while (normalizedLng < -180) normalizedLng += 360;
    return { lat: clampedLat, lng: normalizedLng };
  };

  // Real OpenStreetMap tile configurations with 100% genuine free layers
  const getTileLayer = useCallback((layerType: 'voyager' | 'standard' | 'humanitarian' | 'topo') => {
    switch (layerType) {
      case 'voyager':
        // High-clarity Carto Voyager (Real roads, highways, cities, coastlines, clean typography)
        return L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          maxZoom: 19,
          subdomains: 'abcd',
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>'
        });
      case 'humanitarian':
        // OSM Humanitarian layer
        return L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors, <a href="https://www.hotosm.org/" target="_blank" rel="noopener noreferrer">HOT</a>'
        });
      case 'topo':
        // OpenTopoMap
        return L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
          maxZoom: 17,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://opentopomap.org">OpenTopoMap</a>'
        });
      case 'standard':
      default:
        // Standard OSM
        return L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
        });
    }
  }, []);

  // Update reverse geocode place name
  const updateAreaName = useCallback(async (lat: number, lng: number) => {
    try {
      const area = await reverseGeocode(lat, lng);
      setCurrentAreaName(area);
      return area;
    } catch {
      setCurrentAreaName('Selected Coordinates');
      return 'Selected Coordinates';
    }
  }, []);

  // Initialize Leaflet Map
  useEffect(() => {
    if (mapEngine !== 'osm') return;
    if (!containerRef.current) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }
    if ((containerRef.current as unknown as { _leaflet_id?: number })._leaflet_id) {
      delete (containerRef.current as unknown as { _leaflet_id?: number })._leaflet_id;
    }

    const { lat, lng } = normalizeCoordinates(selectedLat || initialLat, selectedLng || initialLng);

    const map = L.map(containerRef.current, {
      center: [lat, lng],
      zoom: selectedLat && Math.abs(selectedLat - 11.0168) > 0.001 ? 14 : initialZoom,
      zoomControl: false,
      attributionControl: true,
      fadeAnimation: true,
      zoomAnimation: true,
      markerZoomAnimation: true
    });

    // Add clean zoom control top-left
    L.control.zoom({ position: 'topleft' }).addTo(map);

    // Add scale bar
    L.control.scale({ imperial: false, metric: true, position: 'bottomleft' }).addTo(map);

    // Initial tile layer
    const tileLayer = getTileLayer(activeLayer);
    tileLayer.addTo(map);
    currentTileLayerRef.current = tileLayer;

    // Traffic / High-contrast transport overlay
    if (isTrafficActive) {
      const traffic = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        opacity: 0.5
      });
      traffic.addTo(map);
      trafficLayerRef.current = traffic;
    }

    // Regional City Markers
    const citiesGroup = L.layerGroup();
    if (enableCityMarkers) {
      SOUTH_INDIA_CITIES.forEach((city) => {
        const isCapitalOrMetro = city.type === 'capital' || city.type === 'metro';
        const cityIcon = L.divIcon({
          className: 'custom-city-marker-wrap',
          html: `
            <div class="city-marker-node ${city.type}">
              <div class="city-marker-dot"></div>
              <span class="city-marker-label">${city.name}</span>
            </div>
          `,
          iconSize: [80, 24],
          iconAnchor: [40, 12]
        });

        const marker = L.marker([city.lat, city.lng], {
          icon: cityIcon,
          zIndexOffset: isCapitalOrMetro ? 200 : 100,
          title: `${city.name}, ${city.state}`
        });

        marker.bindPopup(`
          <div style="font-family: var(--font-main, 'Plus Jakarta Sans', sans-serif); min-width: 175px; padding: 3px;">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
              <span style="font-weight: 800; font-size: 14px; color: #0F172A;">${city.name}</span>
              <span style="font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: #EFF6FF; color: #1D4ED8;">${city.state}</span>
            </div>
            <p style="font-size: 11px; color: #475569; margin: 0 0 8px 0; line-height: 1.4;">${city.description}</p>
            <div style="font-size: 10px; color: #64748B; margin-bottom: 8px; font-family: monospace;">
              Lat: ${city.lat.toFixed(4)}, Lng: ${city.lng.toFixed(4)}
            </div>
            <button
              type="button"
              id="select-city-node-${city.name.toLowerCase()}"
              style="width: 100%; padding: 6px 10px; font-size: 11px; font-weight: 700; background: #2563EB; color: #FFF; border: none; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;"
            >
              <i class="fas fa-map-pin"></i> Select This City
            </button>
          </div>
        `);

        marker.on('popupopen', () => {
          const btn = document.getElementById(`select-city-node-${city.name.toLowerCase()}`);
          if (btn) {
            btn.onclick = () => {
              handleLocationSelect(city.lat, city.lng, `${city.name}, ${city.state}`);
              map.closePopup();
            };
          }
        });

        citiesGroup.addLayer(marker);
      });
      citiesGroup.addTo(map);
      cityMarkersGroupRef.current = citiesGroup;
    }

    // Selected location pin
    const issueIcon = L.divIcon({
      className: 'custom-marker issue-marker',
      html: `<div class="issue-marker-pin"></div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32]
    });

    const selectedMarker = L.marker([lat, lng], {
      icon: issueIcon,
      draggable: true,
      zIndexOffset: 1000
    }).addTo(map);

    selectedMarker.bindPopup(`
      <div style="font-family: var(--font-main, 'Plus Jakarta Sans', sans-serif); padding: 4px; min-width: 160px;">
        <div style="font-weight: 800; font-size: 13px; color: #0F172A; margin-bottom: 2px;">
          <i class="fas fa-map-marker-alt" style="color: #EF4444; margin-right: 4px;"></i> ${markerTitle}
        </div>
        <div id="popup-area-name" style="font-size: 12px; color: #2563EB; font-weight: 600; margin-bottom: 4px;">${currentAreaName}</div>
        <div style="font-size: 11px; color: #64748B; font-family: monospace;">
          ${lat.toFixed(6)}, ${lng.toFixed(6)}
        </div>
      </div>
    `);

    selectedMarker.on('dragend', async (e) => {
      const marker = e.target;
      const pos = marker.getLatLng();
      const norm = normalizeCoordinates(pos.lat, pos.lng);
      const place = await updateAreaName(norm.lat, norm.lng);
      onLocationSelect(norm.lat, norm.lng, place);
      selectedMarker.openPopup();
    });

    selectedMarkerRef.current = selectedMarker;

    // Map click handler: Clicking anywhere captures real coordinates
    map.on('click', async (e: L.LeafletMouseEvent) => {
      const norm = normalizeCoordinates(e.latlng.lat, e.latlng.lng);
      selectedMarker.setLatLng([norm.lat, norm.lng]);
      const place = await updateAreaName(norm.lat, norm.lng);
      onLocationSelect(norm.lat, norm.lng, place);

      selectedMarker.setPopupContent(`
        <div style="font-family: var(--font-main, 'Plus Jakarta Sans', sans-serif); padding: 4px; min-width: 160px;">
          <div style="font-weight: 800; font-size: 13px; color: #0F172A; margin-bottom: 2px;">
            <i class="fas fa-map-marker-alt" style="color: #EF4444; margin-right: 4px;"></i> ${markerTitle}
          </div>
          <div style="font-size: 12px; color: #2563EB; font-weight: 600; margin-bottom: 4px;">${place}</div>
          <div style="font-size: 11px; color: #64748B; font-family: monospace;">
            Lat: ${norm.lat.toFixed(6)}, Lng: ${norm.lng.toFixed(6)}
          </div>
        </div>
      `);
      selectedMarker.openPopup();
    });

    // Coordinates HUD mouse tracking
    map.on('mousemove', (e: L.LeafletMouseEvent) => {
      const norm = normalizeCoordinates(e.latlng.lat, e.latlng.lng);
      setCursorCoords({ lat: norm.lat, lng: norm.lng });
    });

    mapRef.current = map;
    updateAreaName(lat, lng);

    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [mapEngine]);

  // Update tile layer when activeLayer changes
  useEffect(() => {
    if (mapEngine !== 'osm' || !mapRef.current) return;
    if (currentTileLayerRef.current) {
      mapRef.current.removeLayer(currentTileLayerRef.current);
    }
    const newLayer = getTileLayer(activeLayer);
    newLayer.addTo(mapRef.current);
    currentTileLayerRef.current = newLayer;
  }, [activeLayer, getTileLayer, mapEngine]);

  // Traffic layer toggle
  useEffect(() => {
    if (mapEngine !== 'osm' || !mapRef.current) return;
    if (isTrafficActive) {
      if (!trafficLayerRef.current) {
        const traffic = L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
          maxZoom: 19,
          opacity: 0.4
        });
        traffic.addTo(mapRef.current);
        trafficLayerRef.current = traffic;
      }
    } else {
      if (trafficLayerRef.current) {
        mapRef.current.removeLayer(trafficLayerRef.current);
        trafficLayerRef.current = null;
      }
    }
  }, [isTrafficActive, mapEngine]);

  // Sync selected coordinates
  useEffect(() => {
    if (mapEngine !== 'osm' || !mapRef.current || !selectedMarkerRef.current) return;
    if (!isValidCoordinate(selectedLat, selectedLng)) return;

    const { lat, lng } = normalizeCoordinates(selectedLat, selectedLng);
    const currentPos = selectedMarkerRef.current.getLatLng();

    if (Math.abs(currentPos.lat - lat) > 0.00001 || Math.abs(currentPos.lng - lng) > 0.00001) {
      selectedMarkerRef.current.setLatLng([lat, lng]);
      updateAreaName(lat, lng);
    }
  }, [selectedLat, selectedLng, updateAreaName, mapEngine]);

  // Sync user location marker
  useEffect(() => {
    if (mapEngine !== 'osm' || !mapRef.current) return;
    if (userCoords && isValidCoordinate(userCoords.lat, userCoords.lng)) {
      const { lat, lng } = normalizeCoordinates(userCoords.lat, userCoords.lng);

      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng([lat, lng]);
      } else {
        const userIcon = L.divIcon({
          className: 'custom-marker user-marker',
          html: `<div class="user-marker-pulse"></div><div class="user-marker-dot"></div>`,
          iconSize: [22, 22],
          iconAnchor: [11, 11]
        });

        const userMarker = L.marker([lat, lng], {
          icon: userIcon,
          zIndexOffset: 900,
          title: 'Your Current Location'
        }).addTo(mapRef.current);

        userMarker.bindPopup(`
          <div style="font-family: var(--font-main, 'Plus Jakarta Sans', sans-serif); font-size: 12px; font-weight: 700; color: #1D4ED8;">
            <i class="fas fa-location-arrow"></i> Your Detected Position
          </div>
        `);

        userMarkerRef.current = userMarker;
      }
    } else if (userMarkerRef.current && mapRef.current) {
      mapRef.current.removeLayer(userMarkerRef.current);
      userMarkerRef.current = null;
    }
  }, [userCoords, mapEngine]);

  // Select location helper
  const handleLocationSelect = async (lat: number, lng: number, placeName?: string) => {
    const norm = normalizeCoordinates(lat, lng);
    if (mapRef.current) {
      mapRef.current.flyTo([norm.lat, norm.lng], 15, {
        duration: 1.2,
        easeLinearity: 0.25
      });
    }
    if (selectedMarkerRef.current) {
      selectedMarkerRef.current.setLatLng([norm.lat, norm.lng]);
    }

    const detected = placeName || (await updateAreaName(norm.lat, norm.lng));
    onLocationSelect(norm.lat, norm.lng, detected);

    if (selectedMarkerRef.current) {
      selectedMarkerRef.current.setPopupContent(`
        <div style="font-family: var(--font-main, 'Plus Jakarta Sans', sans-serif); padding: 4px; min-width: 160px;">
          <div style="font-weight: 800; font-size: 13px; color: #0F172A; margin-bottom: 2px;">
            <i class="fas fa-map-marker-alt" style="color: #EF4444; margin-right: 4px;"></i> ${markerTitle}
          </div>
          <div style="font-size: 12px; color: #2563EB; font-weight: 600; margin-bottom: 4px;">${detected}</div>
          <div style="font-size: 11px; color: #64748B; font-family: monospace;">
            Lat: ${norm.lat.toFixed(6)}, Lng: ${norm.lng.toFixed(6)}
          </div>
        </div>
      `);
      selectedMarkerRef.current.openPopup();
    }
  };

  // Search real location query
  const handleSearchSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    setIsSearching(true);
    setSearchError(null);

    try {
      // 1. Instant match in South India / TN Cities
      const lower = query.toLowerCase();
      const matchedCity = SOUTH_INDIA_CITIES.find(
        (c) =>
          c.name.toLowerCase() === lower ||
          lower.includes(c.name.toLowerCase()) ||
          c.name.toLowerCase().includes(lower)
      );

      if (matchedCity) {
        await handleLocationSelect(matchedCity.lat, matchedCity.lng, `${matchedCity.name}, ${matchedCity.state}`);
        setSearchError(null);
        setIsSearching(false);
        return;
      }

      // 2. Multi-tier real geocoding (Photon Komoot + Nominatim + Local Knowledge Base)
      const res = await searchLocationQuery(query);
      if (res && isValidCoordinate(res.lat, res.lng)) {
        await handleLocationSelect(res.lat, res.lng, res.displayName.split(',')[0]);
        setSearchError(null);
      } else {
        setSearchError(`Location not found for "${query}". Please check the spelling or search a major street, area, or city (e.g., Chennai, Erode, Coimbatore, Anna Nagar, Gandhipuram).`);
      }
    } catch (err) {
      console.error('Map search failed:', err);
      setSearchError(`Location not found. Please try another place, street, or city name.`);
    } finally {
      setIsSearching(false);
    }
  };

  // Locate Me Trigger
  const handleLocateMe = async () => {
    setIsLocating(true);
    try {
      const loc = await getAccurateUserLocation();
      if (loc && isValidCoordinate(loc.lat, loc.lng)) {
        handleLocationSelect(loc.lat, loc.lng, loc.cityName || 'My Current Location');
      }
    } catch (e) {
      console.warn('Geolocation failed:', e);
    } finally {
      setIsLocating(false);
    }
  };

  // Reset Regional View (Tamil Nadu & South India Overview)
  const handleResetRegionalView = () => {
    if (mapRef.current) {
      mapRef.current.flyTo([initialLat, initialLng], initialZoom, {
        duration: 1.0
      });
    }
  };

  // Fullscreen handler
  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    const mapWrapper = containerRef.current.parentElement;

    if (!document.fullscreenElement) {
      if (mapWrapper?.requestFullscreen) {
        mapWrapper.requestFullscreen().catch(() => {});
      } else if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen().catch(() => {});
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      if (mapRef.current) {
        setTimeout(() => mapRef.current?.invalidateSize(), 150);
      }
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  return (
    <div
      className={`interactive-leaflet-map-wrapper ${isFullscreen ? 'is-fullscreen' : ''} ${className}`}
      style={{
        position: 'relative',
        width: '100%',
        height: isFullscreen ? '100vh' : height,
        borderRadius: isFullscreen ? '0' : '12px',
        overflow: 'hidden',
        border: '1.5px solid #CBD5E1',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
        backgroundColor: '#E2E8F0',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Top Controls Bar: Search, Engine Switcher, Locate Me, Traffic, Reset, Fullscreen */}
      <div
        className="map-header-bar"
        style={{
          padding: '8px 12px',
          background: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          zIndex: 1001
        }}
      >
        {/* Search location bar */}
        {showSearchBox && (
          <form
            onSubmit={handleSearchSubmit}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#F8FAFC',
              border: searchError ? '1px solid #EF4444' : '1px solid #CBD5E1',
              borderRadius: '8px',
              padding: '4px 8px',
              flex: '1 1 240px',
              maxWidth: '380px',
              boxShadow: searchError ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <i className="fas fa-search" style={{ color: searchError ? '#EF4444' : '#64748B', fontSize: '12px' }}></i>
            <input
              type="text"
              id="mapSearchInput"
              placeholder="Search street, area or city (e.g. Chennai, Erode, Coimbatore)..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (searchError) setSearchError(null);
              }}
              style={{
                border: 'none',
                outline: 'none',
                background: 'transparent',
                width: '100%',
                fontSize: '12px',
                fontWeight: 500,
                color: '#0F172A'
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSearchError(null);
                }}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  padding: '2px',
                  fontSize: '11px'
                }}
              >
                <i className="fas fa-times"></i>
              </button>
            )}
            <button
              type="submit"
              disabled={isSearching}
              style={{
                background: '#2563EB',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              {isSearching ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-arrow-right"></i>}
              <span>{isSearching ? 'Searching...' : 'Go'}</span>
            </button>
          </form>
        )}

        {/* Action Buttons & Switches */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {/* Map Engine Switcher (Google Maps vs OSM) */}
          <div
            style={{
              display: 'flex',
              background: '#F1F5F9',
              padding: '2px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1'
            }}
          >
            <button
              type="button"
              className={`btn btn-sm ${mapEngine === 'google' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '3px 8px', fontSize: '11px', borderRadius: '6px' }}
              onClick={() => {
                if (activeGoogleKey) {
                  setMapEngine('google');
                  setShowKeySetup(false);
                } else {
                  setShowKeySetup(true);
                }
              }}
            >
              <i className="fab fa-google" style={{ marginRight: '4px' }}></i> Google Maps
            </button>
            <button
              type="button"
              className={`btn btn-sm ${mapEngine === 'osm' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '3px 8px', fontSize: '11px', borderRadius: '6px' }}
              onClick={() => {
                setMapEngine('osm');
                setShowKeySetup(false);
              }}
            >
              <i className="fas fa-map" style={{ marginRight: '4px' }}></i> OSM
            </button>
          </div>

          {/* Locate Me Button */}
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={handleLocateMe}
            disabled={isLocating}
            style={{ padding: '4px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px' }}
            title="Locate user via GPS"
          >
            <i className={`fas ${isLocating ? 'fa-spinner fa-spin' : 'fa-crosshairs'}`}></i>
            <span>Locate Me</span>
          </button>

          {/* Traffic Toggle */}
          <button
            type="button"
            className={`btn btn-sm ${isTrafficActive ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setIsTrafficActive(!isTrafficActive)}
            style={{ padding: '4px 8px', fontSize: '11px' }}
            title="Toggle Live Traffic / Transport Layer"
          >
            <i className="fas fa-traffic-light" style={{ marginRight: '4px' }}></i> Traffic
          </button>

          {/* Reset View Button */}
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={handleResetRegionalView}
            style={{ padding: '4px 8px', fontSize: '11px', border: '1px solid #CBD5E1' }}
            title="Reset to South India & Tamil Nadu Regional View"
          >
            <i className="fas fa-undo" style={{ marginRight: '4px' }}></i> Reset View
          </button>

          {/* Fullscreen Button */}
          {showFullscreenToggle && (
            <button
              type="button"
              id="mapFullscreenBtn"
              onClick={handleToggleFullscreen}
              title={isFullscreen ? 'Exit Fullscreen' : 'View Fullscreen Map'}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                color: isFullscreen ? '#2563EB' : '#1E293B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              <i className={`fas ${isFullscreen ? 'fa-compress' : 'fa-expand'}`}></i>
            </button>
          )}
        </div>
      </div>

      {/* Location Not Found Banner */}
      {searchError && (
        <div
          id="mapSearchErrorBanner"
          style={{
            background: '#FEF2F2',
            borderBottom: '1px solid #FECACA',
            color: '#991B1B',
            padding: '7px 12px',
            fontSize: '12px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            zIndex: 1002,
            animation: 'fadeIn 0.2s ease-in-out'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fas fa-exclamation-circle" style={{ color: '#DC2626', fontSize: '14px' }}></i>
            <span>{searchError}</span>
          </div>
          <button
            type="button"
            onClick={() => setSearchError(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#991B1B',
              cursor: 'pointer',
              padding: '2px 6px',
              fontSize: '12px',
              fontWeight: 700
            }}
            title="Dismiss"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
      )}

      {/* Main Map View Area */}
      <div style={{ position: 'relative', flex: 1, width: '100%', minHeight: '300px' }}>
        {mapEngine === 'google' && activeGoogleKey ? (
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <GoogleReportMap
              apiKey={activeGoogleKey}
              lat={selectedLat}
              lng={selectedLng}
              onLocationSelect={(nLat, nLng) => {
                const norm = normalizeCoordinates(nLat, nLng);
                updateAreaName(norm.lat, norm.lng).then((place) => {
                  onLocationSelect(norm.lat, norm.lng, place);
                });
              }}
              userLocation={userCoords}
              onAuthError={() => {
                setMapEngine('osm');
              }}
            />
          </div>
        ) : showKeySetup && mapEngine === 'google' && !activeGoogleKey ? (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: '#F8FAFC',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              zIndex: 100
            }}
          >
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '12px',
                padding: '20px',
                maxWidth: '420px',
                width: '100%',
                boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                border: '1px solid #E2E8F0',
                textAlign: 'center'
              }}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: '#EFF6FF',
                  color: '#2563EB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px auto',
                  fontSize: '20px'
                }}
              >
                <i className="fab fa-google"></i>
              </div>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
                Google Maps Platform
              </h3>
              <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 14px 0', lineHeight: '1.4' }}>
                Enter your Google Maps API key to activate Google Maps rendering or continue using OpenStreetMap.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const trimmed = googleKeyInput.trim();
                  if (!isValidGoogleMapsKey(trimmed)) {
                    setGoogleKeyError('Key must start with "AIza" and be ~39 characters.');
                    return;
                  }
                  setStoredGoogleMapsKey(trimmed);
                  setGoogleKeyError(null);
                  setShowKeySetup(false);
                  setMapEngine('google');
                }}
              >
                <input
                  type="text"
                  placeholder="Paste API Key (AIzaSy...)"
                  value={googleKeyInput}
                  onChange={(e) => {
                    setGoogleKeyInput(e.target.value);
                    setGoogleKeyError(null);
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '12px',
                    marginBottom: '8px',
                    boxSizing: 'border-box'
                  }}
                />
                {googleKeyError && (
                  <p style={{ color: '#EF4444', fontSize: '11px', margin: '0 0 8px 0' }}>{googleKeyError}</p>
                )}
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    style={{ padding: '6px 14px', fontSize: '12px' }}
                  >
                    Activate Google Maps
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      setShowKeySetup(false);
                      setMapEngine('osm');
                    }}
                    style={{ padding: '6px 12px', fontSize: '12px', border: '1px solid #CBD5E1' }}
                  >
                    Use OpenStreetMap
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          <div
            ref={containerRef}
            id="interactiveLeafletMap"
            style={{
              width: '100%',
              height: '100%',
              minHeight: '300px',
              zIndex: 1
            }}
          ></div>
        )}

        {/* OSM Layer Switcher Floating Pill */}
        {mapEngine === 'osm' && showLayerSwitcher && (
          <div
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              zIndex: 1000,
              background: 'rgba(255, 255, 255, 0.96)',
              backdropFilter: 'blur(8px)',
              borderRadius: '8px',
              padding: '2px',
              display: 'flex',
              gap: '2px',
              border: '1px solid rgba(203, 213, 225, 0.9)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
          >
            <button
              type="button"
              className={`btn-map-layer ${activeLayer === 'voyager' ? 'active' : ''}`}
              onClick={() => setActiveLayer('voyager')}
              title="Modern Navigation Roads (Carto Voyager)"
              style={{
                padding: '4px 8px',
                fontSize: '11px',
                fontWeight: 600,
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                background: activeLayer === 'voyager' ? '#2563EB' : 'transparent',
                color: activeLayer === 'voyager' ? '#FFF' : '#475569'
              }}
            >
              <i className="fas fa-route" style={{ marginRight: '3px' }}></i> Roads
            </button>
            <button
              type="button"
              className={`btn-map-layer ${activeLayer === 'standard' ? 'active' : ''}`}
              onClick={() => setActiveLayer('standard')}
              title="Standard OpenStreetMap"
              style={{
                padding: '4px 8px',
                fontSize: '11px',
                fontWeight: 600,
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                background: activeLayer === 'standard' ? '#2563EB' : 'transparent',
                color: activeLayer === 'standard' ? '#FFF' : '#475569'
              }}
            >
              <i className="fas fa-map" style={{ marginRight: '3px' }}></i> OSM
            </button>
            <button
              type="button"
              className={`btn-map-layer ${activeLayer === 'topo' ? 'active' : ''}`}
              onClick={() => setActiveLayer('topo')}
              title="Terrain & Elevation (OpenTopoMap)"
              style={{
                padding: '4px 8px',
                fontSize: '11px',
                fontWeight: 600,
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                background: activeLayer === 'topo' ? '#2563EB' : 'transparent',
                color: activeLayer === 'topo' ? '#FFF' : '#475569'
              }}
            >
              <i className="fas fa-mountain" style={{ marginRight: '3px' }}></i> Topo
            </button>
          </div>
        )}

        {/* Coordinates HUD overlay */}
        {showCoordinatesHUD && (
          <div
            style={{
              position: 'absolute',
              bottom: '12px',
              right: '12px',
              zIndex: 999,
              background: 'rgba(15, 23, 42, 0.85)',
              color: '#FFFFFF',
              backdropFilter: 'blur(4px)',
              borderRadius: '6px',
              padding: '3px 8px',
              fontSize: '10px',
              fontFamily: 'monospace',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              pointerEvents: 'none'
            }}
          >
            <span>
              Pin: {selectedLat.toFixed(5)}, {selectedLng.toFixed(5)}
            </span>
            {cursorCoords && (
              <span style={{ color: '#94A3B8' }}>
                Cursor: {cursorCoords.lat.toFixed(4)}, {cursorCoords.lng.toFixed(4)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Regional View and City Quick Navigation Strip Removed */}
    </div>
  );
};
