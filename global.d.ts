export {};

declare global {
  interface Window {
    /**
     * Optional AI Studio host bridge. Present only when this app runs inside
     * Google AI Studio's preview iframe; undefined in a standalone Vite deployment.
     */
    aistudio?: {
      hasSelectedApiKey?: () => Promise<boolean>;
      openSelectKey?: () => Promise<void>;
    };
  }
}
