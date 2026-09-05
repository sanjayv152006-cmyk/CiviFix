import React, { useState, useEffect, useRef } from 'react';
import {
  CategoryType,
  SeverityType,
  PriorityType,
  Report,
  AuthSession
} from '../../types';
import {
  reverseGeocode,
  searchLocationQuery,
  calculateSmartPriority,
  simulateAIImageAnalysis,
  isValidCoordinate
} from '../../utils/geo';
import { getActiveGoogleMapsKey } from '../../utils/maps';
import { CameraModal } from '../modals/CameraModal';
import { InlineDirectCamera } from '../InlineDirectCamera';
import { GoogleReportMap } from '../maps/GoogleReportMap';
import { InteractiveLeafletMap } from '../maps/InteractiveLeafletMap';

interface ReportPageProps {
  existingReports: Report[];
  onSubmitReport: (newReport: Report) => void;
  session: AuthSession | null;
  showToast: (title: string, msg: string, type?: 'info' | 'success' | 'warning' | 'error', duration?: number) => void;
  initialPhoto?: string | null;
  initialMeta?: {
    category: CategoryType;
    confidence: number;
    priority: PriorityType;
    severity: SeverityType;
    title: string;
    reason: string;
  } | null;
  onClearInitialPhoto?: () => void;
}

export const ReportPage: React.FC<ReportPageProps> = ({
  existingReports,
  onSubmitReport,
  session,
  showToast,
  initialPhoto,
  initialMeta,
  onClearInitialPhoto
}) => {
  const googleMapsApiKey = getActiveGoogleMapsKey();
  const [mapProvider, setMapProvider] = useState<'google' | 'leaflet'>(
    googleMapsApiKey ? 'google' : 'leaflet'
  );
  const [category, setCategory] = useState<CategoryType>('Pothole');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<SeverityType>('Low');

  // Location state
  const [lat, setLat] = useState<number>(11.3410);
  const [lng, setLng] = useState<number>(77.7172);
  const [area, setArea] = useState<string>('Erode, Tamil Nadu');
  const [searchQuery, setSearchQuery] = useState('');
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Photo & AI state
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [isInlineCameraActive, setIsInlineCameraActive] = useState(false);
  const [aiResult, setAiResult] = useState<{
    category: CategoryType;
    confidence: number;
    priority: string;
    severity: string;
    reason: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Automatically update to google if key is active
  useEffect(() => {
    if (googleMapsApiKey && mapProvider === 'leaflet') {
      setMapProvider('google');
    }
  }, [googleMapsApiKey]);

  const updateLocation = async (newLat: number, newLng: number) => {
    if (!isValidCoordinate(newLat, newLng)) return;

    setLat(newLat);
    setLng(newLng);
    setArea('Detecting area...');

    const detectedArea = await reverseGeocode(newLat, newLng);
    setArea(detectedArea);
  };

  const handleLocateUser = () => {
    if (!navigator.geolocation) {
      showToast('Error', 'Geolocation is not supported by your browser.', 'error');
      return;
    }

    showToast('Info', 'Locating your current coordinates...', 'info', 2000);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;

        if (!isValidCoordinate(userLat, userLng)) {
          showToast('Error', 'Invalid coordinates received.', 'error');
          return;
        }

        setUserCoords({ lat: userLat, lng: userLng });
        updateLocation(userLat, userLng);
        showToast('Success', 'Location detected successfully!', 'success');
      },
      (err) => {
        console.warn('Geolocation failed:', err);
        showToast('Warning', 'Could not access GPS. Using default location (Erode, TN).', 'warning', 4000);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSearchLocation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    showToast('Info', `Searching for "${searchQuery}"...`, 'info', 2000);
    const result = await searchLocationQuery(searchQuery);

    if (result) {
      updateLocation(result.lat, result.lng);
      setArea(result.displayName.split(',')[0]);
      showToast('Success', `Found: ${result.displayName.split(',')[0]}`, 'success');
    } else {
      showToast('Error', 'Location not found. Please try another query.', 'error');
    }
  };

  // Image Upload Handling
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processImageFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  const compressImage = (dataUrl: string, maxWidth = 1024, maxHeight = 1024, quality = 0.82): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } else {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  };

  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('Error', 'Please upload a valid image file', 'error');
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      showToast('Error', 'File size exceeds 12MB limit', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (loadEvt) => {
      const rawDataUrl = loadEvt.target?.result as string;
      const optimizedDataUrl = await compressImage(rawDataUrl);
      setPhotoUrl(optimizedDataUrl);

      // Trigger simulated AI Analysis
      setAiAnalyzing(true);
      setAiResult(null);

      setTimeout(() => {
        const analysis = simulateAIImageAnalysis();
        setAiResult(analysis);
        setAiAnalyzing(false);
        // Automatically suggest category if user hasn't typed
        setCategory(analysis.category);
        showToast('AI Analysis', 'Image classified successfully by CivicFix AI Engine!', 'success');
      }, 1500);
    };
    reader.readAsDataURL(file);
  };

  const handleDirectCameraCapture = (
    dataUrl: string,
    meta?: {
      category: CategoryType;
      confidence: number;
      priority: PriorityType;
      severity: SeverityType;
      title: string;
      reason: string;
    }
  ) => {
    setPhotoUrl(dataUrl);
    setAiAnalyzing(true);
    setAiResult(null);

    setTimeout(() => {
      let analysis = {
        category: meta?.category || ('Pothole' as CategoryType),
        confidence: meta?.confidence || 95,
        priority: meta?.priority || ('High' as PriorityType),
        severity: meta?.severity || ('High' as SeverityType),
        reason: meta?.reason || 'Infrastructure irregularity detected from visual analysis.'
      };

      if (!meta) {
        if (dataUrl.includes('POTHOLE')) {
          analysis = {
            category: 'Pothole',
            confidence: 96,
            priority: 'Critical',
            severity: 'Critical',
            reason: 'Severe asphalt cavity detected on vehicular thoroughfare creating high collision hazard.'
          };
        } else if (dataUrl.includes('STREETLIGHT')) {
          analysis = {
            category: 'Broken Streetlight',
            confidence: 94,
            priority: 'High',
            severity: 'High',
            reason: 'Municipal luminaire fixture damaged; critical darkness zone detected near pedestrian walkway.'
          };
        } else if (dataUrl.includes('WASTE')) {
          analysis = {
            category: 'Garbage Overflow',
            confidence: 92,
            priority: 'High',
            severity: 'High',
            reason: 'Refuse spillage detected overflowing public receptacles with environmental bio-hazard risk.'
          };
        } else if (dataUrl.includes('PIPELINE')) {
          analysis = {
            category: 'Water Leakage',
            confidence: 95,
            priority: 'Critical',
            severity: 'Critical',
            reason: 'High-pressure distribution main breach identified causing active sub-base flooding.'
          };
        } else {
          analysis = simulateAIImageAnalysis();
        }
      }

      setAiResult(analysis);
      setAiAnalyzing(false);
      setCategory(analysis.category);
      setSeverity(analysis.severity);
      if (meta?.title && !title) {
        setTitle(meta.title);
      } else if (!title) {
        setTitle(`${analysis.category} near ${area.split(',')[0]}`);
      }
      showToast('AI Hazard Detected', `Instant photo classified as ${analysis.category}!`, 'success');
    }, 1000);
  };

  // Preload initial photo if provided from global instant camera
  useEffect(() => {
    if (initialPhoto) {
      handleDirectCameraCapture(initialPhoto, initialMeta || undefined);
      if (onClearInitialPhoto) {
        onClearInitialPhoto();
      }
    }
  }, [initialPhoto]);

  const handleRemovePhoto = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setPhotoUrl(null);
    setAiResult(null);
    setAiAnalyzing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = '';
    }
    if (onClearInitialPhoto) {
      onClearInitialPhoto();
    }
    showToast('Photo Evidence Removed', 'Photo evidence has been removed from this report.', 'info', 3000);
  };

  // Form Submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !description.trim()) {
      showToast('Error', 'Please fill in all required issue fields.', 'error');
      return;
    }

    const nextNumber = existingReports.length + 1;
    const reportId = `CF-2026-${String(nextNumber).padStart(4, '0')}`;
    const calculatedPriority = calculateSmartPriority(severity, category, lat, lng, existingReports);

    const now = new Date();
    const formattedDate = now.toISOString().split('T')[0];
    const formattedDateTime = now.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const newReport: Report = {
      id: reportId,
      title: title.trim(),
      category,
      description: description.trim(),
      severity,
      priority: calculatedPriority,
      status: 'Reported',
      lat,
      lng,
      area: area || 'Chennai, Tamil Nadu',
      date: formattedDate,
      lastUpdated: formattedDate,
      reporter: session ? session.fullName : 'Citizen Reporter',
      reporterEmail: session ? session.email : 'citizen@email.com',
      reporterId: session ? session.id : 'CFU10001',
      reporterPhone: session?.phone,
      photoUrl: photoUrl || undefined,
      timeline: [
        { status: 'Reported', date: formattedDateTime, completed: true, current: true },
        { status: 'Verified', date: 'Pending', completed: false },
        { status: 'Assigned', date: 'Pending', completed: false },
        { status: 'In Progress', date: 'Pending', completed: false },
        { status: 'Resolved', date: 'Pending', completed: false }
      ]
    };

    onSubmitReport(newReport);

    // Reset Form
    setTitle('');
    setDescription('');
    setCategory('Pothole');
    setSeverity('Low');
    setPhotoUrl(null);
    setAiResult(null);
  };

  return (
    <section className="page active" id="report">
      <div className="container">
        <div className="page-header">
          <span className="section-tag">New Report</span>
          <h1 className="page-title">Report an Infrastructure Issue</h1>
          <p className="page-subtitle">
            Provide accurate details so municipal authorities can prioritize and dispatch field teams quickly.
          </p>
        </div>

        <div className="report-layout">
          {/* Form */}
          <div className="report-form-card">
            <form id="reportForm" className="report-form" onSubmit={handleSubmit}>
              {/* Section 1: Issue Details */}
              <div className="form-section">
                <h3 className="form-section-title">
                  <span className="form-step">1</span> Issue Details
                </h3>

                <div className="form-group">
                  <label className="form-label" htmlFor="issueCategory">
                    Issue Category <span className="req">*</span>
                  </label>
                  <select
                    className="form-control"
                    id="issueCategory"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as CategoryType)}
                    required
                  >
                    <option value="Pothole">Pothole</option>
                    <option value="Road Damage">Road Damage</option>
                    <option value="Broken Streetlight">Broken Streetlight</option>
                    <option value="Garbage Overflow">Garbage Overflow</option>
                    <option value="Water Leakage">Water Leakage</option>
                    <option value="Drainage Issue">Drainage Issue</option>
                    <option value="Damaged Public Facility">Damaged Public Facility</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="issueTitle">
                    Issue Title <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="issueTitle"
                    placeholder="e.g. Large pothole near Anna Salai junction"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="issueDescription">
                    Description <span className="req">*</span>
                  </label>
                  <textarea
                    className="form-control"
                    id="issueDescription"
                    rows={4}
                    placeholder="Describe the problem, hazard details, and approximately how long it has persisted..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                  ></textarea>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">
                      Severity <span className="req">*</span>
                    </label>
                    <div className="severity-options">
                      {(['Low', 'Medium', 'High', 'Critical'] as SeverityType[]).map((sev) => (
                        <label key={sev} className="severity-option">
                          <input
                            type="radio"
                            name="severity"
                            value={sev}
                            checked={severity === sev}
                            onChange={() => setSeverity(sev)}
                          />
                          <span
                            className={`severity-tag sev-${sev.toLowerCase()} ${
                              severity === sev ? 'active' : ''
                            }`}
                          >
                            {sev}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Photo Evidence */}
              <div className="form-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
                  <h3 className="form-section-title" style={{ margin: 0 }}>
                    <span className="form-step">2</span> Photo Evidence
                    <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--gray-500)', marginLeft: '8px' }}>
                      (Optional)
                    </span>
                  </h3>

                  {photoUrl && (
                    <button
                      type="button"
                      className="btn-danger-outline"
                      id="btn-header-remove-photo"
                      onClick={handleRemovePhoto}
                      title="Clear and remove attached photo evidence from this report"
                      style={{
                        padding: '5px 12px',
                        fontSize: '12px',
                        fontWeight: 600
                      }}
                    >
                      <i className="fas fa-trash-alt"></i>
                      <span>Remove Photo Evidence</span>
                    </button>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Capture or Upload Photo</span>
                    {!photoUrl && (
                      <span style={{ fontSize: '12px', color: 'var(--gray-500)', fontWeight: 400 }}>
                        Optional • Not required to submit
                      </span>
                    )}
                  </label>

                  {/* Direct Camera & Upload Option Cards */}
                  <div className="camera-options-grid">
                    {/* Card 1: Direct Camera */}
                    <div
                      className={`camera-action-card highlight ${isInlineCameraActive ? 'active-camera' : ''}`}
                      id="btn-direct-camera"
                      role="button"
                      tabIndex={0}
                      aria-label="Direct camera live viewfinder"
                      aria-expanded={isInlineCameraActive}
                      onClick={() => setIsInlineCameraActive((prev) => !prev)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setIsInlineCameraActive((prev) => !prev);
                        }
                      }}
                    >
                      <div className="camera-card-left">
                        <div className={`camera-card-icon ${isInlineCameraActive ? 'active' : 'primary'}`}>
                          <i className="fas fa-camera"></i>
                          <span className="camera-live-pulse-ring"></span>
                          <span
                            className={`camera-live-dot ${isInlineCameraActive ? 'active' : ''}`}
                            title={isInlineCameraActive ? 'Live Viewfinder Active' : 'Direct Camera Ready'}
                          ></span>
                        </div>
                        <div className="camera-card-info">
                          <h5>
                            Direct Camera
                            <span className={`instant-pill ${isInlineCameraActive ? 'live' : ''}`}>
                              {isInlineCameraActive ? 'LIVE' : 'Direct'}
                            </span>
                          </h5>
                          <p>{isInlineCameraActive ? 'Viewfinder open • Frame & snap' : 'Open live camera in form'}</p>
                        </div>
                      </div>
                      <div className="camera-card-right">
                        <span className={`camera-card-chip ${isInlineCameraActive ? 'active' : ''}`}>
                          {isInlineCameraActive ? (
                            <>
                              <span className="chip-dot"></span> Active
                            </>
                          ) : (
                            <>
                              <i className="fas fa-video" style={{ fontSize: '9px' }}></i> Open
                            </>
                          )}
                        </span>
                        <button
                          type="button"
                          className="camera-card-fullscreen-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsCameraModalOpen(true);
                          }}
                          title="Open Fullscreen Viewfinder"
                          aria-label="Open Fullscreen Viewfinder"
                        >
                          <i className="fas fa-expand"></i>
                        </button>
                      </div>
                    </div>

                    {/* Card 2: Device Camera */}
                    <div
                      className="camera-action-card"
                      id="btn-device-camera"
                      role="button"
                      tabIndex={0}
                      aria-label="Device camera snapshot"
                      onClick={() => cameraInputRef.current?.click()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          cameraInputRef.current?.click();
                        }
                      }}
                    >
                      <div className="camera-card-left">
                        <div className="camera-card-icon accent">
                          <i className="fas fa-mobile-alt"></i>
                        </div>
                        <div className="camera-card-info">
                          <h5>
                            Device Camera
                            <span className="device-pill">Native</span>
                          </h5>
                          <p>Snap with hardware camera</p>
                        </div>
                      </div>
                      <div className="camera-card-right">
                        <span className="camera-card-chip">
                          <i className="fas fa-camera" style={{ fontSize: '10px' }}></i> Snap
                        </span>
                      </div>
                    </div>

                    {/* Card 3: Upload File */}
                    <div
                      className="camera-action-card"
                      id="btn-upload-file"
                      role="button"
                      tabIndex={0}
                      aria-label="Upload photo from files"
                      onClick={() => fileInputRef.current?.click()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          fileInputRef.current?.click();
                        }
                      }}
                    >
                      <div className="camera-card-left">
                        <div className="camera-card-icon neutral">
                          <i className="fas fa-folder-open"></i>
                        </div>
                        <div className="camera-card-info">
                          <h5>
                            Upload Photo
                            <span className="file-pill">Files</span>
                          </h5>
                          <p>Choose gallery photo or file</p>
                        </div>
                      </div>
                      <div className="camera-card-right">
                        <span className="camera-card-chip">
                          <i className="fas fa-upload" style={{ fontSize: '10px' }}></i> Browse
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Embedded Live Direct Camera Viewfinder in Form */}
                  {isInlineCameraActive && (
                    <InlineDirectCamera
                      onCapture={(dataUrl, meta) => {
                        setIsInlineCameraActive(false);
                        handleDirectCameraCapture(dataUrl, meta);
                      }}
                      onClose={() => setIsInlineCameraActive(false)}
                      onOpenFullscreen={() => {
                        setIsInlineCameraActive(false);
                        setIsCameraModalOpen(true);
                      }}
                      showToast={showToast}
                    />
                  )}

                  {/* Hidden inputs for camera capture & gallery files */}
                  <input
                    type="file"
                    ref={cameraInputRef}
                    id="directCameraInput"
                    accept="image/*"
                    capture="environment"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />
                  <input
                    type="file"
                    ref={fileInputRef}
                    id="photoInput"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />

                  {photoUrl ? (
                    <div
                      className="upload-preview-container"
                      id="photo-evidence-preview-card"
                      style={{
                        position: 'relative',
                        borderRadius: 'var(--radius-md)',
                        overflow: 'hidden',
                        border: '1.5px solid var(--gray-200)',
                        backgroundColor: 'var(--white)',
                        padding: '14px',
                        marginBottom: '16px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                      }}
                    >
                      {/* Attached Status Banner with Clear Action */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '8px 12px',
                          backgroundColor: '#F0FDF4',
                          border: '1px solid #BBF7D0',
                          borderRadius: '6px',
                          marginBottom: '12px'
                        }}
                      >
                        <span style={{ fontSize: '12px', color: '#166534', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <i className="fas fa-check-circle" style={{ color: '#16A34A' }}></i> Photo Evidence Attached & Verified
                        </span>
                        <button
                          type="button"
                          id="btn-remove-photo-top-banner"
                          onClick={handleRemovePhoto}
                          title="Remove attached photo"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#DC2626',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '2px 6px'
                          }}
                        >
                          <i className="fas fa-trash-alt"></i> Remove
                        </button>
                      </div>

                      {/* Image Frame with High-Visibility Overlay Button */}
                      <div style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', maxHeight: '280px', display: 'flex', justifyContent: 'center', backgroundColor: '#0F172A' }}>
                        <img
                          id="previewImg"
                          src={photoUrl}
                          alt="Hazard preview"
                          style={{ maxHeight: '280px', width: 'auto', objectFit: 'contain' }}
                        />
                        {/* Prominent Overlay Button: Always visible and unclipped */}
                        <button
                          type="button"
                          className="photo-overlay-remove-btn"
                          id="removePhoto"
                          onClick={handleRemovePhoto}
                          title="Remove photo evidence"
                          aria-label="Remove photo evidence"
                        >
                          <i className="fas fa-trash-alt"></i>
                          <span>Remove Photo</span>
                        </button>
                      </div>

                      {/* Action Bar with Prominent Dedicated Red Remove Button */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', flexWrap: 'wrap', gap: '8px' }}>
                        {/* Clear / Remove Primary Action Button */}
                        <button
                          type="button"
                          id="btn-remove-photo-evidence-main"
                          className="btn-danger-outline"
                          onClick={handleRemovePhoto}
                          title="Clearly remove this photo evidence from report"
                        >
                          <i className="fas fa-trash-alt"></i>
                          <span>Remove Photo Evidence</span>
                        </button>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => setIsInlineCameraActive(true)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
                          >
                            <i className="fas fa-camera"></i> Retake with Direct Camera
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => cameraInputRef.current?.click()}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
                          >
                            <i className="fas fa-mobile-alt"></i> Device Camera
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : !isInlineCameraActive ? (
                    <div
                      className="upload-area compact"
                      id="uploadArea"
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleDrop}
                    >
                      <div className="upload-content" id="uploadContent">
                        <div className="upload-icon-small">
                          <i className="fas fa-cloud-upload-alt"></i>
                        </div>
                        <div className="upload-text-group">
                          <p className="upload-text">Or drag and drop photo file here</p>
                          <p className="upload-hint">Supports PNG, JPG, WEBP (up to 10MB)</p>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Section 3: Location */}
              <div className="form-section">
                <h3 className="form-section-title">
                  <span className="form-step">3</span> Location
                </h3>
                <div className="form-group">
                  <label className="form-label">
                    Select location on map <span className="req">*</span>
                  </label>
                  <div className="map-toolbar">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        id="useMyLocation"
                        onClick={handleLocateUser}
                      >
                        <i className="fas fa-crosshairs"></i>
                        Use My Current Location
                      </button>
                      {googleMapsApiKey ? (
                        <div style={{ display: 'flex', gap: '3px', background: 'var(--gray-100)', padding: '2px', borderRadius: '6px' }}>
                          <button
                            type="button"
                            className={`btn btn-sm ${mapProvider === 'google' ? 'btn-primary' : 'btn-ghost'}`}
                            style={{ padding: '2px 6px', fontSize: '11px', borderRadius: '4px' }}
                            onClick={() => setMapProvider('google')}
                          >
                            <i className="fab fa-google" style={{ marginRight: '3px' }}></i> Google Maps
                          </button>
                          <button
                            type="button"
                            className={`btn btn-sm ${mapProvider === 'leaflet' ? 'btn-primary' : 'btn-ghost'}`}
                            style={{ padding: '2px 6px', fontSize: '11px', borderRadius: '4px' }}
                            onClick={() => setMapProvider('leaflet')}
                          >
                            <i className="fas fa-map" style={{ marginRight: '3px' }}></i> OSM
                          </button>
                        </div>
                      ) : (
                        <span
                          className="map-provider-badge osm"
                          title="OpenStreetMap Active"
                        >
                          <i className="fas fa-map"></i> OpenStreetMap
                        </span>
                      )}
                    </div>
                    <div className="coords-display" id="coordsDisplay">
                      <i className="fas fa-map-marker-alt"></i>
                      <span>
                        Lat: {lat.toFixed(5)}, Lng: {lng.toFixed(5)}
                      </span>
                    </div>
                  </div>

                  <div className="map-container-wrapper" id="reportMapContainerWrapper">
                    {mapProvider === 'google' && googleMapsApiKey ? (
                      <div style={{ height: '380px', width: '100%', borderRadius: '12px', overflow: 'hidden' }}>
                        <GoogleReportMap
                          apiKey={googleMapsApiKey}
                          lat={lat}
                          lng={lng}
                          onLocationSelect={(newLat, newLng) => {
                            updateLocation(newLat, newLng);
                          }}
                          userLocation={userCoords}
                          onAuthError={() => {
                            setMapProvider('leaflet');
                            showToast('Map Notice', 'Switching to OpenStreetMap view.', 'info');
                          }}
                        />
                      </div>
                    ) : (
                      <InteractiveLeafletMap
                        initialLat={11.8500}
                        initialLng={78.7500}
                        initialZoom={7}
                        selectedLat={lat}
                        selectedLng={lng}
                        onLocationSelect={(newLat, newLng, placeName) => {
                          setLat(newLat);
                          setLng(newLng);
                          if (placeName) {
                            setArea(placeName);
                          } else {
                            reverseGeocode(newLat, newLng).then((n) => setArea(n));
                          }
                        }}
                        userCoords={userCoords}
                        height="380px"
                        showSearchBox={true}
                        showLayerSwitcher={true}
                        showFullscreenToggle={true}
                        showCoordinatesHUD={true}
                        enableCityMarkers={true}
                        markerTitle="Selected Hazard Location"
                      />
                    )}
                  </div>

                  <div className="coords-grid">
                    <div className="coord-item">
                      <label>Latitude</label>
                      <input
                        type="text"
                        id="latInput"
                        className="form-control"
                        readOnly
                        value={lat.toFixed(6)}
                      />
                    </div>
                    <div className="coord-item">
                      <label>Longitude</label>
                      <input
                        type="text"
                        id="lngInput"
                        className="form-control"
                        readOnly
                        value={lng.toFixed(6)}
                      />
                    </div>
                    <div className="coord-item">
                      <label>Area</label>
                      <input
                        type="text"
                        id="areaInput"
                        className="form-control"
                        readOnly
                        value={area}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setTitle('');
                    setDescription('');
                    setPhotoUrl(null);
                    setAiResult(null);
                  }}
                >
                  Clear
                </button>
                <button type="submit" id="btn-submit-report" className="btn btn-primary btn-lg">
                  <i className="fas fa-paper-plane"></i>
                  Submit Report
                </button>
              </div>
            </form>
          </div>

          {/* Sidebar tips */}
          <aside className="report-sidebar">
            <div className="tip-card">
              <div className="tip-icon">
                <i className="fas fa-lightbulb"></i>
              </div>
              <h4>Reporting Tips</h4>
              <ul className="tip-list">
                <li>
                  <i className="fas fa-check"></i> Be specific in your description
                </li>
                <li>
                  <i className="fas fa-check"></i> Upload clear, well-lit photos
                </li>
                <li>
                  <i className="fas fa-check"></i> Pin the exact location on map
                </li>
                <li>
                  <i className="fas fa-check"></i> Choose the right severity
                </li>
                <li>
                  <i className="fas fa-check"></i> Avoid duplicate reports
                </li>
              </ul>
            </div>
            <div className="tip-card tip-card-info">
              <div className="tip-icon">
                <i className="fas fa-info-circle"></i>
              </div>
              <h4>What happens next?</h4>
              <ol className="tip-list-ordered">
                <li>Your report gets a unique ID</li>
                <li>Authorities verify the issue</li>
                <li>Work is assigned and prioritized</li>
                <li>You receive real-time status updates</li>
              </ol>
            </div>
          </aside>
        </div>
      </div>

      {/* Direct Camera Capture Live Viewfinder Modal */}
      <CameraModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onCapture={handleDirectCameraCapture}
        showToast={showToast}
      />
    </section>
  );
};
