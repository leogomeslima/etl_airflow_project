import sys
import os
from datetime import datetime
from airflow import DAG
from airflow.operators.python import PythonOperator

# Garante que a pasta scripts está no PYTHONPATH
sys.path.insert(0, '/opt/airflow/scripts')

# Importa as funções dos nossos scripts separados
from extract import extract
from transform import transform
from load import load

default_args = {
    'owner': 'airflow',
    'depends_on_past': False,
    'retries': 1,
}

with DAG(
    dag_id='etl_vendas',
    default_args=default_args,
    description='Pipeline ETL de Vendas (Extract, Transform, Load)',
    schedule_interval='@daily',
    start_date=datetime(2026, 1, 1),
    catchup=False,
    tags=['etl', 'portfolio'],
    doc_md="""
    # ETL Vendas
    Esta DAG demonstra um processo completo de ETL utilizando Python, Pandas e PostgreSQL.
    Ela extrai dados de um CSV, aplica transformações e limpezas, e insere no banco de destino.
    """
) as dag:

    def task_extract(**context):
        # A função extract retorna list[dict], que é retornado pela task para ser armazenado no XCom
        return extract()

    def task_transform(**context):
        # Puxa o retorno da task 'extract' via XCom
        ti = context['ti']
        extracted_data = ti.xcom_pull(task_ids='extract_data')
        
        if not extracted_data:
            raise ValueError("Nenhum dado recebido da etapa de extração.")
            
        # A função transform retorna list[dict]
        return transform(extracted_data)

    def task_load(**context):
        # Puxa o retorno da task 'transform' via XCom
        ti = context['ti']
        transformed_data = ti.xcom_pull(task_ids='transform_data')
        
        if not transformed_data:
            raise ValueError("Nenhum dado recebido da etapa de transformação.")
            
        # Executa a carga no banco
        load(transformed_data)

    # Definição das tasks
    t1 = PythonOperator(
        task_id='extract_data',
        python_callable=task_extract,
        provide_context=True
    )

    t2 = PythonOperator(
        task_id='transform_data',
        python_callable=task_transform,
        provide_context=True
    )

    t3 = PythonOperator(
        task_id='load_data',
        python_callable=task_load,
        provide_context=True
    )

    # Definição das dependências (ordem de execução)
    t1 >> t2 >> t3
