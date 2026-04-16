package com.aethixdigital.portaljuridico.escritorio.feature.clientes.cadastro

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CadastroClienteScreen(
    onSuccess: () -> Unit,
    onBack: () -> Unit,
    viewModel: CadastroClienteViewModel = hiltViewModel()
) {
    val formState by viewModel.formState.collectAsState()
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(uiState) {
        if (uiState is CadastroUiState.Success) onSuccess()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Cadastrar Cliente") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Voltar")
                    }
                }
            )
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Nome
            OutlinedTextField(
                value = formState.nome,
                onValueChange = viewModel::onNomeChange,
                label = { Text("Nome completo *") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )

            // CPF — validação em tempo real (D-11)
            OutlinedTextField(
                value = formState.cpf,
                onValueChange = viewModel::onCpfChange,
                label = { Text("CPF *") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                isError = formState.cpfError != null,
                supportingText = formState.cpfError?.let { { Text(it, color = MaterialTheme.colorScheme.error) } },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                placeholder = { Text("000.000.000-00") }
            )

            // E-mail
            OutlinedTextField(
                value = formState.email,
                onValueChange = viewModel::onEmailChange,
                label = { Text("E-mail *") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                isError = formState.emailError != null,
                supportingText = formState.emailError?.let { { Text(it, color = MaterialTheme.colorScheme.error) } },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email)
            )

            // CNJ — validação em tempo real (D-11), aceita com ou sem formatação
            OutlinedTextField(
                value = formState.cnj,
                onValueChange = viewModel::onCnjChange,
                label = { Text("Número do processo (CNJ) *") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                isError = formState.cnjError != null,
                supportingText = formState.cnjError?.let { { Text(it, color = MaterialTheme.colorScheme.error) } },
                placeholder = { Text("0001234-55.2023.8.26.0100") }
            )

            Spacer(modifier = Modifier.height(8.dp))

            if (uiState is CadastroUiState.Error) {
                Text(
                    text = (uiState as CadastroUiState.Error).message,
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodySmall
                )
            }

            Button(
                onClick = viewModel::cadastrar,
                modifier = Modifier.fillMaxWidth(),
                enabled = formState.isSubmitEnabled && uiState !is CadastroUiState.Loading
            ) {
                if (uiState is CadastroUiState.Loading) {
                    CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                } else {
                    Text("Cadastrar")
                }
            }

            Text(
                "* Campos obrigatórios",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}
