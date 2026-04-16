package com.aethixdigital.portaljuridico.escritorio.feature.clientes.cadastro

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aethixdigital.portaljuridico.common.validation.formatCpf
import com.aethixdigital.portaljuridico.common.validation.isValidCnjFormat
import com.aethixdigital.portaljuridico.common.validation.isValidCpf
import com.aethixdigital.portaljuridico.common.validation.normalizeCnj
import com.aethixdigital.portaljuridico.data.repository.ClienteRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

// Regex pura Kotlin para validação de e-mail — compatível com unit tests JVM (android.util.Patterns não está disponível em unit tests)
private val EMAIL_REGEX = Regex("^[A-Za-z0-9._%+\\-]+@[A-Za-z0-9.\\-]+\\.[A-Za-z]{2,}$")

data class CadastroFormState(
    val nome: String = "",
    val cpf: String = "",
    val email: String = "",
    val cnj: String = "",
    val cpfError: String? = null,
    val cnjError: String? = null,
    val emailError: String? = null,
    val cpfTouched: Boolean = false,
    val cnjTouched: Boolean = false,
    val emailTouched: Boolean = false
) {
    val isSubmitEnabled: Boolean
        get() = nome.isNotBlank() && cpf.isNotBlank() && email.isNotBlank() && cnj.isNotBlank()
            && cpfError == null && cnjError == null && emailError == null
            && cpfTouched && cnjTouched  // só habilita após campos terem sido validados
}

sealed class CadastroUiState {
    object Idle : CadastroUiState()
    object Loading : CadastroUiState()
    data class Success(val clienteId: String) : CadastroUiState()
    data class Error(val message: String) : CadastroUiState()
}

@HiltViewModel
class CadastroClienteViewModel @Inject constructor(
    private val clienteRepository: ClienteRepository
) : ViewModel() {

    private val _formState = MutableStateFlow(CadastroFormState())
    val formState: StateFlow<CadastroFormState> = _formState.asStateFlow()

    private val _uiState = MutableStateFlow<CadastroUiState>(CadastroUiState.Idle)
    val uiState: StateFlow<CadastroUiState> = _uiState.asStateFlow()

    fun onNomeChange(value: String) {
        _formState.update { it.copy(nome = value) }
    }

    fun onEmailChange(value: String) {
        val err = if (value.isNotBlank() && !EMAIL_REGEX.matches(value)) {
            "E-mail inválido"
        } else {
            null
        }
        _formState.update { it.copy(email = value, emailError = err, emailTouched = true) }
    }

    fun onCpfChange(value: String) {
        val digits = value.filter { it.isDigit() }
        val formatted = formatCpf(digits)
        // D-11: validar ao atingir 11 dígitos
        val error = if (digits.length == 11 && !isValidCpf(digits)) "CPF inválido" else null
        _formState.update {
            it.copy(
                cpf = if (digits.length <= 11) formatted else it.cpf,
                cpfError = error
            )
        }
    }

    fun onCpfBlur() {
        val digits = _formState.value.cpf.filter { it.isDigit() }
        val error = when {
            digits.isEmpty() -> null
            !isValidCpf(digits) -> "CPF inválido"
            else -> null
        }
        _formState.update { it.copy(cpfError = error, cpfTouched = true) }
    }

    fun onCnjChange(value: String) {
        val digits = value.filter { it.isDigit() }
        // D-11: validar ao atingir 20 dígitos
        val error = if (digits.length == 20 && !isValidCnjFormat(value)) "Formato de CNJ inválido" else null
        _formState.update { it.copy(cnj = value, cnjError = error) }
    }

    fun onCnjBlur() {
        val value = _formState.value.cnj
        val error = when {
            value.isBlank() -> null
            !isValidCnjFormat(value) -> "Formato de CNJ inválido"
            else -> null
        }
        _formState.update { it.copy(cnjError = error, cnjTouched = true) }
    }

    fun cadastrar() {
        val form = _formState.value
        if (!form.isSubmitEnabled) return
        viewModelScope.launch {
            _uiState.value = CadastroUiState.Loading
            // D-12: unicidade de CPF verificada apenas pelo backend
            clienteRepository.cadastrarCliente(
                nome = form.nome.trim(),
                cpf = form.cpf.filter { it.isDigit() },   // enviar apenas dígitos
                email = form.email.trim(),
                numeroCnj = normalizeCnj(form.cnj)        // normalizar CNJ antes de enviar
            ).fold(
                onSuccess = { id -> _uiState.value = CadastroUiState.Success(id) },
                onFailure = { _uiState.value = CadastroUiState.Error(it.message ?: "Erro ao cadastrar cliente") }
            )
        }
    }
}
