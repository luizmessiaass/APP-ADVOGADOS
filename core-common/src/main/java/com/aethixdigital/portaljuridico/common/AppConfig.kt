package com.aethixdigital.portaljuridico.common

import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AppConfig @Inject constructor() {

    /**
     * Identifies the build type for logging and feature flags.
     * In Phase 0 this is always "debug" or "release" — real config comes in later phases.
     */
    val buildType: String = if (isDebugBuild()) "debug" else "release"

    private fun isDebugBuild(): Boolean {
        return try {
            Class.forName("com.aethixdigital.portaljuridico.BuildConfig")
                .getField("DEBUG")
                .getBoolean(null)
        } catch (e: Exception) {
            // In unit test context (no BuildConfig generated), default to false
            false
        }
    }
}
