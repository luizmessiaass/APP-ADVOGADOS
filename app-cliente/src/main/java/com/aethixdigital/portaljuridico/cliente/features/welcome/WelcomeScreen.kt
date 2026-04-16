package com.aethixdigital.portaljuridico.cliente.features.welcome

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowForward
import androidx.compose.material.icons.outlined.AccountBalance
import androidx.compose.material.icons.outlined.Gavel
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.aethixdigital.portaljuridico.ui.theme.EjBackground
import com.aethixdigital.portaljuridico.ui.theme.EjOnSurfaceVariant
import com.aethixdigital.portaljuridico.ui.theme.EjPrimary
import com.aethixdigital.portaljuridico.ui.theme.EjSecondary
import com.aethixdigital.portaljuridico.ui.theme.EjSurfaceContainerHigh
import com.aethixdigital.portaljuridico.ui.theme.EjSurfaceContainerLow

@Composable
fun WelcomeScreen(
    onComecarClick: () -> Unit,
    onJaSouClienteClick: () -> Unit
) {
    Scaffold(containerColor = EjBackground) { innerPadding ->
        Column(
            modifier = Modifier
                .padding(innerPadding)
                .padding(horizontal = 24.dp)
                .verticalScroll(rememberScrollState()),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(Modifier.height(48.dp))

            // Logo card
            Card(
                modifier = Modifier.size(96.dp),
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Box(
                    modifier = Modifier.size(96.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Outlined.AccountBalance,
                        contentDescription = null,
                        modifier = Modifier.size(48.dp),
                        tint = EjSecondary
                    )
                }
            }

            Spacer(Modifier.height(24.dp))

            // Title
            Text(
                text = "Meu Processo",
                style = MaterialTheme.typography.headlineLarge,
                color = EjPrimary
            )

            // Gold accent line
            Spacer(Modifier.height(8.dp))
            Box(
                modifier = Modifier
                    .width(48.dp)
                    .height(4.dp)
                    .background(EjSecondary)
            )

            Spacer(Modifier.height(8.dp))

            Text(
                text = "Seu processo juridico em portugues claro.",
                style = MaterialTheme.typography.headlineMedium,
                color = EjPrimary,
                textAlign = TextAlign.Center
            )

            Spacer(Modifier.height(12.dp))

            Text(
                text = "Acompanhe cada etapa do seu processo sem precisar ligar para o advogado.",
                style = MaterialTheme.typography.bodyLarge,
                color = EjOnSurfaceVariant,
                textAlign = TextAlign.Center
            )

            Spacer(Modifier.height(32.dp))

            // Feature tiles row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                FeatureTile(
                    icon = { Icon(Icons.Outlined.Gavel, contentDescription = null, tint = EjSecondary, modifier = Modifier.size(28.dp)) },
                    title = "Traducao Juridica",
                    description = "Textos juridicos em linguagem simples",
                    modifier = Modifier.weight(1f)
                )
                FeatureTile(
                    icon = { Icon(Icons.Outlined.Notifications, contentDescription = null, tint = EjSecondary, modifier = Modifier.size(28.dp)) },
                    title = "Alertas em Tempo Real",
                    description = "Saiba imediatamente sobre novidades",
                    modifier = Modifier.weight(1f)
                )
            }

            Spacer(Modifier.height(32.dp))

            // Primary CTA button
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(
                        Brush.linearGradient(
                            colors = listOf(Color(0xFF041631), Color(0xFF1B2B47)),
                            start = Offset(0f, 0f),
                            end = Offset(Float.POSITIVE_INFINITY, Float.POSITIVE_INFINITY)
                        )
                    )
                    .clickable { onComecarClick() },
                contentAlignment = Alignment.Center
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center
                ) {
                    Text(
                        "Comecar agora",
                        color = Color.White,
                        style = MaterialTheme.typography.labelLarge.copy(
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp
                        )
                    )
                    Spacer(Modifier.width(8.dp))
                    Icon(
                        Icons.AutoMirrored.Outlined.ArrowForward,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(20.dp)
                    )
                }
            }

            Spacer(Modifier.height(12.dp))

            TextButton(onClick = onJaSouClienteClick) {
                Text(
                    "Ja sou cliente",
                    color = EjPrimary
                )
            }

            Spacer(Modifier.height(24.dp))

            Text(
                text = "Ao continuar, voce concorda com os Termos de Uso e Politica de Privacidade.",
                style = MaterialTheme.typography.labelSmall,
                color = EjOnSurfaceVariant,
                textAlign = TextAlign.Center
            )

            Spacer(Modifier.height(32.dp))
        }
    }
}

@Composable
private fun FeatureTile(
    icon: @Composable () -> Unit,
    title: String,
    description: String,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = EjSurfaceContainerLow),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(EjSurfaceContainerHigh),
                contentAlignment = Alignment.Center
            ) {
                icon()
            }
            Spacer(Modifier.height(8.dp))
            Text(
                text = title,
                style = MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.Bold),
                color = EjPrimary
            )
            Spacer(Modifier.height(4.dp))
            Text(
                text = description,
                style = MaterialTheme.typography.labelSmall,
                color = EjOnSurfaceVariant
            )
        }
    }
}
