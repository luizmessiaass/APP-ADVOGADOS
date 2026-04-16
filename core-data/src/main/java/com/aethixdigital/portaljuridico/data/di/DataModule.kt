package com.aethixdigital.portaljuridico.data.di

import com.aethixdigital.portaljuridico.data.auth.JwtDecoder
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
