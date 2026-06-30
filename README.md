# react-native-honeywell-scanner

A lightweight, modern React Native TurboModule integration for physical Honeywell Android barcode scanners. It interacts directly with the Honeywell Data Collection Service SDK.

---

## Features

- **TurboModule Support**: Ready for React Native's New Architecture.
- **Hardware Bindings**: Interfaces directly with Honeywell's native decoder engine.
- **Auto Lifecycle Handling**: Automatically releases scanner hardware when the app is paused/backgrounded, and re-claims it upon returning to the foreground.
- **Software Triggers**: Programmatically fire the red laser/imager from JavaScript.
- **Symbology Support**: Provides decoded barcode strings alongside metadata (Symbology, Aim ID, Charset, Timestamps).

---

## Installation

```bash
npm install git+https://github.com/ashishGenefied/react-native-honeywell-scanner.git
```
or with Yarn:
```bash
yarn add git+https://github.com/ashishGenefied/react-native-honeywell-scanner.git
```

### 1. Place Honeywell DataCollection SDK
Since Honeywell's `DataCollection.aar` is a proprietary archive file, you must obtain it from the Honeywell Developer Portal and place it inside the library's local directory:

Move `DataCollection.aar` to:
`node_modules/react-native-honeywell-scanner/android/libs/DataCollection.aar`

### 2. Main App Gradle Configuration
To comply with Android Gradle Plugin 8+ restrictions (which forbid direct local `.aar` file packaging in libraries), the library compiles the `.aar` as `compileOnly`. You must tell your main application's packaging tool to package this `.aar` by adding it directly to your main app's dependencies:

Open `android/app/build.gradle` of your project, and append the following line inside the `dependencies` block:
```groovy
dependencies {
    // ...
    // Include Honeywell's local AAR directly so it compiles and packages in the app
    implementation files("../../node_modules/react-native-honeywell-scanner/android/libs/DataCollection.aar")
}
```

### 3. Android Manifest Permissions
Add the following permission inside your main project's `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="com.honeywell.decode.permission.DECODE" />
```

---

## Usage

### The Recommended Hook Way: `useHoneywellScanner`
The easiest way to integrate scanning is by using the custom hook, which automatically handles the complete lifecycle (initialization, event subscription, focus/blur claims, and unmount cleanups):

```typescript
import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, Alert } from 'react-native';
import { useHoneywellScanner, BarcodeReadSuccessEvent } from 'react-native-honeywell-scanner';
import { useIsFocused } from '@react-navigation/native';

export default function App() {
  const isFocused = useIsFocused();
  const [scannedText, setScannedText] = useState<string>('');

  const { status, errorMsg } = useHoneywellScanner(
    useCallback((data: string) => {
      setScannedText(data);
      Alert.alert('Scanned', data);
    }, []),
    isFocused
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Scanner Status: {status}</Text>
      {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}
      <Text style={styles.result}>Result: {scannedText}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: 'bold' },
  error: { color: 'red', marginTop: 8 },
  result: { marginTop: 20, fontSize: 16 }
});
```

> [!IMPORTANT]
> **Camera Imager Conflict Resolution**:
> Honeywell physical barcode readers use the internal imager hardware. If your screen uses a camera component (e.g., `react-native-vision-camera`), it locks the camera resource and blocks the physical scanner.
> Always disable the camera component's `isActive` property when the Honeywell scanner is supported:
> ```jsx
> <Camera isActive={!HoneywellScannerBridge.isSupported && cameraEnabled} />
> ```

---

## API Reference

### `useHoneywellScanner(onSuccess: (data: string) => void, isFocused?: boolean)`
A custom hook that initializes, claims, and releases the hardware scanner.
- **`onSuccess`**: Callback triggered with the decoded barcode string on a successful scan.
- **`isFocused`**: (Optional, default `true`). Controls focus/blur transition. When `false`, the hook automatically releases control of the scanner engine so other screens/apps can claim it.
- **Returns**: An object containing:
  - `status: ScannerStatus` (e.g. `'READY'`, `'INITIALIZING'`, `'RELEASED'`, etc.)
  - `errorMsg: string`
  - `claim: () => Promise<boolean>`
  - `release: () => Promise<boolean>`
  - `initialized: boolean`

### `HoneywellScannerBridge`

#### `isSupported: boolean`
Returns `true` if the app is running on a compatible Android device with the Honeywell scanner service available.

#### `initialize(): Promise<boolean>`
Connects to the Honeywell system service. Resolves to `true` on success.

#### `claim(): Promise<boolean>`
Requests exclusive control of the scanner engine. Must be called after `initialize()` to capture hardware button scanner events.

#### `release(): Promise<boolean>`
Relinquishes hardware lock to allow other apps on the device to access the scan laser.

#### `softwareTrigger(state: boolean): Promise<boolean>`
Instructs the hardware engine to trigger scanning. Set to `true` to turn the laser beam on, and `false` to turn it off.

#### `onBarcodeRead(callback: (event: BarcodeReadSuccessEvent) => void): () => void`
Subscribes to successful barcode scans. Returns an unsubscribe cleanup function.

#### `onBarcodeReadFail(callback: (event: BarcodeReadFailEvent) => void): () => void`
Subscribes to failed barcode scan actions. Returns an unsubscribe cleanup function.

---

### Type Definitions

```typescript
export interface BarcodeReadSuccessEvent {
  data: string;       // Decoded barcode text
  aimId?: string;     // AIM Symbology Identifier
  charset?: string;   // Output Character Set 
  codeId?: string;    // Honeywell Symbology Identifier Code (e.g. 's' for QR Code)
  timestamp?: string; // Decode timestamp
}

export interface BarcodeReadFailEvent {
  error: string;
}

export type ScannerStatus = 
  | 'UNSUPPORTED' 
  | 'NOT_INITIALIZED' 
  | 'INITIALIZING' 
  | 'READY' 
  | 'RELEASED' 
  | 'ERROR';
```

---

## License

MIT
