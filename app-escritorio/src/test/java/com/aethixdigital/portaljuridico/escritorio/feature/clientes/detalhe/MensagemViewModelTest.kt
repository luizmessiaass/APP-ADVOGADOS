package com.aethixdigital.portaljuridico.escritorio.feature.clientes.detalhe

import com.aethixdigital.portaljuridico.data.repository.ClienteRepository
import com.aethixdigital.portaljuridico.network.model.dto.ClienteItem
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
class MensagemViewModelTest {
    private val testDispatcher = UnconfinedTestDispatcher()
    private lateinit var fakeRepo: FakeMensagemClienteRepository
    private lateinit var viewModel: MensagemViewModel

    @Before
    fun setup() {
        Dispatchers.setMain(testDispatcher)
        fakeRepo = FakeMensagemClienteRepository()
        viewModel = MensagemViewModel(fakeRepo)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun initialState_isIdle() {
        assertTrue(viewModel.uiState.value is MensagemUiState.Idle)
    }

    @Test
    fun enviar_emptyText_remainsIdle() = runTest {
        viewModel.enviar("cli-1", "")
        assertTrue(viewModel.uiState.value is MensagemUiState.Idle)
    }

    @Test
    fun enviar_blankText_remainsIdle() = runTest {
        viewModel.enviar("cli-1", "   ")
        assertTrue(viewModel.uiState.value is MensagemUiState.Idle)
    }

    @Test
    fun enviar_success_emitsSuccess() = runTest {
        fakeRepo.enviarResult = Result.success("msg-uuid-456")
        viewModel.enviar("cli-1", "Olá, temos novidades no seu processo.")
        val state = viewModel.uiState.value
        assertTrue(state is MensagemUiState.Success)
        assertEquals("msg-uuid-456", (state as MensagemUiState.Success).mensagemId)
    }

    @Test
    fun enviar_failure_emitsError() = runTest {
        fakeRepo.enviarResult = Result.failure(Exception("Timeout de rede"))
        viewModel.enviar("cli-1", "Mensagem de teste")
        assertTrue(viewModel.uiState.value is MensagemUiState.Error)
        assertEquals("Timeout de rede", (viewModel.uiState.value as MensagemUiState.Error).message)
    }

    @Test
    fun resetState_returnsToIdle() = runTest {
        fakeRepo.enviarResult = Result.success("msg-1")
        viewModel.enviar("cli-1", "Teste")
        viewModel.resetState()
        assertTrue(viewModel.uiState.value is MensagemUiState.Idle)
    }
}

class FakeMensagemClienteRepository : ClienteRepository {
    var enviarResult: Result<String> = Result.success("fake-msg-id")

    override suspend fun listarClientes(search: String?) = Result.success(emptyList<ClienteItem>())

    override suspend fun cadastrarCliente(
        nome: String,
        cpf: String,
        email: String,
        numeroCnj: String
    ) = Result.success("id")

    override suspend fun getClienteById(id: String) =
        Result.success(ClienteItem("1", "T", "00000000000", null, null))

    override suspend fun previewCliente(clienteId: String) =
        Result.success(PreviewResponse(ClienteItem("1", "T", "00000000000", null, null), emptyList()))

    override suspend fun enviarMensagem(clienteId: String, texto: String) = enviarResult

    override suspend fun getPortalSessionUrl() = Result.success("https://billing.stripe.com/test")

    override suspend fun deletarCliente(clienteId: String): Result<Unit> = Result.success(Unit)
}
