package com.aethixdigital.portaljuridico.cliente.features.processos

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aethixdigital.portaljuridico.common.model.Movimentacao
import com.aethixdigital.portaljuridico.common.model.ProcessoDetail
import com.aethixdigital.portaljuridico.data.repository.ProcessoRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.time.LocalDate
import javax.inject.Inject

@HiltViewModel
class ProcessoDetailViewModel @Inject constructor(
    private val processoRepository: ProcessoRepository
) : ViewModel() {

    data class ProcessoDetailUiState(
        val isLoading: Boolean = true,
        val processo: ProcessoDetail? = null,
        val movimentacoesByMonth: Map<String, List<Movimentacao>> = emptyMap(),
        val hasEmptyTimeline: Boolean = false,
        val error: String? = null,
        val expandedMovimentacaoIds: Set<String> = emptySet(),
        val dadosCadastraisExpanded: Boolean = false,
    )

    private val _uiState = MutableStateFlow(ProcessoDetailUiState())
    val uiState: StateFlow<ProcessoDetailUiState> = _uiState.asStateFlow()

    fun loadProcessoDetail(processoId: String) {
        _uiState.value = ProcessoDetailUiState(isLoading = true)
        viewModelScope.launch {
            val processoDeferred = async { processoRepository.getProcessoDetail(processoId) }
            val movimentacoesDeferred = async { processoRepository.getMovimentacoes(processoId) }

            val processoResult = processoDeferred.await()
            val movimentacoesResult = movimentacoesDeferred.await()

            if (processoResult.isFailure) {
                _uiState.value = ProcessoDetailUiState(
                    isLoading = false,
                    error = processoResult.exceptionOrNull()?.message
                        ?: "Não conseguimos carregar os detalhes deste processo. Verifique sua conexão."
                )
                return@launch
            }

            val processo = processoResult.getOrNull()!!
            val movimentacoes = movimentacoesResult.getOrNull() ?: emptyList()
            val byMonth = groupMovimentacoesByMonth(movimentacoes)

            _uiState.value = ProcessoDetailUiState(
                isLoading = false,
                processo = processo,
                movimentacoesByMonth = byMonth,
                hasEmptyTimeline = movimentacoes.isEmpty(),
                error = null
            )
        }
    }

    fun toggleMovimentacao(id: String) {
        val current = _uiState.value.expandedMovimentacaoIds
        _uiState.value = _uiState.value.copy(
            expandedMovimentacaoIds = if (id in current) current - id else current + id
        )
    }

    fun toggleDadosCadastrais() {
        _uiState.value = _uiState.value.copy(
            dadosCadastraisExpanded = !_uiState.value.dadosCadastraisExpanded
        )
    }

    companion object {
        private val MESES_PT = listOf(
            "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
            "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
        )

        /**
         * Agrupa movimentações por mês/ano no formato "Maio 2025".
         * Grupos em ordem decrescente (mais recente primeiro).
         * Itens dentro de cada grupo em ordem decrescente por dataHora.
         */
        fun groupMovimentacoesByMonth(movimentacoes: List<Movimentacao>): Map<String, List<Movimentacao>> {
            if (movimentacoes.isEmpty()) return emptyMap()

            // Ordena todos os itens por dataHora decrescente
            val sorted = movimentacoes.sortedByDescending { it.dataHora }

            // Agrupa por mês/ano usando LinkedHashMap para manter ordem de inserção
            val grouped = LinkedHashMap<String, MutableList<Movimentacao>>()
            for (mov in sorted) {
                val localDate = LocalDate.parse(mov.dataHora.take(10))
                val mes = MESES_PT[localDate.monthValue - 1]
                val chave = "$mes ${localDate.year}"
                grouped.getOrPut(chave) { mutableListOf() }.add(mov)
            }

            return grouped
        }
    }
}
