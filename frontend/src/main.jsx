import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock3,
  Database,
  Download,
  ExternalLink,
  FileSpreadsheet,
  GitBranch,
  Layers3,
  PackageCheck,
  PieChart,
  Play,
  Radio,
  RefreshCcw,
  Server,
  ShieldCheck,
  Table2,
} from 'lucide-react';
import './styles.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const fallbackRecords = [
  { id: 1, produto: 'Smartphone X', categoria: 'Eletronicos', quantidade: 2, imposto: 3451.15, data: '2026-01-01', status: 'concluido' },
  { id: 2, produto: 'Notebook Y', categoria: 'Eletronicos', quantidade: 1, imposto: 4025, data: '2026-01-02', status: 'pendente' },
  { id: 3, produto: 'Mesa de Escritorio', categoria: 'Moveis', quantidade: 1, imposto: 517.5, data: '2026-01-03', status: 'cancelado' },
  { id: 4, produto: 'Cadeira Gamer', categoria: 'Moveis', quantidade: 3, imposto: 2760, data: '2026-01-04', status: 'concluido' },
  { id: 5, produto: 'Detergente Liquido', categoria: 'Limpeza', quantidade: 10, imposto: 63.25, data: '2026-01-05', status: 'concluido' },
  { id: 7, produto: 'Teclado Mecanico', categoria: 'Eletronicos', quantidade: 5, imposto: 862.5, data: '2026-01-07', status: 'concluido' },
  { id: 9, produto: 'Sabao em Po', categoria: 'Limpeza', quantidade: 20, imposto: 349.6, data: '2026-01-09', status: 'concluido' },
  { id: 10, produto: 'Sofa 3 Lugares', categoria: 'Moveis', quantidade: 1, imposto: 2875, data: '2026-01-10', status: 'concluido' },
  { id: 100, produto: 'Monitor Gamer 144hz', categoria: 'Eletronicos', quantidade: 1, imposto: 1380, data: '2026-02-01', status: 'concluido' },
  { id: 104, produto: 'Webcam Full HD', categoria: 'Eletronicos', quantidade: 2, imposto: 805, data: '2026-02-05', status: 'concluido' },
];

const pipelineSteps = [
  { name: 'Extract', detail: 'Leitura multi-CSV em data/', icon: FileSpreadsheet, state: 'ok' },
  { name: 'Transform', detail: 'Limpeza, tipagem e calculos', icon: RefreshCcw, state: 'ok' },
  { name: 'Load', detail: 'UPSERT em PostgreSQL destino', icon: Database, state: 'ok' },
  { name: 'Audit', detail: 'Analise acionada em falha', icon: ShieldCheck, state: 'standby' },
];

function normalizeRecord(row) {
  return {
    id: Number(row.id),
    produto: row.produto || row.nome || 'Sem produto',
    categoria: row.categoria || 'Sem categoria',
    quantidade: Number(row.quantidade || 0),
    imposto: Number(row.valor_total_com_imposto || row.imposto || 0),
    data: row.data_venda || row.data || '-',
    status: row.status || 'indefinido',
  };
}

function currency(value) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDateTime(value) {
  if (!value) return 'aguardando arquivo';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date(value));
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function StatCard({ icon: Icon, label, value, note }) {
  return (
    <section className="stat-card">
      <div className="stat-icon"><Icon size={20} /></div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{note}</small>
      </div>
    </section>
  );
}

const chartColors = ['#0f766e', '#38bdf8', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6'];

function App() {
  const [records, setRecords] = useState(fallbackRecords);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [lastCheckedAt, setLastCheckedAt] = useState(null);
  const [monitorState, setMonitorState] = useState('carregando');
  const [dataSource, setDataSource] = useState('database');
  const [apiMessage, setApiMessage] = useState('Conectando ao CSV local...');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    let active = true;

    async function loadResults() {
      try {
        const response = await fetch('/api/results', { cache: 'no-store' });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const payload = await response.json();
        const nextRecords = Array.isArray(payload.records)
          ? payload.records.map(normalizeRecord)
          : [];

        if (!active) return;

        setRecords(nextRecords.length > 0 ? nextRecords : fallbackRecords);
        setUpdatedAt(payload.updatedAt || null);
        setDataSource(payload.source || 'csv');
        setApiMessage(payload.message || 'Resultados atualizados.');
        setMonitorState(nextRecords.length > 0 ? 'online' : 'vazio');
      } catch (error) {
        if (!active) return;
        setApiMessage(`Falha ao ler resultados: ${error.message}`);
        setMonitorState('erro');
      } finally {
        if (active) {
          setLastCheckedAt(new Date().toISOString());
        }
      }
    }

    loadResults();
    const interval = window.setInterval(loadResults, 5000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  const stats = useMemo(() => {
    const statusCount = records.reduce((acc, row) => {
      acc[row.status] = (acc[row.status] || 0) + 1;
      return acc;
    }, {});

    const categoryTotals = records.reduce((acc, row) => {
      acc[row.categoria] = (acc[row.categoria] || 0) + row.imposto;
      return acc;
    }, {});

    const totalRevenue = records.reduce((sum, row) => sum + row.imposto, 0);
    const totalQuantity = records.reduce((sum, row) => sum + row.quantidade, 0);
    const maxCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0] || ['-', 1];
    const maxStatusCount = Math.max(...Object.values(statusCount), 1);

    return {
      statusCount,
      categoryTotals,
      totalRevenue,
      totalQuantity,
      maxCategory,
      maxStatusCount,
    };
  }, [records]);

  const categoryChartData = useMemo(() => {
    const entries = Object.entries(stats.categoryTotals);

    return {
      labels: entries.map(([category]) => category),
      datasets: [
        {
          label: 'Receita com imposto',
          data: entries.map(([, value]) => value),
          backgroundColor: entries.map((_, index) => chartColors[index % chartColors.length]),
          borderRadius: 8,
          maxBarThickness: 54,
        },
      ],
    };
  }, [stats.categoryTotals]);

  const statusChartData = useMemo(() => {
    const entries = Object.entries(stats.statusCount);

    return {
      labels: entries.map(([status]) => status),
      datasets: [
        {
          label: 'Registros',
          data: entries.map(([, count]) => count),
          backgroundColor: entries.map((_, index) => chartColors[index % chartColors.length]),
          borderColor: '#ffffff',
          borderWidth: 3,
        },
      ],
    };
  }, [stats.statusCount]);

  const categoryChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => currency(context.parsed.y || 0),
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#617470', font: { weight: 700 } },
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(49, 67, 64, 0.08)' },
        ticks: {
          color: '#617470',
          callback: (value) => currency(value),
        },
      },
    },
  };

  const statusChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '64%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 12,
          boxHeight: 12,
          color: '#314340',
          font: { weight: 700 },
          padding: 16,
        },
      },
    },
  };

  const totalPages = Math.max(1, Math.ceil(records.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = records.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const pageEnd = Math.min(safePage * pageSize, records.length);
  const paginatedRecords = records.slice((safePage - 1) * pageSize, safePage * pageSize);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  function changePageSize(event) {
    setPageSize(Number(event.target.value));
    setCurrentPage(1);
  }

  function exportToExcel() {
    const headers = ['ID', 'Produto', 'Categoria', 'Quantidade', 'Total com imposto', 'Data', 'Status'];
    const rows = records.map((row) => [
      row.id,
      row.produto,
      row.categoria,
      row.quantidade,
      row.imposto,
      row.data,
      row.status,
    ]);
    const tableRows = [headers, ...rows]
      .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`)
      .join('');
    const workbook = `
      <html>
        <head><meta charset="UTF-8" /></head>
        <body>
          <table>${tableRows}</table>
        </body>
      </html>
    `;
    const blob = new Blob([workbook], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().slice(0, 19).replaceAll(':', '-');

    link.href = url;
    link.download = `vendas_transformadas_${timestamp}.xls`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <main className={`app-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><GitBranch size={22} /></div>
          <div className="brand-copy">
            <strong>ETL Vendas</strong>
            <span>Airflow + PostgreSQL</span>
          </div>
          <button
            className="sidebar-toggle"
            type="button"
            onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
            aria-label={sidebarCollapsed ? 'Expandir menu lateral' : 'Contrair menu lateral'}
            title={sidebarCollapsed ? 'Expandir menu' : 'Contrair menu'}
          >
            {sidebarCollapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
          </button>
        </div>

        <nav className="nav-list" aria-label="Navegacao principal">
          <a className="active" href="#overview" title="Overview"><Activity size={18} /> <span>Overview</span></a>
          <a href="#pipeline" title="Pipeline"><Layers3 size={18} /> <span>Pipeline</span></a>
          <a href="#quality" title="Qualidade"><ShieldCheck size={18} /> <span>Qualidade</span></a>
          <a href="#dataset" title="Dataset"><Table2 size={18} /> <span>Dataset</span></a>
        </nav>

        <div className="service-card">
          <Server size={20} />
          <div className="service-copy">
            <span>Airflow Webserver</span>
            <a href="http://localhost:8080" target="_blank" rel="noreferrer">
              localhost:8080 <ExternalLink size={13} />
            </a>
          </div>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar" id="overview">
          <div>
            <span className="eyebrow">Dashboard operacional</span>
            <h1>Pipeline ETL conteinerizado</h1>
          </div>
          <a className="run-button" href="http://localhost:8080/dags/etl_vendas" target="_blank" rel="noreferrer">
            <Play size={18} /> Abrir DAG
          </a>
        </header>

        <section className="hero-panel">
          <div className="hero-copy">
            <div className="hero-kicker">
              <span className={`status-pill live ${monitorState}`}>
                <Radio size={16} /> Monitor em tempo real
              </span>
              <span className="run-chip">{dataSource === 'database' ? 'PostgreSQL destino' : 'Fallback CSV'}</span>
            </div>
            <h2>Pipeline de vendas com leitura multi-arquivo e qualidade rastreavel.</h2>
            <p>
              A interface consulta `data/vendas_transformadas.csv` a cada 5 segundos.
              Ao final de uma nova execucao da DAG, os indicadores e a tabela sao atualizados automaticamente.
            </p>
            <div className="monitor-line">
              <div>
                <span>Arquivo atualizado</span>
                <strong>{formatDateTime(updatedAt)}</strong>
              </div>
              <div>
                <span>Ultima consulta</span>
                <strong>{formatDateTime(lastCheckedAt)}</strong>
              </div>
              <div className="monitor-message">
                <span>Status</span>
                <strong>{apiMessage}</strong>
              </div>
            </div>
          </div>
          <div className="hero-grid">
            <StatCard icon={PackageCheck} label="Registros tratados" value={records.length.toString()} note="lidos do CSV final" />
            <StatCard icon={Database} label="Valor com imposto" value={currency(stats.totalRevenue)} note="resultado monitorado" />
              <StatCard
                icon={dataSource === 'database' ? Database : FileSpreadsheet}
                label="Fonte monitorada"
                value={dataSource === 'database' ? 'etl_destino' : 'CSV local'}
                note="atualiza a cada 5s"
              />
            <StatCard icon={Clock3} label="Agenda Airflow" value="Diário 00:00" note="horário do Airflow" />
          </div>
        </section>

        <section className="content-grid" id="pipeline">
          <div className="panel wide">
            <div className="panel-header">
              <div>
                <span className="eyebrow">Fluxo</span>
                <h3>Etapas da DAG</h3>
              </div>
              <span className="mini-badge">etl_vendas</span>
            </div>
            <div className="pipeline">
              {pipelineSteps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <React.Fragment key={step.name}>
                    <article className={`step-card ${step.state}`}>
                      <div><Icon size={22} /></div>
                      <strong>{step.name}</strong>
                      <span>{step.detail}</span>
                    </article>
                    {index < pipelineSteps.length - 1 && <ArrowRight className="step-arrow" size={22} />}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          <div className="panel" id="quality">
            <div className="panel-header">
              <div>
                <span className="eyebrow">Validacoes</span>
                <h3>Regras aplicadas</h3>
              </div>
            </div>
            <ul className="check-list">
              <li><CheckCircle2 size={17} /> Remove valor_unitario nulo</li>
              <li><CheckCircle2 size={17} /> Valida data no formato ISO</li>
              <li><CheckCircle2 size={17} /> Normaliza status com acentos</li>
              <li><CheckCircle2 size={17} /> Calcula imposto de 15%</li>
              <li><CheckCircle2 size={17} /> Usa ON CONFLICT DO NOTHING</li>
            </ul>
          </div>
        </section>

        <section className="content-grid">
          <div className="panel">
            <div className="panel-header">
              <div>
                <span className="eyebrow">Resumo</span>
                <h3>Indicadores</h3>
              </div>
            </div>
            <div className="metrics-list">
              <div><span>Quantidade vendida</span><strong>{stats.totalQuantity} itens</strong></div>
              <div><span>Categoria lider</span><strong>{stats.maxCategory[0]}</strong></div>
              <div><span>Concluidos</span><strong>{stats.statusCount.concluido || 0} registros</strong></div>
              <div><span>Pendentes</span><strong>{stats.statusCount.pendente || 0} registros</strong></div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <div>
                <span className="eyebrow">Categorias</span>
                <h3>Receita com imposto</h3>
              </div>
            </div>
            <div className="bar-list">
              {Object.entries(stats.categoryTotals).map(([category, value]) => (
                <div className="bar-row" key={category}>
                  <span>{category}</span>
                  <div className="bar-track">
                    <div style={{ width: `${(value / stats.maxCategory[1]) * 100}%` }} />
                  </div>
                  <strong>{currency(value)}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="content-grid charts-grid">
          <div className="panel chart-panel">
            <div className="panel-header">
              <div>
                <span className="eyebrow">Grafico</span>
                <h3>Receita por categoria</h3>
              </div>
              <BarChart3 size={20} />
            </div>
            <div className="category-chart" aria-label="Grafico de receita por categoria">
              <Bar data={categoryChartData} options={categoryChartOptions} />
            </div>
          </div>

          <div className="panel chart-panel">
            <div className="panel-header">
              <div>
                <span className="eyebrow">Grafico</span>
                <h3>Distribuicao por status</h3>
              </div>
              <PieChart size={20} />
            </div>
            <div className="status-chart" aria-label="Grafico de registros por status">
              <Doughnut data={statusChartData} options={statusChartOptions} />
            </div>
          </div>
        </section>

        <section className="panel table-panel" id="dataset">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Monitoramento</span>
              <h3>Dados transformados</h3>
            </div>
            <div className="dataset-actions">
              <button className="export-button" type="button" onClick={exportToExcel}>
                <Download size={16} /> Excel
              </button>
              <label>
                <span>Linhas</span>
                <select value={pageSize} onChange={changePageSize} aria-label="Linhas por pagina">
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                </select>
              </label>
              <span className={`warning ${monitorState}`}>
                <AlertTriangle size={15} /> {monitorState === 'online' ? (dataSource === 'database' ? 'Banco ao vivo' : 'CSV ao vivo') : 'Verificando fonte'}
              </span>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Produto</th>
                  <th>Categoria</th>
                  <th>Qtd.</th>
                  <th>Total</th>
                  <th>Data</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRecords.map((row, index) => (
                  <tr key={`${row.id}-${safePage}-${index}`}>
                    <td>{row.id}</td>
                    <td>{row.produto}</td>
                    <td>{row.categoria}</td>
                    <td>{row.quantidade}</td>
                    <td>{currency(row.imposto)}</td>
                    <td>{row.data}</td>
                    <td><span className={`status ${row.status}`}>{row.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pagination-bar">
            <span>
              Mostrando {pageStart}-{pageEnd} de {records.length} registros
            </span>
            <div className="pagination-controls">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={safePage === 1}
                aria-label="Pagina anterior"
              >
                <ChevronLeft size={17} />
              </button>
              <strong>Pagina {safePage} de {totalPages}</strong>
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={safePage === totalPages}
                aria-label="Proxima pagina"
              >
                <ChevronRight size={17} />
              </button>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
