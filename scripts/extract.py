import os
import pandas as pd
import logging

# Configuração do logger
logger = logging.getLogger("airflow.task")
if not logger.handlers:
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)

EXPECTED_COLUMNS = ['id', 'nome', 'categoria', 'quantidade', 'valor_unitario', 'data_venda', 'status']


def has_expected_header(file_path: str) -> bool:
    with open(file_path, 'r', encoding='utf-8-sig') as file:
        first_line = file.readline().strip().lower()

    header = [column.strip() for column in first_line.split(',')]
    return header == EXPECTED_COLUMNS


def extract() -> list[dict]:
    """
    Extrai os dados de todos os arquivos CSV da pasta data.
    Retorna uma lista de dicionários para ser compatível com XCom no Airflow.
    """
    # Define o diretório de dados
    data_dir = '/opt/airflow/data/'
    if not os.path.exists(data_dir):
        data_dir = os.path.join(os.path.dirname(__file__), '..', 'data')

    logger.info(f"Escaneando diretório de dados: {data_dir}")
    
    # Lista todos os arquivos CSV, independentemente do nome, ignorando apenas o arquivo de saída transformado.
    all_files = sorted(
        f for f in os.listdir(data_dir)
        if f.lower().endswith('.csv') and f.lower() != 'vendas_transformadas.csv'
    )
    
    if not all_files:
        logger.warning("Nenhum arquivo CSV encontrado para extração.")
        return []

    dfs = []
    for filename in all_files:
        file_path = os.path.join(data_dir, filename)
        logger.info(f"Lendo arquivo: {file_path}")
        try:
            if has_expected_header(file_path):
                df_temp = pd.read_csv(file_path, dtype={'data_venda': str})
            else:
                logger.warning(f"Arquivo sem cabeçalho esperado. Aplicando colunas padrão: {filename}")
                df_temp = pd.read_csv(
                    file_path,
                    header=None,
                    names=EXPECTED_COLUMNS,
                    dtype={'data_venda': str}
                )
            df_temp['_arquivo_origem'] = filename
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
