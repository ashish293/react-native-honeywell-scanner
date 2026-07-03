# react-native-honeywell-scanner

A lightweight, modern React Native TurboModule integration for physical Honeywell Android barcode scanners. It interacts directly with the Honeywell Data Collection Service SDK.

---

## Features

- **TurboModule Support**: Ready for React Native's New Architecture.
- **Hardware Bindings**: Interfaces directly with Honeywell's native decoder engine.
- **Auto Lifecycle Handling**: Automatically releases scanner hardware when the app is paused/backgrounded, and re-claims it upon returning to the foreground.
- **Stateful Software Triggers**: Programmatically fire the scanning beam from JavaScript with auto-resets on success or fail.
- **Runtime Properties Configuration**: Enable/disable specific barcode types and configure scanner properties dynamically from the JS layer.
- **Symbology Support**: Provides decoded barcode strings alongside metadata (Symbology, Aim ID, Charset, Timestamps).

---

## Installation

```bash
npm install git+https://github.com/ashish293/react-native-honeywell-scanner.git
```
or with Yarn:
```bash
yarn add git+https://github.com/ashish293/react-native-honeywell-scanner.git
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
The custom hook handles the complete lifecycle (initialization, event subscription, focus/blur claims, and unmount cleanups) and exposes helper actions to control software triggers dynamically:

```typescript
import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useHoneywellScanner } from 'react-native-honeywell-scanner';
import { useIsFocused } from '@react-navigation/native';

export default function App() {
  const isFocused = useIsFocused();
  const [scannedText, setScannedText] = useState<string>('');

  const { status, isScanning, errorMsg, toggleScan } = useHoneywellScanner(
    useCallback((data: string) => {
      setScannedText(data);
    }, []),
    isFocused,
    {
      onFailure: (err) => {
        Alert.alert('Scan Failed', err);
      },
      properties: {
        // Example: disable Aztec symbology, enable QR Code
        "symbology_aztec_enabled": false,
        "symbology_qr_enabled": true,
      }
    }
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Status: {status}</Text>
      {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}
      
      <Text style={styles.result}>Result: {scannedText}</Text>

      <TouchableOpacity
        onPress={toggleScan}
        style={styles.button}
        disabled={status !== 'READY'}
      >
        {isScanning ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.buttonText}>Trigger Scanner</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FC' },
  title: { fontSize: 18, fontWeight: 'bold', color: '#1E1E24' },
  error: { color: 'red', marginTop: 8 },
  result: { marginVertical: 30, fontSize: 16, color: '#6E6E77' },
  button: { backgroundColor: '#FF2D55', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 8 },
  buttonText: { color: 'white', fontWeight: 'bold' }
});
```

---

## API Reference

### `useHoneywellScanner(onSuccess, isFocused, options)`
A custom hook that initializes, claims, and releases the hardware scanner.
- **`onSuccess`**: `(data: string) => void` - Callback triggered with the decoded barcode string on a successful scan.
- **`isFocused`**: `boolean` - (Optional, default `true`). Controls focus/blur transition. When `false`, the hook automatically releases control of the scanner engine.
- **`options`**: `UseHoneywellScannerOptions` - (Optional) custom handlers and properties configurations.
  - `onFailure?: (error: string) => void` - Callback when scanning fails or times out.
  - `properties?: Record<string, any>` - Map of properties to set on the scanner reader upon claim.
- **Returns**: An object containing:
  - `status: ScannerStatus` (e.g. `'READY'`, `'INITIALIZING'`, `'RELEASED'`, etc.)
  - `isScanning: boolean` - Whether the software scanner beam is active.
  - `errorMsg: string` - Error messages if initialization or claim failed.
  - `claim: () => Promise<boolean>` - Manually request scanner hardware lock.
  - `release: () => Promise<boolean>` - Manually release scanner hardware lock.
  - `startScan: () => Promise<boolean>` - Turn the software scanner beam ON.
  - `stopScan: () => Promise<boolean>` - Turn the software scanner beam OFF.
  - `toggleScan: () => Promise<boolean>` - Alternates the software scanner beam.

---

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

#### `setProperties(properties: Record<string, any>): Promise<boolean>`
Configures hardware properties on the reader device (e.g. toggling specific symbology decoders).

---

## License

MIT
