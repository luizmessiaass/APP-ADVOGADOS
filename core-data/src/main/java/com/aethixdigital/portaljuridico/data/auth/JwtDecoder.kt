package com.aethixdigital.portaljuridico.data.auth

import com.auth0.android.jwt.DecodeException
import com.auth0.android.jwt.JWT
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class JwtDecoder @Inject constructor() {

    fun extractRole(token: String): String? = try {
        val jwt = JWT(token)
        @Suppress("UNCHECKED_CAST")
        val appMetadata = jwt.getClaim("app_metadata").asObject(Map::class.java)
        appMetadata?.get("role") as? String
    } catch (e: DecodeException) {
        null
    }

    fun isExpired(token: String): Boolean = try {
        JWT(token).isExpired(0)
    } catch (e: DecodeException) {
        true
    }
}
