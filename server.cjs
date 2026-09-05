var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// server.ts
var server_exports = {};
module.exports = __toCommonJS(server_exports);
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json({ limit: "10mb" }));
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});
var notificationStore = [
  {
    id: "notif-init-1",
    icon: "fa-check-circle",
    color: "success",
    title: "Report Verified",
    text: "Your report CF-2026-0001 has been verified and assigned to the field team.",
    time: "2 hours ago",
    timestamp: Date.now() - 2 * 60 * 60 * 1e3,
    unread: true,
    recipientRole: "all",
    reportId: "CF-2026-0001"
  },
  {
    id: "notif-init-2",
    icon: "fa-user-cog",
    color: "info",
    title: "Assignment Notice",
    text: "Your complaint has been assigned to Municipal Team A.",
    time: "5 hours ago",
    timestamp: Date.now() - 5 * 60 * 60 * 1e3,
    unread: true,
    recipientRole: "all"
  },
  {
    id: "notif-init-3",
    icon: "fa-hard-hat",
    color: "warning",
    title: "Work In Progress",
    text: "Work has started on your reported issue CF-2026-0006.",
    time: "1 day ago",
    timestamp: Date.now() - 24 * 60 * 60 * 1e3,
    unread: true,
    recipientRole: "all",
    reportId: "CF-2026-0006"
  },
  {
    id: "notif-init-4",
    icon: "fa-flag-checkered",
    color: "success",
    title: "Issue Resolved",
    text: "Your issue CF-2026-0003 has been resolved. Please confirm.",
    time: "2 days ago",
    timestamp: Date.now() - 48 * 60 * 60 * 1e3,
    unread: false,
    recipientRole: "all",
    reportId: "CF-2026-0003"
  }
];
var emailStore = [];
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: (/* @__PURE__ */ new Date()).toISOString() });
});
app.get("/api/notifications", (req, res) => {
  const { email, role } = req.query;
  let filtered = [...notificationStore];
  if (email || role) {
    filtered = filtered.filter((n) => {
      const roleMatch = !n.recipientRole || n.recipientRole === "all" || role && n.recipientRole === role;
      const emailMatch = !n.recipientEmail || email && n.recipientEmail.toLowerCase() === String(email).toLowerCase();
      return roleMatch || emailMatch;
    });
  }
  filtered.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  res.json({
    success: true,
    notifications: filtered,
    unreadCount: filtered.filter((n) => n.unread).length
  });
});
app.post("/api/notifications", (req, res) => {
  const body = req.body;
  if (!body.text) {
    return res.status(400).json({ error: "Notification text is required" });
  }
  const newNotif = {
    id: body.id || `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    icon: body.icon || "fa-bell",
    color: body.color || "info",
    title: body.title || "Notification",
    text: body.text,
    time: body.time || "Just now",
    timestamp: body.timestamp || Date.now(),
    unread: body.unread !== void 0 ? body.unread : true,
    recipientEmail: body.recipientEmail,
    recipientRole: body.recipientRole || "all",
    reportId: body.reportId,
    actionType: body.actionType,
    emailSent: body.emailSent,
    emailDetails: body.emailDetails
  };
  notificationStore.unshift(newNotif);
  res.status(201).json({
    success: true,
    notification: newNotif
  });
});
app.patch("/api/notifications/:id/read", (req, res) => {
  const { id } = req.params;
  const notif = notificationStore.find((n) => n.id === id);
  if (notif) {
    notif.unread = false;
    return res.json({ success: true, notification: notif });
  }
  res.status(404).json({ error: "Notification not found" });
});
app.post("/api/notifications/mark-all-read", (req, res) => {
  const { email, role } = req.body || {};
  notificationStore.forEach((n) => {
    if (!email && !role) {
      n.unread = false;
    } else {
      const matchRole = !role || !n.recipientRole || n.recipientRole === "all" || n.recipientRole === role;
      const matchEmail = !email || !n.recipientEmail || n.recipientEmail.toLowerCase() === String(email).toLowerCase();
      if (matchRole || matchEmail) {
        n.unread = false;
      }
    }
  });
  res.json({ success: true, message: "All notifications marked as read" });
});
app.post("/api/send-email", (req, res) => {
  const { to, recipientName, subject, text, html, type, reportId } = req.body;
  if (!to || !subject || typeof to !== "string" || typeof subject !== "string") {
    return res.status(400).json({ error: "Missing required email fields (to, subject)" });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(to.trim())) {
    return res.status(400).json({ error: "Invalid recipient email address format" });
  }
  const cleanSubject = subject.trim().slice(0, 200);
  const cleanRecipientName = (recipientName ? String(recipientName) : "CivicFix User").slice(0, 100);
  const cleanText = (text ? String(text) : "").slice(0, 1e4);
  const cleanHtml = (html ? String(html) : `<p>${cleanText}</p>`).slice(0, 3e4);
  const sentAt = (/* @__PURE__ */ new Date()).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
  const emailRecord = {
    id: `eml-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    to: to.trim().toLowerCase(),
    recipientName: cleanRecipientName,
    subject: cleanSubject,
    text: cleanText,
    html: cleanHtml,
    type: type || "custom",
    reportId: reportId ? String(reportId).slice(0, 50) : void 0,
    sentAt,
    timestamp: Date.now(),
    status: "delivered"
  };
  emailStore.unshift(emailRecord);
  if (emailStore.length > 100) {
    emailStore = emailStore.slice(0, 100);
  }
  console.log(`[CivicFix Email Service] Dispatched email to: ${to} | Subject: "${subject}" | Type: ${type}`);
  res.status(200).json({
    success: true,
    message: `Email successfully dispatched to ${to}`,
    emailRecord
  });
});
app.get("/api/emails", (req, res) => {
  const { to, reportId } = req.query;
  let filtered = [...emailStore];
  if (to) {
    filtered = filtered.filter((e) => e.to.toLowerCase() === String(to).toLowerCase());
  }
  if (reportId) {
    filtered = filtered.filter((e) => e.reportId === String(reportId));
  }
  res.json({
    success: true,
    emails: filtered
  });
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: {
        middlewareMode: true,
        hmr: false
      },
      appType: "spa"
    });
    app.get("/@vite/client", async (req, res, next) => {
      try {
        const transformed = await vite.transformRequest("/@vite/client");
        if (transformed && transformed.code) {
          const patched = transformed.code.replace(
            /async connect\(handlers\) \{[\s\S]*?\},\s*async disconnect/,
            "async connect(handlers) { /* HMR websocket disabled in container */ }, async disconnect"
          );
          res.setHeader("Content-Type", "application/javascript");
          res.setHeader("Cache-Control", "no-cache");
          res.send(patched);
          return;
        }
      } catch (err) {
      }
      next();
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`CivicFix Server running on http://0.0.0.0:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
