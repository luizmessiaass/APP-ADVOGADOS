package com.aethixdigital.portaljuridico.cliente.features.auth

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aethixdigital.portaljuridico.cliente.navigation.Routes
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import javax.inject.Inject

val Context.clienteDataStore: DataStore<Preferences> by preferencesDataStore(name = "cliente_prefs")

val TOKEN_KEY = stringPreferencesKey("access_token")
val REFRESH_TOKEN_KEY = stringPreferencesKey("refresh_token")
val ONBOARDING_SEEN_KEY = booleanPreferencesKey("onboarding_seen")
val LGPD_ACCEPTED_KEY = booleanPreferencesKey("lgpd_accepted")
// D-06: versão dos termos aceita pelo usuário — re-gate se diferente de TERMS_VERSION
val TERMS_VERSION_KEY = stringPreferencesKey("terms_version_accepted")

// D-06: constante local da versão atual dos termos (ISO date). Bumpar para forçar re-gate.
const val TERMS_VERSION = "2026-04-16"

@HiltViewModel
class SplashViewModel @Inject constructor(
    @ApplicationContext private val context: Context,
) : ViewModel() {

    // D-05/D-06: re-gate de consentimento quando versão dos termos muda
    fun checkTermsVersion(storedVersion: String?): Boolean =
        storedVersion == null || storedVersion != TERMS_VERSION

    val startDestination: StateFlow<String?> = context.clienteDataStore.data
        .map { prefs ->
            val token = prefs[TOKEN_KEY]
            val onboardingSeen = prefs[ONBOARDING_SEEN_KEY] ?: false
            val lgpdAccepted = prefs[LGPD_ACCEPTED_KEY] ?: false
            val termsVersionAccepted = prefs[TERMS_VERSION_KEY]
            when {
                token == null -> Routes.LOGIN
                !onboardingSeen -> Routes.ONBOARDING
                // D-05: mostrar gate LGPD se não aceitou ou versão dos termos mudou
                !lgpdAccepted || checkTermsVersion(termsVersionAccepted) -> Routes.LGPD_CONSENT
                else -> Routes.PROCESSO_LIST
            }
        }
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = null
        )
}
