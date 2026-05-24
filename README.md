# Projeto de Engenharia de Dados: Pipeline ETL com Apache Airflow e PostgreSQL

Este repositório contém uma solução completa e conteinerizada para um pipeline de Extração, Transformação e Carga (ETL). O projeto foi desenvolvido utilizando padrões da indústria para orquestração de dados, demonstrando a integração entre processamento em Python (Pandas) e armazenamento relacional estruturado (PostgreSQL), tudo gerenciado pelo Apache Airflow.

## 1. Arquitetura do Projeto

A infraestrutura foi totalmente construída sobre Docker e Docker Compose, garantindo isolamento e reprodutibilidade. Com isso, o princípio "funciona na minha máquina" é eliminado.

Componentes principais:

- Apache Airflow (versão 2.9.1): atua como o orquestrador principal, agendando e monitorando o fluxo de tarefas (DAGs).
- PostgreSQL (Source/Metadados): banco de dados utilizado internamente pelo Airflow para gerenciar estado, usuários e histórico de execução.
- PostgreSQL (Data Warehouse/Destino): banco de dados analítico utilizado para armazenar o resultado final dos dados transformados pelo pipeline.
- Python 3.12: motor de processamento de dados, utilizando a biblioteca Pandas para transformações em memória.

## 2. Estrutura de Diretórios e Modularização

O código-fonte segue o padrão de arquitetura desacoplada, separando a lógica de orquestração da lógica de negócio:

- `dags/etl_dag.py`: define a DAG do Airflow. Não contém lógica de transformação, apenas a declaração de tarefas e suas dependências.
- `scripts/extract.py`: isola a responsabilidade de leitura dos dados brutos (CSV). Agora, suporta a leitura dinâmica de múltiplos arquivos simultaneamente.
- `scripts/transform.py`: centraliza todas as regras de negócio, higienização de dados e lógica de tipagem.
- `scripts/load.py`: gerencia as conexões de rede e inserções no banco de dados.
- `docker-compose.yml`: define a rede interna (`etl-network`), os volumes e os serviços.
- `.env`: centraliza variáveis de ambiente e segredos, como credenciais de banco e chaves do Airflow.

## 3. Regras de Negócio e Transformações

O pipeline executa uma limpeza rigorosa nos dados extraídos de todos os arquivos de origem localizados na pasta de entrada:

- Extração multifonte: o sistema escaneia a pasta `data/` e processa todos os arquivos `.csv` encontrados de forma consolidada, independentemente do nome do arquivo. O arquivo final `vendas_transformadas.csv` é ignorado para evitar reprocessamento.
- Limpeza de nulos: registros com valores essenciais ausentes, como preço unitário, são descartados silenciosamente.
- Tratamento de IDs duplicados: quando dois ou mais arquivos possuem registros com o mesmo `id`, o pipeline mantém a primeira ocorrência encontrada e remove as demais antes de salvar o CSV final e carregar os dados no banco.
- Tipagem e formatação: as datas são validadas e padronizadas de forma rígida para o formato ISO (`YYYY-MM-DD`).
- Normalização de texto: o status das transações é unificado, removendo acentuações e convertendo tudo para letras minúsculas.
- Engenharia de features: cálculo automático do valor bruto e do valor com aplicação de imposto, com base na quantidade e no valor unitário.

## 4. Resiliência e Idempotência

O módulo de carga (`load`) foi projetado para ser 100% idempotente. Isso significa que a mesma DAG pode ser executada centenas de vezes consecutivas sem causar duplicação de registros no banco de dados.

Foi implementada a lógica de UPSERT nativa do PostgreSQL (`ON CONFLICT DO NOTHING`), vinculada a uma chave primária (`id`). Além disso, a inserção no banco é feita via conexão bruta (`psycopg2`), utilizando execuções em lote (`executemany`) para alta performance, eliminando gargalos comuns de ORMs em grandes volumes.

## 5. Instruções de Execução

### 5.0. Frontend React

O projeto também possui um dashboard React em `frontend/` para acompanhar a DAG, as etapas do pipeline, as regras de qualidade e os dados transformados em tempo real.

```bash
cd frontend
npm install
npm run dev
```

Acesse o frontend em: `http://localhost:5173`

Durante o desenvolvimento, o Vite disponibiliza a rota `/api/results`, que consulta a tabela `vendas_transformadas` no PostgreSQL destino e atualiza a interface a cada 5 segundos. Se o banco estiver indisponivel, a rota usa `data/vendas_transformadas.csv` como fallback.

### 5.1. Configuração de Ambiente

Certifique-se de ter o Docker instalado e as portas `8080` e `5433` livres.

O arquivo `.env` já está pré-configurado para o ambiente de desenvolvimento.

### 5.2. Inicializando os Serviços

No terminal, na raiz do projeto, execute o comando abaixo para provisionar e iniciar todos os componentes da infraestrutura:

```bash
docker-compose up -d
```

Aguarde aproximadamente 1 a 2 minutos para que o Airflow crie as tabelas internas e o banco de destino fique online.

### 5.3. Acessando a Interface do Airflow

Abra o navegador e acesse: `http://localhost:8080`

Credenciais de acesso padrão:

- Usuário: `admin`
- Senha: `admin`

### 5.3.1. Airflow

![Airflow](./img/img_02.png)

### 5.4. Executando o Pipeline

1. Na interface do Airflow, localize a DAG chamada `etl_vendas`.
2. Remova a DAG do estado de "Pause" clicando no interruptor ao lado do nome.
3. Acione a DAG manualmente clicando no botão "Trigger DAG" — símbolo de "Play".
4. Acompanhe os logs em tempo real pela aba "Graph" ou "Grid".

### 5.4.1. Airflow Pipeline Executado

![Airflow](./img/img_01.png)

## 6. Auditoria e Validação de Dados

Após a conclusão da execução, você tem duas formas de auditar os dados processados:

### Validação no Banco de Dados

Acesse o banco PostgreSQL de destino diretamente pelo terminal do container para executar consultas SQL:

```bash
docker exec -it etl_airflow_project-postgres-dest-1 psql -U etl_user -d etl_destino -c "SELECT * FROM vendas_transformadas;"
```

### Validação via Planilha Local

A etapa de transformação salva automaticamente uma cópia de backup dos dados limpos no formato CSV, utilizando o separador ponto e vírgula, compatível nativamente com o Excel. O arquivo estará disponível no caminho:

```txt
data/vendas_transformadas.csv
```

## 7. Encerramento

Para parar os serviços e limpar o ambiente, incluindo a exclusão dos dados salvos no banco de dados, execute:

```bash
docker-compose down -v
```
