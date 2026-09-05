import { Report, AuthSession, NotificationItem, StatusType, User } from '../types';

export interface EmailPayload {
  to: string;
  recipientName?: string;
  subject: string;
  text?: string;
  html?: string;
  type: 'citizen_confirmation' | 'admin_alert' | 'status_update' | 'custom';
  reportId?: string;
}

/**
 * Dispatch an email to the backend service (/api/send-email)
 */
export async function sendEmailNotification(payload: EmailPayload): Promise<boolean> {
  try {
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      console.warn('Email API response status:', res.status);
      return false;
    }
    const data = await res.json();
    return data.success === true;
  } catch (err) {
    console.warn('Failed to call /api/send-email, fallback local log:', err);
    return true; // Still resolve gracefully in dev
  }
}

/**
 * Sync notification to backend API (/api/notifications)
 */
export async function postNotificationToBackend(notif: NotificationItem): Promise<void> {
  try {
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notif)
    });
  } catch (err) {
    console.warn('Backend notification sync error:', err);
  }
}

/**
 * Mark notification as read on backend
 */
export async function markNotificationReadOnBackend(id: string): Promise<void> {
  try {
    await fetch(`/api/notifications/${id}/read`, {
      method: 'PATCH'
    });
  } catch (err) {
    console.warn('Backend mark read error:', err);
  }
}

/**
 * Mark all notifications as read on backend
 */
export async function markAllNotificationsReadOnBackend(email?: string, role?: string): Promise<void> {
  try {
    await fetch('/api/notifications/mark-all-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role })
    });
  } catch (err) {
    console.warn('Backend mark all read error:', err);
  }
}

/**
 * Format date time string
 */
export function getFormattedNow(): string {
  return new Date().toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Handle citizen report submission:
 * 1. Normal in-app notification to Citizen: "Report submitted successfully."
 * 2. Send confirmation email to Citizen's registered email
 * 3. In-app notification to Admin
 * 4. Email notification to Admin
 */
export async function handleReportSubmissionNotifications(
  report: Report,
  session: AuthSession,
  users: User[] = []
): Promise<{
  citizenNotif: NotificationItem;
  adminNotif: NotificationItem;
}> {
  const citizenEmail = session.email || report.reporterEmail || 'citizen@email.com';
  const citizenName = session.fullName || report.reporter || 'Registered Citizen';
  const nowFormatted = getFormattedNow();

  // 1. Citizen In-App Notification
  const citizenNotif: NotificationItem = {
    id: `notif-${Date.now()}-cit`,
    icon: 'fa-paper-plane',
    color: 'success',
    title: 'Report Submitted Successfully',
    text: `Report submitted successfully. Reference ID: ${report.id} (${report.category}).`,
    time: 'Just now',
    timestamp: Date.now(),
    unread: true,
    recipientEmail: citizenEmail,
    recipientRole: 'citizen',
    reportId: report.id,
    actionType: 'report_submitted',
    emailSent: true,
    emailDetails: {
      to: citizenEmail,
      subject: `CivicFix: Confirmation for Report ${report.id}`,
      body: `Your grievance has been officially registered with ID ${report.id}. Priority: ${report.priority}.`,
      sentAt: nowFormatted
    }
  };

  // 2. Admin In-App Notification
  const adminNotif: NotificationItem = {
    id: `notif-${Date.now()}-adm`,
    icon: 'fa-bell',
    color: 'warning',
    title: 'New Report Submitted',
    text: `New report ${report.id} (${report.category}) submitted by ${citizenName} at ${report.area}.`,
    time: 'Just now',
    timestamp: Date.now() + 1,
    unread: true,
    recipientRole: 'admin',
    reportId: report.id,
    actionType: 'admin_alert',
    emailSent: true
  };

  // Dispatch background emails & server saves
  // Email to Citizen
  const citizenEmailHtml = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #E2E8F0; border-radius: 12px; background: #ffffff;">
      <div style="background: #0A6EBD; color: #ffffff; padding: 20px; border-radius: 8px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">CivicFix Grievance Confirmation</h1>
        <p style="margin: 6px 0 0 0; opacity: 0.9;">Ticket Reference: <strong>${report.id}</strong></p>
      </div>
      <div style="padding: 24px 8px; color: #334155; line-height: 1.6;">
        <p>Dear <strong>${citizenName}</strong>,</p>
        <p>Thank you for contributing to our community! Your incident report has been officially received and logged into the CivicFix Municipal Incident Management System.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: #F8FAFC; border-radius: 8px; overflow: hidden;">
          <tr style="border-bottom: 1px solid #E2E8F0;">
            <td style="padding: 12px; font-weight: bold; color: #64748B; width: 35%;">Report ID:</td>
            <td style="padding: 12px; font-weight: bold; color: #0A6EBD;">${report.id}</td>
          </tr>
          <tr style="border-bottom: 1px solid #E2E8F0;">
            <td style="padding: 12px; font-weight: bold; color: #64748B;">Category:</td>
            <td style="padding: 12px;">${report.category}</td>
          </tr>
          <tr style="border-bottom: 1px solid #E2E8F0;">
            <td style="padding: 12px; font-weight: bold; color: #64748B;">Location:</td>
            <td style="padding: 12px;">${report.area}</td>
          </tr>
          <tr style="border-bottom: 1px solid #E2E8F0;">
            <td style="padding: 12px; font-weight: bold; color: #64748B;">Initial Status:</td>
            <td style="padding: 12px;"><span style="background: #EBF8FF; color: #2B6CB0; padding: 4px 8px; border-radius: 4px; font-weight: bold;">Reported</span></td>
          </tr>
          <tr style="border-bottom: 1px solid #E2E8F0;">
            <td style="padding: 12px; font-weight: bold; color: #64748B;">Priority:</td>
            <td style="padding: 12px;"><span style="color: #C53030; font-weight: bold;">${report.priority}</span></td>
          </tr>
          <tr>
            <td style="padding: 12px; font-weight: bold; color: #64748B;">Date &amp; Time:</td>
            <td style="padding: 12px;">${nowFormatted}</td>
          </tr>
        </table>

        <p style="margin-top: 16px;">You will receive real-time email and in-app notifications whenever municipal officials update the status of your issue.</p>
      </div>
      <div style="border-top: 1px solid #E2E8F0; padding-top: 16px; text-align: center; color: #94A3B8; font-size: 12px;">
        CivicFix Smart Infrastructure Platform &bull; Tamil Nadu Municipal Operations
      </div>
    </div>
  `;

  sendEmailNotification({
    to: citizenEmail,
    recipientName: citizenName,
    subject: `CivicFix: Confirmation for Report ${report.id} - ${report.title}`,
    text: `Dear ${citizenName},\n\nReport submitted successfully.\nReport ID: ${report.id}\nCategory: ${report.category}\nPriority: ${report.priority}\nLocation: ${report.area}\nTime: ${nowFormatted}\n\nYou can track this report in the CivicFix portal.`,
    html: citizenEmailHtml,
    type: 'citizen_confirmation',
    reportId: report.id
  });

  // Find Admin recipient email dynamically
  const adminUsers = users.filter((u) => u.role === 'Authority' || u.role === 'admin');
  const adminEmail = adminUsers.length > 0 ? adminUsers[0].email : 'officer.k@civicfix.gov';

  const adminEmailHtml = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #E2E8F0; border-radius: 12px; background: #ffffff;">
      <div style="background: #1E293B; color: #ffffff; padding: 20px; border-radius: 8px; text-align: center;">
        <h1 style="margin: 0; font-size: 22px;">New Incident Alert &bull; Authority Portal</h1>
        <p style="margin: 6px 0 0 0; color: #F59E0B; font-weight: bold;">Priority: ${report.priority}</p>
      </div>
      <div style="padding: 24px 8px; color: #334155; line-height: 1.6;">
        <p>A new public infrastructure issue has been submitted by registered citizen <strong>${citizenName}</strong> (${citizenEmail}).</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: #F8FAFC; border-radius: 8px;">
          <tr style="border-bottom: 1px solid #E2E8F0;">
            <td style="padding: 10px; font-weight: bold; color: #64748B;">Ticket ID:</td>
            <td style="padding: 10px; font-weight: bold;">${report.id}</td>
          </tr>
          <tr style="border-bottom: 1px solid #E2E8F0;">
            <td style="padding: 10px; font-weight: bold; color: #64748B;">Category:</td>
            <td style="padding: 10px;">${report.category}</td>
          </tr>
          <tr style="border-bottom: 1px solid #E2E8F0;">
            <td style="padding: 10px; font-weight: bold; color: #64748B;">Location:</td>
            <td style="padding: 10px;">${report.area} (${report.lat.toFixed(4)}, ${report.lng.toFixed(4)})</td>
          </tr>
          <tr style="border-bottom: 1px solid #E2E8F0;">
            <td style="padding: 10px; font-weight: bold; color: #64748B;">Severity / Priority:</td>
            <td style="padding: 10px;">${report.severity} / <strong>${report.priority}</strong></td>
          </tr>
          <tr>
            <td style="padding: 10px; font-weight: bold; color: #64748B;">Description:</td>
            <td style="padding: 10px;">${report.description}</td>
          </tr>
        </table>
        
        <p>Please log in to the CivicFix Admin Console to review, verify, and assign this ticket to municipal field response units.</p>
      </div>
    </div>
  `;

  sendEmailNotification({
    to: adminEmail,
    recipientName: 'Municipal Authority Admin',
    subject: `[CIVIC-ALERT] New Report Submitted: ${report.id} (${report.priority} Priority)`,
    text: `New Report ${report.id} submitted by ${citizenName} (${citizenEmail}).\nCategory: ${report.category}\nLocation: ${report.area}\nPriority: ${report.priority}\nDescription: ${report.description}`,
    html: adminEmailHtml,
    type: 'admin_alert',
    reportId: report.id
  });

  // Sync to server backend
  postNotificationToBackend(citizenNotif);
  postNotificationToBackend(adminNotif);

  return { citizenNotif, adminNotif };
}

/**
 * Handle Admin status change on a report:
 * 1. Notify the Citizen immediately with an in-app notification.
 * 2. Send an email to the Citizen's registered email with report ID, updated status, and update time.
 * Supports: Reported → Verified → In Progress → Resolved (and Assigned)
 */
export async function handleStatusUpdateNotifications(
  report: Report,
  newStatus: StatusType,
  updatedByAdminName = 'Municipal Authority'
): Promise<NotificationItem> {
  const citizenEmail = report.reporterEmail || 'citizen@email.com';
  const citizenName = report.reporter || 'Citizen Reporter';
  const nowFormatted = getFormattedNow();

  let color: 'success' | 'warning' | 'info' | 'error' = 'info';
  let icon = 'fa-sync';

  if (newStatus === 'Verified') {
    color = 'info';
    icon = 'fa-check-circle';
  } else if (newStatus === 'In Progress' || newStatus === 'Assigned') {
    color = 'warning';
    icon = 'fa-hard-hat';
  } else if (newStatus === 'Resolved') {
    color = 'success';
    icon = 'fa-check-double';
  }

  // 1. Citizen In-App Notification
  const notif: NotificationItem = {
    id: `notif-${Date.now()}-status-${newStatus.toLowerCase().replace(' ', '-')}`,
    icon,
    color,
    title: `Status Updated: ${newStatus}`,
    text: `Status updated for ${report.id}: Status is now "${newStatus}" as of ${nowFormatted}.`,
    time: 'Just now',
    timestamp: Date.now(),
    unread: true,
    recipientEmail: citizenEmail,
    recipientRole: 'citizen',
    reportId: report.id,
    actionType: 'status_updated',
    emailSent: true,
    emailDetails: {
      to: citizenEmail,
      subject: `CivicFix: Status Update for ${report.id} [${newStatus}]`,
      body: `Your report ${report.id} (${report.title}) has been updated to "${newStatus}" at ${nowFormatted}.`,
      sentAt: nowFormatted
    }
  };

  // 2. Email Notification to Citizen's Registered Email
  const statusColorsMap: Record<string, string> = {
    Reported: '#3B82F6',
    Verified: '#8B5CF6',
    Assigned: '#00ADB5',
    'In Progress': '#F59E0B',
    Resolved: '#10B981'
  };
  const badgeColor = statusColorsMap[newStatus] || '#0A6EBD';

  const statusEmailHtml = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #E2E8F0; border-radius: 12px; background: #ffffff;">
      <div style="background: ${badgeColor}; color: #ffffff; padding: 20px; border-radius: 8px; text-align: center;">
        <h1 style="margin: 0; font-size: 22px;">Report Status Update</h1>
        <p style="margin: 6px 0 0 0; font-size: 16px; font-weight: bold;">Status: ${newStatus}</p>
      </div>
      <div style="padding: 24px 8px; color: #334155; line-height: 1.6;">
        <p>Dear <strong>${citizenName}</strong>,</p>
        <p>The status of your civic infrastructure report has been updated by <strong>${updatedByAdminName}</strong>.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: #F8FAFC; border-radius: 8px; overflow: hidden;">
          <tr style="border-bottom: 1px solid #E2E8F0;">
            <td style="padding: 12px; font-weight: bold; color: #64748B; width: 35%;">Report ID:</td>
            <td style="padding: 12px; font-weight: bold; color: #0A6EBD;">${report.id}</td>
          </tr>
          <tr style="border-bottom: 1px solid #E2E8F0;">
            <td style="padding: 12px; font-weight: bold; color: #64748B;">Issue Title:</td>
            <td style="padding: 12px;">${report.title}</td>
          </tr>
          <tr style="border-bottom: 1px solid #E2E8F0;">
            <td style="padding: 12px; font-weight: bold; color: #64748B;">Updated Status:</td>
            <td style="padding: 12px;">
              <span style="background: ${badgeColor}; color: #ffffff; padding: 4px 10px; border-radius: 100px; font-size: 13px; font-weight: bold;">
                ${newStatus}
              </span>
            </td>
          </tr>
          <tr style="border-bottom: 1px solid #E2E8F0;">
            <td style="padding: 12px; font-weight: bold; color: #64748B;">Update Time:</td>
            <td style="padding: 12px; font-weight: 500;">${nowFormatted}</td>
          </tr>
          <tr style="border-bottom: 1px solid #E2E8F0;">
            <td style="padding: 12px; font-weight: bold; color: #64748B;">Location:</td>
            <td style="padding: 12px;">${report.area}</td>
          </tr>
          <tr>
            <td style="padding: 12px; font-weight: bold; color: #64748B;">Category:</td>
            <td style="padding: 12px;">${report.category}</td>
          </tr>
        </table>

        ${
          newStatus === 'Resolved'
            ? '<p style="color: #10B981; font-weight: bold; background: #ECFDF5; padding: 12px; border-radius: 6px;">Thank you for making our city safer and better! This issue has been marked as fully resolved.</p>'
            : '<p>Our municipal field operations team is actively addressing this ticket. You can track progress live in your CivicFix portal.</p>'
        }
      </div>
      <div style="border-top: 1px solid #E2E8F0; padding-top: 16px; text-align: center; color: #94A3B8; font-size: 12px;">
        CivicFix Automated Notification System &bull; Live Updates
      </div>
    </div>
  `;

  sendEmailNotification({
    to: citizenEmail,
    recipientName: citizenName,
    subject: `CivicFix: Status Updated to ${newStatus} for Report ${report.id}`,
    text: `Dear ${citizenName},\n\nYour report ${report.id} (${report.title}) has been updated to "${newStatus}".\nUpdate Time: ${nowFormatted}\nLocation: ${report.area}\n\nTrack your ticket live on CivicFix.`,
    html: statusEmailHtml,
    type: 'status_update',
    reportId: report.id
  });

  // Sync to backend
  postNotificationToBackend(notif);

  return notif;
}
