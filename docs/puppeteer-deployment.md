# Puppeteer Deployment Guide

## Overview
This guide covers deploying the application with Puppeteer for receipt image generation in production environments.

## The Problem
Puppeteer requires Chrome/Chromium to be installed, but most serverless platforms (Vercel, AWS Lambda, etc.) don't include Chrome by default.

## Solutions Implemented

### 1. Puppeteer Configuration
- Added `.puppeteerrc.cjs` for local cache configuration
- This ensures browsers are cached locally in the project

### 2. Automatic Browser Installation
- Added `postinstall` script in `package.json`
- Runs `npx puppeteer browsers install chrome` after package installation
- Ensures Chrome is available in production builds

### 3. Environment Variable Support
- Added `CHROME_EXECUTABLE_PATH` environment variable
- Allows specifying custom Chrome path for different platforms

### 4. Enhanced Launch Arguments
- Added serverless-friendly Puppeteer launch options
- Includes `--single-process` and other stability flags

## Platform-Specific Setup

### Vercel
1. Chrome should be automatically installed via postinstall script
2. If issues persist, consider using `@sparticuz/chromium` package:
   ```bash
   npm install @sparticuz/chromium
   ```

### AWS Lambda
- Use AWS Lambda layers with Chrome/Chromium
- Set `CHROME_EXECUTABLE_PATH` to the layer's Chrome path

### Docker
Add to your Dockerfile:
```dockerfile
RUN apt-get update && apt-get install -y \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    wget \
    xdg-utils
```

## Testing

To test Puppeteer installation locally:
```bash
# Install browsers
npx puppeteer browsers install chrome

# Test in Node.js
node -e "
const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: true });
  console.log('Puppeteer working!');
  await browser.close();
})();
"
```

## Troubleshooting

### Error: Could not find Chrome
1. Ensure `postinstall` script ran successfully
2. Check if `.cache/puppeteer` directory exists
3. Verify Chrome executable path

### Memory Issues
- Add `--single-process` flag (already included)
- Increase serverless function memory limits
- Consider using smaller viewport sizes

### Timeout Issues
- Increase `timeout` in `page.setContent()`
- Add more time for `waitUntil: 'networkidle0'`
- Consider using `waitUntil: 'domcontentloaded'` instead

## Alternative Solutions

If Puppeteer continues to cause issues:

1. **Use a PDF generation service**: Switch to server-side PDF generation
2. **External API**: Use services like HTMLCSStoImage API
3. **Client-side generation**: Generate receipts in the browser (less reliable)
4. **Microservice**: Deploy Puppeteer as a separate service with proper Chrome support

## Environment Variables

```bash
# Optional: Custom Chrome path
CHROME_EXECUTABLE_PATH=/path/to/chrome

# For Vercel with chromium package
CHROME_EXECUTABLE_PATH=/var/task/node_modules/@sparticuz/chromium/bin
```