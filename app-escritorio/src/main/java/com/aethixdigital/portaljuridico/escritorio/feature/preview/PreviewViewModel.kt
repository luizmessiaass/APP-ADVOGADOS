package com.aethixdigital.portaljuridico.escritorio.feature.preview

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aethixdigital.portaljuridico.data.repository.ClienteRepository
import com.aethixdigital.portaljuridico.network.model.dto.MovimentacaoDto
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed class PreviewUiState {
    object Loading : PreviewUiState()
    data class Success(
        val clienteNome: String,
        val movimentacoes: List<MovimentacaoDto>,
        val ultimaSincronizacao: String?
    ) : PreviewUiState()
    object Empty : PreviewUiState()
    data class Error(val message: String) : PreviewUiState()
}

@HiltViewModel
class PreviewViewModel @Inject constructor(
    private val clienteRepository: ClienteRepository,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val clienteId: String = checkNotNull(savedStateHandle["clienteId"])

    private val _uiState = MutableStateFlow<PreviewUiState>(PreviewUiState.Loading)
    val uiState: StateFlow<PreviewUiState> = _uiState.asStateFlow()

    init {
        loadPreview()
    }

    fun loadPreview() {
        viewModelScope.launch {
            _uiState.value = PreviewUiState.Loading
            clienteRepository.previewCliente(clienteId).fold(
                onSuccess = { preview ->
                    _uiState.value = if (preview.movimentacoes.isEmpty()) {
                        PreviewUiState.Empty
                    } else {
                        PreviewUiState.Success(
                            clienteNome = preview.cliente.nome,
                            movimentacoes = preview.movimentacoes,
                            ultimaSincronizacao = preview.cliente.ultimaSincronizacao
                        )
                    }
                },
                onFailure = {
                    _uiState.value = PreviewUiState.Error(it.message ?: "Erro ao carregar preview")
                }
            )
        }
    }
}
