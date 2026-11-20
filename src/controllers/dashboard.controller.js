const path = require('path');

/**
 * Dashboard Controller: Serves the responsive single-page admin dashboard
 */
exports.renderDashboard = (req, res) => {
  res.sendFile(path.join(__dirname, '../views/dashboard.html'));
};
