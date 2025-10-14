import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const fs = require('fs')
    const path = require('path')
    const { execSync } = require('child_process')

    const debugInfo: any = {
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL: process.env.VERCEL,
        CHROME_EXECUTABLE_PATH: process.env.CHROME_EXECUTABLE_PATH,
        PWD: process.env.PWD,
        HOME: process.env.HOME,
        LAMBDA_TASK_ROOT: process.env.LAMBDA_TASK_ROOT,
      },
      paths: {
        cwd: process.cwd(),
        homedir: require('os').homedir(),
      },
      cacheDirectories: [],
      chromeExecutables: [],
      puppeteerInfo: null,
      errors: []
    }

    // Check common cache directories
    const cacheDirs = [
      '/vercel/path0/.cache/puppeteer',
      '/var/task/.cache/puppeteer', 
      path.join(process.cwd(), '.cache/puppeteer'),
      path.join(require('os').homedir(), '.cache/puppeteer'),
      '/home/sbx_user1051/.cache/puppeteer'
    ]

    for (const cacheDir of cacheDirs) {
      try {
        if (fs.existsSync(cacheDir)) {
          const contents = fs.readdirSync(cacheDir, { withFileTypes: true })
          debugInfo.cacheDirectories.push({
            path: cacheDir,
            exists: true,
            contents: contents.map((item: any) => ({
              name: item.name,
              isDirectory: item.isDirectory()
            }))
          })

          // Look for Chrome specifically
          const chromePath = path.join(cacheDir, 'chrome')
          if (fs.existsSync(chromePath)) {
            const chromeVersions = fs.readdirSync(chromePath)
            for (const version of chromeVersions) {
              const executablePath = path.join(chromePath, version, 'chrome-linux64/chrome')
              if (fs.existsSync(executablePath)) {
                debugInfo.chromeExecutables.push({
                  path: executablePath,
                  version,
                  exists: true,
                  executable: (() => {
                    try {
                      fs.accessSync(executablePath, fs.constants.F_OK | fs.constants.X_OK)
                      return true
                    } catch {
                      return false
                    }
                  })()
                })
              }
            }
          }
        } else {
          debugInfo.cacheDirectories.push({
            path: cacheDir,
            exists: false
          })
        }
      } catch (error) {
        debugInfo.errors.push({
          type: 'cache_directory_check',
          path: cacheDir,
          error: error instanceof Error ? error.message : String(error)
        })
      }
    }

    // Try to get Puppeteer info
    try {
      const puppeteerInfo = execSync('npx puppeteer browsers list', { 
        encoding: 'utf8', 
        timeout: 10000,
        cwd: process.cwd()
      })
      debugInfo.puppeteerInfo = puppeteerInfo
    } catch (error) {
      debugInfo.errors.push({
        type: 'puppeteer_list',
        error: error instanceof Error ? error.message : String(error)
      })
    }

    // Try to import and check Puppeteer
    try {
      const puppeteer = await import('puppeteer')
      debugInfo.puppeteerModule = {
        available: true,
        // version: puppeteer.default.version || 'unknown'  // Version property doesn't exist on PuppeteerNode
      }

      try {
        const executablePath = puppeteer.default.executablePath()
        debugInfo.puppeteerModule.executablePath = {
          path: executablePath,
          exists: fs.existsSync(executablePath)
        }
      } catch (error) {
        debugInfo.puppeteerModule.executablePathError = error instanceof Error ? error.message : String(error)
      }
    } catch (error) {
      debugInfo.errors.push({
        type: 'puppeteer_import',
        error: error instanceof Error ? error.message : String(error)
      })
    }

    // Check system Chrome
    const systemChromePaths = [
      '/usr/bin/google-chrome-stable',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium'
    ]

    debugInfo.systemChrome = systemChromePaths.map(chromePath => ({
      path: chromePath,
      exists: fs.existsSync(chromePath)
    }))

    return NextResponse.json(debugInfo, { 
      headers: { 'Content-Type': 'application/json' },
      status: 200 
    })

  } catch (error) {
    return NextResponse.json({ 
      error: 'Debug endpoint failed',
      message: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}