export type DatajudErrorTipo = 'network' | 'timeout' | 'auth' | 'schema_drift' | 'unknown';

export class DatajudAdapterError extends Error {
  readonly tipo: DatajudErrorTipo;
  readonly statusCode?: number;
  constructor(message: string, tipo: DatajudErrorTipo, statusCode?: number) {
    super(message);
    this.name = 'DatajudAdapterError';
    this.tipo = tipo;
    this.statusCode = statusCode;
  }
}
