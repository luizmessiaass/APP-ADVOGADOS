package com.aethixdigital.portaljuridico.ui.components

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Card
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.aethixdigital.portaljuridico.common.model.Movimentacao
import com.aethixdigital.portaljuridico.ui.theme.PortalJuridicoTheme

/**
 * Card de movimentação processual na timeline do cliente.
 * Exibe data formatada, explicação traduzida por IA com ExpandableText.
 *
 * Quando explicacao é null, exibe descricaoOriginal com prefixo "Aguardando tradução: "
 * em itálico — exceção à regra de no-italic (D-06) pois sinaliza estado provisório.
 *
 * D-06: Sem disclaimer "Explicação gerada por IA" (removido por decisão de produto).
 *
 * @param movimentacao Dados da movimentação com campos de tradução IA
 * @param onExpandToggle Callback chamado quando o usuário expande/colapsa o texto
 * @param isExpanded Estado atual de expansão do texto
 */
@Composable
fun MovimentacaoCard(
    movimentacao: Movimentacao,
    onExpandToggle: () -> Unit,
    isExpanded: Boolean,
    modifier: Modifier = Modifier
) {
    Column(modifier = modifier.fillMaxWidth()) {
        Card(
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Spacer(modifier = Modifier.weight(1f))
                    Text(
                        text = movimentacao.dataHora,
                        style = MaterialTheme.typography.labelLarge,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                val explicacaoText = movimentacao.explicacao
                if (explicacaoText != null) {
                    ExpandableText(
                        text = explicacaoText,
                        collapsedMaxLines = 3
                    )
                } else {
                    // Fallback: exibe texto original com prefixo em itálico
                    Text(
                        text = "Aguardando tradução: ${movimentacao.descricaoOriginal}",
                        style = MaterialTheme.typography.labelLarge.copy(fontStyle = FontStyle.Italic),
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
        HorizontalDivider()
    }
}

@Preview(showBackground = true)
@Composable
private fun MovimentacaoCardPreview() {
    PortalJuridicoTheme {
        MovimentacaoCard(
            movimentacao = Movimentacao(
                id = "1",
                dataHora = "15 mai 2025",
                descricaoOriginal = "Despacho ordinatório de fl. 123",
                status = "Aguardando decisão",
                explicacao = "O juiz recebeu todas as informações e está analisando o caso para tomar uma decisão.",
                proximaData = null,
                impacto = "Você não precisa fazer nada agora."
            ),
            onExpandToggle = {},
            isExpanded = false
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun MovimentacaoCardFallbackPreview() {
    PortalJuridicoTheme {
        MovimentacaoCard(
            movimentacao = Movimentacao(
                id = "2",
                dataHora = "10 mai 2025",
                descricaoOriginal = "Juntada de documento pelo réu",
                status = null,
                explicacao = null,
                proximaData = null,
                impacto = null
            ),
            onExpandToggle = {},
            isExpanded = false
        )
    }
}
