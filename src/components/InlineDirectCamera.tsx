import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CategoryType, SeverityType, PriorityType } from '../types';
import { createSampleHazardDataUrl } from './modals/CameraModal';

interface InlineDirectCameraProps {
  onCapture: (
    dataUrl: string,
    meta?: {
      category: CategoryType;
      confidence: number;
      priority: PriorityType;
      severity: SeverityType;
      title: string;
      reason: string;
    }
  ) => void;
  onClose: () => void;
  onOpenFullscreen: () => void;
  showToast: (title: string, msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export const InlineDirectCamera: React.FC<InlineDirectCameraProps> = ({
  onCapture,
  onClose,
  onOpenFullscreen,
  showToast
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const deviceInputRef = useRef<HTMLInputElement>(null);

  // Camera connection & state
  const [cameraState, setCameraState] = useState<'loading' | 'active' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

  // Flash & Low-Light Illumination state
  const [flashMode, setFlashMode] = useState<'off' | 'on' | 'fill'>('off');
  const [supportsTorch, setSupportsTorch] = useState(false);

  // Capture & preview state
  const [isCapturing, setIsCapturing] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);

  // Web Audio click generator with flash discharge sound
  const playShutterSound = useCallback((isFlashActive = false) => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      // Shutter click
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.09);

      // Flash pop simulation
      if (isFlashActive) {
        const flashOsc = ctx.createOscillator();
        const flashGain = ctx.createGain();
        flashOsc.type = 'sine';
        flashOsc.frequency.setValueAtTime(1100, ctx.currentTime);
        flashOsc.frequency.exponentialRampToValueAtTime(90, ctx.currentTime + 0.11);
        flashGain.gain.setValueAtTime(0.18, ctx.currentTime);
        flashGain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.11);
        flashOsc.connect(flashGain);
        flashGain.connect(ctx.destination);
        flashOsc.start();
        flashOsc.stop(ctx.currentTime + 0.12);
      }
    } catch {
      // Audio autoplay policy might restrict; harmless
    }
  }, []);

  // Hardware torch controller (safely verifies track capability before applying)
  const setHardwareTorch = useCallback(async (stream: MediaStream | null, enabled: boolean) => {
    if (!stream) return;
    try {
      const track = stream.getVideoTracks()[0];
      if (!track || track.readyState !== 'live' || typeof track.applyConstraints !== 'function') {
        return;
      }
      // Check if track specifically supports physical hardware torch
      if (typeof track.getCapabilities === 'function') {
        const caps = track.getCapabilities() as { torch?: boolean };
        if (!caps || !caps.torch) {
          return;
        }
      } else {
        return;
      }
      await track.applyConstraints({
        advanced: [{ torch: enabled } as unknown as MediaTrackConstraintSet]
      });
    } catch {
      // Harmless if unsupported or restricted by device
    }
  }, []);

  // Check available video devices
  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices
        .enumerateDevices()
        .then((devices) => {
          const videoInputs = devices.filter((d) => d.kind === 'videoinput');
          setHasMultipleCameras(videoInputs.length > 1);
        })
        .catch(() => {
          setHasMultipleCameras(false);
        });
    }
  }, []);

  // Stop current active stream tracks cleanly and reset torch
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      try {
        if (supportsTorch) {
          setHardwareTorch(streamRef.current, false);
        }
        streamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
      } catch {
        // Stream stopped cleanly
      }
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [supportsTorch, setHardwareTorch]);

  // Synchronize continuous hardware torch when fill light mode is toggled
  useEffect(() => {
    if (cameraState === 'active' && streamRef.current && supportsTorch) {
      setHardwareTorch(streamRef.current, flashMode === 'fill');
    }
  }, [flashMode, cameraState, supportsTorch, setHardwareTorch]);

  // Cycle through flash modes (Off -> Flash Auto -> Digital Fill Light -> Off)
  const cycleFlashMode = useCallback(() => {
    setFlashMode((current) => {
      if (current === 'off') {
        showToast('Flash: Auto', 'Camera flash will illuminate on capture', 'info');
        return 'on';
      }
      if (current === 'on') {
        showToast('Digital Fill Light: ON', 'Screen illuminates low-light scene continuously', 'success');
        return 'fill';
      }
      showToast('Flash: Off', 'Flash disabled', 'info');
      return 'off';
    });
  }, [showToast]);

  // Safe camera stream fetch with multi-tier fallbacks (no rigid min resolution to avoid OverconstrainedError)
  const getCameraStream = async (mode: 'environment' | 'user'): Promise<MediaStream> => {
    // Attempt 1: Target facing mode with ideal resolution
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
    } catch (err1) {
      console.warn('Attempt 1 failed, trying facingMode only:', err1);
    }

    // Attempt 2: Relaxed facing mode without resolution constraints
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode },
        audio: false
      });
    } catch (err2) {
      console.warn('Attempt 2 failed, trying generic video:', err2);
    }

    // Attempt 3: Any available video device
    return await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false
    });
  };

  // Start real device camera to show what is in front of the lens
  const startCamera = useCallback(
    async (mode: 'environment' | 'user') => {
      stopStream();
      setCameraState('loading');
      setErrorMessage(null);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraState('error');
        setErrorMessage('Camera access is restricted or not supported by this browser environment.');
        return;
      }

      try {
        const stream = await getCameraStream(mode);

        streamRef.current = stream;

        // Check if device video track supports physical hardware torch
        try {
          const track = stream.getVideoTracks()[0];
          if (track && 'getCapabilities' in track) {
            const caps = track.getCapabilities() as { torch?: boolean };
            setSupportsTorch(Boolean(caps && caps.torch));
          }
        } catch {
          setSupportsTorch(false);
        }

        if (videoRef.current) {
          const video = videoRef.current;
          video.muted = true;
          video.playsInline = true;
          if (video.srcObject !== stream) {
            video.srcObject = stream;
          }

          video
            .play()
            .then(() => {
              setCameraState('active');
            })
            .catch((e: unknown) => {
              const err = e as { name?: string };
              // AbortError is normal when stream resets or autoPlay triggers
              if (err && err.name !== 'AbortError') {
                // onCanPlay or onLoadedMetadata will activate stream
              }
            });
        } else {
          setCameraState('active');
        }
      } catch (err: unknown) {
        console.warn('Camera initiation failed:', err);
        const error = err as { name?: string; message?: string };
        setCameraState('error');
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          setErrorMessage('Camera permission was blocked by your browser or security policy.');
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
          setErrorMessage('No camera hardware was detected on this device.');
        } else {
          setErrorMessage('Unable to connect to live stream. You can snap a photo directly using your device camera below.');
        }
      }
    },
    [stopStream]
  );

  // Launch camera immediately on mount
  useEffect(() => {
    startCamera(facingMode);
    return () => {
      stopStream();
    };
  }, [facingMode, startCamera, stopStream]);

  // Flip front/rear camera
  const handleToggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
  };

  // Capture current frame from live video with physical & digital flash assist
  const handleCapture = async () => {
    // If live video is not active, fallback directly to native device camera
    if (cameraState !== 'active') {
      deviceInputRef.current?.click();
      return;
    }

    if (!videoRef.current || isCapturing) return;

    setIsCapturing(true);

    const isFlashTriggered = flashMode !== 'off';

    // Play shutter sound with optional flash discharge
    playShutterSound(isFlashTriggered);

    // Pulse hardware torch if supported
    if (flashMode === 'on' && supportsTorch && streamRef.current) {
      await setHardwareTorch(streamRef.current, true);
    }

    // Trigger xenon strobe overlay animation
    setShowFlash(true);

    setTimeout(async () => {
      setShowFlash(false);
      if (flashMode === 'on' && supportsTorch && streamRef.current) {
        await setHardwareTorch(streamRef.current, false);
      }
    }, isFlashTriggered ? 350 : 160);

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    const width = video.videoWidth || video.clientWidth || 1280;
    const height = video.videoHeight || video.clientHeight || 720;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      if (facingMode === 'user') {
        // Mirror if user/front facing camera
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
      }

      // Low-light enhancement when flash is active
      if (isFlashTriggered) {
        ctx.filter = 'brightness(1.22) contrast(1.1) saturate(1.05)';
      }
      ctx.drawImage(video, 0, 0, width, height);
      ctx.filter = 'none';

      // Clean timestamp watermark with flash indicator
      ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
      ctx.fillRect(0, height - 38, width, 38);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '600 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(
        `CIVICFIX EVIDENCE • ${new Date().toLocaleString()}${isFlashTriggered ? ' • ⚡ FLASH' : ''}`,
        16,
        height - 14
      );

      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      setCapturedPhoto(dataUrl);
    }

    setIsCapturing(false);
  };

  // Retake photo: return to live video feed
  const handleRetake = () => {
    setCapturedPhoto(null);
  };

  // Discard / Clear captured photo evidence
  const handleDiscardPhoto = () => {
    setCapturedPhoto(null);
    showToast('Photo Discarded', 'Captured photo evidence was discarded.', 'info');
  };

  // Confirm photo: attach to report form
  const handleConfirmPhoto = () => {
    if (!capturedPhoto) return;
    stopStream();
    onCapture(capturedPhoto);
    showToast('Photo Attached', 'Photo captured and attached to report!', 'success');
  };

  // Fallback: choose from phone camera / file input
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (evt) => {
        const dataUrl = evt.target?.result as string;
        stopStream();
        onCapture(dataUrl);
        showToast('Photo Attached', 'Device camera photo attached successfully!', 'success');
      };
      reader.readAsDataURL(file);
    }
  };

  // Keyboard shortcut listener: Space/Enter = capture if video is active
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (cameraState === 'active' && !capturedPhoto) {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          handleCapture();
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cameraState, capturedPhoto, onClose]);

  return (
    <div className="inline-direct-camera-container" id="inline-direct-camera-container">
      {/* Top Header Bar */}
      <div className="inline-camera-header">
        <div className="inline-camera-status">
          <span className="camera-live-pulse-ring"></span>
          <span className={`camera-live-dot ${cameraState === 'active' ? 'active' : ''}`}></span>
          <span className="inline-camera-title">
            {capturedPhoto ? 'Review Photo Evidence' : 'Direct Camera Viewfinder'}
          </span>
          <span className={`camera-feed-badge ${cameraState === 'active' ? 'live' : ''}`}>
            {capturedPhoto ? 'Review' : cameraState === 'active' ? 'Live Stream' : 'Initializing'}
          </span>
        </div>

        <div className="inline-camera-actions">
          {/* Flash & Fill Light Mode Toggle */}
          {!capturedPhoto && (
            <button
              type="button"
              id="btn-inline-flash-toggle"
              className={`camera-flash-toggle-btn mode-${flashMode}`}
              onClick={cycleFlashMode}
              title={`Flash Mode: ${flashMode.toUpperCase()}. Click to cycle (Off -> Auto -> Continuous Fill Light)`}
              aria-label="Toggle Camera Flash"
            >
              {flashMode === 'off' && (
                <>
                  <i className="fas fa-bolt-slash" style={{ color: '#94A3B8' }}></i>
                  <span className="hide-mobile">Flash: Off</span>
                </>
              )}
              {flashMode === 'on' && (
                <>
                  <i className="fas fa-bolt" style={{ color: '#F59E0B' }}></i>
                  <span className="hide-mobile">Flash: Auto</span>
                </>
              )}
              {flashMode === 'fill' && (
                <>
                  <i className="fas fa-lightbulb" style={{ color: '#854D0E' }}></i>
                  <span className="hide-mobile">Fill Light</span>
                </>
              )}
            </button>
          )}

          {cameraState === 'active' && !capturedPhoto && hasMultipleCameras && (
            <button
              type="button"
              className="inline-camera-btn-icon"
              onClick={handleToggleFacingMode}
              title={`Switch Camera (Currently: ${facingMode === 'user' ? 'Front' : 'Rear'})`}
              aria-label="Switch Camera"
            >
              <i className="fas fa-sync-alt"></i>
            </button>
          )}

          <button
            type="button"
            className="inline-camera-btn-icon"
            onClick={onOpenFullscreen}
            title="Expand to Fullscreen Viewfinder"
            aria-label="Fullscreen Camera"
          >
            <i className="fas fa-expand"></i>
          </button>

          <button
            type="button"
            className="inline-camera-btn-icon close-btn"
            onClick={() => {
              stopStream();
              onClose();
            }}
            title="Close camera"
            aria-label="Close Camera"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
      </div>

      {/* Main Viewport Window */}
      <div className={`inline-camera-viewport ${flashMode === 'fill' && !capturedPhoto && cameraState === 'active' ? 'digital-fill-light-active' : ''}`}>
        {/* Flash effect on shutter: Multi-stage xenon flash strobe animation */}
        {showFlash && <div className="camera-flash-strobe"></div>}

        {/* Continuous digital fill light softbox frame for low light */}
        {flashMode === 'fill' && !capturedPhoto && cameraState === 'active' && (
          <div className="fill-light-diffuser-overlay">
            <span className="fill-light-badge">
              <i className="fas fa-lightbulb"></i> Low-Light Fill Light
            </span>
          </div>
        )}

        {capturedPhoto ? (
          /* Captured Photo Preview */
          <div style={{ width: '100%', height: '100%', position: 'relative', backgroundColor: '#020617' }}>
            <img
              src={capturedPhoto}
              alt="Captured evidence preview"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain'
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: '12px',
                left: '12px',
                backgroundColor: 'rgba(16, 185, 129, 0.94)',
                color: '#FFFFFF',
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backdropFilter: 'blur(4px)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
              }}
            >
              <i className="fas fa-check-circle"></i> Photo Ready to Attach
            </div>

            {/* Clear / Discard Photo Action Overlay */}
            <button
              type="button"
              className="photo-overlay-remove-btn"
              id="btn-inline-discard-overlay"
              onClick={handleDiscardPhoto}
              title="Discard captured photo"
              aria-label="Discard captured photo"
            >
              <i className="fas fa-trash-alt"></i>
              <span>Discard Photo</span>
            </button>
          </div>
        ) : (
          /* Live Video Stream */
          <>
            <video
              ref={videoRef}
              className="inline-camera-video"
              autoPlay
              playsInline
              muted
              onLoadedMetadata={() => {
                if (videoRef.current && videoRef.current.paused) {
                  videoRef.current
                    .play()
                    .then(() => setCameraState('active'))
                    .catch(() => setCameraState('active'));
                } else {
                  setCameraState('active');
                }
              }}
              onCanPlay={() => {
                setCameraState('active');
              }}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                opacity: cameraState === 'active' ? 1 : 0,
                transition: 'opacity 0.25s ease'
              }}
            />

            {/* Subtle basic viewfinder corner guides */}
            {cameraState === 'active' && (
              <div className="inline-camera-reticle">
                <div className="reticle-corner reticle-tl"></div>
                <div className="reticle-corner reticle-tr"></div>
                <div className="reticle-corner reticle-bl"></div>
                <div className="reticle-corner reticle-br"></div>
              </div>
            )}

            {/* Loading / Starting Camera State */}
            {cameraState === 'loading' && (
              <div className="inline-camera-loading-overlay">
                <i className="fas fa-circle-notch fa-spin" style={{ fontSize: '26px', color: '#38BDF8' }}></i>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#F8FAFC' }}>
                  Connecting to camera feed...
                </span>
                <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 400 }}>
                  Point your camera at the infrastructure hazard
                </span>
              </div>
            )}

            {/* Camera Access Blocked / Stream Unavailable - Permission Resolver Hub */}
            {cameraState === 'error' && (
              <div className="camera-resolver-container" id="inline-permission-resolver">
                <div className="camera-resolver-icon">
                  <i className="fas fa-video-slash"></i>
                </div>
                <h4 className="camera-resolver-title">
                  Camera Access Blocked or Restricted
                </h4>
                <p className="camera-resolver-description">
                  {errorMessage || 'Direct in-browser stream is blocked by container permissions. Choose an option below to proceed:'}
                </p>

                <div className="camera-resolver-actions">
                  {/* Primary: Direct Device Hardware Camera Bypass */}
                  <button
                    type="button"
                    className="btn-resolver-primary"
                    id="btn-inline-device-camera"
                    onClick={() => deviceInputRef.current?.click()}
                  >
                    <i className="fas fa-camera"></i>
                    <span>Take Photo with Device Camera</span>
                  </button>

                  <div style={{ display: 'flex', gap: '8px', width: '100%', flexWrap: 'wrap' }}>
                    {/* Open in Dedicated Tab */}
                    <button
                      type="button"
                      className="btn-resolver-secondary"
                      style={{ flex: '1 1 calc(50% - 4px)' }}
                      onClick={() => window.open(window.location.href, '_blank')}
                    >
                      <i className="fas fa-external-link-alt"></i> Open in New Tab
                    </button>

                    {/* Request Permission & Retry */}
                    <button
                      type="button"
                      className="btn-resolver-secondary"
                      style={{ flex: '1 1 calc(50% - 4px)' }}
                      onClick={() => startCamera(facingMode)}
                    >
                      <i className="fas fa-redo"></i> Request Permission & Retry
                    </button>
                  </div>

                  {/* Instant Sample Hazard Evidence */}
                  <button
                    type="button"
                    className="btn-resolver-ghost"
                    id="btn-inline-sample-hazard"
                    onClick={() => {
                      const sampleUrl = createSampleHazardDataUrl();
                      if (sampleUrl) {
                        setCapturedPhoto(sampleUrl);
                        showToast('Sample Loaded', 'Pothole hazard sample ready for inspection', 'info');
                      }
                    }}
                  >
                    <i className="fas fa-image"></i> Use Sample Hazard Photo for Testing
                  </button>
                </div>

                {/* Browser Unblock Guide */}
                <div className="camera-resolver-guide">
                  <div className="camera-resolver-step">
                    <span className="camera-resolver-step-num">1</span>
                    <span>Click the <strong>camera or lock icon 🔒</strong> in your browser address bar.</span>
                  </div>
                  <div className="camera-resolver-step">
                    <span className="camera-resolver-step-num">2</span>
                    <span>Change Camera permission from <em>Block</em> to <strong>Allow</strong>.</span>
                  </div>
                  <div className="camera-resolver-step">
                    <span className="camera-resolver-step-num">3</span>
                    <span>Click <strong>Request Permission & Retry</strong> above.</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Hidden File Input with camera capture attribute */}
      <input
        ref={deviceInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Bottom Controls Bar */}
      <div className="inline-camera-footer">
        {capturedPhoto ? (
          /* Review Controls */
          <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                id="btn-inline-discard-photo"
                onClick={handleDiscardPhoto}
                style={{
                  borderColor: 'rgba(248, 113, 113, 0.4)',
                  color: '#F87171',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                title="Discard captured photo"
              >
                <i className="fas fa-trash-alt"></i> Discard Photo
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={handleRetake}
                style={{
                  borderColor: 'rgba(255,255,255,0.2)',
                  color: '#CBD5E1',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <i className="fas fa-redo"></i> Retake Photo
              </button>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              id="btn-confirm-inline-photo"
              onClick={handleConfirmPhoto}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 24px',
                fontWeight: 700,
                boxShadow: '0 4px 14px rgba(10, 110, 189, 0.3)'
              }}
            >
              <i className="fas fa-check"></i> Use This Photo
            </button>
          </div>
        ) : (
          /* Live Shutter Controls */
          <>
            <div className="inline-footer-tip">
              <button
                type="button"
                onClick={() => deviceInputRef.current?.click()}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#CBD5E1',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 600,
                  transition: 'background 0.15s ease'
                }}
                title="Trigger native phone/tablet camera hardware directly"
              >
                <i className="fas fa-mobile-alt" style={{ color: '#38BDF8' }}></i>
                <span>Device Snap</span>
              </button>
            </div>

            {/* Shutter Button */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <button
                type="button"
                id="btn-inline-shutter"
                className="inline-camera-shutter-btn"
                onClick={handleCapture}
                aria-label="Capture photo"
                title={cameraState === 'active' ? 'Snap photo (Spacebar or Enter)' : 'Take photo with device camera'}
              >
                <div className="shutter-inner-ring">
                  <div className="shutter-inner-dot">
                    <i className="fas fa-camera"></i>
                  </div>
                </div>
              </button>
              <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 500 }}>
                {cameraState === 'active' ? 'Click or press Space to snap' : 'Click to take photo'}
              </span>
            </div>

            <div className="inline-footer-actions">
              <button
                type="button"
                className="btn btn-outline btn-sm inline-cancel-btn"
                onClick={() => {
                  stopStream();
                  onClose();
                }}
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
