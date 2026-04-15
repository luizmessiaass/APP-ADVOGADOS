import { z } from 'zod';

/**
 * Zod schemas para o response do DataJud.
 * Validação em runtime detecta drift de schema por tribunal (DATAJUD-02 / RESEARCH.md).
 * nivelSigilo: 0 = público, >0 = algum nível de sigilo.
 * movimentos[].id pode ser null em alguns tribunais — usar hash fallback (DATAJUD-05).
 */

export const DatajudMovimentoSchema = z.object({
  id: z.string().nullable().optional(),
  data: z.string(), // ISO 8601
  tipo: z
    .object({
      nacional: z
        .object({
          id: z.number(),
          nome: z.string(),
        })
        .nullable()
        .optional(),
      local: z.unknown().nullable().optional(),
    })
    .optional(),
  descricao: z.string().nullable().optional(),
  complementos: z
    .array(
      z.object({
        tipoId: z.number().optional(),
        valor: z.string().optional(),
        tabeladoId: z.number().optional(),
      })
    )
    .optional(),
  dataExclusao: z.string().nullable().optional(),
});

export type DatajudMovimento = z.infer<typeof DatajudMovimentoSchema>;

export const DatajudDadosBasicosSchema = z.object({
  numero: z.string(),
  classeProcessual: z
    .object({ codigo: z.number(), nome: z.string() })
    .nullable()
    .optional(),
  orgaoJulgador: z
    .object({ codigo: z.number().optional(), nome: z.string() })
    .nullable()
    .optional(),
  assuntos: z
    .array(z.object({ codigo: z.number(), nome: z.string() }))
    .optional(),
  nivelSigilo: z.number().default(0),
  dataAjuizamento: z.string().nullable().optional(),
  valor: z.number().nullable().optional(),
});

export const DatajudProcessoSchema = z.object({
  dadosBasicos: DatajudDadosBasicosSchema,
  movimentos: z.array(DatajudMovimentoSchema).default([]),
});

export type DatajudProcesso = z.infer<typeof DatajudProcessoSchema>;

export const DatajudHitSchema = z.object({
  _source: DatajudProcessoSchema,
});

export const DatajudResponseSchema = z.object({
  hits: z.object({
    total: z.object({
      value: z.number(),
      relation: z.string().optional(),
    }),
    hits: z.array(DatajudHitSchema),
  }),
});

export type DatajudResponse = z.infer<typeof DatajudResponseSchema>;
