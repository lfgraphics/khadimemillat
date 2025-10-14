# Puppeteer Deployment Guide - Serverless Solution

## Overview
This guide covers deploying the application with Puppeteer for receipt image generation using `@sparticuz/chromium` for serverless environments.

## The Problem
Puppeteer requires Chrome/Chromium to be installed, but:
1. Most serverless platforms (Vercel, AWS Lambda, etc.) don't include Chrome by default
2. Bundling Chrome with serverless functions exceeds size limits (250MB on Vercel)
3. The Chrome binary is ~300MB+ which is too large for serverless deployments

## Solution: @sparticuz/chromium

We use `@sparticuz/chromium` which provides a pre-built, optimized Chromium binary specifically designed for serverless environments.

### Benefits:
- **Smaller size**: Optimized for serverless
- **No bundling issues**: Downloads at runtime
- **Serverless-optimized**: Built for AWS Lambda/Vercel
- **Reliable**: Maintained specifically for this use case

## Implementation Details

### 1. Package Dependencies
```json
{
  "dependencies": {
    "puppeteer": "^24.24.1",
    "@sparticuz/chromium": "^141.0.0"
  }
}
```

### 2. Vercel Configuration
```json
{
  "functions": {
    "app/api/**/*.ts": {
      "excludeFiles": [
        ".cache/**",
        "node_modules/puppeteer/.local-chromium/**"
      ]
    }
  },
  "build": {
    "env": {
      "PUPPETEER_SKIP_CHROMIUM_DOWNLOAD": "true"
    }
  }
}
```

### 3. Runtime Implementation
The API route uses `@sparticuz/chromium` directly without trying to bundle Chrome:

```typescript
const chromium = await import('@sparticuz/chromium')
const browser = await puppeteer.launch({
  args: chromium.default.args,
  defaultViewport: { width: 1280, height: 720 },
  executablePath: await chromium.default.executablePath(),
  headless: true,
})
```

## Platform-Specific Notes

### Vercel
- Chrome is downloaded at runtime by `@sparticuz/chromium`
- No build-time Chrome installation needed
- Function size stays within 250MB limit

### AWS Lambda
- `@sparticuz/chromium` is specifically designed for Lambda
- Works out of the box with this package

### Other Platforms
- Should work on most serverless platforms
- May need platform-specific `@sparticuz/chromium` alternatives

## Environment Variables

No special environment variables needed! The package handles everything automatically.

## Troubleshooting

### Error: Function size exceeded
- Ensure `vercel.json` excludes Chrome cache
- Verify `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true` in build env

### Chrome not found
- The package downloads Chrome at runtime
- Check network connectivity in serverless environment
- Verify `@sparticuz/chromium` package is installed

### Memory issues
- Consider reducing image quality/size
- Use smaller viewport dimensions
- Implement timeout limits

## Cost Considerations

- **Cold starts**: First execution may be slower due to Chrome download
- **Memory usage**: Increase serverless function memory if needed
- **Execution time**: Factor in Chrome download time

## Alternative Approaches

If `@sparticuz/chromium` doesn't work:

1. **HTML-to-Image Service**: Use external APIs like HTMLCSStoImage
2. **PDF Generation**: Switch to PDF receipts using libraries like Puppeteer-PDF
3. **Client-side Generation**: Generate images in the browser
4. **Dedicated Service**: Deploy Puppeteer as a separate microservice

## Testing

To test locally:
```bash
npm install @sparticuz/chromium
# Test the API endpoint
curl https://your-app.com/api/receipts/[donationId]/image
```

## Performance Optimization

1. **Function warming**: Implement keep-alive for frequently used functions
2. **Caching**: Cache generated images if appropriate
3. **Lazy loading**: Only import Chromium when needed
4. **Timeout handling**: Set appropriate timeouts for image generation