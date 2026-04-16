package com.aethixdigital.portaljuridico.cliente.features.processo

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowForward
import androidx.compose.material.icons.automirrored.outlined.KeyboardArrowRight
import androidx.compose.material.icons.outlined.AccountBalance
import androidx.compose.material.icons.outlined.Chat
import androidx.compose.material.icons.outlined.Gavel
import androidx.compose.material.icons.outlined.Lightbulb
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.icons.outlined.Payments
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.Schedule
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextDecoration
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.aethixdigital.portaljuridico.ui.theme.EjBackground
import com.aethixdigital.portaljuridico.ui.theme.EjOnPrimary
import com.aethixdigital.portaljuridico.ui.theme.EjOnPrimaryContainer
import com.aethixdigital.portaljuridico.ui.theme.EjOnSecondaryFixed
import com.aethixdigital.portaljuridico.ui.theme.EjOnSurface
import com.aethixdigital.portaljuridico.ui.theme.EjOnSurfaceVariant
import com.aethixdigital.portaljuridico.ui.theme.EjPrimary
import com.aethixdigital.portaljuridico.ui.theme.EjPrimaryContainer
import com.aethixdigital.portaljuridico.ui.theme.EjSecondary
import com.aethixdigital.portaljuridico.ui.theme.EjSecondaryFixed
import com.aethixdigital.portaljuridico.ui.theme.EjSurfaceContainer
import com.aethixdigital.portaljuridico.ui.theme.EjSurfaceContainerLow
import com.aethixdigital.portaljuridico.ui.theme.EjSurfaceContainerLowest

private data class ProcessoMock(val id: String, val nome: String, val numeroCnj: String)

private val processosMock = listOf(
    ProcessoMock("1", "Acao de Cobranca", "0001234-56.2023.8.26.0100"),
    ProcessoMock("2", "Inventario Extrajudicial", "0007890-12.2022.8.26.0050"),
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProcessoListScreen(
    onProcessoClick: (String) -> Unit,
    onNotificacoesClick: () -> Unit = {},
    onPerfilClick: () -> Unit = {}
) {
    Scaffold(
        containerColor = EjBackground,
        topBar = {
            CenterAlignedTopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Outlined.AccountBalance,
                            contentDescription = null,
                            tint = EjSecondary,
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(Modifier.width(6.dp))
                        Text(
                            "Meu Processo",
                            style = MaterialTheme.typography.titleLarge,
                            color = EjPrimary
                        )
                    }
                },
                actions = {
                    IconButton(onClick = onNotificacoesClick) {
                        Icon(
                            Icons.Outlined.Notifications,
                            contentDescription = "Notificacoes",
                            tint = EjOnSurfaceVariant
                        )
                    }
                    Box(
                        modifier = Modifier
                            .size(32.dp)
                            .clip(CircleShape)
                            .background(EjPrimaryContainer)
                            .clickable(onClick = onPerfilClick),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            "JC",
                            style = MaterialTheme.typography.labelSmall,
                            color = EjOnPrimaryContainer,
                            fontWeight = FontWeight.Bold
                        )
                    }
                    Spacer(Modifier.width(8.dp))
                },
                colors = TopAppBarDefaults.centerAlignedTopAppBarColors(
                    containerColor = EjSurfaceContainerLowest
                )
            )
        },
        bottomBar = {
            NavigationBar(
                containerColor = EjSurfaceContainerLowest,
                tonalElevation = 0.dp
            ) {
                listOf(
                    Triple(Icons.Outlined.AccountBalance, "Inicio", true),
                    Triple(Icons.Outlined.Schedule, "Andamentos", false),
                    Triple(Icons.Outlined.Payments, "Documentos", false),
                    Triple(Icons.Outlined.Chat, "Pagamentos", false),
                    Triple(Icons.Outlined.Person, "Mais", false),
                ).forEach { (icon, label, selected) ->
                    NavigationBarItem(
                        selected = selected,
                        onClick = {},
                        icon = { Icon(icon, contentDescription = label) },
                        label = { Text(label, style = MaterialTheme.typography.labelSmall) },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = EjSecondary,
                            selectedTextColor = EjSecondary,
                            indicatorColor    = EjSecondaryFixed.copy(alpha = 0.3f),
                            unselectedIconColor = EjOnSurfaceVariant,
                            unselectedTextColor = EjOnSurfaceVariant,
                        )
                    )
                }
            }
        }
    ) { innerPadding ->
        LazyColumn(modifier = Modifier.padding(innerPadding)) {

            // Greeting
            item {
                Column(
                    modifier = Modifier
                        .padding(horizontal = 24.dp)
                        .padding(top = 20.dp)
                ) {
                    Text(
                        "Bem-vindo de volta",
                        style = MaterialTheme.typography.labelMedium,
                        color = EjOnSurfaceVariant
                    )
                    Text(
                        "Ola, Joao!",
                        style = MaterialTheme.typography.displayLarge.copy(fontSize = 30.sp),
                        color = EjPrimary
                    )
                }
            }

            // Featured urgent card
            item {
                Spacer(Modifier.height(20.dp))
                Card(
                    modifier = Modifier
                        .padding(horizontal = 24.dp)
                        .fillMaxWidth()
                        .drawBehind {
                            drawRect(EjSecondary, size = Size(4.dp.toPx(), size.height))
                        },
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = EjSurfaceContainerLowest),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(50))
                                    .background(EjSecondaryFixed)
                                    .padding(horizontal = 10.dp, vertical = 4.dp)
                            ) {
                                Text(
                                    "URGENTE",
                                    style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
                                    color = EjOnSecondaryFixed
                                )
                            }
                            Text(
                                "ha 2 horas",
                                style = MaterialTheme.typography.labelSmall,
                                color = EjOnSurfaceVariant
                            )
                        }
                        Spacer(Modifier.height(10.dp))
                        Text(
                            "Novidades no seu processo",
                            style = MaterialTheme.typography.titleLarge,
                            color = EjOnSurface
                        )
                        Spacer(Modifier.height(4.dp))
                        Text(
                            "Juiz designou data de audiencia",
                            style = MaterialTheme.typography.bodyMedium,
                            color = EjOnSurfaceVariant
                        )
                        Spacer(Modifier.height(12.dp))
                        TextButton(
                            onClick = { onProcessoClick("1") },
                            contentPadding = PaddingValues(0.dp)
                        ) {
                            Text(
                                "Ver Detalhes",
                                color = EjSecondary,
                                style = MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.Bold)
                            )
                            Spacer(Modifier.width(4.dp))
                            Icon(
                                Icons.AutoMirrored.Outlined.ArrowForward,
                                contentDescription = null,
                                tint = EjSecondary,
                                modifier = Modifier.size(16.dp)
                            )
                        }
                    }
                }
            }

            // Tip of the day
            item {
                Spacer(Modifier.height(12.dp))
                Card(
                    modifier = Modifier
                        .padding(horizontal = 24.dp)
                        .fillMaxWidth()
                        .drawBehind {
                            drawRect(
                                EjSecondary.copy(alpha = 0.2f),
                                size = Size(4.dp.toPx(), size.height)
                            )
                        },
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = EjSurfaceContainerLow),
                    elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        verticalAlignment = Alignment.Top
                    ) {
                        Box(
                            modifier = Modifier
                                .size(40.dp)
                                .clip(RoundedCornerShape(8.dp))
                                .background(EjSecondaryFixed),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                Icons.Outlined.Lightbulb,
                                contentDescription = null,
                                tint = EjSecondary,
                                modifier = Modifier.size(22.dp)
                            )
                        }
                        Spacer(Modifier.width(12.dp))
                        Column {
                            Text(
                                "Dica do Dia",
                                style = MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.Bold),
                                color = EjOnSurface
                            )
                            Spacer(Modifier.height(2.dp))
                            Text(
                                "Sentenca nao e o fim — saiba o que fazer apos a decisao judicial.",
                                style = MaterialTheme.typography.bodyMedium,
                                color = EjOnSurfaceVariant
                            )
                            Spacer(Modifier.height(6.dp))
                            Text(
                                "Saiba mais",
                                style = MaterialTheme.typography.labelMedium.copy(
                                    textDecoration = TextDecoration.Underline
                                ),
                                color = EjSecondary
                            )
                        }
                    }
                }
            }

            // Quick access shortcuts
            item {
                Spacer(Modifier.height(20.dp))
                Row(
                    modifier = Modifier
                        .padding(horizontal = 24.dp)
                        .fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Card(
                        modifier = Modifier
                            .weight(1f)
                            .height(90.dp),
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = EjPrimary),
                        elevation = CardDefaults.cardElevation(2.dp)
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Icon(
                                Icons.Outlined.Payments,
                                contentDescription = null,
                                tint = EjSecondaryFixed,
                                modifier = Modifier.size(24.dp)
                            )
                            Spacer(Modifier.height(6.dp))
                            Text(
                                "Faturas e\nPagamentos",
                                style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold),
                                color = EjOnPrimary
                            )
                        }
                    }
                    Card(
                        modifier = Modifier
                            .weight(1f)
                            .height(90.dp),
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = EjSurfaceContainerLowest),
                        elevation = CardDefaults.cardElevation(2.dp)
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Icon(
                                Icons.Outlined.Chat,
                                contentDescription = null,
                                tint = EjPrimary,
                                modifier = Modifier.size(24.dp)
                            )
                            Spacer(Modifier.height(6.dp))
                            Text(
                                "Falar com\nAdvogado",
                                style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold),
                                color = EjOnSurface
                            )
                        }
                    }
                }
            }

            // Active processes header
            item {
                Spacer(Modifier.height(24.dp))
                Row(
                    modifier = Modifier
                        .padding(horizontal = 24.dp)
                        .fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        "Processos Ativos",
                        style = MaterialTheme.typography.titleLarge,
                        color = EjOnSurface
                    )
                    TextButton(onClick = {}) {
                        Text("Ver todos", color = EjSecondary, style = MaterialTheme.typography.labelLarge)
                    }
                }
            }

            // Process cards list
            items(processosMock) { processo ->
                Spacer(Modifier.height(8.dp))
                Card(
                    modifier = Modifier
                        .padding(horizontal = 24.dp)
                        .fillMaxWidth()
                        .clickable { onProcessoClick(processo.id) },
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
                                .background(EjSurfaceContainer),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                Icons.Outlined.Gavel,
                                contentDescription = null,
                                tint = EjPrimary,
                                modifier = Modifier.size(24.dp)
                            )
                        }
                        Spacer(Modifier.width(14.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                processo.nome,
                                style = MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.Bold),
                                color = EjOnSurface,
                                maxLines = 1
                            )
                            Spacer(Modifier.height(2.dp))
                            Text(
                                processo.numeroCnj,
                                style = MaterialTheme.typography.labelSmall,
                                color = EjOnSurfaceVariant,
                                maxLines = 1
                            )
                            Spacer(Modifier.height(6.dp))
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(50))
                                    .background(EjSecondaryFixed)
                                    .padding(horizontal = 8.dp, vertical = 3.dp)
                            ) {
                                Text(
                                    "EM ABERTO",
                                    style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
                                    color = EjOnSecondaryFixed
                                )
                            }
                        }
                        Icon(
                            Icons.AutoMirrored.Outlined.KeyboardArrowRight,
                            contentDescription = null,
                            tint = EjOnSurfaceVariant
                        )
                    }
                }
            }

            item { Spacer(Modifier.height(24.dp)) }
        }
    }
}
