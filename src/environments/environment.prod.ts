// src/environments/environment.prod.ts (produção)
export const environment = {
  production: true,
  useMockData: false, // NUNCA true em produção — ver seção de segurança abaixo
  apiUrl: 'https://api.seudominio.com.br/api'
};