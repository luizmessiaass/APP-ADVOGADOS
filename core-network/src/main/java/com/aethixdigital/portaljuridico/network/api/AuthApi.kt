package com.aethixdigital.portaljuridico.network.api

import com.aethixdigital.portaljuridico.network.model.dto.LoginRequest
import com.aethixdigital.portaljuridico.network.model.dto.LoginResponse
import retrofit2.http.Body
import retrofit2.http.POST

interface AuthApi {
    @POST("api/v1/auth/login")
    suspend fun login(@Body request: LoginRequest): LoginResponse
}
