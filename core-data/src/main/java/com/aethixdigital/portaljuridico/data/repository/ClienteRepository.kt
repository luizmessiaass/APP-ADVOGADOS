package com.aethixdigital.portaljuridico.data.repository

import com.aethixdigital.portaljuridico.network.api.ClienteApi
import com.aethixdigital.portaljuridico.network.model.dto.CadastroClienteRequest
import com.aethixdigital.portaljuridico.network.model.dto.ClienteItem
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
}
