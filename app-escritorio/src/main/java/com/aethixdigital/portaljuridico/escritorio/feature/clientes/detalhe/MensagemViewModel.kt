package com.aethixdigital.portaljuridico.escritorio.feature.clientes.detalhe

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aethixdigital.portaljuridico.data.repository.ClienteRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed class MensagemUiState {
    object Idle : MensagemUiState()
    object Loading : MensagemUiState()
    data class Success(val mensagemId: String) : MensagemUiState()
    data class Error(val message: String) : MensagemUiState()
}

@HiltViewModel
class MensagemViewModel @Inject constructor(
    private val clienteRepository: ClienteRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow<MensagemUiState>(MensagemUiState.Idle)
    val uiState: StateFlow<MensagemUiState> = _uiState.asStateFlow()

    fun enviar(clienteId: String, texto: String) {
        if (texto.isBlank()) return  // guard: não envia mensagem vazia
        viewModelScope.launch {
            _uiState.value = MensagemUiState.Loading
            // D-13: fire-and-forget com feedback visual
            clienteRepository.enviarMensagem(clienteId, texto.trim()).fold(
                onSuccess = { id -> _uiState.value = MensagemUiState.Success(id) },
                onFailure = { _uiState.value = MensagemUiState.Error(it.message ?: "Erro ao enviar mensagem") }
            )
        }
    }

    fun resetState() {
        _uiState.value = MensagemUiState.Idle
    }
}
