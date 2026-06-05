# Organizacao frontend

Este projeto usa o App Router do Next como camada de entrada e `src/modules/*` como camada de dominio. A regra pratica daqui para frente e manter `src/app` fino: rotas devem buscar dados, validar acesso, lidar com `redirect` e renderizar um componente do modulo.

## Principios

- Refatore em passos pequenos e verificaveis, preservando comportamento visual.
- Extraia duplicacao quando ela aparecer em tres ou mais lugares ou quando esconder uma responsabilidade importante.
- Prefira composicao e interfaces locais a condicionais grandes espalhadas.
- Use padroes apenas quando reduzirem acoplamento real. Repositorio, use case, adapter e strategy ja fazem sentido nos dominios que conversam com Supabase, pagamentos ou regras de plano.
- Tipos de dominio ficam perto do modulo. Tipos globais ficam em `src/types` apenas quando sao compartilhados por varios dominios.

## Onde colocar codigo novo

- `src/app/**/page.tsx`: server component de rota, fetch inicial, permissao e redirects.
- `src/app/**/loading.tsx` e `src/app/**/error.tsx`: wrappers finos usando componentes compartilhados de dashboard.
- `src/modules/<dominio>/components`: componentes cliente e composicoes de tela daquele dominio.
- `src/modules/<dominio>/actions`: server actions publicas do dominio.
- `src/modules/<dominio>/repositories`: acesso a dados e contratos de persistencia.
- `src/modules/<dominio>/usecases`: regras de aplicacao que coordenam repositorios, gateways e politicas.
- `src/modules/<dominio>/schemas`: validacao de formulario ou payload com Zod.
- `src/modules/<dominio>/types`: tipos de dominio e DTOs.
- `src/components/ui`: primitives do design system.
- `src/components/dashboard`: primitives compartilhadas do shell logado.
- `src/lib`: infraestrutura ou helpers realmente transversais.

## Checklist para futuras skills

1. Identificar dominio existente antes de criar pasta nova.
2. Manter a rota em `src/app` pequena e mover UI/state para `src/modules/<dominio>/components`.
3. Reusar `DashboardErrorState`, `DashboardBlocksLoading`, `DashboardHeaderLoading` e `DashboardPageHeader` antes de criar estados de pagina do zero.
4. Rodar `pnpm exec tsc --noEmit` apos alteracoes estruturais.
5. Para lint, corrigir os arquivos tocados primeiro; o lint global ainda possui debitos herdados registrados.
