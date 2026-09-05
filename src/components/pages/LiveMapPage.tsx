import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { Report, CategoryType, StatusType } from '../../types';
import { categoryConfig } from '../../data/demoData';
import { searchLocationQuery, isValidCoordinate } from '../../utils/geo';
import {
  getActiveGoogleMapsKey,
  getKeyStatusInfo,
  setStoredGoogleMapsKey,
  isValidGoogleMapsKey
} from '../../utils/maps';
import { GoogleLiveMap } from '../maps/GoogleLiveMap';
import { GoogleMapsKeyModal } from '../modals/GoogleMapsKeyModal';
import { MapLegendOverlay } from '../maps/MapLegendOverlay';

interface LiveMapPageProps {
  reports: Report[];
  onViewDetail: (report: Report) => void;
  showToast: (title: string, msg: string, type?: 'info' | 'success' | 'warning' | 'error', duration?: number) => void;
}

export const LiveMapPage: React.FC<LiveMapPageProps> = ({
  reports,
  onViewDetail,
  showToast
}) => {
  const [apiKeyRevision, setApiKeyRevision] = useState(0);
  const googleMapsApiKey = getActiveGoogleMapsKey();
  const keyStatus = getKeyStatusInfo();

  const [mapProvider, setMapProvider] = useState<'google' | 'leaflet'>(
    googleMapsApiKey ? 'google' : 'leaflet'
  );
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [inlineKeyInput, setInlineKeyInput] = useState('');
  const [inlineKeyError, setInlineKeyError] = useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [coordsText, setCoordsText] = useState('Lat: —, Lng: —');
  const [centerTarget, setCenterTarget] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const userMarkerRef = useRef<L.Marker | null>(null);

  // Filter reports
  const filteredReports = reports.filter((report) => {
    const catMatch = selectedCategory === 'all' || report.category === selectedCategory;
    const statusMatch = selectedStatus === 'all' || report.status === selectedStatus;
    return catMatch && statusMatch;
  });

  // Automatically update provider if key becomes active
  useEffect(() => {
    if (googleMapsApiKey && mapProvider === 'leaflet') {
      setMapProvider('google');
    }
  }, [googleMapsApiKey]);

  // Initialize Leaflet Map (when active)
  useEffect(() => {
    if (mapProvider !== 'leaflet') return;
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }
    if ((mapContainerRef.current as unknown as { _leaflet_id?: number })._leaflet_id) {
      delete (mapContainerRef.current as unknown as { _leaflet_id?: number })._leaflet_id;
    }

    const map = L.map(mapContainerRef.current, { zoomControl: true }).setView(
      [11.0168, 78.6569],
      7
    );

    const standardLayer = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      { maxZoom: 19 }
    );
    standardLayer.addTo(map);

    const humanitarianLayer = L.tileLayer(
      'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
      { maxZoom: 19 }
    );

    L.control.layers(
      { 'Standard': standardLayer, 'Humanitarian': humanitarianLayer },
      undefined,
      { position: 'bottomright' }
    ).addTo(map);

    map.on('mousemove', (e: L.LeafletMouseEvent) => {
      setCoordsText(`Lat: ${e.latlng.lat.toFixed(4)}, Lng: ${e.latlng.lng.toFixed(4)}`);
    });

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [mapProvider]);

  // Sync Markers for Leaflet
  useEffect(() => {
    if (mapProvider !== 'leaflet') return;
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear old markers
    markersRef.current.forEach((m) => map.removeLayer(m));
    markersRef.current = [];

    filteredReports.forEach((report) => {
      const config = categoryConfig[report.category] || {
        color: '#64748B',
        class: 'marker-other',
        icon: 'fa-ellipsis-h'
      };

      const icon = L.divIcon({
        className: 'custom-marker',
        html: `<div class="marker-pin ${config.class}"><i class="fas ${config.icon}"></i></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
      });

      const popupContent = `
        <div class="popup-card">
          <div class="popup-header" style="background: ${config.color};">
            <span class="popup-id">${report.id}</span>
            <span class="popup-status status-${report.status.toLowerCase().replace(' ', '-')}">${report.status}</span>
          </div>
          <div class="popup-body">
            <h4>${report.title}</h4>
            <p><strong>Category:</strong> ${report.category}</p>
            <p><strong>Priority:</strong> <span class="badge badge-${report.priority.toLowerCase()}">${report.priority}</span></p>
            <p><strong>Location:</strong> ${report.area}</p>
            <p class="popup-desc">${report.description.substring(0, 100)}...</p>
            <button class="btn btn-primary btn-sm btn-block view-detail-btn" data-id="${report.id}">View Details</button>
          </div>
        </div>
      `;

      const marker = L.marker([report.lat, report.lng], { icon })
        .bindPopup(popupContent)
        .addTo(map);

      marker.on('popupopen', () => {
        const btn = document.querySelector(`.view-detail-btn[data-id="${report.id}"]`);
        if (btn) {
          btn.addEventListener('click', () => {
            onViewDetail(report);
          });
        }
      });

      markersRef.current.push(marker);
    });
  }, [filteredReports, mapProvider, onViewDetail]);

  // Center on user position
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      showToast('Error', 'Geolocation is not supported by your browser.', 'error');
      return;
    }

    showToast('Locating...', 'Requesting GPS coordinates...', 'info', 2000);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const uLat = pos.coords.latitude;
        const uLng = pos.coords.longitude;

        if (!isValidCoordinate(uLat, uLng)) {
          showToast('Error', 'Invalid GPS position coordinates received.', 'error');
          return;
        }

        setUserLocation({ lat: uLat, lng: uLng });
        setCenterTarget({ lat: uLat, lng: uLng, zoom: 14 });
        setCoordsText(`Lat: ${uLat.toFixed(4)}, Lng: ${uLng.toFixed(4)}`);

        const map = mapInstanceRef.current;
        if (map && mapProvider === 'leaflet') {
          map.setView([uLat, uLng], 14);

          if (userMarkerRef.current) {
            map.removeLayer(userMarkerRef.current);
          }

          const userIcon = L.divIcon({
            className: 'custom-marker user-marker',
            html: `<div class="user-marker-pulse"></div><div class="user-marker-dot"></div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          });

          userMarkerRef.current = L.marker([uLat, uLng], {
            icon: userIcon,
            zIndexOffset: 1000
          })
            .bindPopup(
              '<div style="padding: 6px; font-weight: 700; font-size: 13px;">📍 You are here</div>'
            )
            .addTo(map);
        }

        showToast('Success', 'Centered on your current position!', 'success');
      },
      (err) => {
        showToast('Warning', 'Location permission denied or unavailable.', 'warning', 4000);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    showToast('Info', `Searching for "${searchQuery}"...`, 'info', 2000);
    const res = await searchLocationQuery(searchQuery);

    if (res) {
      setCenterTarget({ lat: res.lat, lng: res.lng, zoom: 14 });
      setCoordsText(`Lat: ${res.lat.toFixed(4)}, Lng: ${res.lng.toFixed(4)}`);

      if (mapInstanceRef.current && mapProvider === 'leaflet') {
        mapInstanceRef.current.setView([res.lat, res.lng], 14);
      }
      showToast('Found', `Showing ${res.displayName}`, 'success');
    } else {
      showToast('Not Found', 'Location not recognized. Try "Madurai", "Salem", or "Anna Nagar".', 'warning');
    }
  };

  return (
    <section id="livemap" className="page active">
      <div className="livemap-container">
        <div className="livemap-layout">
          {/* Main Map View */}
          <div className="livemap-main">
            <div className="map-controls-top">
              <div className="map-search">
                <i className="fas fa-search"></i>
                <input
                  type="text"
                  id="mapSearchInput"
                  placeholder="Search location (e.g. Madurai, Coimbatore, Anna Nagar)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSearch();
                    }
                  }}
                />
                <button type="button" id="mapSearchBtn" onClick={() => handleSearch()}>
                  <i className="fas fa-arrow-right"></i>
                </button>
              </div>
              <div className="map-actions">
                {/* Map Engine Selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ display: 'flex', gap: '3px', background: 'var(--gray-100)', padding: '3px', borderRadius: '8px' }}>
                    <button
                      type="button"
                      className={`btn btn-sm ${mapProvider === 'google' ? 'btn-primary' : 'btn-ghost'}`}
                      style={{ padding: '3px 8px', fontSize: '11px', borderRadius: '6px' }}
                      onClick={() => setMapProvider('google')}
                    >
                      <i className="fab fa-google" style={{ marginRight: '4px' }}></i> Google Maps
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${mapProvider === 'leaflet' ? 'btn-primary' : 'btn-ghost'}`}
                      style={{ padding: '3px 8px', fontSize: '11px', borderRadius: '6px' }}
                      onClick={() => setMapProvider('leaflet')}
                    >
                      <i className="fas fa-map" style={{ marginRight: '4px' }}></i> OSM
                    </button>
                  </div>

                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() => setIsKeyModalOpen(true)}
                    style={{
                      padding: '4px 8px',
                      fontSize: '11px',
                      borderRadius: '6px',
                      border: '1px solid var(--gray-300)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                    title="Configure Google Maps API Key"
                  >
                    <span
                      style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        backgroundColor: googleMapsApiKey ? '#16A34A' : '#EAB308',
                        display: 'inline-block'
                      }}
                    ></span>
                    <i className="fas fa-key"></i>
                    {googleMapsApiKey ? 'Key Active' : 'Set Key'}
                  </button>
                </div>

                <span className="map-coords" id="liveMapCoords">
                  {coordsText}
                </span>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  id="myLocationBtnLive"
                  onClick={handleLocateMe}
                >
                  <i className="fas fa-crosshairs"></i> 📍 Locate Me
                </button>
              </div>
            </div>

            {/* Targeted Element: div#liveMap */}
            <div id="liveMap" className="live-map">
              {mapProvider === 'google' && googleMapsApiKey ? (
                <div style={{ position: 'relative', width: '100%', height: '100%', flex: 1 }}>
                  <GoogleLiveMap
                    apiKey={googleMapsApiKey}
                    reports={filteredReports}
                    onViewDetail={onViewDetail}
                    centerTarget={centerTarget}
                    userLocation={userLocation}
                    onAuthError={() => {
                      setMapProvider('leaflet');
                      showToast('Map Notice', 'Switched to OpenStreetMap due to API key restrictions.', 'info');
                    }}
                  />
                </div>
              ) : mapProvider === 'google' && !googleMapsApiKey ? (
                <div className="google-map-setup-placeholder">
                  <div className="google-map-setup-card">
                    <div className="google-map-setup-icon">
                      <i className="fab fa-google"></i>
                    </div>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
                      Activate Google Maps Platform
                    </h3>
                    <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#64748B', lineHeight: '1.5' }}>
                      {keyStatus.source === 'env' && keyStatus.rawKey === '123'
                        ? 'Current key in environment is placeholder "123". Enter a genuine Google Maps API key (or mint a free demo key) to load Google Maps.'
                        : 'Enter your Google Maps Platform API key to render satellite imagery, dynamic issue markers, and live highway traffic.'}
                    </p>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const trimmed = inlineKeyInput.trim();
                        if (!isValidGoogleMapsKey(trimmed)) {
                          setInlineKeyError('Key must start with "AIza" and be ~39 characters.');
                          return;
                        }
                        setStoredGoogleMapsKey(trimmed);
                        setInlineKeyInput('');
                        setInlineKeyError(null);
                        setApiKeyRevision((r) => r + 1);
                        setMapProvider('google');
                        showToast('Google Maps Activated', 'API key saved and Google Maps loaded!', 'success');
                      }}
                      style={{ marginBottom: '16px' }}
                    >
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                        <input
                          type="text"
                          placeholder="Paste API Key (AIzaSy...)"
                          value={inlineKeyInput}
                          onChange={(e) => {
                            setInlineKeyInput(e.target.value);
                            setInlineKeyError(null);
                          }}
                          style={{
                            flex: 1,
                            padding: '10px 14px',
                            borderRadius: '8px',
                            border: inlineKeyError ? '1px solid #EF4444' : '1px solid #CBD5E1',
                            fontSize: '13px',
                            fontFamily: 'monospace'
                          }}
                        />
                        <button
                          type="submit"
                          className="btn btn-primary"
                          style={{ padding: '10px 16px', fontSize: '13px', whiteSpace: 'nowrap' }}
                        >
                          Activate
                        </button>
                      </div>
                      {inlineKeyError && (
                        <div style={{ fontSize: '12px', color: '#DC2626', textAlign: 'left', marginBottom: '8px' }}>
                          <i className="fas fa-exclamation-circle" style={{ marginRight: '4px' }}></i>
                          {inlineKeyError}
                        </div>
                      )}
                    </form>

                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                      <a
                        href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-sm btn-ghost"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          border: '1px solid #CBD5E1',
                          padding: '6px 12px',
                          fontSize: '12px'
                        }}
                      >
                        <i className="fas fa-key"></i> Get Free Demo Key ↗
                      </a>
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost"
                        onClick={() => setMapProvider('leaflet')}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          border: '1px solid #CBD5E1',
                          padding: '6px 12px',
                          fontSize: '12px'
                        }}
                      >
                        <i className="fas fa-map"></i> OpenStreetMap
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div ref={mapContainerRef} style={{ width: '100%', height: '100%', flex: 1 }}></div>
              )}
            </div>

            {/* Collapsible Map Legend Overlay */}
            <MapLegendOverlay
              reports={filteredReports}
              selectedCategory={selectedCategory}
              selectedStatus={selectedStatus}
              onSelectCategory={(cat) => setSelectedCategory(cat)}
              onSelectStatus={(stat) => setSelectedStatus(stat)}
              hasUserLocation={Boolean(userLocation)}
            />
          </div>
        </div>
      </div>

      <GoogleMapsKeyModal
        isOpen={isKeyModalOpen}
        onClose={() => setIsKeyModalOpen(false)}
        onKeyUpdated={() => {
          setApiKeyRevision((r) => r + 1);
          setMapProvider('google');
        }}
        showToast={showToast}
      />
    </section>
  );
};
