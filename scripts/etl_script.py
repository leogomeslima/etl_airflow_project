import os
import logging
from extract import extract
from transform import transform
from load import load

# Configuração do logger
logger = logging.getLogger(__name__)
if not logger.handlers:
    logging.basicConfig(level=logging.INFO)

def run_etl():
    """
    Executa o processo de ETL completo de forma autônoma chamando os módulos separados (útil para testes manuais locais).
    """
    try:
        logger.info("--- Iniciando ETL Pipeline ---")
        extracted_data = extract()
        transformed_data = transform(extracted_data)
        load(transformed_data)
        logger.info("--- ETL Pipeline finalizado com sucesso ---")
    except Exception as e:
        logger.error(f"--- Falha no ETL Pipeline: {e} ---")
        raise e

if __name__ == '__main__':
    # Para testar fora do docker, aponte as credenciais para o localhost mapeado no compose
    # Usa setdefault para permitir sobrescrita via linha de comando
    os.environ.setdefault('POSTGRES_HOST', 'localhost')
    os.environ.setdefault('POSTGRES_PORT', '5433')
    run_etl()
