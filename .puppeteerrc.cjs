const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Changes the cache location for Puppeteer to local directory
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
  
  // Configure chrome download
  chrome: {
    skipDownload: false,
  },
};