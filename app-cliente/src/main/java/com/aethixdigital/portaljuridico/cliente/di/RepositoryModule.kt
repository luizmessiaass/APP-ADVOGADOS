package com.aethixdigital.portaljuridico.cliente.di

import com.aethixdigital.portaljuridico.data.repository.ProcessoRepository
import com.aethixdigital.portaljuridico.data.repository.ProcessoRepositoryImpl
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {

    @Binds
    @Singleton
    abstract fun bindProcessoRepository(impl: ProcessoRepositoryImpl): ProcessoRepository
}
