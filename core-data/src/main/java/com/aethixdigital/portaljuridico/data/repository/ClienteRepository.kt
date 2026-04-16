package com.aethixdigital.portaljuridico.data.repository

import com.aethixdigital.portaljuridico.network.api.ClienteApi
import com.aethixdigital.portaljuridico.network.model.dto.ClienteItem
import javax.inject.Inject
import javax.inject.Singleton

interface ClienteRepository {
    suspend fun listarClientes(search: String? = null): Result<List<ClienteItem>>
}

@Singleton
class ClienteRepositoryImpl @Inject constructor(
    private val clienteApi: ClienteApi
) : ClienteRepository {

    override suspend fun listarClientes(search: String?): Result<List<ClienteItem>> = runCatching {
        clienteApi.listarClientes(search)
    }
}
