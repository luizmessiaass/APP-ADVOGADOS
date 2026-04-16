package com.aethixdigital.portaljuridico.data.repository

import com.aethixdigital.portaljuridico.network.api.ClienteApi
import com.aethixdigital.portaljuridico.network.model.dto.CadastroClienteRequest
import com.aethixdigital.portaljuridico.network.model.dto.ClienteItem
import com.aethixdigital.portaljuridico.network.model.dto.EnviarMensagemRequest
import com.aethixdigital.portaljuridico.network.model.dto.PreviewResponse
import javax.inject.Inject
import javax.inject.Singleton

interface ClienteRepository {
    suspend fun listarClientes(search: String? = null): Result<List<ClienteItem>>
    suspend fun cadastrarCliente(
        nome: String,
        cpf: String,
        email: String,
        numeroCnj: String
    ): Result<String>
    suspend fun getClienteById(id: String): Result<ClienteItem>
    suspend fun previewCliente(clienteId: String): Result<PreviewResponse>
    suspend fun enviarMensagem(clienteId: String, texto: String): Result<String>
    suspend fun getPortalSessionUrl(): Result<String>
    suspend fun deletarCliente(clienteId: String): Result<Unit>
}

@Singleton
class ClienteRepositoryImpl @Inject constructor(
    private val clienteApi: ClienteApi
) : ClienteRepository {

    override suspend fun listarClientes(search: String?): Result<List<ClienteItem>> = runCatching {
        clienteApi.listarClientes(search)
    }

    override suspend fun cadastrarCliente(
        nome: String,
        cpf: String,
        email: String,
        numeroCnj: String
    ): Result<String> = runCatching {
        val response = clienteApi.cadastrarCliente(
            CadastroClienteRequest(nome = nome, cpf = cpf, email = email, numeroCnj = numeroCnj)
        )
        response.id
    }

    override suspend fun getClienteById(id: String): Result<ClienteItem> = runCatching {
        clienteApi.getClienteById(id)
    }

    override suspend fun previewCliente(clienteId: String): Result<PreviewResponse> = runCatching {
        clienteApi.previewCliente(clienteId)
    }

    override suspend fun enviarMensagem(clienteId: String, texto: String): Result<String> = runCatching {
        clienteApi.enviarMensagem(clienteId, EnviarMensagemRequest(texto)).id
    }

    override suspend fun getPortalSessionUrl(): Result<String> = runCatching {
        clienteApi.getPortalSession().url
    }

    override suspend fun deletarCliente(clienteId: String): Result<Unit> = runCatching {
        val response = clienteApi.deletarCliente(clienteId)
        if (!response.isSuccessful) {
            throw Exception("Erro ao deletar cliente: HTTP ${response.code()}")
        }
    }
}
