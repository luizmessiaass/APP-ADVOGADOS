package com.aethixdigital.portaljuridico.escritorio.feature.preview

import androidx.lifecycle.SavedStateHandle
import com.aethixdigital.portaljuridico.data.repository.ClienteRepository
import com.aethixdigital.portaljuridico.network.model.dto.ClienteItem
import com.aethixdigital.portaljuridico.network.model.dto.MovimentacaoDto
import com.aethixdigital.portaljuridico.network.model.dto.PreviewResponse
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class PreviewViewModelTest {
    private val testDispatcher = UnconfinedTestDispatcher()
    private lateinit var fakeRepo: FakePreviewClienteRepository

    private val sampleMov = MovimentacaoDto(
        id = "mov-1",
        status = "Em julgamento",
        proximaData = "20/06/2026",
        explicacao = "O juiz está avaliando",
        impacto = "Aguarde decisão",
        disclaimer = "Explicação gerada por IA — confirme com seu advogado"
    )
    private val sampleCliente = ClienteItem("cli-1", "João", "123.456.789-09", "2h atrás", "Em andamento")

    @Before
    fun setup() {
        Dispatchers.setMain(testDispatcher)
        fakeRepo = FakePreviewClienteRepository()
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    private fun buildViewModel(): PreviewViewModel =
        PreviewViewModel(fakeRepo, SavedStateHandle(mapOf("clienteId" to "cli-1")))

    @Test
    fun loadPreview_success_emitsSuccess() = runTest {
        fakeRepo.previewResult = Result.success(PreviewResponse(sampleCliente, listOf(sampleMov)))
        val vm = buildViewModel()
        val state = vm.uiState.value
        assertTrue(state is PreviewUiState.Success)
        assertEquals(1, (state as PreviewUiState.Success).movimentacoes.size)
    }

    @Test
    fun loadPreview_emptyList_emitsEmpty() = runTest {
        fakeRepo.previewResult = Result.success(PreviewResponse(sampleCliente, emptyList()))
        val vm = buildViewModel()
        assertTrue(vm.uiState.value is PreviewUiState.Empty)
    }

    @Test
    fun loadPreview_failure_emitsError() = runTest {
        fakeRepo.previewResult = Result.failure(Exception("Falha de rede"))
        val vm = buildViewModel()
        assertTrue(vm.uiState.value is PreviewUiState.Error)
    }
}

class FakePreviewClienteRepository : ClienteRepository {
    var previewResult: Result<PreviewResponse> = Result.success(
        PreviewResponse(
            ClienteItem("1", "Test", "00000000000", null, null),
            emptyList()
        )
    )

    override suspend fun listarClientes(search: String?) = Result.success(emptyList<ClienteItem>())

    override suspend fun cadastrarCliente(
        nome: String,
        cpf: String,
        email: String,
        numeroCnj: String
    ) = Result.success("id")

    override suspend fun getClienteById(id: String) =
        Result.success(ClienteItem("1", "Test", "00000000000", null, null))

    override suspend fun previewCliente(clienteId: String) = previewResult

    override suspend fun enviarMensagem(clienteId: String, texto: String): Result<String> =
        Result.success("fake-msg-id")

    override suspend fun getPortalSessionUrl(): Result<String> =
        Result.success("https://billing.stripe.com/test")

    override suspend fun deletarCliente(clienteId: String): Result<Unit> =
        Result.success(Unit)
}
