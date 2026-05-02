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
    file_path = '/opt/airflow/data/teste.csv'
    
    # Se estiver rodando localmente (fora do docker) para teste
    if not os.path.exists(file_path):
        file_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'teste.csv')

    logger.info(f"Iniciando extração do arquivo: {file_path}")
    
    df = pd.read_csv(file_path, dtype={'data_venda': str})
    
    logger.info(f"Extração concluída. Total de linhas lidas: {len(df)}")
    logger.info(f"Amostra dos dados extraídos:\n{df.head(5).to_string()}")
    
    return df.to_dict(orient='records')
