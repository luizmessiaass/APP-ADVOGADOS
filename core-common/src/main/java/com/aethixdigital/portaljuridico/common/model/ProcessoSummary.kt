package com.aethixdigital.portaljuridico.common.model

/**
 * Resumo de um processo jurídico para exibição na lista do cliente.
 * Fornece os dados necessários para o ProcessoListCard em :core-ui.
 *
 * @param id UUID do processo (Supabase)
 * @param numeroCnj Número CNJ formatado ex: "0001234-55.2023.8.26.0100"
 * @param tribunal Nome do tribunal responsável; null se não informado
 * @param ultimaSincronizacao ISO timestamp da última sync DataJud; null = nunca sincronizado
 * @param desatualizado true se o processo está desatualizado (sincronização atrasada)
 * @param status Status atual em linguagem simples gerado por IA; null = tradução em andamento
 */
data class ProcessoSummary(
    val id: String,
    val numeroCnj: String,
    val tribunal: String?,
    val ultimaSincronizacao: String?,
    val desatualizado: Boolean,
    val status: String?,
)
