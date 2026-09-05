import React, { useState, useEffect } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useMap,
  useApiLoadingStatus,
  APILoadingStatus
} from '@vis.gl/react-google-maps';
import { Report } from '../../types';
import { categoryConfig } from '../../data/demoData';

interface GoogleLiveMapProps {
  apiKey: string;
  reports: Report[];
  onViewDetail: (report: Report) => void;
  centerTarget?: { lat: number; lng: number; zoom?: number } | null;
  userLocation?: { lat: number; lng: number } | null;
  onAuthError?: () => void;
}

// Controller component to smoothly pan/zoom when target changes
const CameraController: React.FC<{
  target?: { lat: number; lng: number; zoom?: number } | null;
}> = ({ target }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !target) return;
    map.panTo({ lat: target.lat, lng: target.lng });
    if (target.zoom !== undefined) {
      map.setZoom(target.zoom);
    }
  }, [map, target]);

  return null;
};

// Real-time Traffic Layer
const TrafficOverlay: React.FC<{ enabled: boolean }> = ({ enabled }) => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    if (typeof window === 'undefined' || !(window as unknown as { google?: { maps?: { TrafficLayer?: new () => google.maps.TrafficLayer } } }).google?.maps?.TrafficLayer) {
      return;
    }
    const trafficLayer = new google.maps.TrafficLayer();
    if (enabled) {
      trafficLayer.setMap(map);
    }
    return () => {
      try {
        trafficLayer.setMap(null);
      } catch {
        // ignore
      }
    };
  }, [map, enabled]);

  return null;
};

// Internal watcher to detect any Google Maps API authentication errors
const MapStatusWatcher: React.FC<{ onAuthError?: () => void }> = ({ onAuthError }) => {
  const status = useApiLoadingStatus();

  useEffect(() => {
    if (status === APILoadingStatus.AUTH_FAILURE || status === APILoadingStatus.FAILED) {
      console.warn('[GoogleLiveMap] API loading failure detected:', status);
      onAuthError?.();
    }
  }, [status, onAuthError]);

  return null;
};

export const GoogleLiveMap: React.FC<GoogleLiveMapProps> = ({
  apiKey,
  reports,
  onViewDetail,
  centerTarget,
  userLocation,
  onAuthError
}) => {
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [trafficEnabled, setTrafficEnabled] = useState(false);
  const [localCenter, setLocalCenter] = useState<{ lat: number; lng: number; zoom: number } | null>(null);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', flexDirection: 'column', flex: 1 }}>
      <APIProvider
        apiKey={apiKey}
        libraries={['marker', 'places']}
        onError={(err) => {
          console.warn('[GoogleLiveMap] APIProvider error event:', err);
          onAuthError?.();
        }}
      >
        <MapStatusWatcher onAuthError={onAuthError} />

        {/* In-Map Quick Bar */}
        <div
          style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            zIndex: 10,
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.94)',
            backdropFilter: 'blur(8px)',
            padding: '4px 8px',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            border: '1px solid rgba(226, 232, 240, 0.8)'
          }}
        >
          <button
            type="button"
            onClick={() => setTrafficEnabled(!trafficEnabled)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 8px',
              fontSize: '11px',
              fontWeight: 600,
              borderRadius: '6px',
              border: trafficEnabled ? '1px solid #16A34A' : '1px solid #CBD5E1',
              backgroundColor: trafficEnabled ? '#DCFCE7' : '#FFFFFF',
              color: trafficEnabled ? '#15803D' : '#475569',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title="Toggle Live Traffic on Tamil Nadu roads"
          >
            <i className="fas fa-traffic-light" style={{ color: trafficEnabled ? '#16A34A' : '#94A3B8' }}></i>
            Traffic {trafficEnabled ? 'ON' : 'OFF'}
          </button>

          <button
            type="button"
            onClick={() => setLocalCenter({ lat: 11.0168, lng: 78.6569, zoom: 7 })}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              fontSize: '11px',
              fontWeight: 600,
              borderRadius: '6px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#475569',
              cursor: 'pointer'
            }}
            title="Reset map view to Tamil Nadu state center"
          >
            <i className="fas fa-compress-arrows-alt" style={{ color: '#64748B' }}></i>
            Reset View
          </button>
        </div>

        <Map
          mapId="DEMO_MAP_ID"
          defaultCenter={{ lat: 11.0168, lng: 78.6569 }}
          defaultZoom={7}
          gestureHandling="greedy"
          disableDefaultUI={false}
          mapTypeControl={true}
          streetViewControl={true}
          fullscreenControl={true}
          zoomControl={true}
          style={{ width: '100%', height: '100%' }}
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
        >
          <CameraController target={localCenter || centerTarget} />
          <TrafficOverlay enabled={trafficEnabled} />

          {/* User Location Marker */}
          {userLocation && (
            <AdvancedMarker position={userLocation} title="Your Current Location">
              <Pin
                background="#2563EB"
                glyphColor="#FFFFFF"
                borderColor="#1E40AF"
                scale={1.2}
              />
            </AdvancedMarker>
          )}

          {/* Issue Markers */}
          {reports.map((report) => {
            const config = categoryConfig[report.category] || {
              color: '#64748B',
              class: 'marker-other',
              icon: 'fa-circle'
            };

            const isCritical = report.priority === 'Critical';

            return (
              <AdvancedMarker
                key={report.id}
                position={{ lat: report.lat, lng: report.lng }}
                title={`${report.id}: ${report.title} (${report.priority})`}
                onClick={() => setSelectedReport(report)}
              >
                <Pin
                  background={config.color}
                  glyphColor="#FFFFFF"
                  borderColor={isCritical ? '#DC2626' : '#FFFFFF'}
                  scale={isCritical ? 1.25 : 1.1}
                />
              </AdvancedMarker>
            );
          })}

          {/* Popup / InfoWindow for Selected Report */}
          {selectedReport && (
            <InfoWindow
              position={{ lat: selectedReport.lat, lng: selectedReport.lng }}
              onCloseClick={() => setSelectedReport(null)}
              headerContent={
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '2px 0' }}>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 800,
                      color: 'var(--navy, #0F172A)'
                    }}
                  >
                    {selectedReport.id}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '8px',
                      backgroundColor:
                        selectedReport.status === 'Resolved'
                          ? '#D1FAE5'
                          : selectedReport.status === 'In Progress'
                          ? '#FEF3C7'
                          : '#E0E7FF',
                      color:
                        selectedReport.status === 'Resolved'
                          ? '#065F46'
                          : selectedReport.status === 'In Progress'
                          ? '#92400E'
                          : '#3730A3'
                    }}
                  >
                    {selectedReport.status}
                  </span>
                </div>
              }
            >
              <div
                style={{
                  minWidth: '240px',
                  maxWidth: '280px',
                  fontFamily: 'var(--font-main, sans-serif)',
                  padding: '4px 0'
                }}
              >
                {selectedReport.photoUrl && (
                  <div
                    style={{
                      marginBottom: '8px',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      height: '110px',
                      backgroundColor: '#F1F5F9'
                    }}
                  >
                    <img
                      src={selectedReport.photoUrl}
                      alt={selectedReport.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}

                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: 'var(--navy, #0F172A)',
                    marginBottom: '6px'
                  }}
                >
                  {selectedReport.title}
                </div>

                <div style={{ display: 'flex', gap: '6px', marginBottom: '6px', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      background: '#F1F5F9',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      color: '#475569'
                    }}
                  >
                    <i className="fas fa-tag" style={{ marginRight: '3px' }}></i>
                    {selectedReport.category}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      background:
                        selectedReport.priority === 'Critical'
                          ? '#FEE2E2'
                          : selectedReport.priority === 'High'
                          ? '#FFEDD5'
                          : '#EFF6FF',
                      color:
                        selectedReport.priority === 'Critical'
                          ? '#991B1B'
                          : selectedReport.priority === 'High'
                          ? '#9A3412'
                          : '#1E40AF',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontWeight: 600
                    }}
                  >
                    {selectedReport.priority} Priority
                  </span>
                </div>

                <div style={{ fontSize: '12px', color: '#475569', marginBottom: '6px' }}>
                  <i className="fas fa-map-marker-alt" style={{ marginRight: '4px', color: '#0A6EBD' }}></i>
                  <strong>Location:</strong> {selectedReport.area}
                </div>

                <div
                  style={{
                    fontSize: '12px',
                    color: '#64748B',
                    lineHeight: '1.4',
                    marginBottom: '10px',
                    maxHeight: '55px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {selectedReport.description}
                </div>

                <button
                  type="button"
                  onClick={() => onViewDetail(selectedReport)}
                  className="btn btn-primary btn-sm btn-block"
                  style={{
                    width: '100%',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 600
                  }}
                >
                  <i className="fas fa-eye" style={{ marginRight: '6px' }}></i>
                  View Full Details
                </button>
              </div>
            </InfoWindow>
          )}
        </Map>
      </APIProvider>
    </div>
  );
};
