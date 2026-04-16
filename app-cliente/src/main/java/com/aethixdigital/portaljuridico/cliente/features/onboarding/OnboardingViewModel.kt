package com.aethixdigital.portaljuridico.cliente.features.onboarding

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aethixdigital.portaljuridico.cliente.features.auth.ONBOARDING_SEEN_KEY
import com.aethixdigital.portaljuridico.cliente.features.auth.clienteDataStore
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class OnboardingViewModel @Inject constructor(
    @ApplicationContext private val context: Context
) : ViewModel() {

    fun markOnboardingComplete() {
        viewModelScope.launch {
            context.clienteDataStore.edit { prefs ->
                prefs[ONBOARDING_SEEN_KEY] = true
            }
        }
    }
}
