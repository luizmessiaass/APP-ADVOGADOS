package com.aethixdigital.portaljuridico.network.model.dto

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

// ---- DTOs do painel do advogado ----

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

// ---- DTOs do fluxo do app cliente (processos) ----

@JsonClass(generateAdapter = true)
data class ProcessoSummaryDto(
    val id: String,
    @Json(name = "numero_cnj") val numeroCnj: String,
    val tribunal: String?,
    @Json(name = "ultima_sincronizacao") val ultimaSincronizacao: String?,
    val desatualizado: Boolean,
    val status: String?
)

@JsonClass(generateAdapter = true)
data class ProcessoListResponse(
    val success: Boolean,
    val data: List<ProcessoSummaryDto>
)

@JsonClass(generateAdapter = true)
data class DadosBrutosDto(
    val comarca: String?,
    @Json(name = "classe_processual") val classeProcessual: String?,
    val partes: PartesDto?
)

@JsonClass(generateAdapter = true)
data class PartesDto(
    val requerente: String?,
    val requerido: String?
)

@JsonClass(generateAdapter = true)
data class ProcessoDetailDto(
    val id: String,
    @Json(name = "numero_cnj") val numeroCnj: String,
    val tribunal: String?,
    @Json(name = "ultima_sincronizacao") val ultimaSincronizacao: String?,
    val desatualizado: Boolean,
    val status: String?,
    @Json(name = "dados_brutos") val dadosBrutos: DadosBrutosDto?,
    @Json(name = "telefone_whatsapp") val telefoneWhatsapp: String?
)

@JsonClass(generateAdapter = true)
data class ProcessoDetailResponse(
    val data: ProcessoDetailDto
)

// MovimentacaoDto original (usada por PreviewResponse — painel do advogado) mantida sem alteração.
// Para o fluxo do app cliente (GET /api/v1/processos/:id/movimentacoes) usamos ProcessoMovimentacaoDto.

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
data class ProcessoMovimentacaoDto(
    val id: String,
    @Json(name = "data_hora") val dataHora: String,
    @Json(name = "descricao_original") val descricaoOriginal: String,
    val status: String?,
    val explicacao: String?,
    @Json(name = "proxima_data") val proximaData: String?,
    val impacto: String?
)

@JsonClass(generateAdapter = true)
data class MovimentacoesResponse(
    val success: Boolean,
    val data: List<ProcessoMovimentacaoDto>
)

// ---- DTOs de LGPD ----

@JsonClass(generateAdapter = true)
data class ConsentimentoRequest(
    @Json(name = "versao_termos") val versaoTermos: String
)

@JsonClass(generateAdapter = true)
data class ConsentimentoResponse(
    val success: Boolean,
    @Json(name = "consentimento_id") val consentimentoId: String
)

// ---- DTOs de login/logout (usados pelo app cliente) ----

@JsonClass(generateAdapter = true)
data class ClienteLoginResponse(
    @Json(name = "access_token") val accessToken: String,
    @Json(name = "refresh_token") val refreshToken: String,
    val user: UserDto
)

@JsonClass(generateAdapter = true)
data class UserDto(
    val id: String,
    val email: String,
    val role: String,
    @Json(name = "tenant_id") val tenantId: String
)
