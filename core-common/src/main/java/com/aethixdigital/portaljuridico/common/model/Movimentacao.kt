package com.aethixdigital.portaljuridico.common.model

/**
 * Movimentação processual com tradução IA.
 * Usada em MovimentacaoCard (:core-ui) e na tela de detalhe do processo.
 *
 * @param id UUID da movimentação (Supabase)
 * @param dataHora ISO timestamp da movimentação
 * @param descricaoOriginal Texto original do DataJud (jargão jurídico)
 * @param status Status atual em linguagem simples; null = tradução em andamento
 * @param explicacao Descrição em linguagem acessível gerada por IA; null = aguardando tradução
 * @param proximaData Próxima data importante ex: "Audiência em 20 de maio de 2026"; null se não houver
 * @param impacto O que a movimentação significa para o cliente; null = aguardando tradução
 */
data class Movimentacao(
    val id: String,
    val dataHora: String,
    val descricaoOriginal: String,
    val status: String?,
    val explicacao: String?,
    val proximaData: String?,
    val impacto: String?,
)
