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

    fun getClienteId(): String = clienteId
}
