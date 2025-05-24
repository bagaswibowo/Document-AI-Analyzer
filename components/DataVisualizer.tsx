import React, { useState, useMemo, useContext } from 'react';
import { ParsedCsvData, ChartData } from '../types';
import { ThemeContext } from '../index';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell, ScatterChart, Scatter, ZAxis 
} from 'recharts';
import { 
  ChartBarIcon as BarChartIconSolid, 
  ChartPieIcon as PieChartIconSolid,
  PresentationChartLineIcon as LineChartIconSolid,
  CircleStackIcon as ScatterPlotIconSolid,
  MinusIcon as DoughnutIconSolid, // Placeholder
} from '@heroicons/react/24/solid'; // Using solid for active state potentially

interface DataVisualizerProps {
  data: ParsedCsvData;
}

const getDefaultColors = (isDarkMode: boolean) => [
  isDarkMode ? '#38bdf8' : '#2563eb', // blue-400 / blue-600
  isDarkMode ? '#34d399' : '#10b981', // emerald-400 / emerald-500
  isDarkMode ? '#facc15' : '#eab308', // yellow-400 / yellow-500
  isDarkMode ? '#fb923c' : '#f97316', // orange-400 / orange-500
  isDarkMode ? '#f472b6' : '#ec4899', // pink-400 / pink-500
  isDarkMode ? '#a78bfa' : '#8b5cf6', // violet-400 / violet-500
  isDarkMode ? '#60a5fa' : '#3b82f6', // lightBlue-400 / blue-500
];


type ChartType = 'bar' | 'line' | 'pie' | 'doughnut' | 'scatter' | 'histogram';

interface ChartTypeOption {
  id: ChartType;
  name: string;
  icon: React.ElementType;
}

export const DataVisualizer: React.FC<DataVisualizerProps> = ({ data }) => {
  const { themeMode } = useContext(ThemeContext);
  const isDarkMode = themeMode === 'dark';

  const [chartType, setChartType] = useState<ChartType>('bar');
  const [selectedXColumn, setSelectedXColumn] = useState<string | null>(data.headers[0] || null);
  const [selectedYColumn, setSelectedYColumn] = useState<string | null>(
    data.columnInfos.find(c => c.type === 'number')?.name || data.headers.find(h => data.columnInfos.find(ci => ci.name === h)?.type === 'number') || null
  );
  const [selectedPieColumn, setSelectedPieColumn] = useState<string | null>(
    data.columnInfos.find(c => c.type === 'string' || c.type === 'boolean')?.name || data.headers[0] || null
  );
  const [histogramBins, setHistogramBins] = useState<number>(10);

  const COLORS = useMemo(() => getDefaultColors(isDarkMode), [isDarkMode]);

  const numericalColumns = useMemo(() => data.columnInfos.filter(col => col.type === 'number').map(col => col.name), [data.columnInfos]);
  const categoricalColumns = useMemo(() => data.columnInfos.filter(col => col.type === 'string' || col.type === 'boolean').map(col => col.name), [data.columnInfos]);
  const allColumns = useMemo(() => data.headers, [data.headers]);

  const chartData = useMemo((): ChartData | null => {
    // ... (Chart data logic remains largely the same as in the AntD version, but ensure it's robust)
    // Key adjustments:
    // - Ensure all parseFloat conversions are handled safely (e.g. for scatter/line Y-axis)
    // - Histogram logic should be robust for edge cases (e.g. single value, all same values)
    try {
      if (chartType === 'histogram') {
        if (!selectedXColumn || !numericalColumns.includes(selectedXColumn)) return null;
        const values = data.rows.map(r => r[selectedXColumn] as number).filter(v => typeof v === 'number' && !isNaN(v));
        if (values.length === 0) return null;
        
        const min = Math.min(...values);
        const max = Math.max(...values);
        const numBins = Math.max(1, Math.min(histogramBins, 50));
        if (numBins <=0 || min === max) return [{name: String(min.toFixed(2)), value: values.length}];

        const binSize = (max - min) / numBins || 1; 
        
        const hist: Record<string, number> = {};
        for(let i=0; i < numBins; i++) {
          const binStart = min + i * binSize;
          const binEnd = min + (i+1) * binSize;
          hist[`${binStart.toFixed(1)}-${binEnd.toFixed(1)}`] = 0;
        }
        
        const lastBinKey = Object.keys(hist)[numBins-1];
         if(!lastBinKey && numBins === 1 && min !== undefined && max !== undefined) { 
            hist[`${min.toFixed(1)}-${max.toFixed(1)}`] = 0;
        }

        values.forEach(v => {
            let binIndex = Math.floor((v - min) / binSize);
            binIndex = Math.max(0, Math.min(binIndex, numBins - 1)); 
            const binKeys = Object.keys(hist);
            const binName = binKeys[binIndex];
            if(binName) hist[binName]++;
            else if (v === max && binKeys[numBins-1]) {
                 hist[binKeys[numBins-1]]++;
            }
        });
        return Object.entries(hist).map(([name, value]) => ({ name, value }));

      } else if ((chartType === 'pie' || chartType === 'doughnut') && selectedPieColumn) {
        const colInfo = data.columnInfos.find(c => c.name === selectedPieColumn);
        if (!colInfo || !colInfo.stats.valueCounts) return null;
        return Object.entries(colInfo.stats.valueCounts)
          .map(([name, value]) => ({ name, value }))
          .sort((a,b) => b.value - a.value) 
          .slice(0, 10); 
      }
      
      if ((chartType === 'bar' || chartType === 'line' || chartType === 'scatter') && !selectedXColumn) {
        return null;
      }
      
      if((chartType === 'line' || chartType === 'scatter') && !selectedYColumn) return null;

      if (selectedXColumn && selectedYColumn && (chartType === 'line' || chartType === 'scatter' || chartType === 'bar')) {
         return data.rows.map(row => ({
          [selectedXColumn]: row[selectedXColumn],
          [selectedYColumn]: typeof row[selectedYColumn] === 'string' ? parseFloat(row[selectedYColumn] as string) : row[selectedYColumn]
        })).filter(item => {
            const yVal = item[selectedYColumn];
            return yVal !== null && yVal !== undefined && !isNaN(Number(yVal));
        });
      } else if (selectedXColumn && chartType === 'bar' && !selectedYColumn) {
        const colInfo = data.columnInfos.find(c => c.name === selectedXColumn);
        if (colInfo?.stats.valueCounts) { 
            return Object.entries(colInfo.stats.valueCounts)
              .map(([name, value]) => ({ name, value }))
              .sort((a,b) => b.value - a.value)
              .slice(0,20);
        }
      }
    } catch (error) {
      console.error("Error preparing chart data:", error);
      return [{ name: "Error", value: 0 }]; 
    }
    return null;
  }, [data, chartType, selectedXColumn, selectedYColumn, selectedPieColumn, numericalColumns, histogramBins]);

  const renderChart = () => {
    if (!chartData || chartData.length === 0) {
      return <div className="w-full p-4 text-center text-sm text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/30 rounded-md">Tidak ada data untuk ditampilkan untuk pilihan saat ini, atau pilihan tidak lengkap.</div>;
    }
    
    const yAxisDataKey = chartType === 'histogram' || (chartType === 'bar' && !selectedYColumn) ? 'value' : selectedYColumn;
    const xAxisDataKey = chartType === 'histogram' || (chartType === 'bar' && !selectedYColumn) ? 'name' : selectedXColumn;

    const commonTooltipProps = {
        contentStyle: { 
            backgroundColor: isDarkMode ? 'rgb(30 41 59 / 0.9)' : 'rgb(255 255 255 / 0.9)', // slate-800 / white
            border: `1px solid ${isDarkMode ? 'rgb(51 65 85)' : 'rgb(226 232 240)'}`, // slate-700 / slate-200
            borderRadius: '0.375rem', // rounded-md
            color: isDarkMode ? 'rgb(226 232 240)' : 'rgb(30 41 59)', // slate-200 / slate-800
            fontSize: '0.8rem',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' // shadow-lg
        },
        itemStyle: { color: isDarkMode ? 'rgb(226 232 240)' : 'rgb(30 41 59)' },
        labelStyle: { color: isDarkMode ? 'rgb(148 163 184)' : 'rgb(71 85 105)', fontWeight: 'bold' }, // slate-400 / slate-600
        cursor:{ fill: isDarkMode ? 'rgb(51 65 85 / 0.5)' : 'rgb(226 232 240 / 0.5)' }
    };
    const commonAxisProps = {
        stroke: isDarkMode ? 'rgb(71 85 105)' : 'rgb(203 213 225)', // slate-600 / slate-300
        tickFormatter: (tick: any) => typeof tick === 'number' ? tick.toLocaleString('id-ID') : String(tick).substring(0, 15),
        tick: { fill: isDarkMode ? 'rgb(148 163 184)' : 'rgb(100 116 139)', fontSize: 10 } // slate-400 / slate-500
    };
    const commonLegendProps = { wrapperStyle: { color: isDarkMode ? 'rgb(226 232 240)' : 'rgb(30 41 59)', paddingTop: '10px', fontSize: 10 }};

    let chartComponent: React.ReactElement | null = null;

    if ((chartType === 'bar' || chartType === 'histogram') && selectedXColumn) {
      chartComponent = (
        <BarChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? 'rgb(51 65 85)' : 'rgb(226 232 240)'} />
          <XAxis dataKey={xAxisDataKey!} {...commonAxisProps} angle={-35} textAnchor="end" interval={0} />
          <YAxis {...commonAxisProps} label={{ value: yAxisDataKey!, angle: -90, position: 'insideLeft', fill: commonAxisProps.tick.fill, style: {textAnchor: 'middle', fontSize: 10} }} />
          <RechartsTooltip {...commonTooltipProps} />
          <Legend {...commonLegendProps} />
          <Bar dataKey={yAxisDataKey!} fill={COLORS[0]} radius={[4, 4, 0, 0]} />
        </BarChart>
      );
    } else if (chartType === 'line' && selectedXColumn && selectedYColumn) {
      chartComponent = (
        <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? 'rgb(51 65 85)' : 'rgb(226 232 240)'} />
          <XAxis dataKey={selectedXColumn} {...commonAxisProps} />
          <YAxis {...commonAxisProps} label={{ value: selectedYColumn, angle: -90, position: 'insideLeft', fill: commonAxisProps.tick.fill, style: {textAnchor: 'middle', fontSize: 10} }} />
          <RechartsTooltip {...commonTooltipProps} />
          <Legend {...commonLegendProps} />
          <Line type="monotone" dataKey={selectedYColumn} stroke={COLORS[0]} strokeWidth={2} activeDot={{ r: 6, fill: COLORS[0], stroke: isDarkMode ? '#0f172a' : '#fff', strokeWidth: 1 }} dot={{r:3, fill:COLORS[0]}}/>
        </LineChart>
      );
    } else if ((chartType === 'pie' || chartType === 'doughnut') && selectedPieColumn) {
      chartComponent = (
        <PieChart margin={{ top: 10, right: 10, bottom: 30, left: 10 }}>
          <Pie 
            data={chartData} 
            dataKey="value" 
            nameKey="name" 
            cx="50%" 
            cy="50%" 
            innerRadius={chartType === 'doughnut' ? '50%' : '0%'} 
            outerRadius={'80%'}
            fill={COLORS[0]} 
            labelLine={false}
            label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }) => {
              const RADIAN = Math.PI / 180;
              const radius = innerRadius + (outerRadius - innerRadius) * 0.5 + 10;
              const x = cx + radius * Math.cos(-midAngle * RADIAN);
              const y = cy + radius * Math.sin(-midAngle * RADIAN);
              return (percent * 100) > 3 ? (
                <text x={x} y={y} fill={isDarkMode ? '#cbd5e1' : '#334155'} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="10px">
                  {`${String(name).substring(0,10)}${String(name).length > 10 ? '...': ''} (${(percent * 100).toFixed(0)}%)`}
                </text>
              ) : null;
            }}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke={isDarkMode ? '#0f172a' : '#fff'} strokeWidth={1}/>
            ))}
          </Pie>
          <RechartsTooltip {...commonTooltipProps} />
          <Legend {...commonLegendProps} layout="horizontal" verticalAlign="bottom" align="center"/>
        </PieChart>
      );
    } else if (chartType === 'scatter' && selectedXColumn && selectedYColumn) {
      chartComponent = (
         <ScatterChart margin={{ top: 5, right: 5, bottom: 20, left: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? 'rgb(51 65 85)' : 'rgb(226 232 240)'} />
          <XAxis type="number" dataKey={selectedXColumn} name={selectedXColumn} {...commonAxisProps} domain={['dataMin', 'dataMax']}/>
          <YAxis type="number" dataKey={selectedYColumn} name={selectedYColumn} {...commonAxisProps} label={{ value: selectedYColumn, angle: -90, position: 'insideLeft', fill: commonAxisProps.tick.fill, style: {textAnchor: 'middle', fontSize: 10} }} domain={['dataMin', 'dataMax']}/>
          <ZAxis range={[30, 150]} />
          <RechartsTooltip {...commonTooltipProps} />
          <Legend {...commonLegendProps} />
          <Scatter name={`${selectedXColumn} vs ${selectedYColumn}`} data={chartData} fill={COLORS[0]} shape="circle" />
        </ScatterChart>
      );
    }

    if (!chartComponent) {
        return <div className="w-full p-4 text-center text-sm text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-700/30 rounded-md">Tidak dapat merender grafik dengan pilihan saat ini.</div>;
    }

    return (
      <ResponsiveContainer width="100%" height={450}>
        {chartComponent}
      </ResponsiveContainer>
    );
  };
  
  const commonSelectClass = "mt-1 block w-full py-2 px-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-slate-900 dark:text-slate-200";
  const commonLabelClass = "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1";

  const renderColumnSelectors = () => {
    if (chartType === 'pie' || chartType === 'doughnut') {
      return (
        <div>
          <label htmlFor="pieColumn" className={commonLabelClass}>Kolom Kategorikal</label>
          <select
            id="pieColumn"
            value={selectedPieColumn || ""}
            onChange={(e) => setSelectedPieColumn(e.target.value || null)}
            className={commonSelectClass}
          >
            <option value="">Pilih Kolom</option>
            {categoricalColumns.map(col => <option key={col} value={col}>{col}</option>)}
            {allColumns.filter(col => !categoricalColumns.includes(col)).map(col => <option key={col} value={col} disabled>{col} (kurang ideal)</option>)}
          </select>
        </div>
      );
    }
    
    if (chartType === 'histogram') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="histogramXColumn" className={commonLabelClass}>Kolom Numerik (Histogram)</label>
            <select
              id="histogramXColumn"
              value={selectedXColumn || ""}
              onChange={(e) => setSelectedXColumn(e.target.value || null)}
              className={commonSelectClass}
            >
              <option value="">Pilih Kolom Numerik</option>
              {numericalColumns.map(col => <option key={col} value={col}>{col}</option>)}
            </select>
          </div>
          <div>
             <label htmlFor="histogramBins" className={commonLabelClass}>Jumlah Bin</label>
             <select id="histogramBins" value={histogramBins} onChange={(e) => setHistogramBins(Number(e.target.value))} className={commonSelectClass}>
                {[5, 8, 10, 12, 15, 20, 25, 30].map(b => <option key={b} value={b}>{b}</option>)}
             </select>
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="xAxisColumn" className={commonLabelClass}>{chartType === 'bar' && !selectedYColumn ? 'Kolom Kategori (Bar)' : 'Kolom Sumbu X'}</label>
          <select
            id="xAxisColumn"
            value={selectedXColumn || ""}
            onChange={(e) => setSelectedXColumn(e.target.value || null)}
            className={commonSelectClass}
          >
            <option value="">Pilih Kolom Sumbu X</option>
            {(chartType === 'scatter' ? numericalColumns : allColumns).map(col => <option key={col} value={col}>{col}</option>)}
          </select>
        </div>
        { (chartType === 'line' || chartType === 'scatter' || (chartType === 'bar' && selectedXColumn)) && (
          <div>
            <label htmlFor="yAxisColumn" className={commonLabelClass}>Kolom Sumbu Y (Numerik)</label>
            <select
              id="yAxisColumn"
              value={selectedYColumn || ""}
              onChange={(e) => setSelectedYColumn(e.target.value || null)}
              className={commonSelectClass}
            >
              <option value="">Pilih Kolom Sumbu Y (Opsional untuk Bar)</option>
              {numericalColumns.map(col => <option key={col} value={col}>{col}</option>)}
            </select>
          </div>
        )}
      </div>
    );
  };
  
  const chartTypeOptions: ChartTypeOption[] = [
    { id: 'bar', name: 'Batang', icon: BarChartIconSolid },
    { id: 'line', name: 'Garis', icon: LineChartIconSolid },
    { id: 'pie', name: 'Lingkaran', icon: PieChartIconSolid },
    { id: 'doughnut', name: 'Donat', icon: DoughnutIconSolid }, 
    { id: 'scatter', name: 'Sebar', icon: ScatterPlotIconSolid },
    { id: 'histogram', name: 'Histogram', icon: BarChartIconSolid },
  ];

  return (
    <div className="bg-white dark:bg-slate-800 p-0 sm:p-0 rounded-lg shadow-none min-h-[calc(100vh-250px)]"> {/* No internal padding, App.tsx handles it */}
      <div className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center">
        <BarChartIconSolid className="w-6 h-6 mr-2 text-blue-600 dark:text-blue-400" />
        Studio Visualisasi Data
      </div>
      
      <div className="mb-6 flex flex-wrap justify-center gap-2 p-2 bg-slate-100 dark:bg-slate-700/50 rounded-md">
        {chartTypeOptions.map(ct => (
          <button
            key={ct.id}
            onClick={() => {
                setChartType(ct.id);
                if (ct.id === 'pie' || ct.id === 'doughnut' || ct.id === 'histogram') {
                    setSelectedYColumn(null);
                }
            }}
            className={`px-3 py-2 text-xs sm:text-sm font-medium rounded-md flex items-center space-x-2 transition-all duration-150
              ${chartType === ct.id 
                ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-300 dark:ring-blue-500' 
                : 'bg-white dark:bg-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-500 shadow-sm hover:shadow'
              }
            `}
          >
            <ct.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${chartType === ct.id ? 'text-white' : 'text-blue-500 dark:text-blue-400'}`} />
            <span>{ct.name}</span>
          </button>
        ))}
      </div>
      
      <div className="mb-6 p-4 border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-700/30">
        {renderColumnSelectors()}
      </div>
      
      <div className="mt-4 p-2 sm:p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 min-h-[480px] flex items-center justify-center">
        {renderChart()}
      </div>
    </div>
  );
};
