const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Changes the cache location for Puppeteer to local directory
  // This ensures browsers are cached in the project directory
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
  
  // Configure chrome download
  chrome: {
    skipDownload: false,
  },

  // Set executable path for different environments
  ...(process.env.NODE_ENV === 'production' && {
    executablePath: process.env.CHROME_EXECUTABLE_PATH || 
      // Fallback paths for common serverless environments
      join(__dirname, '.cache', 'puppeteer', 'chrome', 'linux-141.0.7390.76', 'chrome-linux64', 'chrome')
  })
};