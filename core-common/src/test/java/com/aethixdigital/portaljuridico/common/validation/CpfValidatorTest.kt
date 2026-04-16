package com.aethixdigital.portaljuridico.common.validation

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class CpfValidatorTest {
    @Test fun allSameDigits_000_isInvalid() = assertFalse(isValidCpf("000.000.000-00"))
    @Test fun allSameDigits_111_isInvalid() = assertFalse(isValidCpf("111.111.111-11"))
    @Test fun allSameDigits_999_isInvalid() = assertFalse(isValidCpf("999.999.999-99"))
    @Test fun validCpf_formatted_isValid() = assertTrue(isValidCpf("123.456.789-09"))
    @Test fun validCpf_unformatted_isValid() = assertTrue(isValidCpf("12345678909"))
    @Test fun wrongCheckDigit_isInvalid() = assertFalse(isValidCpf("123.456.789-10"))
    @Test fun nonNumeric_isInvalid() = assertFalse(isValidCpf("abc.def.ghi-jk"))
    @Test fun empty_isInvalid() = assertFalse(isValidCpf(""))
}
