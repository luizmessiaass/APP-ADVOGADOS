package com.aethixdigital.portaljuridico.escritorio.feature.clientes.list

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
class ClienteListViewModelTest {
    private val testDispatcher = UnconfinedTestDispatcher()
    private lateinit var fakeRepo: FakeClienteRepository
    private lateinit var viewModel: ClienteListViewModel

    private val sampleClientes = listOf(
        ClienteItem("1", "João Silva", "123.456.789-09", "2h atrás", "Em andamento"),
        ClienteItem("2", "Maria Santos", "987.654.321-00", null, null),
        ClienteItem("3", "Pedro Costa", "111.222.333-44", "1d atrás", "Encerrado")
    )

    @Before
    fun setup() {
        Dispatchers.setMain(testDispatcher)
        fakeRepo = FakeClienteRepository()
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun loadClientes_success_emitsSuccessWithClientes() = runTest {
        fakeRepo.result = Result.success(sampleClientes)
        viewModel = ClienteListViewModel(fakeRepo)
        val state = viewModel.uiState.value
        assertTrue(state is ClienteListUiState.Success)
        assertEquals(3, (state as ClienteListUiState.Success).clientes.size)
    }

    @Test
    fun loadClientes_failure_emitsError() = runTest {
        fakeRepo.result = Result.failure(Exception("Sem conexão"))
        viewModel = ClienteListViewModel(fakeRepo)
        val state = viewModel.uiState.value
        assertTrue(state is ClienteListUiState.Error)
    }

    @Test
    fun searchByName_filtersCorrectly() = runTest {
        fakeRepo.result = Result.success(sampleClientes)
        viewModel = ClienteListViewModel(fakeRepo)
        viewModel.onSearchQueryChange("João")
        val state = viewModel.uiState.value
        assertTrue(state is ClienteListUiState.Success)
        assertEquals(1, (state as ClienteListUiState.Success).clientes.size)
        assertEquals("João Silva", state.clientes[0].nome)
    }

    @Test
    fun searchEmpty_showsAllClientes() = runTest {
        fakeRepo.result = Result.success(sampleClientes)
        viewModel = ClienteListViewModel(fakeRepo)
        viewModel.onSearchQueryChange("")
        val state = viewModel.uiState.value
        assertTrue(state is ClienteListUiState.Success)
        assertEquals(3, (state as ClienteListUiState.Success).clientes.size)
    }
}

class FakeClienteRepository : ClienteRepository {
    var result: Result<List<ClienteItem>> = Result.success(emptyList())
    override suspend fun listarClientes(search: String?) = result
    override suspend fun cadastrarCliente(
        nome: String,
        cpf: String,
        email: String,
        numeroCnj: String
    ): Result<String> = Result.success("fake-id")
    override suspend fun getClienteById(id: String): Result<ClienteItem> =
        Result.success(ClienteItem("1", "Test", "00000000000", null, null))
    override suspend fun previewCliente(clienteId: String): Result<PreviewResponse> =
        Result.success(PreviewResponse(ClienteItem("1", "Test", "00000000000", null, null), emptyList()))
    override suspend fun enviarMensagem(clienteId: String, texto: String): Result<String> =
        Result.success("fake-msg-id")
    override suspend fun getPortalSessionUrl(): Result<String> =
        Result.success("https://billing.stripe.com/test")
}
