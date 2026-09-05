import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CategoryType, SeverityType, PriorityType } from '../../types';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
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
  showToast: (title: string, msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export interface HazardPreset {
  id: string;
  category: CategoryType;
  title: string;
  label: string;
  icon: string;
  badgeColor: string;
  priority: PriorityType;
  severity: SeverityType;
  confidence: number;
  reason: string;
  description: string;
}

export const HAZARD_PRESETS: HazardPreset[] = [
  {
    id: 'pothole',
    category: 'Pothole',
    title: 'Road Pothole Hazard',
    label: 'Road Pothole',
    icon: 'fa-road',
    badgeColor: '#EF4444',
    priority: 'High',
    severity: 'High',
    confidence: 95,
    reason: 'Road asphalt irregularity or cavity.',
    description: 'Road damage requiring maintenance.'
  }
];

// Helper to create an instant client-side realistic road hazard photo for verification/testing
export const createSampleHazardDataUrl = (): string => {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Asphalt road background
  ctx.fillStyle = '#334155';
  ctx.fillRect(0, 0, 640, 480);

  // Surface texture
  for (let i = 0; i < 240; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? '#1E293B' : '#475569';
    ctx.fillRect(Math.random() * 640, Math.random() * 480, 2 + Math.random() * 4, 2 + Math.random() * 4);
  }

  // Yellow center lane markings
  ctx.fillStyle = '#F59E0B';
  ctx.fillRect(312, 0, 16, 140);
  ctx.fillRect(312, 340, 16, 140);

  // Pothole dark cavity
  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  ctx.ellipse(320, 240, 135, 75, 0, 0, Math.PI * 2);
  ctx.fill();

  // Edge jagged fractures
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(185, 240);
  ctx.lineTo(135, 215);
  ctx.lineTo(105, 245);
  ctx.moveTo(455, 240);
  ctx.lineTo(505, 270);
  ctx.lineTo(535, 245);
  ctx.stroke();

  // Watermark
  ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
  ctx.fillRect(0, 444, 640, 36);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '600 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`CIVICFIX • ROAD HAZARD EVIDENCE • ${new Date().toLocaleDateString()}`, 16, 467);

  return canvas.toDataURL('image/jpeg', 0.92);
};

export const CameraModal: React.FC<CameraModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  showToast
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Camera connection & state
  const [cameraState, setCameraState] = useState<'loading' | 'active' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

  // Flash & Low-Light Illumination state
  const [flashMode, setFlashMode] = useState<'off' | 'on' | 'fill'>('off');
  const [supportsTorch, setSupportsTorch] = useState(false);

  // Capture & Preview
  const [isCapturing, setIsCapturing] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);

  // Audio shutter feedback via Web Audio API (with optional xenon capacitor discharge sound)
  const playShutterSound = useCallback((isFlashActive = false) => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      // Shutter click oscillator
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(820, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(170, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.09);

      // Flash pop simulation if flash mode is active
      if (isFlashActive) {
        const flashNoise = ctx.createOscillator();
        const flashGain = ctx.createGain();
        flashNoise.type = 'sine';
        flashNoise.frequency.setValueAtTime(1200, ctx.currentTime);
        flashNoise.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.12);
        flashGain.gain.setValueAtTime(0.18, ctx.currentTime);
        flashGain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.12);
        flashNoise.connect(flashGain);
        flashGain.connect(ctx.destination);
        flashNoise.start();
        flashNoise.stop(ctx.currentTime + 0.13);
      }
    } catch {
      // Audio policy might prevent sound; harmless
    }
  }, []);

  // Hardware torch controller for mobile and supported webcams (safely verifies capability before applying)
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
      // Harmless if unsupported or restricted by device/browser
    }
  }, []);

  // Enumerate video devices
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

  // Stop current active stream tracks cleanly and disable torch
  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      try {
        if (supportsTorch) {
          setHardwareTorch(streamRef.current, false);
        }
        streamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
      } catch {
        // Stream tracks stopped cleanly
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

  // Start real device camera stream to show what is in front of the lens
  const startCamera = useCallback(
    async (mode: 'environment' | 'user') => {
      stopCameraStream();
      setCameraState('loading');
      setErrorMessage(null);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraState('error');
        setErrorMessage('Camera access is not supported by your browser.');
        return;
      }

      let stream: MediaStream | null = null;

      try {
        // Attempt 1: Target facingMode with ideal resolution
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: mode },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });
      } catch {
        try {
          // Attempt 2: Relaxed facingMode
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: mode },
            audio: false
          });
        } catch {
          try {
            // Attempt 3: Any available video device
            stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false
            });
          } catch (err: unknown) {
            const error = err as { name?: string; message?: string };
            setCameraState('error');
            if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
              setErrorMessage('Camera permission was blocked. Please click the camera icon in your browser address bar to allow access.');
            } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
              setErrorMessage('No camera hardware found on this device.');
            } else {
              setErrorMessage('Unable to connect to camera. Please check permissions or select a photo from your device.');
            }
            return;
          }
        }
      }

      if (stream) {
        streamRef.current = stream;
        setCameraState('active');

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
          video.play().catch((e: unknown) => {
            const err = e as { name?: string };
            // Ignore standard AbortError when switching or auto-loading
            if (err && err.name !== 'AbortError') {
              // onCanPlay or onLoadedMetadata will activate stream
            }
          });
        }
      }
    },
    [stopCameraStream]
  );

  // Manage camera lifecycle when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCapturedPreview(null);
      startCamera(facingMode);
    } else {
      stopCameraStream();
      setCapturedPreview(null);
    }

    return () => {
      stopCameraStream();
    };
  }, [isOpen, facingMode, startCamera, stopCameraStream]);

  // Flip front/rear camera
  const toggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
  };

  // Capture current frame from live video with physical/digital flash support
  const handleSnap = async () => {
    if (!videoRef.current || isCapturing) return;

    setIsCapturing(true);

    const isFlashTriggered = flashMode !== 'off';

    // Play shutter sound with flash capacitor discharge if flash active
    playShutterSound(isFlashTriggered);

    // Pulse hardware torch if supported
    if (flashMode === 'on' && supportsTorch && streamRef.current) {
      await setHardwareTorch(streamRef.current, true);
    }

    // Trigger digital xenon flash strobe overlay animation
    setShowFlash(true);

    setTimeout(async () => {
      setShowFlash(false);
      if (flashMode === 'on' && supportsTorch && streamRef.current) {
        await setHardwareTorch(streamRef.current, false);
      }
    }, isFlashTriggered ? 350 : 160);

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      if (facingMode === 'user') {
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
      }

      // Low-light enhancement when flash is active
      if (isFlashTriggered) {
        ctx.filter = 'brightness(1.22) contrast(1.1) saturate(1.05)';
      }
      ctx.drawImage(video, 0, 0, width, height);
      ctx.filter = 'none';

      // Clean timestamp watermark with flash assist indicator
      ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
      ctx.fillRect(0, height - 36, width, 36);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '500 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(
        `CIVICFIX • ${new Date().toLocaleString()}${isFlashTriggered ? ' • ⚡ FLASH' : ''}`,
        16,
        height - 13
      );

      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      setCapturedPreview(dataUrl);
    }

    setIsCapturing(false);
  };

  // Confirm photo selection
  const handleConfirmPhoto = () => {
    if (!capturedPreview) return;
    stopCameraStream();
    onCapture(capturedPreview);
    showToast('Photo Attached', 'Photo captured and attached to report!', 'success');
    onClose();
  };

  // Retake photo: return to live video
  const handleRetake = () => {
    setCapturedPreview(null);
  };

  // Fallback: file upload or phone camera app
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (evt) => {
        const dataUrl = evt.target?.result as string;
        stopCameraStream();
        onCapture(dataUrl);
        showToast('Photo Attached', 'Device photo attached successfully!', 'success');
        onClose();
      };
      reader.readAsDataURL(file);
    }
  };

  // Keyboard shortcut listener: Space/Enter = Snap, Esc = Close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        stopCameraStream();
        onClose();
      } else if ((e.key === ' ' || e.key === 'Enter') && cameraState === 'active' && !capturedPreview) {
        e.preventDefault();
        handleSnap();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, cameraState, capturedPreview, onClose, stopCameraStream]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay active"
      id="cameraModal"
      onClick={() => {
        stopCameraStream();
        onClose();
      }}
      style={{
        zIndex: 2500,
        padding: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflowY: 'auto'
      }}
    >
      <div
        className="modal camera-modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '680px',
          width: '100%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '16px',
          borderRadius: '16px',
          overflowY: 'auto',
          backgroundColor: '#FFFFFF',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.3)',
          boxSizing: 'border-box',
          margin: 'auto'
        }}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', gap: '8px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <span
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: '#EFF6FF',
                color: '#2563EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                flexShrink: 0
              }}
            >
              <i className="fas fa-camera"></i>
            </span>
            <div style={{ minWidth: 0 }}>
              <h3
                style={{
                  fontFamily: 'var(--font-display, inherit)',
                  fontSize: '17px',
                  fontWeight: 700,
                  color: 'var(--navy, #0F172A)',
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  flexWrap: 'wrap'
                }}
              >
                <span>Instant Camera</span>
                <span
                  style={{
                    fontSize: '10px',
                    padding: '2px 7px',
                    borderRadius: '20px',
                    backgroundColor: capturedPreview ? '#E0F2FE' : cameraState === 'active' ? '#DCFCE7' : '#F1F5F9',
                    color: capturedPreview ? '#0284C7' : cameraState === 'active' ? '#16A34A' : '#64748B',
                    fontWeight: 700
                  }}
                >
                  {capturedPreview ? 'Review' : cameraState === 'active' ? 'Live' : 'Connecting'}
                </span>
              </h3>
              <p style={{ color: '#64748B', fontSize: '12px', margin: '2px 0 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {capturedPreview
                  ? 'Review captured photo'
                  : 'Point camera at hazard and click shutter button'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            {/* Physical / Digital Flash & Low-Light Overlay Toggle Button */}
            {!capturedPreview && (
              <button
                type="button"
                id="btn-camera-flash-toggle"
                className={`camera-flash-toggle-btn mode-${flashMode}`}
                onClick={cycleFlashMode}
                title={`Flash Mode: ${flashMode.toUpperCase()}`}
                aria-label="Toggle Camera Flash"
              >
                {flashMode === 'off' && (
                  <>
                    <i className="fas fa-bolt-slash" style={{ color: '#94A3B8' }}></i>
                    <span className="hide-mobile">Off</span>
                  </>
                )}
                {flashMode === 'on' && (
                  <>
                    <i className="fas fa-bolt" style={{ color: '#F59E0B' }}></i>
                    <span className="hide-mobile">Auto</span>
                  </>
                )}
                {flashMode === 'fill' && (
                  <>
                    <i className="fas fa-lightbulb" style={{ color: '#854D0E' }}></i>
                    <span className="hide-mobile">Fill</span>
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              className="modal-close"
              id="btn-close-camera"
              onClick={() => {
                stopCameraStream();
                onClose();
              }}
              style={{
                position: 'static',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                backgroundColor: 'var(--gray-100, #F1F5F9)',
                color: 'var(--gray-600, #475569)',
                border: 'none',
                cursor: 'pointer',
                flexShrink: 0
              }}
              aria-label="Close camera modal"
              title="Close Camera"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>

        {/* Viewfinder Window with Digital Fill Light illumination */}
        <div
          className={flashMode === 'fill' && !capturedPreview && cameraState === 'active' ? 'digital-fill-light-active' : ''}
          style={{
            position: 'relative',
            width: '100%',
            height: 'clamp(200px, 42vh, 360px)',
            backgroundColor: '#020617',
            borderRadius: '12px',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.4)',
            transition: 'box-shadow 0.3s ease, border 0.3s ease',
            flexShrink: 0
          }}
        >
          {/* Multi-stage Xenon Flash Strobe Overlay Animation */}
          {showFlash && (
            <div className="camera-flash-strobe" />
          )}

          {/* Continuous Digital Fill Light Softbox Frame for Low-Light Environments */}
          {flashMode === 'fill' && !capturedPreview && cameraState === 'active' && (
            <div className="fill-light-diffuser-overlay">
              <span className="fill-light-badge">
                <i className="fas fa-lightbulb"></i> Low-Light Fill Light Active
              </span>
            </div>
          )}

          {capturedPreview ? (
            /* Review Captured Photo */
            <div style={{ width: '100%', height: '100%', position: 'relative' }}>
              <img
                src={capturedPreview}
                alt="Captured hazard"
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
                  backgroundColor: 'rgba(16, 185, 129, 0.92)',
                  color: 'white',
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backdropFilter: 'blur(4px)'
                }}
              >
                <i className="fas fa-check-circle"></i> Photo Ready
              </div>

              {/* Clear / Discard Photo Action Overlay */}
              <button
                type="button"
                className="photo-overlay-remove-btn"
                id="btn-modal-discard-overlay"
                onClick={handleRetake}
                title="Discard captured photo"
                aria-label="Discard captured photo"
              >
                <i className="fas fa-trash-alt"></i>
                <span>Discard Photo</span>
              </button>
            </div>
          ) : (
            /* Live Camera Video Feed (What is in front of the camera) */
            <>
              <video
                ref={videoRef}
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
                  display: cameraState === 'active' ? 'block' : 'none',
                  transform: facingMode === 'user' ? 'scaleX(-1)' : 'none'
                }}
              />

              {/* Basic Viewfinder Reticle Corners */}
              {cameraState === 'active' && (
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: '240px',
                    height: '180px',
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none'
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '20px',
                      height: '20px',
                      borderTop: '2.5px solid rgba(255, 255, 255, 0.85)',
                      borderLeft: '2.5px solid rgba(255, 255, 255, 0.85)'
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      right: 0,
                      width: '20px',
                      height: '20px',
                      borderTop: '2.5px solid rgba(255, 255, 255, 0.85)',
                      borderRight: '2.5px solid rgba(255, 255, 255, 0.85)'
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      width: '20px',
                      height: '20px',
                      borderBottom: '2.5px solid rgba(255, 255, 255, 0.85)',
                      borderLeft: '2.5px solid rgba(255, 255, 255, 0.85)'
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      width: '20px',
                      height: '20px',
                      borderBottom: '2.5px solid rgba(255, 255, 255, 0.85)',
                      borderRight: '2.5px solid rgba(255, 255, 255, 0.85)'
                    }}
                  />
                </div>
              )}

              {/* Camera Starting State */}
              {cameraState === 'loading' && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundColor: 'rgba(2, 6, 23, 0.85)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    color: '#38BDF8',
                    fontSize: '14px',
                    fontWeight: 600
                  }}
                >
                  <i className="fas fa-circle-notch fa-spin" style={{ fontSize: '26px' }}></i>
                  <span>Starting camera feed...</span>
                  <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 400 }}>
                    Please allow camera permissions if prompted by browser
                  </span>
                </div>
              )}

              {/* Camera Error / Blocked State - Permission Resolver Hub */}
              {cameraState === 'error' && (
                <div className="camera-resolver-container" id="camera-permission-resolver">
                  <div className="camera-resolver-icon">
                    <i className="fas fa-video-slash"></i>
                  </div>
                  <h4 className="camera-resolver-title">
                    Camera Access Blocked or Restricted
                  </h4>
                  <p className="camera-resolver-description">
                    {errorMessage || 'Your browser or system has restricted direct camera feed access. Choose an option below to continue:'}
                  </p>

                  <div className="camera-resolver-actions">
                    {/* Direct Device Native Camera Capture - 100% bypass of iframe restrictions */}
                    <button
                      type="button"
                      className="btn-resolver-primary"
                      id="btn-modal-device-camera"
                      onClick={() => fileInputRef.current?.click()}
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
                      id="btn-use-sample-hazard"
                      onClick={() => {
                        const sampleUrl = createSampleHazardDataUrl();
                        if (sampleUrl) {
                          setCapturedPreview(sampleUrl);
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
                      <span>Change Camera from <em>Block</em> to <strong>Allow</strong>.</span>
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

        {/* Bottom Control Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '12px',
            paddingTop: '10px',
            borderTop: '1px solid #F1F5F9',
            flexShrink: 0,
            gap: '8px'
          }}
        >
          {capturedPreview ? (
            /* Review Controls */
            <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  id="btn-modal-discard-photo"
                  onClick={handleRetake}
                  style={{
                    borderColor: 'rgba(248, 113, 113, 0.4)',
                    color: '#DC2626',
                    backgroundColor: '#FEF2F2',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontWeight: 600
                  }}
                  title="Discard captured photo"
                >
                  <i className="fas fa-trash-alt"></i> Discard
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={handleRetake}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <i className="fas fa-redo"></i> Retake
                </button>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  id="btn-confirm-camera-photo"
                  onClick={handleConfirmPhoto}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 18px',
                    fontWeight: 700,
                    boxShadow: '0 4px 14px rgba(10, 110, 189, 0.3)'
                  }}
                >
                  <i className="fas fa-check"></i> Use Photo
                </button>
              </div>
            </div>
          ) : (
            /* Live Camera Controls */
            <div style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              {/* Left Action: Flip Camera or Cancel */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {cameraState === 'active' && hasMultipleCameras && (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={toggleFacingMode}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 10px', fontSize: '12px' }}
                    title={`Switch camera (Current: ${facingMode === 'user' ? 'Front' : 'Rear'})`}
                  >
                    <i className="fas fa-sync-alt"></i>
                    <span className="hide-mobile">Flip</span>
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    stopCameraStream();
                    onClose();
                  }}
                  style={{ padding: '6px 10px', fontSize: '12px', color: '#64748B' }}
                  title="Cancel and close camera"
                >
                  Cancel
                </button>
              </div>

              {/* Center Action: Classic Shutter Button */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <button
                  type="button"
                  id="btn-snap-photo"
                  onClick={handleSnap}
                  disabled={cameraState !== 'active' || isCapturing}
                  style={{
                    width: '58px',
                    height: '58px',
                    borderRadius: '50%',
                    backgroundColor: '#EF4444',
                    border: '4px solid #FFFFFF',
                    boxShadow: '0 0 0 3px #EF4444, 0 6px 16px rgba(239, 68, 68, 0.35)',
                    cursor: cameraState === 'active' ? 'pointer' : 'not-allowed',
                    opacity: cameraState === 'active' ? 1 : 0.6,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    fontSize: '20px',
                    transform: isCapturing ? 'scale(0.92)' : 'scale(1)',
                    transition: 'all 0.15s ease'
                  }}
                  title="Snap photo (Spacebar or Enter)"
                  aria-label="Capture photo"
                >
                  <i className="fas fa-camera"></i>
                </button>
              </div>

              {/* Right Action: Device File / Camera Fallback */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                <label
                  className="btn btn-ghost btn-sm"
                  id="btn-device-app-camera"
                  style={{
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: '#475569',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    fontSize: '12px'
                  }}
                  title="Select photo from device storage or native phone camera"
                >
                  <i className="fas fa-folder-open" style={{ color: '#0A6EBD' }}></i>
                  <span className="hide-mobile">Browse</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
