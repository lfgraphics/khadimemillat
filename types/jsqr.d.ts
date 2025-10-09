declare module 'jsqr' {
  interface Point { x: number; y: number }
  interface QRCode {
    binaryData: Uint8ClampedArray
    data: string
    chunks?: unknown[]
    version?: number
    location?: {
      topLeftCorner: Point
      topRightCorner: Point
      bottomLeftCorner: Point
      bottomRightCorner: Point
      topLeftFinderPattern?: Point
      topRightFinderPattern?: Point
      bottomLeftFinderPattern?: Point
    }
  }
  function jsQR(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    options?: { inversionAttempts?: 'dontInvert' | 'onlyInvert' | 'attemptBoth' | 'invertFirst' }
  ): QRCode | null
  export = jsQR
}
