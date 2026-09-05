import React, { useEffect } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  useMap,
  useApiLoadingStatus,
  APILoadingStatus
} from '@vis.gl/react-google-maps';

interface GoogleReportMapProps {
  apiKey: string;
  lat: number;
  lng: number;
  onLocationSelect: (newLat: number, newLng: number) => void;
  userLocation?: { lat: number; lng: number } | null;
  onAuthError?: () => void;
}

const MapPanController: React.FC<{ lat: number; lng: number }> = ({ lat, lng }) => {
  const map = useMap();

  useEffect(() => {
    if (map && lat && lng) {
      map.panTo({ lat, lng });
    }
  }, [map, lat, lng]);

  return null;
};

// Internal watcher to detect any Google Maps API authentication errors
const MapStatusWatcher: React.FC<{ onAuthError?: () => void }> = ({ onAuthError }) => {
  const status = useApiLoadingStatus();

  useEffect(() => {
    if (status === APILoadingStatus.AUTH_FAILURE || status === APILoadingStatus.FAILED) {
      console.warn('[GoogleReportMap] API loading failure detected:', status);
      onAuthError?.();
    }
  }, [status, onAuthError]);

  return null;
};

export const GoogleReportMap: React.FC<GoogleReportMapProps> = ({
  apiKey,
  lat,
  lng,
  onLocationSelect,
  userLocation,
  onAuthError
}) => {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <APIProvider
        apiKey={apiKey}
        libraries={['marker', 'places']}
        onError={(err) => {
          console.warn('[GoogleReportMap] APIProvider error event:', err);
          onAuthError?.();
        }}
      >
        <MapStatusWatcher onAuthError={onAuthError} />
        <Map
          mapId="DEMO_MAP_ID"
          defaultCenter={{ lat: lat || 11.3410, lng: lng || 77.7172 }}
          defaultZoom={15}
          gestureHandling="greedy"
          disableDefaultUI={false}
          style={{ width: '100%', height: '100%' }}
          onClick={(e) => {
            if (e.detail.latLng) {
              onLocationSelect(e.detail.latLng.lat, e.detail.latLng.lng);
            }
          }}
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
        >
          <MapPanController lat={lat} lng={lng} />

          {/* Selected Issue Location Marker */}
          <AdvancedMarker
            position={{ lat, lng }}
            title="Selected Hazard Location"
          >
            <Pin
              background="#EF4444"
              glyphColor="#FFFFFF"
              borderColor="#991B1B"
              scale={1.25}
            />
          </AdvancedMarker>

          {/* User Current Location (if available) */}
          {userLocation && (
            <AdvancedMarker
              position={userLocation}
              title="Your Current GPS Position"
            >
              <Pin
                background="#2563EB"
                glyphColor="#FFFFFF"
                borderColor="#1E40AF"
                scale={1.1}
              />
            </AdvancedMarker>
          )}
        </Map>
      </APIProvider>
    </div>
  );
};
