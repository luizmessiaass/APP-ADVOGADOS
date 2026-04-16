package com.aethixdigital.portaljuridico.common.validation

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class CnjValidatorTest {
    @Test fun formattedCnj_isValid() = assertTrue(isValidCnjFormat("0001234-55.2023.8.26.0100"))
    @Test fun unformattedCnj_20digits_isValid() = assertTrue(isValidCnjFormat("00012345520238260100"))
    @Test fun malformedCnj_isInvalid() = assertFalse(isValidCnjFormat("0001234-55.2023.8.260100"))
    @Test fun empty_isInvalid() = assertFalse(isValidCnjFormat(""))
    @Test fun normalizeCnj_20digits_returnsFormatted() =
        assertEquals("0001234-55.2023.8.26.0100", normalizeCnj("00012345520238260100"))
    @Test fun normalizeCnj_alreadyFormatted_returnsUnchanged() =
        assertEquals("0001234-55.2023.8.26.0100", normalizeCnj("0001234-55.2023.8.26.0100"))
}
