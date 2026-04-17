package com.aethixdigital.portaljuridico.common.util

import java.time.Instant
import java.time.temporal.ChronoUnit

/**
 * Formata o label de sincronização para exibição ao usuário.
 *
 * Regras:
 * - null → "Nunca sincronizado"
 * - < 24h → "Sincronizado há Xh"
 * - 1-7 dias → "Sincronizado há Xd"
 * - > 7 dias → "Sincronizado há X semanas"
 */
object SyncLabelFormatter {

    fun format(ultimaSincronizacao: String?): String {
        if (ultimaSincronizacao == null) return "Nunca sincronizado"
        val sincronizado = Instant.parse(ultimaSincronizacao)
        val agora = Instant.now()
        val diffHours = ChronoUnit.HOURS.between(sincronizado, agora)
        return when {
            diffHours < 24L -> "Sincronizado há ${diffHours}h"
            diffHours <= 168L -> "Sincronizado há ${diffHours / 24}d"
            else -> "Sincronizado há ${diffHours / 168} semanas"
        }
    }
}
