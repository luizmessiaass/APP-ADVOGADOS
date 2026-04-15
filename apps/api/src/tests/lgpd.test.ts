// apps/api/src/tests/lgpd.test.ts
// LGPD PII Redaction Test — LGPD-04
// Prova que CPF e outros dados PII nunca aparecem em logs de request.
// Usa mock do transport do pino para capturar logs em memoria.

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import Fastify from 'fastify'
import type { FastifyInstance } from 'fastify'

// Capturar logs em memoria para inspecao
const capturedLogs: string[] = []

describe('LGPD PII Redaction (LGPD-04)', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    // Criar Fastify com destination customizado que captura logs em memoria
    app = Fastify({
      logger: {
        level: 'debug',
        redact: {
          paths: [
            'req.body.cpf',
            'req.body.password',
            'req.body.senha',
            '*.cpf',
            '*.prompt_text',
            '*.senha',
            'req.headers.authorization',
          ],
          censor: '[REDACTED]',
        },
        // Stream customizado para capturar logs nos testes
        stream: {
          write: (line: string) => {
            capturedLogs.push(line)
          },
        },
      },
    })

    // Rota de teste que recebe CPF no body e tenta logar o objeto usuario
    app.post('/test/signup', { config: { skipAuth: true } }, async (req, reply) => {
      const body = req.body as Record<string, unknown>
      // Simular o que um handler mal-escrito faria: logar o objeto completo
      req.log.info({ usuario: body }, 'Processando signup')
      return reply.code(201).send({ success: true })
    })

    await app.ready()
  })

  afterAll(() => app.close())

  beforeEach(() => {
    capturedLogs.length = 0  // limpar logs antes de cada teste
  })

  it('CPF no body nao aparece nos logs de request', async () => {
    const cpf = '123.456.789-00'

    await app.inject({
      method: 'POST',
      url: '/test/signup',
      payload: {
        nome: 'Joao Silva',
        email: 'joao@exemplo.com',
        cpf,
        senha: 'MinhaS3nh@',
      },
    })

    // CPF nao deve aparecer em NENHUM log capturado
    const allLogs = capturedLogs.join('\n')
    expect(allLogs).not.toContain(cpf)
    expect(allLogs).not.toContain('123.456.789-00')
    expect(allLogs).not.toContain('12345678900')
  })

  it('senha no body nao aparece nos logs', async () => {
    const senha = 'MinhaS3nh@Secreta'

    await app.inject({
      method: 'POST',
      url: '/test/signup',
      payload: { nome: 'Maria Silva', email: 'maria@exemplo.com', senha },
    })

    const allLogs = capturedLogs.join('\n')
    expect(allLogs).not.toContain(senha)
  })

  it('[REDACTED] aparece no lugar do CPF nos logs', async () => {
    await app.inject({
      method: 'POST',
      url: '/test/signup',
      payload: { nome: 'Test User', email: 'test@exemplo.com', cpf: '987.654.321-00', senha: 'abc' },
    })

    const logsComBody = capturedLogs.filter(log => log.includes('usuario'))
    expect(logsComBody.length).toBeGreaterThan(0)

    // O campo cpf deve aparecer como [REDACTED] ou nao aparecer
    for (const log of logsComBody) {
      if (log.includes('"cpf"')) {
        // Se o campo cpf aparece, deve ser como [REDACTED]
        expect(log).toContain('[REDACTED]')
        expect(log).not.toContain('987.654.321-00')
      }
    }
  })

  it('Authorization header nao aparece nos logs (JWT protegido)', async () => {
    const fakeToken = 'Bearer eyJfaketoken.fake.fake'

    capturedLogs.length = 0
    await app.inject({
      method: 'POST',
      url: '/test/signup',
      headers: { authorization: fakeToken },
      payload: { nome: 'Test', email: 'test@test.com' },
    })

    const allLogs = capturedLogs.join('\n')
    expect(allLogs).not.toContain('eyJfaketoken')
    expect(allLogs).not.toContain(fakeToken)
  })
})
