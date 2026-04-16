package com.aethixdigital.portaljuridico.cliente.features.lgpd

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aethixdigital.portaljuridico.cliente.features.auth.LGPD_ACCEPTED_KEY
import com.aethixdigital.portaljuridico.cliente.features.auth.TERMS_VERSION
import com.aethixdigital.portaljuridico.cliente.features.auth.TERMS_VERSION_KEY
import com.aethixdigital.portaljuridico.cliente.features.auth.TOKEN_KEY
import com.aethixdigital.portaljuridico.cliente.features.auth.REFRESH_TOKEN_KEY
import com.aethixdigital.portaljuridico.cliente.features.auth.clienteDataStore
import com.aethixdigital.portaljuridico.network.api.ClienteApi
import com.aethixdigital.portaljuridico.network.model.dto.ConsentimentoRequest
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class LgpdConsentViewModel @Inject constructor(
    @ApplicationContext private val context: Context,
    private val clienteApi: ClienteApi,
) : ViewModel() {

    sealed class UiState {
        object Idle : UiState()
        object Loading : UiState()
        object Success : UiState()
        data class Error(val message: String) : UiState()
    }

    private val _uiState = MutableStateFlow<UiState>(UiState.Idle)
    val uiState: StateFlow<UiState> = _uiState.asStateFlow()

    fun acceptConsent() {
        viewModelScope.launch {
            _uiState.value = UiState.Loading
            val result = runCatching {
                clienteApi.postConsentimento(ConsentimentoRequest(versaoTermos = TERMS_VERSION))
            }
            result.onSuccess {
                context.clienteDataStore.edit { prefs ->
                    prefs[LGPD_ACCEPTED_KEY] = true
                    // D-05/D-06: salvar a versão dos termos aceita para o re-gate futuro
                    prefs[TERMS_VERSION_KEY] = TERMS_VERSION
                }
                _uiState.value = UiState.Success
            }.onFailure {
                _uiState.value = UiState.Error("Erro ao registrar aceite. Tente novamente.")
            }
        }
    }

    fun rejectConsent() {
        viewModelScope.launch {
            // D-12: logout + clear lgpd flag so gate reappears on next open
            context.clienteDataStore.edit { prefs ->
                prefs.remove(TOKEN_KEY)
                prefs.remove(REFRESH_TOKEN_KEY)
                prefs[LGPD_ACCEPTED_KEY] = false
            }
            _uiState.value = UiState.Idle  // caller navigates to Login
        }
    }
}
