const path = require('path');
const fs = require('fs');

/**
 * Dashboard Controller: Serves the React Single-Page Application (SPA)
 * Falls back to legacy view if client bundle is not built.
 */
exports.renderDashboard = (req, res) => {
  const reactIndexPath = path.join(__dirname, '../../public/index.html');
  if (fs.existsSync(reactIndexPath)) {
    return res.sendFile(reactIndexPath);
  }
  return res.sendFile(path.join(__dirname, '../views/dashboard.html'));
};
