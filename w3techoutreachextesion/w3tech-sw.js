// Service worker for W3Tech Outreach Ext: the original Maps Leads background plus the
// W3Tech Hunt engine. Each is loaded separately so one failing can't stop the other.
try {
  importScripts("background.93e42914.js");
} catch (err) {
  console.error("Maps Leads background failed to load", err);
}
importScripts("w3tech-core.js", "w3tech-background.js", "w3tech-push.js");
