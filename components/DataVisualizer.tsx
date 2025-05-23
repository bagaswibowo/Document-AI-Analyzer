
import React, { useState, useMemo } from 'react';
import { ParsedCsvData, ColumnInfo, DataRow, ChartData } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, ScatterChart, Scatter, ZAxis } from 'recharts';
import { Card } from './common/Card';
import { ChartBarIcon, PresentationChartLineIcon, ChartPieIcon, SquaresPlusIcon } from '@heroicons/react/24/outline';

interface DataVisualizerProps {
  data: ParsedCsvData;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82Ca9D'];

export const DataVisualizer: React.FC<DataVisualizerProps> = ({ data }) => {
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie' | 'scatter'>('bar');
  const [selectedXColumn, setSelectedXColumn] = useState<string | null>(data.headers[0] || null);
  const [selectedYColumn, setSelectedYColumn] = useState<string | null>(
    data.columnInfos.find(c => c.type === 'number')?.name || null
  );
   const [selectedPieColumn, setSelectedPieColumn] = useState<string | null>(
    data.columnInfos.find(c => c.type === 'string')?.name || null
  );


  const numericalColumns = useMemo(() => data.columnInfos.filter(col => col.type === 'number').map(col => col.name), [data.columnInfos]);
  const categoricalColumns = useMemo(() => data.columnInfos.filter(col => col.type === 'string' || col.type === 'boolean').map(col => col.name), [data.columnInfos]);
  const allColumns = useMemo(() => data.headers, [data.headers]);


  const chartData = useMemo((): ChartData | null => {
    if (!selectedXColumn && chartType !== 'pie') return null;
    if (chartType === 'pie' && !selectedPieColumn) return null;

    try {
      if (chartType === 'pie' && selectedPieColumn) {
        const colInfo = data.columnInfos.find(c => c.name === selectedPieColumn);
        if (!colInfo || !colInfo.stats.valueCounts) return null;
        return Object.entries(colInfo.stats.valueCounts).map(([name, value]) => ({ name, value }));
      }
      
      if (!selectedXColumn || (chartType !== 'bar' && chartType !== 'line' && chartType !== 'scatter' && !selectedYColumn)) return null;
      if((chartType === 'bar' || chartType === 'line' || chartType === 'scatter') && !selectedYColumn) return null;


      if (selectedXColumn && selectedYColumn) {
         return data.rows.map(row => ({
          [selectedXColumn]: row[selectedXColumn],
          [selectedYColumn]: typeof row[selectedYColumn] === 'string' ? parseFloat(row[selectedYColumn] as string) : row[selectedYColumn]
        }));
      } else if (selectedXColumn && chartType === 'bar') { // Single column bar chart (histogram like)
        const colInfo = data.columnInfos.find(c => c.name === selectedXColumn);
        if (colInfo?.type === 'number') { //rudimentary histogram
            const values = data.rows.map(r => r[selectedXColumn] as number).filter(v => typeof v === 'number');
            const min = Math.min(...values);
            const max = Math.max(...values);
            const bins = 10;
            const binSize = (max-min)/bins;
            const hist: Record<string, number> = {};
            for(let i=0; i<bins; i++) hist[`${(min + i*binSize).toFixed(1)}-${(min + (i+1)*binSize).toFixed(1)}`] = 0;
            values.forEach(v => {
                const binIndex = Math.floor((v - min) / binSize);
                const binName = `${(min + binIndex*binSize).toFixed(1)}-${(min + (binIndex+1)*binSize).toFixed(1)}`;
                if(hist[binName] !== undefined) hist[binName]++; else if(binIndex === bins) hist[Object.keys(hist)[bins-1]]++; // last bin for max value
            });
            return Object.entries(hist).map(([name, value]) => ({ name, value }));
        } else if (colInfo?.stats.valueCounts) { // bar chart for categorical
            return Object.entries(colInfo.stats.valueCounts).map(([name, value]) => ({ name, value }));
        }
      }


    } catch (error) {
      console.error("Error preparing chart data:", error);
      return null;
    }
    return null;
  }, [data, chartType, selectedXColumn, selectedYColumn, selectedPieColumn]);

  const renderChart = () => {
    if (!chartData || chartData.length === 0) {
      return <p className="text-gray-400 text-center py-8">No data to display for current selection, or selection is incomplete.</p>;
    }

    const yAxisLabel = selectedYColumn || 'Value';

    return (
      <ResponsiveContainer width="100%" height={400}>
        {chartType === 'bar' && selectedXColumn && (
          <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
            <XAxis dataKey={selectedYColumn ? selectedXColumn : 'name'} stroke="#9CA3AF" />
            <YAxis stroke="#9CA3AF" label={{ value: yAxisLabel, angle: -90, position: 'insideLeft', fill:"#9CA3AF" }} />
            <Tooltip contentStyle={{ backgroundColor: '#2D3748', border: 'none', borderRadius: '0.375rem' }} itemStyle={{ color: '#E2E8F0' }} labelStyle={{ color: '#CBD5E0' }}/>
            <Legend wrapperStyle={{color: "#E2E8F0"}}/>
            <Bar dataKey={selectedYColumn || 'value'} fill="#3b82f6" />
          </BarChart>
        )}
        {chartType === 'line' && selectedXColumn && selectedYColumn && (
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
            <XAxis dataKey={selectedXColumn} stroke="#9CA3AF" />
            <YAxis stroke="#9CA3AF" label={{ value: yAxisLabel, angle: -90, position: 'insideLeft', fill:"#9CA3AF" }} />
            <Tooltip contentStyle={{ backgroundColor: '#2D3748', border: 'none', borderRadius: '0.375rem' }} itemStyle={{ color: '#E2E8F0' }} labelStyle={{ color: '#CBD5E0' }}/>
            <Legend wrapperStyle={{color: "#E2E8F0"}}/>
            <Line type="monotone" dataKey={selectedYColumn} stroke="#3b82f6" activeDot={{ r: 8 }} />
          </LineChart>
        )}
        {chartType === 'pie' && selectedPieColumn && (
          <PieChart>
            <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120} fill="#3b82f6" label>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ backgroundColor: '#2D3748', border: 'none', borderRadius: '0.375rem' }} itemStyle={{ color: '#E2E8F0' }} labelStyle={{ color: '#CBD5E0' }}/>
            <Legend wrapperStyle={{color: "#E2E8F0"}} />
          </PieChart>
        )}
        {chartType === 'scatter' && selectedXColumn && selectedYColumn && (
           <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
            <XAxis type="number" dataKey={selectedXColumn} name={selectedXColumn} stroke="#9CA3AF" />
            <YAxis type="number" dataKey={selectedYColumn} name={selectedYColumn} stroke="#9CA3AF" label={{ value: yAxisLabel, angle: -90, position: 'insideLeft', fill:"#9CA3AF" }}/>
            <ZAxis range={[100]} /> {/* Optional: for bubble size if a Z-axis column is selected */}
            <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#2D3748', border: 'none', borderRadius: '0.375rem' }} itemStyle={{ color: '#E2E8F0' }} labelStyle={{ color: '#CBD5E0' }}/>
            <Legend wrapperStyle={{color: "#E2E8F0"}}/>
            <Scatter name={`${selectedXColumn} vs ${selectedYColumn}`} data={chartData} fill="#3b82f6" />
          </ScatterChart>
        )}
      </ResponsiveContainer>
    );
  };

  const renderColumnSelectors = () => {
    if (chartType === 'pie') {
      return (
        <div className="mb-4">
          <label htmlFor="pieColumn" className="block text-sm font-medium text-gray-300 mb-1">Categorical Column for Pie Chart:</label>
          <select
            id="pieColumn"
            value={selectedPieColumn || ''}
            onChange={(e) => setSelectedPieColumn(e.target.value || null)}
            className="w-full p-2 bg-slate-700 border border-slate-600 rounded-md text-gray-100 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">Select Column</option>
            {categoricalColumns.map(col => <option key={col} value={col}>{col}</option>)}
          </select>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label htmlFor="xColumn" className="block text-sm font-medium text-gray-300 mb-1">X-Axis Column:</label>
          <select
            id="xColumn"
            value={selectedXColumn || ''}
            onChange={(e) => setSelectedXColumn(e.target.value || null)}
            className="w-full p-2 bg-slate-700 border border-slate-600 rounded-md text-gray-100 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">Select Column</option>
            {(chartType === 'scatter' ? numericalColumns : allColumns).map(col => <option key={col} value={col}>{col}</option>)}
          </select>
        </div>
        {(chartType === 'line' || chartType === 'scatter' || (chartType === 'bar' && numericalColumns.includes(selectedXColumn || ''))) && (
          <div>
            <label htmlFor="yColumn" className="block text-sm font-medium text-gray-300 mb-1">Y-Axis Column (Numerical):</label>
            <select
              id="yColumn"
              value={selectedYColumn || ''}
              onChange={(e) => setSelectedYColumn(e.target.value || null)}
              className="w-full p-2 bg-slate-700 border border-slate-600 rounded-md text-gray-100 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Select Column</option>
              {numericalColumns.map(col => <option key={col} value={col}>{col}</option>)}
            </select>
          </div>
        )}
      </div>
    );
  };
  
  const chartTypes = [
    { id: 'bar', name: 'Bar Chart', icon: ChartBarIcon },
    { id: 'line', name: 'Line Chart', icon: PresentationChartLineIcon },
    { id: 'pie', name: 'Pie Chart', icon: ChartPieIcon },
    { id: 'scatter', name: 'Scatter Plot', icon: SquaresPlusIcon },
  ];


  return (
    <Card title="Data Visualization" icon={ChartBarIcon}>
      <div className="mb-6 flex flex-wrap gap-2">
        {chartTypes.map(ct => (
           <button
            key={ct.id}
            onClick={() => setChartType(ct.id as 'bar' | 'line' | 'pie' | 'scatter')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center
                        ${chartType === ct.id ? 'bg-primary-600 text-white' : 'bg-slate-600 text-gray-300 hover:bg-slate-500'}`}
          >
            <ct.icon className="h-5 w-5 mr-2" />
            {ct.name}
          </button>
        ))}
      </div>
      
      {renderColumnSelectors()}
      
      <div className="mt-6 bg-slate-750 p-4 rounded-lg shadow-inner min-h-[400px] flex items-center justify-center">
        {renderChart()}
      </div>
    </Card>
  );
};
    