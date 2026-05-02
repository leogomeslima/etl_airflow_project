CREATE TABLE IF NOT EXISTS vendas_transformadas (
    id SERIAL PRIMARY KEY,
    produto VARCHAR(100) NOT NULL,
    categoria VARCHAR(50),
    quantidade INTEGER NOT NULL,
    valor_total_bruto NUMERIC(10,2) NOT NULL,
    valor_total_com_imposto NUMERIC(10,2) NOT NULL,
    data_venda DATE NOT NULL,
    status VARCHAR(20) NOT NULL,
    processado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
