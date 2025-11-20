export interface AudioState {
  blobUrl: string | null;
  isPlaying: boolean;
  duration: number; // in seconds
  currentTime: number;
}

export interface PdfExtractResult {
  text: string;
  pageCount: number;
}

// Quick typings for window.pdfjsLib since we are loading via CDN
export interface PdfJsLib {
  getDocument: (src: string | Uint8Array) => {
    promise: Promise<{
      numPages: number;
      getPage: (pageNumber: number) => Promise<{
        getTextContent: () => Promise<{
          items: Array<{ str: string }>;
        }>;
      }>;
    }>;
  };
}

declare global {
  interface Window {
    pdfjsLib: PdfJsLib;
  }
}