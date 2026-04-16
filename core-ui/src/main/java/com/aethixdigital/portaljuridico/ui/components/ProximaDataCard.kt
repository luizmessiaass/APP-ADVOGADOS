package com.aethixdigital.portaljuridico.ui.components

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedCard
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.aethixdigital.portaljuridico.ui.theme.PortalJuridicoTheme

/**
 * Card de próxima data importante do processo.
 * Exibido acima da dobra na tela de detalhe, logo abaixo do ProcessoStatusCard.
 *
 * @param proximaData Texto da próxima data ex: "Audiência em 20 de maio de 2026"; null se não houver
 */
@Composable
fun ProximaDataCard(
    proximaData: String?,
    modifier: Modifier = Modifier
) {
    OutlinedCard(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.outlinedCardColors(
            containerColor = MaterialTheme.colorScheme.primaryContainer
        )
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            if (proximaData != null) {
                Text(
                    text = "Próxima data",
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.onPrimaryContainer
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = proximaData,
                    style = MaterialTheme.typography.titleLarge,
                    color = MaterialTheme.colorScheme.onPrimaryContainer
                )
            } else {
                Text(
                    text = "Nenhuma data agendada no momento.",
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onPrimaryContainer
                )
            }
        }
    }
}

@Preview(showBackground = true)
@Composable
private fun ProximaDataCardPreview() {
    PortalJuridicoTheme {
        ProximaDataCard(proximaData = "Audiência em 20 de maio de 2026")
    }
}

@Preview(showBackground = true)
@Composable
private fun ProximaDataCardNullPreview() {
    PortalJuridicoTheme {
        ProximaDataCard(proximaData = null)
    }
}
