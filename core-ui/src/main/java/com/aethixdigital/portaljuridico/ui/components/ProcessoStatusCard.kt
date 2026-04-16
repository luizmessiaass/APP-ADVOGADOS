package com.aethixdigital.portaljuridico.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.aethixdigital.portaljuridico.ui.theme.PortalJuridicoTheme

/**
 * Card de status resumido do processo.
 * Exibe número CNJ, status atual e última sincronização DataJud.
 * Reutilizável em app-escritorio e app-cliente (Phase 5).
 *
 * ESCR-08: última sincronização DataJud visível no card.
 *
 * @param numeroCnj Número CNJ formatado do processo
 * @param statusAtual Status atual em linguagem simples
 * @param ultimaSincronizacao String de timestamp da última sync DataJud (null = "Aguardando primeira sincronização")
 * @param modifier Modifier padrão Compose
 */
@Composable
fun ProcessoStatusCard(
    numeroCnj: String,
    statusAtual: String,
    ultimaSincronizacao: String?,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = numeroCnj,
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                // Status badge
                Surface(
                    color = MaterialTheme.colorScheme.primaryContainer,
                    shape = MaterialTheme.shapes.small
                ) {
                    Text(
                        text = statusAtual,
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Medium,
                        color = MaterialTheme.colorScheme.onPrimaryContainer,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                }
            }
            Spacer(modifier = Modifier.height(8.dp))
            HorizontalDivider()
            Spacer(modifier = Modifier.height(8.dp))
            // ESCR-08: última sincronização DataJud visível
            Text(
                text = if (ultimaSincronizacao != null)
                    "Última sync DataJud: $ultimaSincronizacao"
                else
                    "Aguardando primeira sincronização",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Preview(showBackground = true)
@Composable
private fun ProcessoStatusCardPreview() {
    PortalJuridicoTheme {
        ProcessoStatusCard(
            numeroCnj = "0001234-55.2023.8.26.0100",
            statusAtual = "Em andamento",
            ultimaSincronizacao = "há 2 horas"
        )
    }
}
