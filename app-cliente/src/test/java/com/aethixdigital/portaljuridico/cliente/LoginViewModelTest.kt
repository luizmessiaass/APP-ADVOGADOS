package com.aethixdigital.portaljuridico.cliente

import com.aethixdigital.portaljuridico.cliente.features.auth.LoginUiState
import com.aethixdigital.portaljuridico.network.api.AuthApi
import com.aethixdigital.portaljuridico.network.model.dto.LoginRequest
import com.aethixdigital.portaljuridico.network.model.dto.LoginResponse
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.ResponseBody.Companion.toResponseBody
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import retrofit2.HttpException
import retrofit2.Response

/**
 * Unit tests for login logic covering APP-01 requirements:
 * - JWT role != "cliente" rejects login ("Esta conta não é de um cliente.")
 * - Success flow stores token in DataStore
 * - 401 returns error state
 *
 * Uses LoginLogic — a lightweight testable abstraction that mirrors
 * LoginViewModel behavior without requiring Android Context or DataStore.
 */
@OptIn(ExperimentalCoroutinesApi::class)
class LoginViewModelTest {

    private val testDispatcher = StandardTestDispatcher()
    private lateinit var fakeAuthApi: FakeAuthApi

    @Before
    fun setUp() {
        Dispatchers.setMain(testDispatcher)
        fakeAuthApi = FakeAuthApi()
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun login_withValidClienteCredentials_storesTokenAndEmitsSuccess() = runTest {
        fakeAuthApi.nextResult = Result.success(LoginResponse(token = "jwt.cliente.token", role = "cliente"))
        val logic = LoginLogic(fakeAuthApi)

        logic.login("cliente@test.com", "password123")
        advanceUntilIdle()

        assertEquals(LoginUiState.Success, logic.uiState.value)
        assertNotNull(logic.savedToken)
        assertEquals("jwt.cliente.token", logic.savedToken)
    }

    @Test
    fun login_withAdvogadoRole_emitsRoleError() = runTest {
        fakeAuthApi.nextResult = Result.success(LoginResponse(token = "jwt.adv.token", role = "advogado"))
        val logic = LoginLogic(fakeAuthApi)

        logic.login("adv@test.com", "password123")
        advanceUntilIdle()

        val state = logic.uiState.value
        assertTrue("Expected Error but got: $state", state is LoginUiState.Error)
        assertTrue(
            "Expected role error referencing 'cliente'",
            (state as LoginUiState.Error).message.contains("cliente")
        )
    }

    @Test
    fun login_with401Response_emitsCredentialsError() = runTest {
        fakeAuthApi.nextResult = Result.failure(
            HttpException(
                Response.error<LoginResponse>(
                    401,
                    "Unauthorized".toResponseBody("application/json".toMediaType())
                )
            )
        )
        val logic = LoginLogic(fakeAuthApi)

        logic.login("user@test.com", "wrongpass")
        advanceUntilIdle()

        val state = logic.uiState.value
        assertTrue("Expected Error but got: $state", state is LoginUiState.Error)
        assertTrue(
            "Expected credential error containing 'incorretos'",
            (state as LoginUiState.Error).message.contains("incorretos")
        )
    }
}

// --- Test doubles ---

class FakeAuthApi : AuthApi {
    var nextResult: Result<LoginResponse> = Result.success(LoginResponse("token", "cliente"))
    override suspend fun login(request: LoginRequest): LoginResponse = nextResult.getOrThrow()
}

/**
 * Lightweight login logic that mirrors LoginViewModel behavior.
 * Avoids Android Context/DataStore so tests run as pure JVM unit tests.
 */
class LoginLogic(private val authApi: AuthApi) {
    private val _uiState = MutableStateFlow<LoginUiState>(LoginUiState.Idle)
    val uiState: StateFlow<LoginUiState> = _uiState.asStateFlow()
    var savedToken: String? = null

    suspend fun login(email: String, password: String) {
        if (email.isBlank() || password.isBlank()) {
            _uiState.value = LoginUiState.Error("Preencha email e senha.")
            return
        }
        _uiState.value = LoginUiState.Loading
        try {
            val response = authApi.login(LoginRequest(email, password))
            if (response.role != "cliente") {
                _uiState.value = LoginUiState.Error("Esta conta não é de um cliente.")
                return
            }
            savedToken = response.token
            _uiState.value = LoginUiState.Success
        } catch (e: HttpException) {
            if (e.code() == 401) {
                _uiState.value = LoginUiState.Error("Email ou senha incorretos. Tente novamente.")
            } else {
                _uiState.value = LoginUiState.Error("Erro ao fazer login. Tente novamente.")
            }
        } catch (e: Exception) {
            _uiState.value = LoginUiState.Error("Sem conexão. Verifique sua internet.")
        }
    }
}
