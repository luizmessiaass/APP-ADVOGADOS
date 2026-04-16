package com.aethixdigital.portaljuridico.cliente.features.processos

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aethixdigital.portaljuridico.common.model.ProcessoSummary
import com.aethixdigital.portaljuridico.data.repository.ProcessoRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ProcessoListViewModel @Inject constructor(
    private val processoRepository: ProcessoRepository
) : ViewModel() {

    sealed class UiState {
        object Loading : UiState()
        data class Success(val processos: List<ProcessoSummary>) : UiState()
        object Empty : UiState()
        data class Error(val message: String) : UiState()
    }

    private val _uiState = MutableStateFlow<UiState>(UiState.Loading)
    val uiState: StateFlow<UiState> = _uiState.asStateFlow()

    init {
        loadProcessos()
    }

    fun loadProcessos() {
        _uiState.value = UiState.Loading
        viewModelScope.launch {
            processoRepository.getProcessos()
                .onSuccess { processos ->
                    _uiState.value = if (processos.isEmpty()) {
                        UiState.Empty
                    } else {
                        UiState.Success(processos)
                    }
                }
                .onFailure { error ->
                    _uiState.value = UiState.Error(
                        error.message ?: "Não conseguimos carregar seus processos. Verifique sua conexão."
                    )
                }
        }
    }
}
