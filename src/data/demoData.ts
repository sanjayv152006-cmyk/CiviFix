import { Report, User, NotificationItem, CategoryType, StatusType } from '../types';

export const categoryConfig: Record<CategoryType, { color: string; class: string; icon: string }> = {
  'Pothole': { color: '#F59E0B', class: 'marker-pothole', icon: 'fa-circle' },
  'Road Damage': { color: '#F97316', class: 'marker-road', icon: 'fa-road' },
  'Broken Streetlight': { color: '#8B5CF6', class: 'marker-light', icon: 'fa-lightbulb' },
  'Garbage Overflow': { color: '#10B981', class: 'marker-garbage', icon: 'fa-trash' },
  'Water Leakage': { color: '#3B82F6', class: 'marker-water', icon: 'fa-tint' },
  'Drainage Issue': { color: '#0A6EBD', class: 'marker-drainage', icon: 'fa-water' },
  'Damaged Public Facility': { color: '#EF4444', class: 'marker-facility', icon: 'fa-building' },
  'Other': { color: '#64748B', class: 'marker-other', icon: 'fa-ellipsis-h' }
};

export const statusColors: Record<StatusType, string> = {
  'Reported': '#3B82F6',
  'Verified': '#8B5CF6',
  'Assigned': '#00ADB5',
  'In Progress': '#F59E0B',
  'Resolved': '#10B981'
};

export const demoReports: Report[] = [
  {
    id: 'CF-2026-0001',
    title: 'Large pothole near Anna Salai junction',
    category: 'Pothole',
    description: 'Deep pothole causing traffic congestion and vehicle damage. Located on the main road near the signal.',
    severity: 'Critical',
    priority: 'Critical',
    status: 'In Progress',
    lat: 13.0527,
    lng: 80.2427,
    area: 'Anna Salai, Chennai',
    date: '2026-01-15',
    lastUpdated: '2026-01-18',
    reporter: 'Sanjay',
    reporterEmail: 'sanju19@gmail.com',
    timeline: [
      { status: 'Reported', date: 'Jan 15, 2026 - 10:30 AM', completed: true },
      { status: 'Verified', date: 'Jan 16, 2026 - 02:15 PM', completed: true },
      { status: 'Assigned', date: 'Jan 17, 2026 - 09:00 AM', completed: true },
      { status: 'In Progress', date: 'Jan 18, 2026 - 11:00 AM', completed: true, current: true },
      { status: 'Resolved', date: 'Pending', completed: false }
    ]
  },
  {
    id: 'CF-2026-0002',
    title: 'Broken streetlight near school zone',
    category: 'Broken Streetlight',
    description: 'Streetlight not working for past 5 days near PSBB School. Safety concern for children.',
    severity: 'High',
    priority: 'High',
    status: 'Verified',
    lat: 13.0677,
    lng: 80.2347,
    area: 'KK Nagar, Chennai',
    date: '2026-01-14',
    lastUpdated: '2026-01-16',
    reporter: 'Priya Sharma',
    reporterEmail: 'priya.s@email.com',
    timeline: [
      { status: 'Reported', date: 'Jan 14, 2026 - 06:45 PM', completed: true },
      { status: 'Verified', date: 'Jan 16, 2026 - 10:00 AM', completed: true, current: true },
      { status: 'Assigned', date: 'Pending', completed: false },
      { status: 'In Progress', date: 'Pending', completed: false },
      { status: 'Resolved', date: 'Pending', completed: false }
    ]
  },
  {
    id: 'CF-2026-0003',
    title: 'Garbage overflow near bus stop',
    category: 'Garbage Overflow',
    description: 'Garbage bins overflowing near T Nagar bus terminus. Foul smell and unhygienic conditions.',
    severity: 'Medium',
    priority: 'Medium',
    status: 'Resolved',
    lat: 13.0418,
    lng: 80.2341,
    area: 'T Nagar, Chennai',
    date: '2026-01-10',
    lastUpdated: '2026-01-14',
    reporter: 'Mohammed Ali',
    reporterEmail: 'mohammed.a@email.com',
    timeline: [
      { status: 'Reported', date: 'Jan 10, 2026 - 08:00 AM', completed: true },
      { status: 'Verified', date: 'Jan 10, 2026 - 04:00 PM', completed: true },
      { status: 'Assigned', date: 'Jan 11, 2026 - 09:30 AM', completed: true },
      { status: 'In Progress', date: 'Jan 12, 2026 - 02:00 PM', completed: true },
      { status: 'Resolved', date: 'Jan 14, 2026 - 05:00 PM', completed: true, current: true }
    ]
  },
  {
    id: 'CF-2026-0004',
    title: 'Water leakage on main pipeline',
    category: 'Water Leakage',
    description: 'Continuous water leakage from underground pipe. Wasting water and creating slippery road.',
    severity: 'High',
    priority: 'High',
    status: 'Reported',
    lat: 13.0827,
    lng: 80.2707,
    area: 'Teynampet, Chennai',
    date: '2026-01-19',
    lastUpdated: '2026-01-19',
    reporter: 'Lakshmi Devi',
    reporterEmail: 'lakshmi.d@email.com',
    timeline: [
      { status: 'Reported', date: 'Jan 19, 2026 - 07:15 AM', completed: true, current: true },
      { status: 'Verified', date: 'Pending', completed: false },
      { status: 'Assigned', date: 'Pending', completed: false },
      { status: 'In Progress', date: 'Pending', completed: false },
      { status: 'Resolved', date: 'Pending', completed: false }
    ]
  },
  {
    id: 'CF-2026-0005',
    title: 'Damaged road after heavy rain',
    category: 'Road Damage',
    description: 'Road surface severely damaged after recent rains. Multiple cracks and depressions.',
    severity: 'Medium',
    priority: 'Medium',
    status: 'Assigned',
    lat: 11.0168,
    lng: 76.9558,
    area: 'RS Puram, Coimbatore',
    date: '2026-01-12',
    lastUpdated: '2026-01-17',
    reporter: 'Suresh Babu',
    reporterEmail: 'suresh.b@email.com',
    timeline: [
      { status: 'Reported', date: 'Jan 12, 2026 - 11:00 AM', completed: true },
      { status: 'Verified', date: 'Jan 13, 2026 - 03:00 PM', completed: true },
      { status: 'Assigned', date: 'Jan 17, 2026 - 10:00 AM', completed: true, current: true },
      { status: 'In Progress', date: 'Pending', completed: false },
      { status: 'Resolved', date: 'Pending', completed: false }
    ]
  },
  {
    id: 'CF-2026-0006',
    title: 'Blocked drainage causing waterlogging',
    category: 'Drainage Issue',
    description: 'Drainage blocked near market area causing waterlogging during rain. Health hazard.',
    severity: 'High',
    priority: 'Critical',
    status: 'In Progress',
    lat: 9.9252,
    lng: 78.1198,
    area: 'Madurai Main, Madurai',
    date: '2026-01-11',
    lastUpdated: '2026-01-18',
    reporter: 'Anitha R',
    reporterEmail: 'anitha.r@email.com',
    timeline: [
      { status: 'Reported', date: 'Jan 11, 2026 - 09:00 AM', completed: true },
      { status: 'Verified', date: 'Jan 11, 2026 - 06:00 PM', completed: true },
      { status: 'Assigned', date: 'Jan 12, 2026 - 08:00 AM', completed: true },
      { status: 'In Progress', date: 'Jan 18, 2026 - 10:00 AM', completed: true, current: true },
      { status: 'Resolved', date: 'Pending', completed: false }
    ]
  },
  {
    id: 'CF-2026-0007',
    title: 'Streetlight not working near Trichy Central',
    category: 'Broken Streetlight',
    description: 'Streetlight completely dark for a week near the bus stand. Risk of accidents at night.',
    severity: 'Medium',
    priority: 'Medium',
    status: 'Reported',
    lat: 10.7905,
    lng: 78.7047,
    area: 'Trichy Central, Trichy',
    date: '2026-01-20',
    lastUpdated: '2026-01-20',
    reporter: 'Karthik R',
    reporterEmail: 'karthik.r@email.com',
    timeline: [
      { status: 'Reported', date: 'Jan 20, 2026 - 08:00 PM', completed: true, current: true },
      { status: 'Verified', date: 'Pending', completed: false },
      { status: 'Assigned', date: 'Pending', completed: false },
      { status: 'In Progress', date: 'Pending', completed: false },
      { status: 'Resolved', date: 'Pending', completed: false }
    ]
  },
  {
    id: 'CF-2026-0008',
    title: 'Huge pothole on Salem highway',
    category: 'Pothole',
    description: 'Deep pothole causing two-wheeler accidents on the highway stretch.',
    severity: 'Critical',
    priority: 'Critical',
    status: 'Verified',
    lat: 11.6643,
    lng: 78.1460,
    area: 'Salem City, Salem',
    date: '2026-01-18',
    lastUpdated: '2026-01-19',
    reporter: 'Vignesh S',
    reporterEmail: 'vignesh.s@email.com',
    timeline: [
      { status: 'Reported', date: 'Jan 18, 2026 - 06:00 AM', completed: true },
      { status: 'Verified', date: 'Jan 19, 2026 - 10:00 AM', completed: true, current: true },
      { status: 'Assigned', date: 'Pending', completed: false },
      { status: 'In Progress', date: 'Pending', completed: false },
      { status: 'Resolved', date: 'Pending', completed: false }
    ]
  }
];

export const demoUsers: User[] = [
  { name: 'Sanjay', email: 'sanju19@gmail.com', role: 'Citizen', reports: 12, status: 'Active', joined: 'Jan 2026' },
  { name: 'Priya Sharma', email: 'priya.s@email.com', role: 'Citizen', reports: 8, status: 'Active', joined: 'Jan 2026' },
  { name: 'Mohammed Ali', email: 'mohammed.a@email.com', role: 'Citizen', reports: 15, status: 'Active', joined: 'Dec 2025' },
  { name: 'Lakshmi Devi', email: 'lakshmi.d@email.com', role: 'Citizen', reports: 6, status: 'Active', joined: 'Jan 2026' },
  { name: 'Suresh Babu', email: 'suresh.b@email.com', role: 'Citizen', reports: 9, status: 'Active', joined: 'Dec 2025' },
  { name: 'Officer Kumar', email: 'officer.k@civicfix.gov', role: 'Authority', reports: 0, status: 'Active', joined: 'Nov 2025' },
  { name: 'Inspector Rao', email: 'inspector.r@civicfix.gov', role: 'Authority', reports: 0, status: 'Active', joined: 'Nov 2025' }
];

export const initialNotifications: NotificationItem[] = [
  {
    id: 'notif-1',
    icon: 'fa-check-circle',
    color: 'success',
    title: 'Report Verified',
    text: 'Your report CF-2026-0001 has been verified and assigned to the field team.',
    time: '2 hours ago',
    timestamp: Date.now() - 2 * 60 * 60 * 1000,
    unread: true,
    recipientRole: 'all',
    reportId: 'CF-2026-0001'
  },
  {
    id: 'notif-2',
    icon: 'fa-user-cog',
    color: 'info',
    title: 'Team Assigned',
    text: 'Your complaint has been assigned to Municipal Team A.',
    time: '5 hours ago',
    timestamp: Date.now() - 5 * 60 * 60 * 1000,
    unread: true,
    recipientRole: 'all'
  },
  {
    id: 'notif-3',
    icon: 'fa-hard-hat',
    color: 'warning',
    title: 'Work in Progress',
    text: 'Work has started on your reported issue CF-2026-0006.',
    time: '1 day ago',
    timestamp: Date.now() - 24 * 60 * 60 * 1000,
    unread: true,
    recipientRole: 'all',
    reportId: 'CF-2026-0006'
  },
  {
    id: 'notif-4',
    icon: 'fa-flag-checkered',
    color: 'success',
    title: 'Issue Resolved',
    text: 'Your issue CF-2026-0003 has been resolved. Please confirm.',
    time: '2 days ago',
    timestamp: Date.now() - 48 * 60 * 60 * 1000,
    unread: false,
    recipientRole: 'all',
    reportId: 'CF-2026-0003'
  }
];
