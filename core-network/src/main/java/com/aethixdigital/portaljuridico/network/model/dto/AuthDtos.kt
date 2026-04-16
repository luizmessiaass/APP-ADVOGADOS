package com.aethixdigital.portaljuridico.network.model.dto

import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class LoginRequest(val email: String, val password: String)

@JsonClass(generateAdapter = true)
data class LoginResponse(val token: String, val role: String)
