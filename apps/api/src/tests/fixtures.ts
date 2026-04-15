// Tenants ficticios para testes de integracao
export const TENANT_A = {
  id: '00000000-0000-0000-0000-000000000001',
  nome: 'Escritorio Alpha Advogados',
  email: 'alpha@test.portaljuridico.com.br',
  status: 'active' as const,
}

export const TENANT_B = {
  id: '00000000-0000-0000-0000-000000000002',
  nome: 'Escritorio Beta Advocacia',
  email: 'beta@test.portaljuridico.com.br',
  status: 'active' as const,
}

export const USER_ADMIN_A = {
  id: '00000000-0000-0000-0001-000000000001',
  tenant_id: TENANT_A.id,
  nome: 'Admin Alpha',
  email: 'admin@alpha.test',
  role_local: 'admin_escritorio' as const,
}

export const USER_ADMIN_B = {
  id: '00000000-0000-0000-0001-000000000002',
  tenant_id: TENANT_B.id,
  nome: 'Admin Beta',
  email: 'admin@beta.test',
  role_local: 'admin_escritorio' as const,
}
