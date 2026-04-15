-- Migration: 0005_triggers
-- Triggers de sistema para automacao de timestamps e sync de auth.users
-- D-18: updated_at automatico via trigger em todas as tabelas
-- D-17: sync auth.users -> public.usuarios no signup/invite

-- =========================================================
-- FUNCAO: update_updated_at_column()
-- Atualiza o campo updated_at para now() em qualquer UPDATE
-- =========================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger de updated_at nas tabelas que possuem o campo
CREATE TRIGGER escritorios_updated_at
  BEFORE UPDATE ON public.escritorios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER usuarios_updated_at
  BEFORE UPDATE ON public.usuarios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- FUNCAO: sync_auth_user_to_public()
-- Cria registro em public.usuarios quando auth.users recebe INSERT.
-- Triggered por: signup de admin_escritorio E inviteUserByEmail de cliente.
-- D-17: tenant_id extraido de raw_user_meta_data (passado no invite/signup)
-- Pitfall 6 do RESEARCH.md: passar tenant_id no metadata do invite
-- =========================================================
CREATE OR REPLACE FUNCTION public.sync_auth_user_to_public()
RETURNS TRIGGER AS $$
BEGIN
  -- Extrair dados do metadata passado no signup/invite
  -- Para admin_escritorio: tenant_id sera preenchido apos criacao do escritorio
  -- Para cliente: tenant_id passado via inviteUserByEmail metadata
  INSERT INTO public.usuarios (
    id,
    tenant_id,
    nome,
    email,
    role_local,
    cpf
  ) VALUES (
    NEW.id,
    (NEW.raw_user_meta_data ->> 'tenant_id')::uuid,
    COALESCE(NEW.raw_user_meta_data ->> 'nome', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'role_local', 'cliente'),
    NEW.raw_user_meta_data ->> 'cpf'  -- pode ser NULL para admin_escritorio
  )
  ON CONFLICT (id) DO NOTHING;  -- idempotente: nao recriar se ja existe

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger dispara APOS INSERT em auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_auth_user_to_public();

-- NOTA: O trigger nao cria escritorio automaticamente. O fluxo de signup
-- de admin_escritorio e tratado no endpoint POST /api/v1/auth/signup/escritorio
-- que: (1) cria o user no Supabase Auth, (2) cria o escritorio, (3) atualiza o usuario.
