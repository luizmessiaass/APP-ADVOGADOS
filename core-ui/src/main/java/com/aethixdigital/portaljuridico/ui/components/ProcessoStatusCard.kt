package com.aethixdigital.portaljuridico.ui.components

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.aethixdigital.portaljuridico.ui.theme.PortalJuridicoTheme

/**
 * Card de status atual do processo em linguagem simples gerado por IA.
 * Exibido acima da dobra na tela de detalhe do processo.
 *
 * Estados:
 * - isLoading=true: indicador de progresso + "Tradução em andamento..."
 * - status != null: texto de status + impacto
 *
 * @param status Status atual em linguagem simples; null = tradução em andamento
 * @param impacto O que o status significa para o cliente; null se não disponível
 * @param isLoading true enquanto a tradução IA estiver sendo processada
 */
@Composable
fun ProcessoStatusCard(
    status: String?,
    impacto: String?,
    isLoading: Boolean,
    modifier: Modifier = Modifier
) {
    ElevatedCard(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.elevatedCardColors(
            containerColor = MaterialTheme.colorScheme.primaryContainer
        )
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            if (isLoading || status == null) {
                Row(
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(16.dp),
                        strokeWidth = 2.dp,
                        color = MaterialTheme.colorScheme.onPrimaryContainer
                    )
                    Spacer(modifier = Modifier.size(8.dp))
                    Text(
                        text = "Tradução em andamento...",
                        style = MaterialTheme.typography.labelLarge,
                        color = MaterialTheme.colorScheme.onPrimaryContainer
                    )
                }
            } else {
                Text(
                    text = "Situação atual",
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.onPrimaryContainer
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = status,
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onPrimaryContainer
                )
                if (!impacto.isNullOrBlank()) {
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = impacto,
                        style = MaterialTheme.typography.labelLarge,
                        color = MaterialTheme.colorScheme.onPrimaryContainer
                    )
                }
            }
        }
    }
}

@Preview(showBackground = true)
@Composable
private fun ProcessoStatusCardLoadingPreview() {
    PortalJuridicoTheme {
        ProcessoStatusCard(status = null, impacto = null, isLoading = true)
    }
}

@Preview(showBackground = true)
@Composable
private fun ProcessoStatusCardPreview() {
    PortalJuridicoTheme {
        ProcessoStatusCard(
            status = "Aguardando julgamento",
            impacto = "Você não precisa fazer nada agora.",
            isLoading = false
        )
    }
}
