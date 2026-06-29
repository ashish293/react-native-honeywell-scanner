import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  initialize(): Promise<boolean>;
  claim(): Promise<boolean>;
  release(): Promise<boolean>;
  softwareTrigger(state: boolean): Promise<boolean>;
  
  // Required for emitting device events via NativeEventEmitter inside a TurboModule context
  addListener(eventName: string): void;
  removeListeners(count: number): void;
}

export default TurboModuleRegistry.getEnforcing<Spec>('HoneywellScanner');
