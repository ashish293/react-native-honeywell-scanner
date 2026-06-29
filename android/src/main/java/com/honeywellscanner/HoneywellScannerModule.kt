package com.honeywellscanner

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableMap
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.modules.core.DeviceEventManagerModule

import com.honeywell.aidc.AidcManager
import com.honeywell.aidc.BarcodeFailureEvent
import com.honeywell.aidc.BarcodeReadEvent
import com.honeywell.aidc.BarcodeReader
import com.honeywell.aidc.ScannerUnavailableException

@ReactModule(name = HoneywellScannerModule.NAME)
class HoneywellScannerModule(reactContext: ReactApplicationContext) : 
    NativeHoneywellScannerSpec(reactContext), 
    BarcodeReader.BarcodeListener,
    LifecycleEventListener {

    private var manager: AidcManager? = null
    private var reader: BarcodeReader? = null
    private var isClaimed = false

    init {
        reactContext.addLifecycleEventListener(this)
    }

    override fun getName(): String {
        return NAME
    }

    private fun sendEvent(eventName: String, params: WritableMap?) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    override fun initialize(promise: Promise) {
        if (manager != null) {
            promise.resolve(true)
            return
        }

        AidcManager.create(reactApplicationContext, object : AidcManager.CreatedCallback {
            override fun onCreated(aidcManager: AidcManager) {
                manager = aidcManager
                try {
                    reader = manager?.createBarcodeReader()
                    reader?.addBarcodeListener(this@HoneywellScannerModule)
                    promise.resolve(true)
                } catch (e: Exception) {
                    promise.reject("INIT_ERROR", "Failed to create BarcodeReader: ${e.message}")
                }
            }
        })
    }

    override fun claim(promise: Promise) {
        val r = reader
        if (r == null) {
            promise.reject("NOT_INITIALIZED", "Scanner not initialized. Call initialize() first.")
            return
        }

        try {
            r.claim()
            isClaimed = true
            promise.resolve(true)
        } catch (e: ScannerUnavailableException) {
            promise.reject("SCANNER_UNAVAILABLE", "Scanner unavailable: ${e.message}")
        } catch (e: Exception) {
            promise.reject("CLAIM_ERROR", "Failed to claim scanner: ${e.message}")
        }
    }

    override fun release(promise: Promise) {
        val r = reader
        if (r == null) {
            promise.resolve(true)
            return
        }

        try {
            r.release()
            isClaimed = false
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("RELEASE_ERROR", "Failed to release scanner: ${e.message}")
        }
    }

    override fun softwareTrigger(state: Boolean, promise: Promise) {
        val r = reader
        if (r == null) {
            promise.reject("NOT_INITIALIZED", "Scanner not initialized.")
            return
        }

        try {
            r.softwareTrigger(state)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("TRIGGER_ERROR", "Failed to set software trigger state: ${e.message}")
        }
    }

    // Required for TurboModule event emitting
    override fun addListener(eventName: String) {
        // Required by TurboModule spec
    }

    override fun removeListeners(count: Double) {
        // Required by TurboModule spec
    }

    // BarcodeReader.BarcodeListener implementation
    override fun onBarcodeEvent(event: BarcodeReadEvent) {
        val map = Arguments.createMap().apply {
            putString("data", event.barcodeData)
            putString("aimId", event.aimId)
            putString("charset", event.charset?.name() ?: "")
            putString("codeId", event.codeId)
            putString("timestamp", event.timestamp)
        }
        sendEvent("barcodeReadSuccess", map)
    }

    override fun onFailureEvent(event: BarcodeFailureEvent) {
        val map = Arguments.createMap().apply {
            putString("error", "Scan failure")
        }
        sendEvent("barcodeReadFail", map)
    }

    // LifecycleEventListener implementation
    override fun onHostResume() {
        if (isClaimed) {
            try {
                reader?.claim()
            } catch (e: Exception) {
                // Log or handle
            }
        }
    }

    override fun onHostPause() {
        try {
            reader?.release()
        } catch (e: Exception) {
            // Log or handle
        }
    }

    override fun onHostDestroy() {
        try {
            reader?.removeBarcodeListener(this)
            reader?.close()
            manager?.close()
        } catch (e: Exception) {
            // Log or handle
        }
        reader = null
        manager = null
    }

    companion object {
        const val NAME = "HoneywellScanner"
    }
}
