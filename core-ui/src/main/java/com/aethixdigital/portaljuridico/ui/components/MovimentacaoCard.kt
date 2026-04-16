package com.aethixdigital.portaljuridico.ui.components

import androidx.compose.foundation.layout.Column
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
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.aethixdigital.portaljuridico.ui.theme.PortalJuridicoTheme

/**
 * Card de movimentação traduzida por IA.
 * Reutilizável em app-escritorio (preview) e app-cliente (Phase 5).
 *
 * Security: T-04-02-02 — disclaimer visível no TOPO de cada card (per D-10, ESCR-06, AI-06).
 * Compose Text() renderiza texto puro — sem superfície de injection (T-04-02-04).
 *
 * @param status Status atual do processo (linguagem simples)
 * @param explicacao Descrição da movimentação em linguagem acessível
 * @param impacto Impacto para o cliente (ex: "Aguardar decisão do juiz")
 * @param proximaData Próxima data importante (pode ser null)
 * @param disclaimer Texto de disclaimer — deve ser "Explicação gerada por IA — confirme com seu advogado"
 * @param modifier Modifier padrão Compose
 */
@Composable
fun MovimentacaoCard(
    status: String,
    explicacao: String,
    impacto: String,
    proximaData: String?,
    disclaimer: String,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            // DISCLAIMER NO TOPO — visível sem rolar (per D-10 e CONTEXT specifics)
            Surface(
                color = MaterialTheme.colorScheme.secondaryContainer,
                shape = MaterialTheme.shapes.small,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = disclaimer,
                    style = MaterialTheme.typography.labelSmall,
                    fontStyle = FontStyle.Italic,
                    color = MaterialTheme.colorScheme.onSecondaryContainer,
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                )
            }
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = status,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = explicacao,
                style = MaterialTheme.typography.bodyMedium
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "O que isso significa para você: $impacto",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            if (proximaData != null) {
                Spacer(modifier = Modifier.height(8.dp))
                HorizontalDivider()
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "Próxima data: $proximaData",
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.primary
                )
            }
        }
    }
}

@Preview(showBackground = true)
@Composable
private fun MovimentacaoCardPreview() {
    PortalJuridicoTheme {
        MovimentacaoCard(
            status = "Aguardando julgamento",
            explicacao = "O juiz recebeu todas as informações e está analisando o caso.",
            impacto = "Você não precisa fazer nada agora. Aguarde a decisão.",
            proximaData = "15/06/2026 — Audiência",
            disclaimer = "Explicação gerada por IA — confirme com seu advogado"
        )
    }
}
