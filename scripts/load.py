import os
import time
import pandas as pd
import psycopg2
import logging

# Configuração do logger
logger = logging.getLogger("airflow.task")
if not logger.handlers:
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)

def load(data: list[dict]):
    """
    Carrega os dados transformados no banco de dados PostgreSQL usando psycopg2 nativo.
    """
    logger.info("Iniciando processo de carga.")
    df = pd.DataFrame(data)
    
    if df.empty:
        logger.warning("Nenhum dado para carregar após a transformação.")
        return

    user = os.getenv('POSTGRES_USER', 'etl_user')
    password = os.getenv('POSTGRES_PASSWORD', 'etl_pass')
    host = os.getenv('POSTGRES_HOST', 'postgres-dest')
    port = os.getenv('POSTGRES_PORT', '5432')
    db = os.getenv('POSTGRES_DB', 'etl_destino')
    
    max_retries = 3
    for attempt in range(1, max_retries + 1):
        try:
            logger.info(f"Tentativa {attempt} de conectar ao banco de dados e inserir registros.")
            conn = psycopg2.connect(
                host=host,
                port=port,
                dbname=db,
                user=user,
                password=password
            )
            cur = conn.cursor()
            
            # Cria a tabela se não existir garantindo a PRIMARY KEY no 'id'
            create_table_query = """
            CREATE TABLE IF NOT EXISTS vendas_transformadas (
                id INTEGER PRIMARY KEY,
                produto VARCHAR(255),
                categoria VARCHAR(255),
                quantidade INTEGER,
                valor_total_bruto NUMERIC(15, 2),
                valor_total_com_imposto NUMERIC(15, 2),
                data_venda DATE,
                status VARCHAR(50),
                processado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """
            cur.execute(create_table_query)
            
            # Monta a query de insert idempotente (ignora se o ID já existir)
            columns = ','.join(df.columns)
            values_placeholder = ','.join(['%s'] * len(df.columns))
            insert_query = f"INSERT INTO vendas_transformadas ({columns}) VALUES ({values_placeholder}) ON CONFLICT (id) DO NOTHING;"
            
            # Converte os dados do dataframe para lista de tuplas
            dados_tuplas = [tuple(x) for x in df.to_numpy()]
            
            cur.executemany(insert_query, dados_tuplas)
            conn.commit()
            
            cur.close()
            conn.close()
            
            logger.info(f"Carga concluída com sucesso! {len(df)} linhas inseridas na tabela 'vendas_transformadas'.")
            break
        except Exception as e:
            logger.error(f"Erro ao carregar dados no banco de destino: {e}")
            if attempt < max_retries:
                logger.info("Aguardando 5 segundos antes da próxima tentativa...")
                time.sleep(5)
            else:
                logger.error("Número máximo de tentativas alcançado. Falha no processo de carga.")
                raise e
