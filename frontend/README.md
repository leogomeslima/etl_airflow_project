# Frontend React - ETL Airflow Dashboard

Dashboard em React para acompanhar o projeto `etl_vendas`, com visão operacional da DAG, etapas do pipeline, regras de qualidade e monitoramento em tempo real dos dados transformados.

## Executar em desenvolvimento

```bash
cd frontend
npm install
npm run dev
```

Depois acesse o endereço exibido pelo Vite, normalmente `http://localhost:5173`.

Enquanto o servidor Vite estiver ativo, a rota `/api/results` consulta primeiro o PostgreSQL destino (`vendas_transformadas`). Se o banco estiver indisponivel, a rota usa `../data/vendas_transformadas.csv` como fallback. A tela consulta essa rota a cada 5 segundos e atualiza os indicadores automaticamente.

## Scripts

- `npm run dev`: inicia o servidor Vite.
- `npm run build`: gera a versao de producao.
- `npm run preview`: serve o build localmente.

## Observacao

O monitor atual acompanha o PostgreSQL destino. O fallback em CSV existe apenas para manter a interface utilizavel quando o banco nao estiver disponivel.
