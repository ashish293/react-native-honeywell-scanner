package com.honeywellscanner

import com.facebook.react.TurboReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class HoneywellScannerPackage : TurboReactPackage() {
    override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? {
        return if (name == HoneywellScannerModule.NAME) {
            HoneywellScannerModule(reactContext)
        } else {
            null
        }
    }

    override fun getReactModuleInfoProvider(): ReactModuleInfoProvider {
        return ReactModuleInfoProvider {
            val moduleInfo = ReactModuleInfo(
                HoneywellScannerModule.NAME,
                HoneywellScannerModule::class.java.name,
                false, // canOverrideExistingModule
                false, // needsEagerInit
                true,  // hasConstants
                false, // isCxxModule
                true   // isTurboModule
            )
            mapOf(HoneywellScannerModule.NAME to moduleInfo)
        }
    }
}
