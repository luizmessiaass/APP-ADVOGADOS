package com.aethixdigital.portaljuridico.network.api

import com.aethixdigital.portaljuridico.network.model.dto.CadastroClienteRequest
import com.aethixdigital.portaljuridico.network.model.dto.CadastroClienteResponse
import com.aethixdigital.portaljuridico.network.model.dto.ClienteItem
import com.aethixdigital.portaljuridico.network.model.dto.EnviarMensagemRequest
import com.aethixdigital.portaljuridico.network.model.dto.MensagemResponse
import com.aethixdigital.portaljuridico.network.model.dto.PortalSessionResponse
import com.aethixdigital.portaljuridico.network.model.dto.PreviewResponse
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface ClienteApi {
    @POST("api/v1/clientes")
    suspend fun cadastrarCliente(@Body request: CadastroClienteRequest): CadastroClienteResponse

    @GET("api/v1/clientes")
    suspend fun listarClientes(@Query("search") search: String? = null): List<ClienteItem>

    @GET("api/v1/clientes/{id}/preview")
    suspend fun previewCliente(@Path("id") clienteId: String): PreviewResponse

    @POST("api/v1/clientes/{id}/mensagens")
    suspend fun enviarMensagem(
        @Path("id") clienteId: String,
        @Body request: EnviarMensagemRequest
    ): MensagemResponse

    @POST("api/v1/escritorios/portal-session")
    suspend fun getPortalSession(): PortalSessionResponse
}
