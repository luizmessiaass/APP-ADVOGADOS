package com.aethixdigital.portaljuridico.common.model

/**
 * Detalhes completos de um processo jurídico para exibição na tela de detalhe.
 * Inclui dados cadastrais (comarca, classe processual, partes) e WhatsApp do escritório.
 *
 * @param id UUID do processo (Supabase)
 * @param numeroCnj Número CNJ formatado ex: "0001234-55.2023.8.26.0100"
 * @param tribunal Nome do tribunal responsável; null se não informado
 * @param ultimaSincronizacao ISO timestamp da última sync DataJud; null = nunca sincronizado
 * @param desatualizado true se o processo está desatualizado (sincronização atrasada)
 * @param status Status atual em linguagem simples gerado por IA; null = tradução em andamento
 * @param comarca Cidade/comarca do processo; null se não disponível
 * @param classeProcessual Tipo de processo; null se não disponível
 * @param requerente Nome do requerente; null se não disponível
 * @param requerido Nome do requerido; null se não disponível
 * @param telefoneWhatsapp Telefone WhatsApp do escritório para contato; null se não configurado
 */
data class ProcessoDetail(
    val id: String,
    val numeroCnj: String,
    val tribunal: String?,
    val ultimaSincronizacao: String?,
    val desatualizado: Boolean,
    val status: String?,
    val comarca: String?,
    val classeProcessual: String?,
    val requerente: String?,
    val requerido: String?,
    val telefoneWhatsapp: String?,
)
