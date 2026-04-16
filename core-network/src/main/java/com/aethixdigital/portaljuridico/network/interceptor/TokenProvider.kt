package com.aethixdigital.portaljuridico.network.interceptor

/**
 * Abstraction over token storage so that :core-network does not depend on :core-data.
 * Implemented by TokenDataStore in :core-data; binding is provided via DataBindingModule.
 */
interface TokenProvider {
    suspend fun getToken(): String?
}
