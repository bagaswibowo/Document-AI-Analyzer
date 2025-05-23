
import React, { useState, useMemo } from 'react';
import { ParsedCsvData } from '../types';
import { ChartData } from '../types'; // Ensure ChartData allows nulls if necessary
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell, ScatterChart, Scatter, ZAxis 
} from 'recharts';
import { Card } from './common/Card';
import { 
  ChartBarIcon, PresentationChartLineIcon, ChartPieIcon, SquaresPlusIcon, 
  QueueListIcon, Squares2X2Icon, ChartBarSquareIcon 
} from '@heroicons/react/24/outline';

interface DataVisualizerProps {
  data: ParsedCsvData;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

// Extend ChartType to include 'doughnut'
type ChartType = 'bar' | 'line' | 'pie' | 'doughnut' | 'scatter' | 'histogram' | 'heatmap' | 'boxplot';

interface ChartTypeOption {
  id: ChartType;
  name: string;
  icon: React.ElementType;
  disabled?: boolean;
}

export const DataVisualizer: React.FC<DataVisualizerProps> = ({ data }) => {
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [selectedXColumn, setSelectedXColumn] = useState<string | null>(data.headers[0] || null);
  const [selectedYColumn, setSelectedYColumn] = useState<string | null>(
    data.columnInfos.find(c => c.type === 'number')?.name || data.headers.find(h => data.columnInfos.find(ci => ci.name === h)?.type === 'number') || null
  );
  const [selectedPieColumn, setSelectedPieColumn] = useState<string | null>(
    data.columnInfos.find(c => c.type === 'string' || c.type === 'boolean')?.name || data.headers[0] || null
  );

  const numericalColumns = useMemo(() => data.columnInfos.filter(col => col.type === 'number').map(col => col.name), [data.columnInfos]);
  const categoricalColumns = useMemo(() => data.columnInfos.filter(col => col.type === 'string' || col.type === 'boolean').map(col => col.name), [data.columnInfos]);
  const allColumns = useMemo(() => data.headers, [data.headers]);

  const chartData = useMemo((): ChartData | null => {
    if (!selectedXColumn && !['pie', 'doughnut'].includes(chartType)) return null;
    if (['pie', 'doughnut'].includes(chartType) && !selectedPieColumn) return null;

    try {
      if ((chartType === 'pie' || chartType === 'doughnut') && selectedPieColumn) {
        const colInfo = data.columnInfos.find(c => c.name === selectedPieColumn);
        if (!colInfo || !colInfo.stats.valueCounts) return null;
        return Object.entries(colInfo.stats.valueCounts)
          .map(([name, value]) => ({ name, value }))
          .sort((a,b) => b.value - a.value) 
          .slice(0, 10); 
      }
      
      if (!selectedXColumn || (chartType !== 'bar' && !selectedYColumn)) return null;
      if((chartType === 'line' || chartType === 'scatter') && !selectedYColumn) return null;

      if (selectedXColumn && selectedYColumn) {
         return data.rows.map(row => ({
          [selectedXColumn]: row[selectedXColumn],
          [selectedYColumn]: typeof row[selectedYColumn] === 'string' ? parseFloat(row[selectedYColumn] as string) : row[selectedYColumn]
        })).filter(item => item[selectedYColumn] !== null && !isNaN(Number(item[selectedYColumn])));
      } else if (selectedXColumn && chartType === 'bar') { 
        const colInfo = data.columnInfos.find(c => c.name === selectedXColumn);
        if (colInfo?.type === 'number') { 
            const values = data.rows.map(r => r[selectedXColumn] as number).filter(v => typeof v === 'number' && !isNaN(v));
            if (values.length === 0) return null;
            const min = Math.min(...values);
            const max = Math.max(...values);
            const numBins = Math.min(10, Math.floor(Math.sqrt(values.length)));
            if (numBins <=0 || min === max) return [{name: String(min), value: values.length}];

            const binSize = (max - min) / numBins || 1; 
            
            const hist: Record<string, number> = {};
            for(let i=0; i < numBins; i++) {
              const binStart = min + i * binSize;
              const binEnd = min + (i+1) * binSize;
              hist[`${binStart.toFixed(1)}-${binEnd.toFixed(1)}`] = 0;
            }
            const lastBinKey = Object.keys(hist)[numBins-1];
            if(!lastBinKey && numBins === 1) { 
                 hist[`${min.toFixed(1)}-${max.toFixed(1)}`] = 0;
            }

            values.forEach(v => {
                let binIndex = Math.floor((v - min) / binSize);
                binIndex = Math.max(0, Math.min(binIndex, numBins - 1)); 
                const binKeys = Object.keys(hist);
                const binName = binKeys[binIndex];
                if(binName) hist[binName]++;
            });
            return Object.entries(hist).map(([name, value]) => ({ name, value }));
        } else if (colInfo?.stats.valueCounts) { 
            return Object.entries(colInfo.stats.valueCounts)
              .map(([name, value]) => ({ name, value }))
              .sort((a,b) => b.value - a.value)
              .slice(0,15); 
        }
      }
    } catch (error) {
      console.error("Kesalahan saat menyiapkan data grafik:", error);
      return [{ name: "Kesalahan", value: 0 }]; 
    }
    return null;
  }, [data, chartType, selectedXColumn, selectedYColumn, selectedPieColumn]);

  const renderChart = () => {
    if (!chartData || chartData.length === 0) {
      return <p className="text-slate-400 text-center py-12 text-lg">Tidak ada data untuk ditampilkan untuk pilihan saat ini, atau pilihan tidak lengkap. Silakan sesuaikan pilihan kolom atau jenis grafik.</p>;
    }
    
    const yAxisDataKey = selectedYColumn || 'value';
    const xAxisDataKey = selectedYColumn ? selectedXColumn : 'name';

    const commonTooltipProps = {
        contentStyle: { backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '0.375rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' },
        itemStyle: { color: '#d1d5db' },
        labelStyle: { color: '#9ca3af', fontWeight: 'bold' },
        cursor:{ fill: 'rgba(100, 116, 139, 0.1)' }
    };
    const commonAxisProps = {
        stroke: '#6b7280', 
        tickFormatter: (tick: any) => typeof tick === 'number' ? tick.toLocaleString('id-ID') : tick,
    };
    const commonLegendProps = { wrapperStyle: { color: "#cbd5e1", paddingTop: '10px' }};

    return (
      <ResponsiveContainer width="100%" height={450}>
        {chartType === 'bar' && selectedXColumn && (
          <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey={xAxisDataKey} {...commonAxisProps} angle={-25} textAnchor="end" height={60} interval={0}/>
            <YAxis {...commonAxisProps} label={{ value: yAxisDataKey, angle: -90, position: 'insideLeft', fill:"#9ca3af", style: {textAnchor: 'middle'} }} />
            <Tooltip {...commonTooltipProps} />
            <Legend {...commonLegendProps} />
            <Bar dataKey={yAxisDataKey} fill={COLORS[0]} radius={[4, 4, 0, 0]} />
          </BarChart>
        )}
        {chartType === 'line' && selectedXColumn && selectedYColumn && (
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey={selectedXColumn} {...commonAxisProps} />
            <YAxis {...commonAxisProps} label={{ value: selectedYColumn, angle: -90, position: 'insideLeft', fill:"#9ca3af", style: {textAnchor: 'middle'} }} />
            <Tooltip {...commonTooltipProps} />
            <Legend {...commonLegendProps} />
            <Line type="monotone" dataKey={selectedYColumn} stroke={COLORS[0]} strokeWidth={2} activeDot={{ r: 8, fill: COLORS[0], stroke: '#fff', strokeWidth: 2 }} dot={{r:4, fill:COLORS[0]}}/>
          </LineChart>
        )}
        {(chartType === 'pie' || chartType === 'doughnut') && selectedPieColumn && (
          <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <Pie 
              data={chartData} 
              dataKey="value" 
              nameKey="name" 
              cx="50%" 
              cy="50%" 
              innerRadius={chartType === 'doughnut' ? 60 : 0} 
              outerRadius={120} 
              fill={COLORS[0]} 
              labelLine={false}
              label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }) => {
                const RADIAN = Math.PI / 180;
                const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                const x = cx + (radius + 10) * Math.cos(-midAngle * RADIAN);
                const y = cy + (radius + 10) * Math.sin(-midAngle * RADIAN);
                return (percent * 100) > 3 ? (
                  <text x={x} y={y} fill="#cbd5e1" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="12px">
                    {`${name} (${(percent * 100).toFixed(0)}%)`}
                  </text>
                ) : null;
              }}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="#1f2937" strokeWidth={1}/>
              ))}
            </Pie>
            <Tooltip {...commonTooltipProps} />
            <Legend {...commonLegendProps} layout="horizontal" verticalAlign="bottom" align="center"/>
          </PieChart>
        )}
        {chartType === 'scatter' && selectedXColumn && selectedYColumn && (
           <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis type="number" dataKey={selectedXColumn} name={selectedXColumn} {...commonAxisProps} domain={['dataMin', 'dataMax']}/>
            <YAxis type="number" dataKey={selectedYColumn} name={selectedYColumn} {...commonAxisProps} label={{ value: selectedYColumn, angle: -90, position: 'insideLeft', fill:"#9ca3af", style: {textAnchor: 'middle'} }} domain={['dataMin', 'dataMax']}/>
            <ZAxis range={[50, 200]} />
            <Tooltip {...commonTooltipProps} />
            <Legend {...commonLegendProps} />
            <Scatter name={`${selectedXColumn} vs ${selectedYColumn}`} data={chartData} fill={COLORS[0]} shape="circle" />
          </ScatterChart>
        )}
      </ResponsiveContainer>
    );
  };

  const renderColumnSelectors = () => {
    if (chartType === 'pie' || chartType === 'doughnut') {
      return (
        <div className="mb-6">
          <label htmlFor="pieColumn" className="block text-sm font-medium text-slate-300 mb-1">Kolom Kategorikal:</label>
          <select
            id="pieColumn"
            value={selectedPieColumn || ''}
            onChange={(e) => setSelectedPieColumn(e.target.value || null)}
            className="w-full p-2.5 bg-slate-600 border border-slate-500 rounded-md text-slate-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
            aria-label="Pilih kolom kategorikal untuk diagram lingkaran atau donat"
          >
            <option value="">Pilih Kolom</option>
            {categoricalColumns.map(col => <option key={col} value={col}>{col}</option>)}
             {allColumns.filter(col => !categoricalColumns.includes(col)).map(col => <option key={col} value={col} disabled>{col} (kurang ideal)</option>)}
          </select>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label htmlFor="xColumn" className="block text-sm font-medium text-slate-300 mb-1">
            {chartType === 'bar' && !selectedYColumn ? 'Kolom untuk Bar (Kategorikal/Bin Numerik):' : 'Kolom Sumbu X:'}
          </label>
          <select
            id="xColumn"
            value={selectedXColumn || ''}
            onChange={(e) => setSelectedXColumn(e.target.value || null)}
            className="w-full p-2.5 bg-slate-600 border border-slate-500 rounded-md text-slate-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
            aria-label="Pilih kolom sumbu X"
          >
            <option value="">Pilih Kolom</option>
            {(chartType === 'scatter' ? numericalColumns : allColumns).map(col => <option key={col} value={col}>{col}</option>)}
          </select>
        </div>
        { (chartType === 'line' || chartType === 'scatter' || (chartType === 'bar' && selectedXColumn && numericalColumns.includes(data.columnInfos.find(c => c.name === selectedXColumn)?.type === 'number' ? selectedXColumn : ''))) && (
          <div>
            <label htmlFor="yColumn" className="block text-sm font-medium text-slate-300 mb-1">Kolom Sumbu Y (Numerik):</label>
            <select
              id="yColumn"
              value={selectedYColumn || ''}
              onChange={(e) => setSelectedYColumn(e.target.value || null)}
              className="w-full p-2.5 bg-slate-600 border border-slate-500 rounded-md text-slate-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
              aria-label="Pilih kolom sumbu Y (numerik)"
            >
              <option value="">Pilih Kolom (Nilai)</option>
              {numericalColumns.map(col => <option key={col} value={col}>{col}</option>)}
            </select>
          </div>
        )}
      </div>
    );
  };
  
  const chartTypeOptions: ChartTypeOption[] = [
    { id: 'bar', name: 'Diagram Batang', icon: ChartBarIcon },
    { id: 'line', name: 'Diagram Garis', icon: PresentationChartLineIcon },
    { id: 'pie', name: 'Diagram Lingkaran', icon: ChartPieIcon },
    { id: 'doughnut', name: 'Diagram Donat', icon: ChartPieIcon },
    { id: 'scatter', name: 'Plot Sebar', icon: SquaresPlusIcon },
    { id: 'histogram', name: 'Histogram', icon: QueueListIcon, disabled: true },
    { id: 'heatmap', name: 'Heatmap', icon: Squares2X2Icon, disabled: true },
    { id: 'boxplot', name: 'Box Plot', icon: ChartBarSquareIcon, disabled: true },
  ];


  return (
    <Card title="Studio Visualisasi Data" icon={ChartBarIcon}>
      <div className="mb-6 flex flex-wrap gap-2 items-center">
        <span className="text-sm font-medium text-slate-400 mr-2">Jenis Grafik:</span>
        {chartTypeOptions.map(ct => (
           <button
            key={ct.id}
            onClick={() => !ct.disabled && setChartType(ct.id)}
            disabled={ct.disabled}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-150 flex items-center shadow-sm hover:shadow-md
                        ${chartType === ct.id ? 'bg-primary-600 text-white ring-2 ring-primary-400 ring-offset-2 ring-offset-slate-700' : 
                         ct.disabled ? 'bg-slate-600 text-slate-500 cursor-not-allowed opacity-70' :
                         'bg-slate-600 text-slate-300 hover:bg-slate-500 hover:text-slate-100'}`}
            aria-pressed={chartType === ct.id}
            aria-label={ct.name}
          >
            <ct.icon className={`h-5 w-5 mr-2 ${ct.disabled ? 'text-slate-500' : ''}`} />
            {ct.name}
          </button>
        ))}
      </div>
      
      {renderColumnSelectors()}
      
      <div className="mt-6 bg-slate-750 p-4 rounded-lg shadow-inner min-h-[480px] flex items-center justify-center">
        {renderChart()}
      </div>
       {chartTypeOptions.find(ct => ct.id === chartType)?.disabled && (
        <p className="text-center text-amber-400 mt-4 text-sm">
            {chartTypeOptions.find(ct => ct.id === chartType)?.name} direncanakan untuk pembaruan mendatang.
        </p>
      )}
    </Card>
  );
};