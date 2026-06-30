import { useEffect, useRef, useState, useCallback } from 'react';
import HoneywellScannerBridge, { ScannerStatus } from './index';

export interface UseHoneywellScannerOptions {
  onFailure?: (error: string) => void;
  properties?: Record<string, any>;
}

/**
 * A custom hook to initialize and claim the Honeywell scanner hardware,
 * handle focus/blur transitions, and subscribe to barcode scan events.
 *
 * Automatically manages software trigger state tracking and resets.
 *
 * @param {Function} onSuccess - Callback when a barcode is successfully scanned: (data: string) => void
 * @param {boolean} isFocused - Whether the current screen is focused (active).
 * @param {UseHoneywellScannerOptions} options - Optional callbacks and scanner properties configuration
 */
export default function useHoneywellScanner(
  onSuccess: (data: string) => void,
  isFocused: boolean = true,
  options?: UseHoneywellScannerOptions
) {
  const onSuccessRef = useRef<(data: string) => void>(onSuccess);
  const onFailureRef = useRef<((error: string) => void) | undefined>(options?.onFailure);
  const propertiesRef = useRef<Record<string, any> | undefined>(options?.properties);

  const [status, setStatus] = useState<ScannerStatus>(
    HoneywellScannerBridge.isSupported ? 'NOT_INITIALIZED' : 'UNSUPPORTED'
  );
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [initialized, setInitialized] = useState<boolean>(false);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  useEffect(() => {
    onFailureRef.current = options?.onFailure;
  }, [options?.onFailure]);

  useEffect(() => {
    propertiesRef.current = options?.properties;
  }, [options?.properties]);

  const claim = useCallback(async () => {
    if (!HoneywellScannerBridge.isSupported) return false;
    try {
      setErrorMsg('');
      const success = await HoneywellScannerBridge.claim();
      if (success) {
        setStatus('READY');
        // Apply properties configuration if provided
        if (propertiesRef.current) {
          try {
            await HoneywellScannerBridge.setProperties(propertiesRef.current);
          } catch (propErr: any) {
            console.warn('[Honeywell Hook] Failed to configure scanner properties:', propErr);
          }
        }
        return true;
      }
      return false;
    } catch (err: any) {
      setStatus('ERROR');
      setErrorMsg(err.message || 'Failed to claim scanner hardware.');
      throw err;
    }
  }, []);

  const release = useCallback(async () => {
    if (!HoneywellScannerBridge.isSupported) return false;
    try {
      setErrorMsg('');
      setIsScanning(false);
      // Turn off software trigger before releasing
      try {
        await HoneywellScannerBridge.softwareTrigger(false);
      } catch (err) { }
      const success = await HoneywellScannerBridge.release();
      setStatus('RELEASED');
      return success;
    } catch (err: any) {
      setStatus('ERROR');
      setErrorMsg(err.message || 'Failed to release scanner hardware.');
      throw err;
    }
  }, []);

  const startScan = useCallback(async () => {
    if (status !== 'READY') {
      throw new Error('Scanner not ready.');
    }
    try {
      const success = await HoneywellScannerBridge.softwareTrigger(true);
      if (success) {
        setIsScanning(true);
      }
      return success;
    } catch (err: any) {
      throw err;
    }
  }, [status]);

  const stopScan = useCallback(async () => {
    try {
      const success = await HoneywellScannerBridge.softwareTrigger(false);
      setIsScanning(false);
      return success;
    } catch (err: any) {
      throw err;
    }
  }, []);

  const toggleScan = useCallback(async () => {
    if (isScanning) {
      return stopScan();
    } else {
      return startScan();
    }
  }, [isScanning, startScan, stopScan]);

  // Main lifecycle, initialization, and event subscription
  useEffect(() => {
    if (!HoneywellScannerBridge.isSupported) return;

    const initScanner = async () => {
      try {
        setStatus('INITIALIZING');
        setErrorMsg('');
        const success = await HoneywellScannerBridge.initialize();
        console.log('[Honeywell Hook] Initialized:', success);
        if (success) {
          setInitialized(true);
        } else {
          setStatus('ERROR');
          setErrorMsg('Failed to initialize Honeywell SDK.');
        }
      } catch (err: any) {
        console.error('[Honeywell Hook] Init error:', err);
        setStatus('ERROR');
        setErrorMsg(err.message || 'Error occurred during initialization.');
      }
    };

    initScanner();

    console.log('[Honeywell Hook] Subscribing to barcode read events...');

    // Register success listener
    const unsubscribeSuccess = HoneywellScannerBridge.onBarcodeRead((event) => {
      console.log('[Honeywell Hook] Scanned event callback triggered:', event?.data);
      // Auto-reset trigger state native-side when scan completes
      HoneywellScannerBridge.softwareTrigger(false).catch(() => { });
      setIsScanning(false);
      if (event && event.data && onSuccessRef.current) {
        onSuccessRef.current(event.data);
      }
    });

    // Register fail listener (timeout or trigger release)
    const unsubscribeFail = HoneywellScannerBridge.onBarcodeReadFail((errorEvent) => {
      console.warn('[Honeywell Hook] Scan fail:', errorEvent?.error);
      // Auto-reset trigger state native-side when scan fails
      HoneywellScannerBridge.softwareTrigger(false).catch(() => { });
      setIsScanning(false);
      if (onFailureRef.current) {
        onFailureRef.current(errorEvent?.error || 'Scan failure');
      }
    });

    return () => {
      console.log('[Honeywell Hook] Unsubscribing from barcode read events...');
      unsubscribeSuccess();
      unsubscribeFail();

      // Clean up and release the scanner when leaving the screen
      HoneywellScannerBridge.softwareTrigger(false).catch(() => { });
      HoneywellScannerBridge.release().catch((err: any) =>
        console.error('[Honeywell Hook] Cleanup release error:', err)
      );
    };
  }, []);

  // Handle focus/blur transitions
  useEffect(() => {
    if (!HoneywellScannerBridge.isSupported || !initialized) return;

    const manageClaim = async () => {
      try {
        if (isFocused) {
          console.log('[Honeywell Hook] Gained focus, claiming scanner...');
          await claim();
        } else {
          console.log('[Honeywell Hook] Lost focus, releasing scanner...');
          await release();
        }
      } catch (err) {
        console.error('[Honeywell Hook] Focus manage claim error:', err);
      }
    };

    manageClaim();
  }, [isFocused, initialized, claim, release]);

  return {
    status,
    isScanning,
    errorMsg,
    claim,
    release,
    startScan,
    stopScan,
    toggleScan
  };
}
