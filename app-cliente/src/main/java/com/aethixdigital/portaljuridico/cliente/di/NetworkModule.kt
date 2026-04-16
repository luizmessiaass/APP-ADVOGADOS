package com.aethixdigital.portaljuridico.cliente.di

import com.aethixdigital.portaljuridico.cliente.BuildConfig
import com.aethixdigital.portaljuridico.network.config.NetworkConfig
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    @Provides
    @Singleton
    fun provideNetworkConfig(): NetworkConfig = NetworkConfig(
        baseUrl = BuildConfig.API_BASE_URL,
        isDebug = BuildConfig.DEBUG
    )
}
