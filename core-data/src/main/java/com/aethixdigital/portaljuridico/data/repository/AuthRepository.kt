package com.aethixdigital.portaljuridico.data.repository

import com.aethixdigital.portaljuridico.data.auth.JwtDecoder
import com.aethixdigital.portaljuridico.data.auth.TokenDataStore
import com.aethixdigital.portaljuridico.network.api.AuthApi
import com.aethixdigital.portaljuridico.network.model.dto.LoginRequest
import javax.inject.Inject
import javax.inject.Singleton

interface AuthRepository {
    suspend fun login(email: String, password: String): Result<String>
    suspend fun logout()
    suspend fun getSavedToken(): String?
    fun isValidAdvogadoToken(token: String): Boolean
}

@Singleton
class AuthRepositoryImpl @Inject constructor(
    private val authApi: AuthApi,
    private val tokenDataStore: TokenDataStore,
    private val jwtDecoder: JwtDecoder
) : AuthRepository {

    override suspend fun login(email: String, password: String): Result<String> = runCatching {
        val response = authApi.login(LoginRequest(email, password))
        tokenDataStore.saveToken(response.token)
        val role = jwtDecoder.extractRole(response.token) ?: response.role
        role
    }

    override suspend fun logout() = tokenDataStore.clearToken()

    // Uses TokenDataStore.getToken() which implements TokenProvider.getToken(): suspend String?
    override suspend fun getSavedToken(): String? = tokenDataStore.getToken()

    override fun isValidAdvogadoToken(token: String): Boolean {
        if (jwtDecoder.isExpired(token)) return false
        val role = jwtDecoder.extractRole(token)
        return role == "advogado" || role == "admin_escritorio"
    }
}
