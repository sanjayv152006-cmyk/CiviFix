export type PageType = 'home' | 'report' | 'livemap' | 'track' | 'dashboard' | 'admin' | 'about';

export type CategoryType = 
  | 'Pothole'
  | 'Road Damage'
  | 'Broken Streetlight'
  | 'Garbage Overflow'
  | 'Water Leakage'
  | 'Drainage Issue'
  | 'Damaged Public Facility'
  | 'Other';

export type SeverityType = 'Low' | 'Medium' | 'High' | 'Critical';
export type PriorityType = 'Low' | 'Medium' | 'High' | 'Critical';
export type StatusType = 'Reported' | 'Verified' | 'Assigned' | 'In Progress' | 'Resolved';

export interface TimelineItem {
  status: string;
  date: string;
  completed: boolean;
  current?: boolean;
}

export interface Report {
  id: string;
  title: string;
  category: CategoryType;
  description: string;
  severity: SeverityType;
  priority: PriorityType;
  status: StatusType;
  lat: number;
  lng: number;
  area: string;
  date: string;
  lastUpdated: string;
  reporter: string;
  reporterEmail?: string;
  reporterId?: string;
  reporterPhone?: string;
  timeline: TimelineItem[];
  photoUrl?: string;
}

export interface User {
  id?: string;
  name: string;
  email: string;
  role: 'Citizen' | 'Authority' | 'admin' | 'citizen';
  reports: number;
  status: string;
  joined: string;
}

export interface AuthSession {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  city?: string;
  ward?: string;
  location?: string;
  role: 'citizen' | 'admin';
  joinedDate?: string;
}

export interface NotificationItem {
  id?: string;
  icon: string;
  color: 'success' | 'warning' | 'info' | 'error';
  title?: string;
  text: string;
  time: string;
  timestamp?: number;
  unread: boolean;
  recipientEmail?: string;
  recipientRole?: 'citizen' | 'admin' | 'all';
  reportId?: string;
  actionType?: 'report_submitted' | 'status_updated' | 'priority_changed' | 'admin_alert';
  emailSent?: boolean;
  emailDetails?: {
    to: string;
    subject: string;
    body: string;
    sentAt: string;
  };
}

export interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}
