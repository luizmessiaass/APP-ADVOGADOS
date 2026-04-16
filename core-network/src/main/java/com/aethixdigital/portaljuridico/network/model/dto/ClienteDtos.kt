package com.aethixdigital.portaljuridico.network.model.dto

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class CadastroClienteRequest(
    val nome: String,
    val cpf: String,
    val email: String,
    @Json(name = "numero_cnj") val numeroCnj: String
)

@JsonClass(generateAdapter = true)
data class CadastroClienteResponse(
    val id: String,
    val nome: String,
    val cpf: String
)

@JsonClass(generateAdapter = true)
data class ClienteItem(
    @Json(name = "id") val id: String,
    val nome: String,
    val cpf: String,
    @Json(name = "ultima_sincronizacao") val ultimaSincronizacao: String?,
    @Json(name = "status_processo") val statusProcesso: String?
)

@JsonClass(generateAdapter = true)
data class MovimentacaoDto(
    val id: String,
    val status: String,
    @Json(name = "proxima_data") val proximaData: String?,
    val explicacao: String,
    val impacto: String,
    val disclaimer: String
)

@JsonClass(generateAdapter = true)
data class PreviewResponse(
    val cliente: ClienteItem,
    val movimentacoes: List<MovimentacaoDto>
)

@JsonClass(generateAdapter = true)
data class EnviarMensagemRequest(val texto: String)

@JsonClass(generateAdapter = true)
data class MensagemResponse(
    val id: String,
    @Json(name = "enviado_em") val enviadoEm: String
)

@JsonClass(generateAdapter = true)
data class PortalSessionResponse(val url: String)
