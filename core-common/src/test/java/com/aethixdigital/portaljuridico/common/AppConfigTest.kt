package com.aethixdigital.portaljuridico.common

import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Test

class AppConfigTest {

    @Test
    fun `AppConfig instantiates without DI harness`() {
        val config = AppConfig()
        assertNotNull(config)
    }

    @Test
    fun `AppConfig buildType is non-empty`() {
        val config = AppConfig()
        assertFalse(config.buildType.isEmpty())
    }
}
