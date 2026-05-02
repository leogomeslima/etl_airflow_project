import os
import pandas as pd
import logging

# Configuração do logger
logger = logging.getLogger("airflow.task")
if not logger.handlers:
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)

def transform(data: list[dict]) -> list[dict]:
    """
    Transforma os dados recebidos.
    """
    logger.info("Iniciando transformação de dados.")
    df = pd.DataFrame(data)
    
    # Remove registros onde 'valor_unitario' é nulo
    linhas_antes = len(df)
    df = df.dropna(subset=['valor_unitario'])
    logger.info(f"Linhas removidas por valor_unitario nulo: {linhas_antes - len(df)}")
    
    # Converte 'data_venda' para datetime forçando o formato %Y-%m-%d
    linhas_antes = len(df)
    df['data_venda'] = pd.to_datetime(df['data_venda'], format='%Y-%m-%d', errors='coerce')
    df = df.dropna(subset=['data_venda'])
    # Converte de volta para string no formato YYYY-MM-DD para serialização JSON no XCom
    df['data_venda'] = df['data_venda'].dt.strftime('%Y-%m-%d')
    logger.info(f"Linhas removidas por formato de data inválido: {linhas_antes - len(df)}")
    
    # Normaliza a coluna 'status'
    status_validos = ['concluido', 'pendente', 'cancelado']
    
    def normalizar_status(val):
        if not isinstance(val, str):
            return val
        # Remover acentos de forma simples para os status conhecidos
        val = val.lower().strip()
        val = val.replace('í', 'i')
        return val

    linhas_antes = len(df)
    df['status'] = df['status'].apply(normalizar_status)
    df = df[df['status'].isin(status_validos)]
    logger.info(f"Linhas removidas por status inválido: {linhas_antes - len(df)}")
    
    # Cria coluna 'valor_total_bruto'
    df['valor_total_bruto'] = df['quantidade'] * df['valor_unitario']
    
    # Cria coluna 'valor_total_com_imposto'
    df['valor_total_com_imposto'] = df['valor_total_bruto'] * 1.15
    
    # Renomeia 'nome' para 'produto'
    df = df.rename(columns={'nome': 'produto'})
    
    # Seleciona as colunas finais na ordem solicitada (incluindo 'id' para a chave primária)
    colunas_finais = ['id', 'produto', 'categoria', 'quantidade', 'valor_total_bruto', 'valor_total_com_imposto', 'data_venda', 'status']
    df = df[colunas_finais]
    
    logger.info(f"Transformação concluída. Total de linhas após transformação: {len(df)}")
    logger.info(f"Amostra dos dados transformados:\n{df.head(5).to_string()}")
    
    # Salva os dados transformados em um arquivo CSV (planilha) na pasta data
    out_path = '/opt/airflow/data/vendas_transformadas.csv'
    if not os.path.exists('/opt/airflow/data'):
        out_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'vendas_transformadas.csv')
    
    df.to_csv(out_path, index=False, sep=';', encoding='utf-8')
    logger.info(f"Planilha de dados transformados salva localmente em: {out_path}")
    
    return df.to_dict(orient='records')
