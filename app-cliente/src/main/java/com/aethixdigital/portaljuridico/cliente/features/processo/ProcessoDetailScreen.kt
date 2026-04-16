package com.aethixdigital.portaljuridico.cliente.features.processo

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.ArrowBackIosNew
import androidx.compose.material.icons.outlined.Gavel
import androidx.compose.material.icons.outlined.Info
import androidx.compose.material.icons.outlined.Lightbulb
import androidx.compose.material.icons.outlined.Schedule
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material.icons.outlined.VerifiedUser
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.aethixdigital.portaljuridico.ui.theme.EjBackground
import com.aethixdigital.portaljuridico.ui.theme.EjOnPrimary
import com.aethixdigital.portaljuridico.ui.theme.EjOnSecondaryFixed
import com.aethixdigital.portaljuridico.ui.theme.EjOnSurface
import com.aethixdigital.portaljuridico.ui.theme.EjOnSurfaceVariant
import com.aethixdigital.portaljuridico.ui.theme.EjPrimary
import com.aethixdigital.portaljuridico.ui.theme.EjSecondary
import com.aethixdigital.portaljuridico.ui.theme.EjSecondaryContainer
import com.aethixdigital.portaljuridico.ui.theme.EjSurfaceContainerHigh
import com.aethixdigital.portaljuridico.ui.theme.EjSurfaceContainerLowest

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProcessoDetailScreen(
    processoId: String,
    onBackClick: () -> Unit,
    onConsultorIaClick: () -> Unit = {}
) {
    Scaffold(
        containerColor = EjBackground,
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        "Sentenca Proferida",
                        style = MaterialTheme.typography.titleLarge,
                        color = EjOnSurface
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(
                            Icons.Outlined.ArrowBackIosNew,
                            contentDescription = "Voltar",
                            tint = EjOnSurface
                        )
                    }
                },
                actions = {
                    IconButton(onClick = {}) {
                        Icon(
                            Icons.Outlined.Share,
                            contentDescription = "Compartilhar",
                            tint = EjOnSurfaceVariant
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = EjSurfaceContainerLowest)
            )
        }
    ) { innerPadding ->
        LazyColumn(
            modifier = Modifier
                .padding(innerPadding)
                .padding(horizontal = 24.dp)
        ) {
            // DECISAO JUDICIAL label
            item {
                Spacer(Modifier.height(16.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(8.dp)
                            .clip(CircleShape)
                            .background(EjSecondary)
                    )
                    Spacer(Modifier.width(8.dp))
                    Text(
                        "DECISAO JUDICIAL",
                        style = MaterialTheme.typography.labelMedium.copy(
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 1.5.sp
                        ),
                        color = EjSecondary
                    )
                }
            }

            // Headline
            item {
                Spacer(Modifier.height(12.dp))
                Text(
                    "O juiz tomou uma decisao final sobre o seu caso.",
                    style = MaterialTheme.typography.headlineLarge,
                    color = EjPrimary
                )
            }

            // Process info card
            item {
                Spacer(Modifier.height(20.dp))
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = EjSurfaceContainerLowest),
                    elevation = CardDefaults.cardElevation(2.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(44.dp)
                                .clip(CircleShape)
                                .background(EjPrimary),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                Icons.Outlined.Gavel,
                                contentDescription = null,
                                tint = EjOnPrimary,
                                modifier = Modifier.size(24.dp)
                            )
                        }
                        Spacer(Modifier.width(14.dp))
                        Column {
                            Text(
                                "Processo no",
                                style = MaterialTheme.typography.labelSmall,
                                color = EjOnSurfaceVariant
                            )
                            Text(
                                "0001234-56.2023.8.26.0100",
                                style = MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.Bold),
                                color = EjOnSurface
                            )
                        }
                    }
                }
            }

            // O que aconteceu section
            item {
                Spacer(Modifier.height(24.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Outlined.Info,
                        contentDescription = null,
                        tint = EjPrimary,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(Modifier.width(8.dp))
                    Text(
                        "O que aconteceu?",
                        style = MaterialTheme.typography.titleLarge,
                        color = EjOnSurface
                    )
                }
                Spacer(Modifier.height(10.dp))
                Text(
                    buildAnnotatedString {
                        append("O juiz analisou todas as provas do processo e proferiu a ")
                        withStyle(SpanStyle(fontWeight = FontWeight.Bold)) { append("sentenca") }
                        append(". Isso significa que ele tomou uma decisao definitiva sobre o caso em primeira instancia. A decisao determina que a parte re deve ")
                        withStyle(SpanStyle(fontWeight = FontWeight.Bold)) { append("pagar o valor cobrado") }
                        append(" mais correcao monetaria e honorarios advocaticios.")
                    },
                    style = MaterialTheme.typography.bodyLarge,
                    color = EjOnSurface
                )
            }

            // O que isso significa card
            item {
                Spacer(Modifier.height(20.dp))
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .drawBehind {
                            drawRect(EjSecondary, size = Size(4.dp.toPx(), size.height))
                        },
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = EjSurfaceContainerLowest),
                    elevation = CardDefaults.cardElevation(2.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                Icons.Outlined.Lightbulb,
                                contentDescription = null,
                                tint = EjSecondary,
                                modifier = Modifier.size(20.dp)
                            )
                            Spacer(Modifier.width(8.dp))
                            Text(
                                "O que isso significa?",
                                style = MaterialTheme.typography.titleLarge,
                                color = EjOnSurface
                            )
                        }
                        Spacer(Modifier.height(12.dp))
                        listOf(
                            "A decisao e favoravel a voce",
                            "A parte contraria tem 15 dias para recorrer",
                            "Voce pode solicitar o cumprimento da sentenca"
                        ).forEach { itemText ->
                            Row(
                                verticalAlignment = Alignment.Top,
                                modifier = Modifier.padding(vertical = 4.dp)
                            ) {
                                Icon(
                                    Icons.Outlined.VerifiedUser,
                                    contentDescription = null,
                                    tint = Color(0xFF2E7D32),
                                    modifier = Modifier.size(18.dp)
                                )
                                Spacer(Modifier.width(8.dp))
                                Text(
                                    itemText,
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = EjOnSurface
                                )
                            }
                        }
                    }
                }
            }

            // Proximos passos
            item {
                Spacer(Modifier.height(24.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Outlined.Schedule,
                        contentDescription = null,
                        tint = EjPrimary,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(Modifier.width(8.dp))
                    Text(
                        "Proximos passos",
                        style = MaterialTheme.typography.titleLarge,
                        color = EjOnSurface
                    )
                }
                Spacer(Modifier.height(10.dp))
                Text(
                    "Aguarde o prazo de recurso da parte contraria. Caso nao haja recurso, seu advogado podera iniciar a execucao da sentenca para garantir o pagamento.",
                    style = MaterialTheme.typography.bodyLarge,
                    color = EjOnSurface
                )
                Spacer(Modifier.height(12.dp))
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(50))
                        .background(EjSurfaceContainerHigh)
                        .padding(horizontal = 14.dp, vertical = 6.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Outlined.Schedule,
                            contentDescription = null,
                            tint = EjOnSurfaceVariant,
                            modifier = Modifier.size(14.dp)
                        )
                        Spacer(Modifier.width(6.dp))
                        Text(
                            "Prazo final: 24 Out",
                            style = MaterialTheme.typography.labelMedium,
                            color = EjOnSurfaceVariant
                        )
                    }
                }
            }

            // CTA gradient card for chatbot
            item {
                Spacer(Modifier.height(24.dp))
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(16.dp))
                        .background(
                            Brush.linearGradient(
                                colors = listOf(Color(0xFF041631), Color(0xFF1B2B47)),
                                start = Offset(0f, 0f),
                                end = Offset(Float.POSITIVE_INFINITY, Float.POSITIVE_INFINITY)
                            )
                        )
                        .padding(20.dp)
                ) {
                    Column {
                        Text(
                            "Restou alguma duvida sobre o texto juridico?",
                            style = MaterialTheme.typography.titleLarge,
                            color = Color.White
                        )
                        Spacer(Modifier.height(6.dp))
                        Text(
                            "Nosso Consultor IA explica em linguagem simples.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = Color.White.copy(alpha = 0.7f)
                        )
                        Spacer(Modifier.height(16.dp))
                        Button(
                            onClick = onConsultorIaClick,
                            colors = ButtonDefaults.buttonColors(containerColor = EjSecondaryContainer),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(48.dp)
                        ) {
                            Text(
                                "Perguntar ao Consultor IA",
                                color = EjOnSecondaryFixed,
                                style = MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.Bold)
                            )
                        }
                    }
                }
                Spacer(Modifier.height(32.dp))
            }
        }
    }
}
