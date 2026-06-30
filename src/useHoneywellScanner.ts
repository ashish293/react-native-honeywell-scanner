import { useEffect, useRef, useState, useCallback } from 'react';
import HoneywellScannerBridge, { ScannerStatus } from './index';

/**
 * A custom hook to initialize and claim the Honeywell scanner hardware,
 * handle focus/blur transitions, and subscribe to barcode scan events.
 *
 * @param {Function} onSuccess - Callback when a barcode is successfully scanned: (data: string) => void
 * @param {boolean} isFocused - Whether the current screen is focused (active).
 */
export default function useHoneywellScanner(
  onSuccess: (data: string) => void,
  isFocused: boolean = true
) {
  const onSuccessRef = useRef<(data: string) => void>(onSuccess);
  const [status, setStatus] = useState<ScannerStatus>(
    HoneywellScannerBridge.isSupported ? 'NOT_INITIALIZED' : 'UNSUPPORTED'
  );
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [initialized, setInitialized] = useState<boolean>(false);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  // Main lifecycle, initialization, and subscription
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
    // Register event listeners
    const unsubscribeSuccess = HoneywellScannerBridge.onBarcodeRead((event) => {
      console.log('[Honeywell Hook] Scanned event callback triggered:', event?.data);
      if (event && event.data && onSuccessRef.current) {
        onSuccessRef.current(event.data);
      }
    });

    const unsubscribeFail = HoneywellScannerBridge.onBarcodeReadFail((errorEvent) => {
      console.warn('[Honeywell Hook] Scan fail:', errorEvent?.error);
    });

    return () => {
      console.log('[Honeywell Hook] Unsubscribing from barcode read events...');
      unsubscribeSuccess();
      unsubscribeFail();

      // Clean up and release the scanner when leaving the screen
      HoneywellScannerBridge.release().catch((err: any) =>
        console.error('[Honeywell Hook] Cleanup release error:', err)
      );
    };
  }, []);

  const claim = useCallback(async () => {
    if (!HoneywellScannerBridge.isSupported) return false;
    try {
      setErrorMsg('');
      const success = await HoneywellScannerBridge.claim();
      if (success) {
        setStatus('READY');
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
      const success = await HoneywellScannerBridge.release();
      setStatus('RELEASED');
      return success;
    } catch (err: any) {
      setStatus('ERROR');
      setErrorMsg(err.message || 'Failed to release scanner hardware.');
      throw err;
    }
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
    errorMsg,
    claim,
    release,
    initialized
  };
}
