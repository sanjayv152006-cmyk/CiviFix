import React, { useState, useEffect } from 'react';
import {
  PageType,
  Report,
  User,
  AuthSession,
  NotificationItem,
  ToastMessage,
  PriorityType,
  StatusType
} from './types';
import { demoReports, demoUsers, initialNotifications } from './data/demoData';
import {
  handleReportSubmissionNotifications,
  handleStatusUpdateNotifications,
  markNotificationReadOnBackend,
  markAllNotificationsReadOnBackend
} from './utils/notificationService';

import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ToastContainer } from './components/ToastContainer';

import { HomePage } from './components/pages/HomePage';
import { ReportPage } from './components/pages/ReportPage';
import { LiveMapPage } from './components/pages/LiveMapPage';
import { TrackPage } from './components/pages/TrackPage';
import { DashboardPage } from './components/pages/DashboardPage';
import { AdminPage } from './components/pages/AdminPage';
import { AboutPage } from './components/pages/AboutPage';
import { LoginPage } from './components/pages/LoginPage';

import { LoginModal } from './components/modals/LoginModal';
import { RegisterModal } from './components/modals/RegisterModal';
import { ReportDetailModal } from './components/modals/ReportDetailModal';
import { SuccessModal } from './components/modals/SuccessModal';
import { ActionModal } from './components/modals/ActionModal';
import { CameraModal } from './components/modals/CameraModal';

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('home');

  // Instant Camera Global State
  const [globalCameraOpen, setGlobalCameraOpen] = useState(false);
  const [pendingReportPhoto, setPendingReportPhoto] = useState<string | null>(null);
  const [pendingReportMeta, setPendingReportMeta] = useState<any>(null);

  // Reports state (with localStorage fallback)
  const [reports, setReports] = useState<Report[]>(() => {
    const saved = localStorage.getItem('civicfix_reports');
    return saved ? JSON.parse(saved) : demoReports;
  });

  // Users state
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('civicfix_users_list');
    return saved ? JSON.parse(saved) : demoUsers;
  });

  // Notifications state (with localStorage fallback)
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    const saved = localStorage.getItem('civicfix_notifications');
    return saved ? JSON.parse(saved) : initialNotifications;
  });

  // Default Citizen Profile
  const DEFAULT_CITIZEN_SESSION: AuthSession = {
    id: 'CFU10001',
    fullName: 'Sanjay',
    email: 'sanju19@gmail.com',
    phone: '+91 98401 23456',
    city: 'Tirupur',
    ward: 'MS Nagar',
    location: 'MS Nagar, Tirupur',
    role: 'citizen',
    joinedDate: 'Aug 2024'
  };

  // Auth session
  const [session, setSession] = useState<AuthSession | null>(() => {
    try {
      const isLoggedOut = localStorage.getItem('civicfix_logged_out');
      if (isLoggedOut === 'true') {
        return null;
      }
      const saved = localStorage.getItem('civicfix_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Cleanly replace any legacy Rajesh Kumar session with Sanjay
        if (
          parsed &&
          (parsed.fullName === 'Rajesh Kumar' ||
            parsed.email === 'rajesh.k@email.com' ||
            (parsed.fullName && parsed.fullName.includes('Rajesh')))
        ) {
          const updated = {
            ...parsed,
            fullName: 'Sanjay',
            email: 'sanju19@gmail.com',
            city: 'Tirupur',
            ward: 'MS Nagar',
            location: 'MS Nagar, Tirupur'
          };
          localStorage.setItem('civicfix_session', JSON.stringify(updated));
          return updated;
        }
        return parsed;
      }
      // If no session stored, initialize with the active Sanjay citizen session
      localStorage.setItem('civicfix_session', JSON.stringify(DEFAULT_CITIZEN_SESSION));
      return DEFAULT_CITIZEN_SESSION;
    } catch {
      return DEFAULT_CITIZEN_SESSION;
    }
  });

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Modals state
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [detailReport, setDetailReport] = useState<Report | null>(null);
  const [successReport, setSuccessReport] = useState<Report | null>(null);
  const [actionReport, setActionReport] = useState<Report | null>(null);
  const [actionMode, setActionMode] = useState<'priority' | 'status' | null>(null);

  // Track initial ID
  const [trackInitialId, setTrackInitialId] = useState<string | undefined>();

  // Persist reports safely
  useEffect(() => {
    try {
      localStorage.setItem('civicfix_reports', JSON.stringify(reports));
    } catch (e) {
      console.warn('[CivicFix] Unable to persist reports to localStorage:', e);
    }
  }, [reports]);

  // Persist notifications safely
  useEffect(() => {
    try {
      localStorage.setItem('civicfix_notifications', JSON.stringify(notifications));
    } catch (e) {
      console.warn('[CivicFix] Unable to persist notifications to localStorage:', e);
    }
  }, [notifications]);

  // Persist session safely
  useEffect(() => {
    try {
      if (session) {
        localStorage.setItem('civicfix_session', JSON.stringify(session));
      } else {
        localStorage.removeItem('civicfix_session');
      }
    } catch (e) {
      console.warn('[CivicFix] Unable to persist session to localStorage:', e);
    }
  }, [session]);

  // Initial welcome toast
  useEffect(() => {
    const timer = setTimeout(() => {
      showToast(
        'Welcome to CivicFix',
        'Report and monitor community infrastructure issues in real-time across Tamil Nadu.',
        'info',
        5000
      );
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const showToast = (
    title: string,
    message: string,
    type: 'info' | 'success' | 'warning' | 'error' = 'info',
    duration = 4000
  ) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: ToastMessage = { id, title, message, type, duration };
    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  };

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Redirect unauthorized users if currently on protected pages
  useEffect(() => {
    if (currentPage === 'admin' && session?.role !== 'admin') {
      setCurrentPage('home');
      showToast(
        'Access Restricted',
        'Authority Admin privileges required to access the Admin Console.',
        'error'
      );
    } else if (currentPage === 'dashboard' && !session) {
      setCurrentPage('home');
    }
  }, [session, currentPage]);

  const handleNavigate = (page: PageType) => {
    // Protected routes check
    if (page === 'dashboard' && !session) {
      showToast('Authentication Required', 'Please sign in or register to access your personal citizen dashboard.', 'info');
      setLoginModalOpen(true);
      return;
    }

    if (page === 'admin') {
      if (!session) {
        showToast('Admin Access Required', 'Please sign in with administrator credentials.', 'info');
        setLoginModalOpen(true);
        return;
      }
      if (session.role !== 'admin') {
        showToast(
          'Access Restricted',
          'Authority Admin privileges required to access the Admin Console.',
          'error'
        );
        setCurrentPage('home');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }

    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLoginSuccess = (newSession: AuthSession) => {
    try {
      localStorage.removeItem('civicfix_logged_out');
    } catch {
      // ignore
    }
    setSession(newSession);
    showToast('Logged In', `Signed in as ${newSession.fullName} (${newSession.role})`, 'success');
  };

  const handleLogout = () => {
    try {
      localStorage.setItem('civicfix_logged_out', 'true');
      localStorage.removeItem('civicfix_session');
    } catch {
      // ignore
    }
    setSession(null);
    if (currentPage === 'dashboard' || currentPage === 'admin') {
      setCurrentPage('home');
    }
    showToast('Logged Out', 'You have been logged out successfully.', 'info');
  };

  // Filter notifications based on active session role & email
  const visibleNotifications = notifications.filter((n) => {
    if (!session) return true;
    if (session.role === 'admin') {
      return !n.recipientRole || n.recipientRole === 'admin' || n.recipientRole === 'all';
    } else {
      return (
        !n.recipientRole ||
        n.recipientRole === 'citizen' ||
        n.recipientRole === 'all' ||
        (n.recipientEmail && n.recipientEmail.toLowerCase() === session.email.toLowerCase())
      );
    }
  });

  const handleMarkNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, unread: false } : n))
    );
    markNotificationReadOnBackend(id);
  };

  const handleMarkAllNotificationsRead = () => {
    setNotifications((prev) =>
      prev.map((n) => {
        if (session?.role === 'admin') {
          if (n.recipientRole === 'admin' || n.recipientRole === 'all') return { ...n, unread: false };
        } else {
          if (
            n.recipientRole === 'citizen' ||
            n.recipientRole === 'all' ||
            (n.recipientEmail && session?.email && n.recipientEmail.toLowerCase() === session.email.toLowerCase())
          ) {
            return { ...n, unread: false };
          }
        }
        return n;
      })
    );
    markAllNotificationsReadOnBackend(session?.email, session?.role);
    showToast('Notifications', 'All notifications marked as read', 'success');
  };

  // Submit new report
  const handleSubmitReport = async (newReport: Report) => {
    setReports((prev) => [newReport, ...prev]);

    // Dispatch notifications & emails
    if (session) {
      const { citizenNotif, adminNotif } = await handleReportSubmissionNotifications(newReport, session, users);
      setNotifications((prev) => [citizenNotif, adminNotif, ...prev]);
    }

    // Open success modal
    setSuccessReport(newReport);
    showToast('Report Submitted', 'Report submitted successfully.', 'success', 4000);
    showToast('Confirmation Email Sent', `Confirmation email sent to ${session?.email || 'registered email'}. Admin notified.`, 'info', 5000);
  };

  // Instant Camera Global Capture Handler
  const handleGlobalCameraCapture = (dataUrl: string, meta?: any) => {
    setPendingReportPhoto(dataUrl);
    setPendingReportMeta(meta || null);
    setGlobalCameraOpen(false);
    setCurrentPage('report');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast('Evidence Captured', 'Photo evidence and hazard classification loaded into report form!', 'info');
  };

  // Track newly submitted report
  const handleTrackReport = (reportId: string) => {
    setTrackInitialId(reportId);
    setCurrentPage('track');
  };

  // Admin Actions
  const handleAdminAction = (
    reportId: string,
    action: 'verify' | 'assign' | 'resolve' | 'priority' | 'status'
  ) => {
    const report = reports.find((r) => r.id === reportId);
    if (!report) return;

    if (action === 'priority') {
      setActionReport(report);
      setActionMode('priority');
      return;
    }

    if (action === 'status') {
      setActionReport(report);
      setActionMode('status');
      return;
    }

    let nextStatus: StatusType = report.status;
    if (action === 'verify') nextStatus = 'Verified';
    if (action === 'assign') nextStatus = 'Assigned';
    if (action === 'resolve') nextStatus = 'Resolved';

    updateReportStatus(reportId, nextStatus);
  };

  const updateReportStatus = async (reportId: string, newStatus: StatusType) => {
    const statusOrder: StatusType[] = [
      'Reported',
      'Verified',
      'Assigned',
      'In Progress',
      'Resolved'
    ];
    const currentIndex = statusOrder.indexOf(newStatus);
    const nowTime = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const targetReport = reports.find((r) => r.id === reportId);

    setReports((prev) =>
      prev.map((r) => {
        if (r.id !== reportId) return r;

        const updatedTimeline = r.timeline.map((item, idx) => {
          if (idx < currentIndex) {
            return { ...item, completed: true, current: false };
          } else if (idx === currentIndex) {
            return { ...item, completed: true, current: true, date: nowTime };
          } else {
            return { ...item, completed: false, current: false, date: 'Pending' };
          }
        });

        return {
          ...r,
          status: newStatus,
          lastUpdated: new Date().toISOString().split('T')[0],
          timeline: updatedTimeline
        };
      })
    );

    // If currently viewing detail, update detail
    if (detailReport && detailReport.id === reportId) {
      setDetailReport((prev) => (prev ? { ...prev, status: newStatus } : null));
    }

    // Trigger immediate Citizen In-App & Email notification
    if (targetReport) {
      const notif = await handleStatusUpdateNotifications(
        { ...targetReport, status: newStatus },
        newStatus,
        session?.fullName || 'Municipal Authority Admin'
      );
      setNotifications((prev) => [notif, ...prev]);

      const citizenContact = targetReport.reporterEmail || targetReport.reporter || 'Citizen';
      showToast(
        'Status Updated',
        `Report ${reportId} updated to ${newStatus}. In-app alert and email notification sent to ${citizenContact}.`,
        'success',
        5000
      );
    }
  };

  const handleChangePriority = (reportId: string, newPriority: PriorityType) => {
    setReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, priority: newPriority } : r))
    );
    showToast('Priority Updated', `Report ${reportId} set to ${newPriority} priority.`, 'success');
  };

  // If user is not authenticated, strictly show the Login page gateway
  if (!session) {
    return (
      <div className="civicfix-app">
        {/* Toast notifications container */}
        <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />

        {/* Dedicated Login / Register Gateway */}
        <LoginPage onLoginSuccess={handleLoginSuccess} showToast={showToast} />
      </div>
    );
  }

  return (
    <div className="civicfix-app">
      {/* Toast notifications container */}
      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />

      {/* Main Header / Navbar */}
      <Navbar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        session={session}
        onOpenModal={(modalName) => {
          if (modalName === 'login') setLoginModalOpen(true);
          if (modalName === 'register') setRegisterModalOpen(true);
        }}
        onLogout={handleLogout}
        notifications={visibleNotifications}
        onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
        onMarkNotificationRead={handleMarkNotificationRead}
        onTrackReport={handleTrackReport}
        onOpenInstantCamera={() => setGlobalCameraOpen(true)}
      />

      {/* Page Routing */}
      <main className="main-content">
        {currentPage === 'home' && (
          <HomePage
            reports={reports}
            onNavigate={handleNavigate}
            onOpenRegister={() => setRegisterModalOpen(true)}
            onOpenInstantCamera={() => setGlobalCameraOpen(true)}
          />
        )}

        {currentPage === 'report' && (
          <ReportPage
            existingReports={reports}
            onSubmitReport={handleSubmitReport}
            session={session}
            showToast={showToast}
            initialPhoto={pendingReportPhoto}
            initialMeta={pendingReportMeta}
            onClearInitialPhoto={() => {
              setPendingReportPhoto(null);
              setPendingReportMeta(null);
            }}
          />
        )}

        {currentPage === 'livemap' && (
          <LiveMapPage
            reports={reports}
            onViewDetail={(r) => setDetailReport(r)}
            showToast={showToast}
          />
        )}

        {currentPage === 'track' && (
          <TrackPage reports={reports} initialSearchId={trackInitialId} />
        )}

        {currentPage === 'dashboard' && session && (
          <DashboardPage
            reports={reports}
            session={session}
            onNavigate={handleNavigate}
            onViewDetail={(r) => setDetailReport(r)}
          />
        )}

        {currentPage === 'admin' && session.role === 'admin' && (
          <AdminPage
            reports={reports}
            users={users}
            onNavigate={handleNavigate}
            onViewDetail={(r) => setDetailReport(r)}
            onAdminAction={handleAdminAction}
            showToast={showToast}
          />
        )}

        {currentPage === 'about' && <AboutPage />}
      </main>

      {/* Footer */}
      <Footer
        onNavigate={handleNavigate}
        session={session}
        onOpenRegister={() => setRegisterModalOpen(true)}
      />

      {/* Modals */}
      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        onSwitchToRegister={() => {
          setLoginModalOpen(false);
          setRegisterModalOpen(true);
        }}
        showToast={showToast}
      />

      <RegisterModal
        isOpen={registerModalOpen}
        onClose={() => setRegisterModalOpen(false)}
        onRegisterSuccess={handleLoginSuccess}
        onSwitchToLogin={() => {
          setRegisterModalOpen(false);
          setLoginModalOpen(true);
        }}
        showToast={showToast}
      />

      <ReportDetailModal
        report={detailReport}
        onClose={() => setDetailReport(null)}
      />

      <SuccessModal
        report={successReport}
        onClose={() => setSuccessReport(null)}
        onTrack={handleTrackReport}
      />

      <ActionModal
        report={actionReport}
        mode={actionMode}
        onClose={() => {
          setActionReport(null);
          setActionMode(null);
        }}
        onChangePriority={handleChangePriority}
        onChangeStatus={updateReportStatus}
      />

      {/* Global Instant Camera Viewfinder Modal */}
      <CameraModal
        isOpen={globalCameraOpen}
        onClose={() => setGlobalCameraOpen(false)}
        onCapture={handleGlobalCameraCapture}
        showToast={showToast}
      />
    </div>
  );
}

