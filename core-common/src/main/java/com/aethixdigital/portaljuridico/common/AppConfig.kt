package com.aethixdigital.portaljuridico.common

import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AppConfig @Inject constructor() {

    /**
     * Identifies the build type for logging and feature flags.
     * In Phase 0 this is always "debug" or "release" — real config comes in later phases.
     */
    val buildType: String = if (BuildConfig.DEBUG) "debug" else "release"
}
