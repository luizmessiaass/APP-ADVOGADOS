package com.aethixdigital.portaljuridico.data.repository

import com.aethixdigital.portaljuridico.common.model.Movimentacao
import com.aethixdigital.portaljuridico.common.model.ProcessoDetail
import com.aethixdigital.portaljuridico.common.model.ProcessoSummary
import com.aethixdigital.portaljuridico.network.api.ClienteApi
import com.aethixdigital.portaljuridico.network.model.dto.ProcessoDetailDto
import com.aethixdigital.portaljuridico.network.model.dto.ProcessoMovimentacaoDto
import com.aethixdigital.portaljuridico.network.model.dto.ProcessoSummaryDto
import javax.inject.Inject
import javax.inject.Singleton

interface ProcessoRepository {
    suspend fun getProcessos(): Result<List<ProcessoSummary>>
    suspend fun getProcessoDetail(id: String): Result<ProcessoDetail>
    suspend fun getMovimentacoes(id: String): Result<List<Movimentacao>>
}

@Singleton
class ProcessoRepositoryImpl @Inject constructor(
    private val clienteApi: ClienteApi
) : ProcessoRepository {

    override suspend fun getProcessos(): Result<List<ProcessoSummary>> = runCatching {
        val response = clienteApi.getProcessos()
        val body = response.body() ?: error("Resposta vazia ao buscar processos")
        body.data.map { it.toDomain() }
    }

    override suspend fun getProcessoDetail(id: String): Result<ProcessoDetail> = runCatching {
        val response = clienteApi.getProcesso(id)
        val body = response.body() ?: error("Resposta vazia ao buscar detalhe do processo")
        body.data.toDomain()
    }

    override suspend fun getMovimentacoes(id: String): Result<List<Movimentacao>> = runCatching {
        val response = clienteApi.getMovimentacoes(id)
        val body = response.body() ?: error("Resposta vazia ao buscar movimentações")
        body.data.map { it.toDomain() }
    }

    private fun ProcessoSummaryDto.toDomain() = ProcessoSummary(
        id = id,
        numeroCnj = numeroCnj,
        tribunal = tribunal,
        ultimaSincronizacao = ultimaSincronizacao,
        desatualizado = desatualizado,
        status = status
    )

    private fun ProcessoDetailDto.toDomain() = ProcessoDetail(
        id = id,
        numeroCnj = numeroCnj,
        tribunal = tribunal,
        ultimaSincronizacao = ultimaSincronizacao,
        desatualizado = desatualizado,
        status = status,
        comarca = dadosBrutos?.comarca,
        classeProcessual = dadosBrutos?.classeProcessual,
        requerente = dadosBrutos?.partes?.requerente,
        requerido = dadosBrutos?.partes?.requerido,
        telefoneWhatsapp = telefoneWhatsapp
    )

    private fun ProcessoMovimentacaoDto.toDomain() = Movimentacao(
        id = id,
        dataHora = dataHora,
        descricaoOriginal = descricaoOriginal,
        status = status,
        explicacao = explicacao,
        proximaData = proximaData,
        impacto = impacto
    )
}
