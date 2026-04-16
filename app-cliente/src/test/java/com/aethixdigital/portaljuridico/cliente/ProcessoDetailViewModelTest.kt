package com.aethixdigital.portaljuridico.cliente

import com.aethixdigital.portaljuridico.cliente.features.processos.ProcessoDetailViewModel
import com.aethixdigital.portaljuridico.common.model.Movimentacao
import com.aethixdigital.portaljuridico.common.model.ProcessoDetail
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class ProcessoDetailViewModelTest {

    private val testDispatcher = StandardTestDispatcher()
    private lateinit var fakeRepository: FakeProcessoRepository

    private val processoDetail = ProcessoDetail(
        id = "proc-1",
        numeroCnj = "0001234-55.2023.8.26.0100",
        tribunal = "TJSP",
        ultimaSincronizacao = "2025-05-15T10:00:00Z",
        desatualizado = false,
        status = "Aguardando julgamento",
        comarca = "São Paulo",
        classeProcessual = "Ação Civil",
        requerente = "João Silva",
        requerido = "Empresa X",
        telefoneWhatsapp = "+5511999999999"
    )

    @Before
    fun setUp() {
        Dispatchers.setMain(testDispatcher)
        fakeRepository = FakeProcessoRepository()
        fakeRepository.processoDetailResult = Result.success(processoDetail)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `loadProcessoDetail emite Loading e depois Success com processo e movimentacoes`() = runTest {
        val movimentacoes = listOf(
            movimentacao("mov-1", "2025-05-15T10:00:00Z"),
            movimentacao("mov-2", "2025-05-01T08:00:00Z")
        )
        fakeRepository.movimentacoesResult = Result.success(movimentacoes)

        val viewModel = ProcessoDetailViewModel(fakeRepository)
        // Estado inicial é Loading
        assertTrue(viewModel.uiState.value.isLoading)

        viewModel.loadProcessoDetail("proc-1")
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertFalse(state.isLoading)
        assertEquals(processoDetail, state.processo)
        assertFalse(state.hasEmptyTimeline)
        assertEquals(2, state.movimentacoesByMonth.values.flatten().size)
    }

    @Test
    fun `quando movimentacoes e vazia hasEmptyTimeline e true`() = runTest {
        fakeRepository.movimentacoesResult = Result.success(emptyList())

        val viewModel = ProcessoDetailViewModel(fakeRepository)
        viewModel.loadProcessoDetail("proc-1")
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertTrue(state.hasEmptyTimeline)
        assertTrue(state.movimentacoesByMonth.isEmpty())
    }

    @Test
    fun `movimentacoesByMonth agrupa corretamente mesmo mes e mes diferente`() = runTest {
        // Três movimentações: duas em maio 2025, uma em abril 2025
        val movimentacoes = listOf(
            movimentacao("mov-1", "2025-05-15T10:00:00Z"),
            movimentacao("mov-2", "2025-05-01T08:00:00Z"),
            movimentacao("mov-3", "2025-04-20T09:00:00Z")
        )
        fakeRepository.movimentacoesResult = Result.success(movimentacoes)

        val viewModel = ProcessoDetailViewModel(fakeRepository)
        viewModel.loadProcessoDetail("proc-1")
        advanceUntilIdle()

        val byMonth = viewModel.uiState.value.movimentacoesByMonth
        assertEquals(2, byMonth.size)
        assertTrue(byMonth.containsKey("Maio 2025"))
        assertTrue(byMonth.containsKey("Abril 2025"))
        assertEquals(2, byMonth["Maio 2025"]!!.size)
        assertEquals(1, byMonth["Abril 2025"]!!.size)
    }

    @Test
    fun `movimentacoesByMonth grupos em ordem decrescente mais recente primeiro`() = runTest {
        // Maio deve aparecer ANTES de Abril (mais recente primeiro)
        val movimentacoes = listOf(
            movimentacao("mov-1", "2025-04-20T09:00:00Z"),
            movimentacao("mov-2", "2025-05-15T10:00:00Z"),
            movimentacao("mov-3", "2025-05-01T08:00:00Z")
        )
        fakeRepository.movimentacoesResult = Result.success(movimentacoes)

        val viewModel = ProcessoDetailViewModel(fakeRepository)
        viewModel.loadProcessoDetail("proc-1")
        advanceUntilIdle()

        val keys = viewModel.uiState.value.movimentacoesByMonth.keys.toList()
        assertEquals("Maio 2025", keys[0])
        assertEquals("Abril 2025", keys[1])
    }

    @Test
    fun `itens dentro do grupo em ordem decrescente mais recente primeiro`() = runTest {
        // Dentro de maio: "2025-05-15" deve aparecer antes de "2025-05-01"
        val movimentacoes = listOf(
            movimentacao("mov-2", "2025-05-01T08:00:00Z"),
            movimentacao("mov-1", "2025-05-15T10:00:00Z"),
            movimentacao("mov-3", "2025-04-20T09:00:00Z")
        )
        fakeRepository.movimentacoesResult = Result.success(movimentacoes)

        val viewModel = ProcessoDetailViewModel(fakeRepository)
        viewModel.loadProcessoDetail("proc-1")
        advanceUntilIdle()

        val maioritems = viewModel.uiState.value.movimentacoesByMonth["Maio 2025"]!!
        assertEquals("mov-1", maioritems[0].id) // 2025-05-15 primeiro
        assertEquals("mov-2", maioritems[1].id) // 2025-05-01 segundo
    }

    @Test
    fun `groupMovimentacoesByMonth estatico funciona corretamente`() {
        val movimentacoes = listOf(
            movimentacao("mov-1", "2025-05-15T10:00:00Z"),
            movimentacao("mov-2", "2025-05-01T08:00:00Z"),
            movimentacao("mov-3", "2025-04-20T09:00:00Z")
        )

        val result = ProcessoDetailViewModel.groupMovimentacoesByMonth(movimentacoes)
        val keys = result.keys.toList()

        assertEquals("Maio 2025", keys[0])
        assertEquals("Abril 2025", keys[1])

        val maioItems = result["Maio 2025"]!!
        assertEquals("mov-1", maioItems[0].id)
        assertEquals("mov-2", maioItems[1].id)
    }

    // Helper
    private fun movimentacao(id: String, dataHora: String) = Movimentacao(
        id = id,
        dataHora = dataHora,
        descricaoOriginal = "Despacho de teste",
        status = "Em andamento",
        explicacao = "Explicação de teste",
        proximaData = null,
        impacto = null
    )
}
