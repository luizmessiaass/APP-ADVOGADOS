package com.aethixdigital.portaljuridico.escritorio.feature.clientes.detalhe

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aethixdigital.portaljuridico.data.repository.ClienteRepository
import com.aethixdigital.portaljuridico.network.model.dto.ClienteItem
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed class DeletarClienteState {
    object Idle : DeletarClienteState()
    object Loading : DeletarClienteState()
    object Success : DeletarClienteState()
    data class Error(val message: String) : DeletarClienteState()
}

sealed class ClienteDetalheUiState {
    object Loading : ClienteDetalheUiState()
    data class Success(val cliente: ClienteItem) : ClienteDetalheUiState()
    data class Error(val message: String) : ClienteDetalheUiState()
}

@HiltViewModel
class ClienteDetalheViewModel @Inject constructor(
    private val clienteRepository: ClienteRepository,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    // Navigation Compose 2.9 type-safe: SavedStateHandle auto-populated
    private val clienteId: String = checkNotNull(savedStateHandle["clienteId"])

    private val _uiState = MutableStateFlow<ClienteDetalheUiState>(ClienteDetalheUiState.Loading)
    val uiState: StateFlow<ClienteDetalheUiState> = _uiState.asStateFlow()

    private val _portalUrl = MutableStateFlow<String?>(null)
    val portalUrl: StateFlow<String?> = _portalUrl.asStateFlow()

    private val _portalError = MutableStateFlow<String?>(null)
    val portalError: StateFlow<String?> = _portalError.asStateFlow()

    private val _deletarState = MutableStateFlow<DeletarClienteState>(DeletarClienteState.Idle)
    val deletarState: StateFlow<DeletarClienteState> = _deletarState.asStateFlow()

    init {
        loadCliente()
    }

    private fun loadCliente() {
        viewModelScope.launch {
            clienteRepository.getClienteById(clienteId).fold(
                onSuccess = { _uiState.value = ClienteDetalheUiState.Success(it) },
                onFailure = { _uiState.value = ClienteDetalheUiState.Error(it.message ?: "Erro") }
            )
        }
    }

    fun loadPortalUrl() {
        viewModelScope.launch {
            clienteRepository.getPortalSessionUrl().fold(
                onSuccess = { url -> _portalUrl.value = url },
                onFailure = { _portalError.value = it.message ?: "Erro ao obter link do portal" }
            )
        }
    }

    fun getClienteId(): String = clienteId

    fun deletarCliente() {
        viewModelScope.launch {
            _deletarState.value = DeletarClienteState.Loading
            clienteRepository.deletarCliente(clienteId).fold(
                onSuccess = { _deletarState.value = DeletarClienteState.Success },
                onFailure = { _deletarState.value = DeletarClienteState.Error(it.message ?: "Erro ao deletar cliente") }
            )
        }
    }
}
