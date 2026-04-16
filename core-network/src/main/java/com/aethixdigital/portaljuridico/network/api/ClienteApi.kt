package com.aethixdigital.portaljuridico.network.api

import com.aethixdigital.portaljuridico.network.model.dto.CadastroClienteRequest
import com.aethixdigital.portaljuridico.network.model.dto.CadastroClienteResponse
import com.aethixdigital.portaljuridico.network.model.dto.ClienteItem
import com.aethixdigital.portaljuridico.network.model.dto.ClienteLoginResponse
import com.aethixdigital.portaljuridico.network.model.dto.ConsentimentoRequest
import com.aethixdigital.portaljuridico.network.model.dto.ConsentimentoResponse
import com.aethixdigital.portaljuridico.network.model.dto.EnviarMensagemRequest
import com.aethixdigital.portaljuridico.network.model.dto.LoginRequest
import com.aethixdigital.portaljuridico.network.model.dto.MensagemResponse
import com.aethixdigital.portaljuridico.network.model.dto.MovimentacoesResponse
import com.aethixdigital.portaljuridico.network.model.dto.PortalSessionResponse
import com.aethixdigital.portaljuridico.network.model.dto.PreviewResponse
import com.aethixdigital.portaljuridico.network.model.dto.ProcessoDetailResponse
import com.aethixdigital.portaljuridico.network.model.dto.ProcessoListResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface ClienteApi {
    // ---- Endpoints do app cliente (fluxo cliente final) ----

    @GET("api/v1/processos")
    suspend fun getProcessos(): Response<ProcessoListResponse>

    @GET("api/v1/processos/{id}")
    suspend fun getProcesso(@Path("id") id: String): Response<ProcessoDetailResponse>

    @GET("api/v1/processos/{id}/movimentacoes")
    suspend fun getMovimentacoes(@Path("id") id: String): Response<MovimentacoesResponse>

    @POST("api/v1/auth/login")
    suspend fun login(@Body request: LoginRequest): Response<ClienteLoginResponse>

    @POST("api/v1/auth/logout")
    suspend fun logout(): Response<Unit>

    @POST("api/v1/lgpd/consentimento")
    suspend fun postConsentimento(@Body request: ConsentimentoRequest): Response<ConsentimentoResponse>

    // ---- Endpoints do painel do advogado (gerenciamento de clientes) ----

    @POST("api/v1/clientes")
    suspend fun cadastrarCliente(@Body request: CadastroClienteRequest): CadastroClienteResponse

    @GET("api/v1/clientes")
    suspend fun listarClientes(@Query("search") search: String? = null): List<ClienteItem>

    @GET("api/v1/clientes/{id}")
    suspend fun getClienteById(@Path("id") clienteId: String): ClienteItem

    @GET("api/v1/clientes/{id}/preview")
    suspend fun previewCliente(@Path("id") clienteId: String): PreviewResponse

    @POST("api/v1/clientes/{id}/mensagens")
    suspend fun enviarMensagem(
        @Path("id") clienteId: String,
        @Body request: EnviarMensagemRequest
    ): MensagemResponse

    @POST("api/v1/escritorios/portal-session")
    suspend fun getPortalSession(): PortalSessionResponse

    @DELETE("api/v1/clientes/{id}")
    suspend fun deletarCliente(@Path("id") clienteId: String): Response<Unit>
}
