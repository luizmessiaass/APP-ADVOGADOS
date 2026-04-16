package com.aethixdigital.portaljuridico.data.auth

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.aethixdigital.portaljuridico.network.interceptor.TokenProvider
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "auth_prefs")

@Singleton
class TokenDataStore @Inject constructor(
    @ApplicationContext private val context: Context
) : TokenProvider {
    private val jwtKey = stringPreferencesKey("jwt_token")

    /** Returns the token as a Flow — use for observing token changes. */
    fun getTokenFlow(): Flow<String?> = context.dataStore.data.map { it[jwtKey] }

    /** Returns the current token value once (implements TokenProvider for AuthInterceptor). */
    override suspend fun getToken(): String? = context.dataStore.data.map { it[jwtKey] }.firstOrNull()

    suspend fun saveToken(token: String) {
        context.dataStore.edit { it[jwtKey] = token }
    }

    suspend fun clearToken() {
        context.dataStore.edit { it.remove(jwtKey) }
    }
}
