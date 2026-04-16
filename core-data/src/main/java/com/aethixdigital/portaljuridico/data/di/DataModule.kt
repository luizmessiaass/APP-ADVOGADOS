package com.aethixdigital.portaljuridico.data.di

import com.aethixdigital.portaljuridico.data.auth.JwtDecoder
import com.aethixdigital.portaljuridico.data.auth.TokenDataStore
import com.aethixdigital.portaljuridico.data.repository.AuthRepository
import com.aethixdigital.portaljuridico.data.repository.AuthRepositoryImpl
import com.aethixdigital.portaljuridico.data.repository.ClienteRepository
import com.aethixdigital.portaljuridico.data.repository.ClienteRepositoryImpl
import com.aethixdigital.portaljuridico.network.interceptor.TokenProvider
import dagger.Binds
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DataModule {

    @Provides
    @Singleton
    fun provideJwtDecoder(): JwtDecoder = JwtDecoder()
}

// TokenDataStore is injected directly via @Inject constructor — no @Provides needed

@Module
@InstallIn(SingletonComponent::class)
abstract class DataBindingModule {

    @Binds
    @Singleton
    abstract fun bindAuthRepository(impl: AuthRepositoryImpl): AuthRepository

    @Binds
    @Singleton
    abstract fun bindClienteRepository(impl: ClienteRepositoryImpl): ClienteRepository

    @Binds
    @Singleton
    abstract fun bindTokenProvider(impl: TokenDataStore): TokenProvider
}
