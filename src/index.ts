import { NativeEventEmitter, Platform } from 'react-native';
import NativeHoneywellScanner from './NativeHoneywellScanner';

export interface BarcodeReadSuccessEvent {
  data: string;
  aimId?: string;
  charset?: string;
  codeId?: string;
  timestamp?: string;
}

export interface BarcodeReadFailEvent {
  error: string;
}

export type ScannerStatus = 'UNSUPPORTED' | 'NOT_INITIALIZED' | 'INITIALIZING' | 'READY' | 'RELEASED' | 'ERROR';

const isSupported =
  Platform.OS === 'android' &&
  !!NativeHoneywellScanner &&
  (Platform.constants as any).Manufacturer?.toLowerCase().includes('honeywell');

// Cast to any because NativeEventEmitter expects a NativeModule interface in some React Native typings
const eventEmitter = isSupported ? new NativeEventEmitter(NativeHoneywellScanner as any) : null;

export const HoneywellScannerBridge = {
  isSupported,

  /**
   * Initializes the Honeywell scanner.
   * Resolves to true on success, false if not supported.
   */
  async initialize(): Promise<boolean> {
    if (!isSupported) {
      return false;
    }
    return NativeHoneywellScanner.initialize();
  },

  /**
   * Claims control over the hardware scanner.
   * Resolves to true on success.
   */
  async claim(): Promise<boolean> {
    if (!isSupported) {
      return false;
    }
    return NativeHoneywellScanner.claim();
  },

  /**
   * Releases control over the hardware scanner.
   * Resolves to true on success.
   */
  async release(): Promise<boolean> {
    if (!isSupported) {
      return false;
    }
    return NativeHoneywellScanner.release();
  },

  /**
   * Starts or stops the software trigger.
   * @param state true to start scanning, false to stop
   */
  async softwareTrigger(state: boolean): Promise<boolean> {
    if (!isSupported) {
      return false;
    }
    return NativeHoneywellScanner.softwareTrigger(state);
  },

  /**
   * Registers a listener for successful scans.
   * Returns a function to unsubscribe.
   */
  onBarcodeRead(callback: (event: BarcodeReadSuccessEvent) => void): () => void {
    if (!eventEmitter) {
      return () => { };
    }
    const subscription = eventEmitter.addListener('barcodeReadSuccess', callback);
    return () => {
      subscription.remove();
    };
  },

  /**
   * Registers a listener for failed scans.
   * Returns a function to unsubscribe.
   */
  onBarcodeReadFail(callback: (event: BarcodeReadFailEvent) => void): () => void {
    if (!eventEmitter) {
      return () => { };
    }
    const subscription = eventEmitter.addListener('barcodeReadFail', callback);
    return () => {
      subscription.remove();
    };
  }
};

export { default as useHoneywellScanner } from './useHoneywellScanner';
export default HoneywellScannerBridge;
