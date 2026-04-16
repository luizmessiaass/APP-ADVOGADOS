package com.aethixdigital.portaljuridico.cliente

import com.aethixdigital.portaljuridico.common.util.SyncLabelFormatter
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.Instant
import java.time.temporal.ChronoUnit

class SyncLabelFormatterTest {

    @Test
    fun `formatSyncLabel null returns Nunca sincronizado`() {
        assertEquals("Nunca sincronizado", SyncLabelFormatter.format(null))
    }

    @Test
    fun `formatSyncLabel agora returns Sincronizado ha 0h`() {
        val agora = Instant.now().toString()
        val result = SyncLabelFormatter.format(agora)
        // 0h ou 1h são ambos válidos para "agora" dependendo do milissegundo
        assertTrue(
            "Esperado 'Sincronizado há 0h' ou 'Sincronizado há 1h', obtido: $result",
            result == "Sincronizado há 0h" || result == "Sincronizado há 1h"
        )
    }

    @Test
    fun `formatSyncLabel 10 horas atras returns Sincronizado ha 10h`() {
        val dezHorasAtras = Instant.now().minus(10, ChronoUnit.HOURS).toString()
        assertEquals("Sincronizado há 10h", SyncLabelFormatter.format(dezHorasAtras))
    }

    @Test
    fun `formatSyncLabel 2 dias atras returns Sincronizado ha 2d`() {
        val doisDiasAtras = Instant.now().minus(2, ChronoUnit.DAYS).toString()
        assertEquals("Sincronizado há 2d", SyncLabelFormatter.format(doisDiasAtras))
    }

    @Test
    fun `formatSyncLabel 10 dias atras returns Sincronizado ha 1 semanas`() {
        val dezDiasAtras = Instant.now().minus(10, ChronoUnit.DAYS).toString()
        assertEquals("Sincronizado há 1 semanas", SyncLabelFormatter.format(dezDiasAtras))
    }

    @Test
    fun `formatSyncLabel 23 horas atras returns Sincronizado ha 23h`() {
        val vinteETresHorasAtras = Instant.now().minus(23, ChronoUnit.HOURS).toString()
        assertEquals("Sincronizado há 23h", SyncLabelFormatter.format(vinteETresHorasAtras))
    }

    @Test
    fun `formatSyncLabel 7 dias atras returns Sincronizado ha 7d`() {
        val seteDiasAtras = Instant.now().minus(7, ChronoUnit.DAYS).toString()
        assertEquals("Sincronizado há 7d", SyncLabelFormatter.format(seteDiasAtras))
    }

    @Test
    fun `formatSyncLabel 14 dias atras returns Sincronizado ha 2 semanas`() {
        val quatorze = Instant.now().minus(14, ChronoUnit.DAYS).toString()
        assertEquals("Sincronizado há 2 semanas", SyncLabelFormatter.format(quatorze))
    }
}
