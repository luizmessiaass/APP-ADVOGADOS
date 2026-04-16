package com.aethixdigital.portaljuridico.network.config

/**
 * Configuration holder for the network layer.
 * Provided by the app module (app-escritorio) via Hilt to avoid
 * circular dependency between :core-network and :app-escritorio.
 */
data class NetworkConfig(
    val baseUrl: String,
    val isDebug: Boolean
)
