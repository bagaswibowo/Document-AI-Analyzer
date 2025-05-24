
import React, { useState, useMemo } from 'react';
import { ParsedCsvData, ChartData } from '../types';
// ThemeContext removed
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell, ScatterChart, Scatter, ZAxis, AreaChart, Area
} from 'recharts';
import { 
  ChartBarIcon as BarChartIconSolid, 
  ChartPieIcon as PieChartIconSolid,
  PresentationChartLineIcon as LineChartIconSolid,
  CircleStackIcon as ScatterPlotIconSolid,
  StopCircleIcon as DoughnutIconSolid, 
  MapIcon as AreaChartIconSolid, 
} from '@heroicons/react/24/solid';

interface DataVisualizerProps {
  data: ParsedCsvData;
}

const getDefaultColors = () => [ // Always light mode colors
  '#2563eb', // blue-600
  '#10b981', // emerald-500
  '#eab308', // yellow-500
  '#f97316', // orange-500
  '#ec4899', // pink-500
  '#8b5cf6', // violet-500
  '#3b82f6', // blue-500
];


type ChartType = 'bar' | 'line' | 'pie' | 'doughnut' | 'scatter' | 'histogram' | 'area';

interface ChartTypeOption {
  id: ChartType;
  name: string; 
  icon: React.ElementType;
}

export const DataVisualizer: React.FC<DataVisualizerProps> = ({ data }) => {
  // themeMode and isDarkMode removed
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [selectedXColumn, setSelectedXColumn] = useState<string | null>(data.headers[0] || null);
  const [selectedYColumn, setSelectedYColumn] = useState<string | null>(
    data.columnInfos.find(c => c.type === 'number')?.name || data.headers.find(h => data.columnInfos.find(ci => ci.name === h)?.type === 'number') || null
  );
  const [selectedPieColumn, setSelectedPieColumn] = useState<string | null>(
    data.columnInfos.find(c => c.type === 'string' || c.type === 'boolean')?.name || data.headers[0] || null
  );
  const [histogramBins, setHistogramBins] = useState<number>(10);

  const COLORS = useMemo(() => getDefaultColors(), []); // No dependency on isDarkMode

  const numericalColumns = useMemo(() => data.columnInfos.filter(col => col.type === 'number').map(col => col.name), [data.columnInfos]);
  const categoricalColumns = useMemo(() => data.columnInfos.filter(col => col.type === 'string' || col.type === 'boolean').map(col => col.name), [data.columnInfos]);
  const allColumns = useMemo(() => data.headers, [data.headers]);

  const chartData = useMemo((): ChartData | null => {
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
      
      if ((chartType === 'bar' || chartType === 'line' || chartType === 'scatter' || chartType === 'area') && !selectedXColumn) {
        return null;
      }
      
      if((chartType === 'line' || chartType === 'scatter' || chartType === 'area') && !selectedYColumn) return null;

      if (selectedXColumn && selectedYColumn && (chartType === 'line' || chartType === 'scatter' || chartType === 'bar' || chartType === 'area')) {
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
      return <div className="w-full p-4 text-center text-sm text-slate-700 bg-gray-100 rounded-md">No data to display for the current selection, or selection is incomplete.</div>;
    }
    
    const yAxisDataKey = chartType === 'histogram' || (chartType === 'bar' && !selectedYColumn) ? 'value' : selectedYColumn;
    const xAxisDataKey = chartType === 'histogram' || (chartType === 'bar' && !selectedYColumn) ? 'name' : selectedXColumn;

    const commonTooltipProps = {
        contentStyle: { 
            backgroundColor: 'rgb(255 255 255 / 0.9)', 
            border: '1px solid rgb(226 232 240)', 
            borderRadius: '0.375rem',
            color: 'rgb(30 41 59)', 
            fontSize: '0.8rem',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
        },
        itemStyle: { color: 'rgb(30 41 59)' },
        labelStyle: { color: 'rgb(71 85 105)', fontWeight: 'bold' },
        cursor:{ fill: 'rgb(226 232 240 / 0.5)' }
    };
    const commonAxisProps = {
        stroke: 'rgb(203 213 225)', 
        tickFormatter: (tick: any) => typeof tick === 'number' ? tick.toLocaleString('id-ID') : String(tick).substring(0, 15),
        tick: { fill: 'rgb(100 116 139)', fontSize: 10 } 
    };
    const commonLegendProps = { wrapperStyle: { color: 'rgb(30 41 59)', paddingTop: '10px', fontSize: 10 }};

    let chartComponent: React.ReactElement | null = null;

    if ((chartType === 'bar' || chartType === 'histogram') && selectedXColumn) {
      chartComponent = (
        <BarChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={'rgb(226 232 240)'} />
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
          <CartesianGrid strokeDasharray="3 3" stroke={'rgb(226 232 240)'} />
          <XAxis dataKey={selectedXColumn} {...commonAxisProps} />
          <YAxis {...commonAxisProps} label={{ value: selectedYColumn, angle: -90, position: 'insideLeft', fill: commonAxisProps.tick.fill, style: {textAnchor: 'middle', fontSize: 10} }} />
          <RechartsTooltip {...commonTooltipProps} />
          <Legend {...commonLegendProps} />
          <Line type="monotone" dataKey={selectedYColumn} stroke={COLORS[0]} strokeWidth={2} activeDot={{ r: 6, fill: COLORS[0], stroke: '#fff', strokeWidth: 1 }} dot={{r:3, fill:COLORS[0]}}/>
        </LineChart>
      );
    } else if (chartType === 'area' && selectedXColumn && selectedYColumn) { 
        chartComponent = (
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={'rgb(226 232 240)'} />
            <XAxis dataKey={selectedXColumn} {...commonAxisProps} />
            <YAxis {...commonAxisProps} label={{ value: selectedYColumn, angle: -90, position: 'insideLeft', fill: commonAxisProps.tick.fill, style: {textAnchor: 'middle', fontSize: 10} }} />
            <RechartsTooltip {...commonTooltipProps} />
            <Legend {...commonLegendProps} />
            <Area type="monotone" dataKey={selectedYColumn} stroke={COLORS[0]} fillOpacity={0.6} fill={COLORS[0]} strokeWidth={2} activeDot={{ r: 6, fill: COLORS[0], stroke: '#fff', strokeWidth: 1 }} dot={{r:3, fill:COLORS[0]}} />
          </AreaChart>
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
                <text x={x} y={y} fill={'#334155'} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="10px">
                  {`${String(name).substring(0,10)}${String(name).length > 10 ? '...': ''} (${(percent * 100).toFixed(0)}%)`}
                </text>
              ) : null;
            }}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke={'#fff'} strokeWidth={1}/>
            ))}
          </Pie>
          <RechartsTooltip {...commonTooltipProps} />
          <Legend {...commonLegendProps} layout="horizontal" verticalAlign="bottom" align="center"/>
        </PieChart>
      );
    } else if (chartType === 'scatter' && selectedXColumn && selectedYColumn) {
      chartComponent = (
         <ScatterChart margin={{ top: 5, right: 5, bottom: 20, left: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={'rgb(226 232 240)'} />
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
        return <div className="w-full p-4 text-center text-sm text-orange-600 bg-orange-50 rounded-md">Cannot render chart with current selections.</div>;
    }

    return (
      <ResponsiveContainer width="100%" height={450}>
        {chartComponent}
      </ResponsiveContainer>
    );
  };
  
  const commonSelectClass = "mt-1 block w-full py-2 px-3 border border-slate-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-slate-900";
  const commonLabelClass = "block text-sm font-medium text-slate-700 mb-1";

  const renderColumnSelectors = () => {
    if (chartType === 'pie' || chartType === 'doughnut') {
      return (
        <div>
          <label htmlFor="pieColumn" className={commonLabelClass}>Categorical Column</label>
          <select
            id="pieColumn"
            value={selectedPieColumn || ""}
            onChange={(e) => setSelectedPieColumn(e.target.value || null)}
            className={commonSelectClass}
          >
            <option value="">Select Column</option>
            {categoricalColumns.map(col => <option key={col} value={col}>{col}</option>)}
            {allColumns.filter(col => !categoricalColumns.includes(col)).map(col => <option key={col} value={col} disabled>{col} (less ideal)</option>)}
          </select>
        </div>
      );
    }
    
    if (chartType === 'histogram') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="histogramXColumn" className={commonLabelClass}>Numeric Column (Histogram)</label>
            <select
              id="histogramXColumn"
              value={selectedXColumn || ""}
              onChange={(e) => setSelectedXColumn(e.target.value || null)}
              className={commonSelectClass}
            >
              <option value="">Select Numeric Column</option>
              {numericalColumns.map(col => <option key={col} value={col}>{col}</option>)}
            </select>
          </div>
          <div>
             <label htmlFor="histogramBins" className={commonLabelClass}>Number of Bins</label>
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
          <label htmlFor="xAxisColumn" className={commonLabelClass}>{chartType === 'bar' && !selectedYColumn ? 'Category Column (Bar)' : 'X-Axis Column'}</label>
          <select
            id="xAxisColumn"
            value={selectedXColumn || ""}
            onChange={(e) => setSelectedXColumn(e.target.value || null)}
            className={commonSelectClass}
          >
            <option value="">Select X-Axis Column</option>
            {(chartType === 'scatter' ? numericalColumns : allColumns).map(col => <option key={col} value={col}>{col}</option>)}
          </select>
        </div>
        { (chartType === 'line' || chartType === 'scatter' || chartType === 'area' || (chartType === 'bar' && selectedXColumn)) && (
          <div>
            <label htmlFor="yAxisColumn" className={commonLabelClass}>Y-Axis Column (Numeric)</label>
            <select
              id="yAxisColumn"
              value={selectedYColumn || ""}
              onChange={(e) => setSelectedYColumn(e.target.value || null)}
              className={commonSelectClass}
            >
              <option value="">Select Y-Axis Column (Optional for Bar)</option>
              {numericalColumns.map(col => <option key={col} value={col}>{col}</option>)}
            </select>
          </div>
        )}
      </div>
    );
  };
  
  const chartTypeOptions: ChartTypeOption[] = [
    { id: 'bar', name: 'Bar', icon: BarChartIconSolid },
    { id: 'line', name: 'Line', icon: LineChartIconSolid },
    { id: 'area', name: 'Area', icon: AreaChartIconSolid }, 
    { id: 'pie', name: 'Pie', icon: PieChartIconSolid },
    { id: 'doughnut', name: 'Doughnut', icon: DoughnutIconSolid }, 
    { id: 'scatter', name: 'Scatter', icon: ScatterPlotIconSolid },
    { id: 'histogram', name: 'Histogram', icon: BarChartIconSolid }, 
  ];

  return (
    <div className="bg-white p-0 sm:p-0 rounded-lg shadow-none min-h-[calc(100vh-250px)]">
      <div className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
        <BarChartIconSolid className="w-6 h-6 mr-2 text-violet-600" />
        Data Visualization Studio
      </div>
      
      <div className="mb-6 flex flex-wrap justify-center gap-2 p-2 bg-slate-100 rounded-md">
        {chartTypeOptions.map(ct => (
          <button
            key={ct.id}
            onClick={() => {
                setChartType(ct.id);
                if (ct.id === 'pie' || ct.id === 'doughnut' || ct.id === 'histogram') {
                    setSelectedYColumn(null); 
                }
                if ((ct.id === 'line' || ct.id === 'area' || ct.id === 'scatter') && !selectedYColumn && numericalColumns.length > 0) {
                     setSelectedYColumn(numericalColumns[0]);
                }
            }}
            className={`px-3 py-2 text-xs sm:text-sm font-medium rounded-md flex items-center space-x-2 transition-all duration-150
              ${chartType === ct.id 
                ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-300' 
                : 'bg-white text-slate-700 hover:bg-slate-50 shadow-sm hover:shadow'
              }
            `}
          >
            <ct.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${chartType === ct.id ? 'text-white' : 'text-blue-500'}`} />
            <span>{ct.name}</span>
          </button>
        ))}
      </div>
      
      <div className="mb-6 p-4 border border-slate-200 rounded-md bg-slate-50">
        {renderColumnSelectors()}
      </div>
      
      <div className="mt-4 p-2 sm:p-4 border border-slate-200 rounded-lg bg-white min-h-[480px] flex items-center justify-center">
        {renderChart()}
      </div>
    </div>
  );
};
