declare module '@zxing/library' {
  export class BrowserMultiFormatReader {
    decodeFromVideoElement(source: string | HTMLVideoElement): Promise<{ getText(): string }>
  }
  export class NotFoundException extends Error {}
}