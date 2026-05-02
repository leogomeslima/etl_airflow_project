import os
import pandas as pd
import logging

# Configuração do logger
logger = logging.getLogger("airflow.task")
if not logger.handlers:
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)

def extract() -> list[dict]:
    """
    Extrai os dados do CSV.
    Retorna uma lista de dicionários para ser compatível com XCom no Airflow.
    """
    # Define o diretório de dados
    data_dir = '/opt/airflow/data/'
    if not os.path.exists(data_dir):
        data_dir = os.path.join(os.path.dirname(__file__), '..', 'data')

    logger.info(f"Escaneando diretório de dados: {data_dir}")
    
    # Lista todos os arquivos CSV, ignorando o arquivo de saída transformado
    all_files = [f for f in os.listdir(data_dir) if f.endswith('.csv') and f != 'vendas_transformadas.csv']
    
    if not all_files:
        logger.warning("Nenhum arquivo CSV encontrado para extração.")
        return []

    dfs = []
    for filename in all_files:
        file_path = os.path.join(data_dir, filename)
        logger.info(f"Lendo arquivo: {file_path}")
        try:
            df_temp = pd.read_csv(file_path, dtype={'data_venda': str})
            dfs.append(df_temp)
        except Exception as e:
            logger.error(f"Erro ao ler o arquivo {filename}: {e}")

    if not dfs:
        return []

    # Concatena todos os arquivos em um único DataFrame
    df = pd.concat(dfs, ignore_index=True)
    
    logger.info(f"Extração concluída. Total de arquivos processados: {len(all_files)}")
    logger.info(f"Total de linhas lidas: {len(df)}")
    logger.info(f"Amostra dos dados extraídos:\n{df.head(5).to_string()}")
    
    return df.to_dict(orient='records')
