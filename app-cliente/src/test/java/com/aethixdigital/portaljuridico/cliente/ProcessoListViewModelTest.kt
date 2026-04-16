package com.aethixdigital.portaljuridico.cliente

import com.aethixdigital.portaljuridico.cliente.features.processos.ProcessoListViewModel
import com.aethixdigital.portaljuridico.common.model.Movimentacao
import com.aethixdigital.portaljuridico.common.model.ProcessoDetail
import com.aethixdigital.portaljuridico.common.model.ProcessoSummary
import com.aethixdigital.portaljuridico.data.repository.ProcessoRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class ProcessoListViewModelTest {

    private val testDispatcher = StandardTestDispatcher()
    private lateinit var fakeRepository: FakeProcessoRepository

    @Before
    fun setUp() {
        Dispatchers.setMain(testDispatcher)
        fakeRepository = FakeProcessoRepository()
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `estado inicial e Loading`() = runTest {
        // Repositório bloqueia para que possamos verificar o estado inicial
        fakeRepository.processosResult = null // será configurado abaixo

        // Configura resultado depois que o viewmodel já iniciou
        fakeRepository.processosResult = Result.success(emptyList())

        val viewModel = ProcessoListViewModel(fakeRepository)
        // O estado inicial antes de qualquer avanço deve ser Loading
        assertEquals(ProcessoListViewModel.UiState.Loading, viewModel.uiState.value)
    }

    @Test
    fun `quando repositorio retorna lista vazia estado e Empty`() = runTest {
        fakeRepository.processosResult = Result.success(emptyList())

        val viewModel = ProcessoListViewModel(fakeRepository)
        advanceUntilIdle()

        assertEquals(ProcessoListViewModel.UiState.Empty, viewModel.uiState.value)
    }

    @Test
    fun `quando repositorio retorna lista estado e Success com processos`() = runTest {
        val processos = listOf(
            ProcessoSummary(
                id = "1",
                numeroCnj = "0001234-55.2023.8.26.0100",
                tribunal = "TJSP",
                ultimaSincronizacao = null,
                desatualizado = false,
                status = "Aguardando julgamento"
            )
        )
        fakeRepository.processosResult = Result.success(processos)

        val viewModel = ProcessoListViewModel(fakeRepository)
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertTrue("Esperado Success mas foi: $state", state is ProcessoListViewModel.UiState.Success)
        assertEquals(processos, (state as ProcessoListViewModel.UiState.Success).processos)
    }

    @Test
    fun `quando repositorio lanca excecao estado e Error`() = runTest {
        fakeRepository.processosResult = Result.failure(RuntimeException("Sem conexão"))

        val viewModel = ProcessoListViewModel(fakeRepository)
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertTrue("Esperado Error mas foi: $state", state is ProcessoListViewModel.UiState.Error)
    }

    @Test
    fun `loadProcessos recarrega e atualiza estado`() = runTest {
        fakeRepository.processosResult = Result.failure(RuntimeException("Erro"))
        val viewModel = ProcessoListViewModel(fakeRepository)
        advanceUntilIdle()

        assertTrue(viewModel.uiState.value is ProcessoListViewModel.UiState.Error)

        // Agora configura sucesso e recarrega
        val processos = listOf(
            ProcessoSummary("1", "0001234-55.2023.8.26.0100", "TJSP", null, false, "Em andamento")
        )
        fakeRepository.processosResult = Result.success(processos)
        viewModel.loadProcessos()
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertTrue("Esperado Success após retry, mas foi: $state", state is ProcessoListViewModel.UiState.Success)
    }
}

// --- Test double ---

class FakeProcessoRepository : ProcessoRepository {
    var processosResult: Result<List<ProcessoSummary>>? = Result.success(emptyList())
    var processoDetailResult: Result<ProcessoDetail> = Result.failure(NotImplementedError())
    var movimentacoesResult: Result<List<Movimentacao>> = Result.success(emptyList())

    override suspend fun getProcessos(): Result<List<ProcessoSummary>> =
        processosResult ?: Result.success(emptyList())

    override suspend fun getProcessoDetail(id: String): Result<ProcessoDetail> =
        processoDetailResult

    override suspend fun getMovimentacoes(id: String): Result<List<Movimentacao>> =
        movimentacoesResult
}
