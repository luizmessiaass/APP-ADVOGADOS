package com.aethixdigital.portaljuridico.escritorio.feature.clientes.list

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

sealed class ClienteListUiState {
    object Loading : ClienteListUiState()
    data class Success(val clientes: List<ClienteItem>) : ClienteListUiState()
    data class Error(val message: String) : ClienteListUiState()
}

@HiltViewModel
class ClienteListViewModel @Inject constructor(
    private val clienteRepository: ClienteRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow<ClienteListUiState>(ClienteListUiState.Loading)
    val uiState: StateFlow<ClienteListUiState> = _uiState.asStateFlow()

    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    private var allClientes: List<ClienteItem> = emptyList()

    init {
        loadClientes()
    }

    fun loadClientes() {
        viewModelScope.launch {
            _uiState.value = ClienteListUiState.Loading
            clienteRepository.listarClientes().fold(
                onSuccess = { clientes ->
                    allClientes = clientes
                    _uiState.value = ClienteListUiState.Success(filterClientes(clientes, _searchQuery.value))
                },
                onFailure = {
                    _uiState.value = ClienteListUiState.Error(it.message ?: "Erro ao carregar clientes")
                }
            )
        }
    }

    fun onSearchQueryChange(query: String) {
        _searchQuery.value = query
        val current = _uiState.value
        if (current is ClienteListUiState.Success) {
            _uiState.value = ClienteListUiState.Success(filterClientes(allClientes, query))
        }
    }

    private fun filterClientes(clientes: List<ClienteItem>, query: String): List<ClienteItem> {
        if (query.isBlank()) return clientes
        val q = query.trim().lowercase()
        val qDigits = q.filter { it.isDigit() }
        return clientes.filter { cliente ->
            cliente.nome.lowercase().contains(q) ||
                // Only match CPF digits if the query actually contains digits
                (qDigits.isNotEmpty() && cliente.cpf.filter { it.isDigit() }.contains(qDigits)) ||
                (cliente.ultimaSincronizacao?.lowercase()?.contains(q) == true)
        }
    }
}
