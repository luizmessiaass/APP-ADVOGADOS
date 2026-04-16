package com.aethixdigital.portaljuridico.cliente.features.lgpd

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import com.aethixdigital.portaljuridico.cliente.navigation.Routes

@Composable
fun LgpdConsentScreen(navController: NavController) {
    val viewModel: LgpdConsentViewModel = hiltViewModel()
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val listState = rememberLazyListState()
    var checkboxChecked by remember { mutableStateOf(false) }
    var showRejectDialog by remember { mutableStateOf(false) }

    // D-11: derivedStateOf scroll detection — Accept enabled only when at end AND checked
    val hasScrolledToEnd by remember {
        derivedStateOf {
            val lastVisible = listState.layoutInfo.visibleItemsInfo.lastOrNull()
            val totalItems = listState.layoutInfo.totalItemsCount
            lastVisible != null && lastVisible.index >= totalItems - 1 && totalItems > 0
        }
    }

    LaunchedEffect(uiState) {
        if (uiState is LgpdConsentViewModel.UiState.Success) {
            navController.navigate(Routes.PROCESSO_LIST) {
                popUpTo(Routes.LGPD_CONSENT) { inclusive = true }
            }
        }
    }

    // D-12: Back button on LGPD screen triggers reject flow
    BackHandler { showRejectDialog = true }

    if (showRejectDialog) {
        AlertDialog(
            onDismissRequest = { showRejectDialog = false },
            title = { Text("Uso do app requer aceite") },
            text = { Text("Para usar o app, é necessário aceitar a política de privacidade. Deseja sair?") },
            confirmButton = {
                TextButton(
                    onClick = {
                        showRejectDialog = false
                        viewModel.rejectConsent()
                        navController.navigate(Routes.LOGIN) {
                            popUpTo(0) { inclusive = true }
                        }
                    }
                ) { Text("Sair", color = MaterialTheme.colorScheme.error) }
            },
            dismissButton = {
                TextButton(onClick = { showRejectDialog = false }) { Text("Cancelar") }
            }
        )
    }

    Scaffold { innerPadding ->
        LazyColumn(
            state = listState,
            contentPadding = PaddingValues(
                start = 16.dp,
                end = 16.dp,
                top = innerPadding.calculateTopPadding() + 16.dp,
                bottom = innerPadding.calculateBottomPadding() + 16.dp
            ),
            modifier = Modifier.background(MaterialTheme.colorScheme.surfaceVariant)
        ) {
            item {
                Text(
                    text = "Política de Privacidade",
                    style = MaterialTheme.typography.titleLarge,
                    modifier = Modifier.padding(bottom = 16.dp)
                )
            }
            item {
                Text(
                    text = "Role até o final para aceitar.",
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(bottom = 16.dp)
                )
            }
            item {
                Text(
                    text = "1. Coleta de dados\n\nO Portal Jurídico coleta seu endereço de e-mail e informações sobre os processos judiciais aos quais você está vinculado, fornecidas pelo seu escritório de advocacia.",
                    style = MaterialTheme.typography.bodyLarge,
                    modifier = Modifier.padding(bottom = 16.dp)
                )
            }
            item {
                Text(
                    text = "2. Uso dos dados\n\nSeus dados são utilizados exclusivamente para exibir informações sobre seus processos jurídicos e permitir comunicação com o escritório responsável.",
                    style = MaterialTheme.typography.bodyLarge,
                    modifier = Modifier.padding(bottom = 16.dp)
                )
            }
            item {
                Text(
                    text = "3. Tradução por inteligência artificial\n\nAs movimentações processuais são traduzidas para linguagem simples com o auxílio da API Claude da Anthropic. O texto original do processo não é armazenado nos servidores da Anthropic após o processamento.",
                    style = MaterialTheme.typography.bodyLarge,
                    modifier = Modifier.padding(bottom = 16.dp)
                )
            }
            item {
                Text(
                    text = "4. Sub-processadores internacionais\n\nPara viabilizar a tradução automatizada, utilizamos a Anthropic PBC (EUA) como sub-processadora internacional, conforme o Art. 33 da LGPD.",
                    style = MaterialTheme.typography.bodyLarge,
                    modifier = Modifier.padding(bottom = 16.dp)
                )
            }
            item {
                Text(
                    text = "5. Compartilhamento\n\nSeus dados são compartilhados apenas com o escritório de advocacia que te cadastrou na plataforma. Não vendemos, alugamos ou cedemos seus dados a terceiros.",
                    style = MaterialTheme.typography.bodyLarge,
                    modifier = Modifier.padding(bottom = 16.dp)
                )
            }
            item {
                Text(
                    text = "6. Seus direitos (LGPD, Art. 18)\n\nVocê tem o direito de acessar, corrigir, solicitar a exclusão ou portabilidade dos seus dados pessoais.",
                    style = MaterialTheme.typography.bodyLarge,
                    modifier = Modifier.padding(bottom = 16.dp)
                )
            }
            item {
                Text(
                    text = "7. Segurança\n\nAdotamos medidas técnicas e organizacionais para proteger seus dados contra acesso não autorizado, incluindo criptografia em trânsito (TLS) e isolamento de dados por escritório (Row Level Security).",
                    style = MaterialTheme.typography.bodyLarge,
                    modifier = Modifier.padding(bottom = 16.dp)
                )
            }
            item {
                Text(
                    text = "8. Contato\n\nDúvidas sobre esta política? Entre em contato pelo e-mail privacidade@portaljuridico.com.br. O Portal Jurídico é operado pela AETHIX DIGITAL LTDA.",
                    style = MaterialTheme.typography.bodyLarge,
                    modifier = Modifier.padding(bottom = 24.dp)
                )
            }

            // Checkbox — disabled until scrolled to end
            item {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.padding(bottom = 16.dp)
                ) {
                    Checkbox(
                        checked = checkboxChecked,
                        onCheckedChange = { if (hasScrolledToEnd) checkboxChecked = it },
                        enabled = hasScrolledToEnd,
                        modifier = Modifier.testTag("lgpd_checkbox")
                    )
                    Spacer(Modifier.width(8.dp))
                    Text(
                        text = "Li e aceito os termos de uso e política de privacidade.",
                        style = MaterialTheme.typography.labelLarge
                    )
                }
            }

            // Accept button
            item {
                Button(
                    onClick = { viewModel.acceptConsent() },
                    enabled = hasScrolledToEnd && checkboxChecked &&
                            uiState !is LgpdConsentViewModel.UiState.Loading,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 8.dp)
                ) {
                    if (uiState is LgpdConsentViewModel.UiState.Loading) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(16.dp),
                            color = Color.White
                        )
                    } else {
                        Text("Aceitar")
                    }
                }
            }

            // Reject link
            item {
                TextButton(
                    onClick = { showRejectDialog = true },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Recusar", color = MaterialTheme.colorScheme.error)
                }
            }
        }
    }
}
