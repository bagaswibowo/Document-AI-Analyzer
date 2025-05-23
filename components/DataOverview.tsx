
import React from 'react';
import { ParsedCsvData, ColumnInfo, DataRow } from '../types';
import { Card } from './common/Card';
import { InformationCircleIcon, HashtagIcon, ChartPieIcon, CalculatorIcon } from '@heroicons/react/24/outline';

interface DataOverviewProps {
  data: ParsedCsvData;
}

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ElementType }> = ({ title, value, icon: Icon }) => (
  <div className="bg-slate-700 p-4 rounded-lg shadow flex items-center">
    <div className="p-2 bg-primary-500/20 rounded-full mr-3">
      <Icon className="h-6 w-6 text-primary-400" />
    </div>
    <div>
      <p className="text-sm text-gray-400">{title}</p>
      <p className="text-xl font-semibold text-gray-100">{value}</p>
    </div>
  </div>
);


export const DataOverview: React.FC<DataOverviewProps> = ({ data }) => {
  return (
    <div className="space-y-6">
      <Card title={`Overview: ${data.fileName}`} icon={InformationCircleIcon}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard title="Total Rows" value={data.rowCount} icon={HashtagIcon} />
            <StatCard title="Total Columns" value={data.columnCount} icon={ChartPieIcon} />
            <StatCard title="File Size" value={`${(data.rows.reduce((acc, row) => acc + JSON.stringify(row).length, 0) / 1024).toFixed(2)} KB`} icon={CalculatorIcon} />
            <StatCard title="Sample Rows Displayed" value={data.sampleRows.length} icon={InformationCircleIcon} />
        </div>
        
        <h3 className="text-xl font-semibold mb-2 text-gray-100">Sample Data (First {data.sampleRows.length} Rows)</h3>
        <div className="overflow-x-auto bg-slate-750 rounded-md shadow">
          <table className="min-w-full text-sm text-left text-gray-300">
            <thead className="bg-slate-700 text-xs text-gray-400 uppercase">
              <tr>
                {data.headers.map((header) => (
                  <th key={header} className="px-4 py-3 whitespace-nowrap">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-600">
              {data.sampleRows.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-slate-650 transition-colors">
                  {data.headers.map((header) => (
                    <td key={`${rowIndex}-${header}`} className="px-4 py-3 whitespace-nowrap">
                      {String(row[header] ?? 'N/A')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Column Information & Statistics" icon={InformationCircleIcon}>
        <div className="overflow-x-auto bg-slate-750 rounded-md shadow">
          <table className="min-w-full text-sm text-left text-gray-300">
            <thead className="bg-slate-700 text-xs text-gray-400 uppercase">
              <tr>
                <th className="px-4 py-3">Column Name</th>
                <th className="px-4 py-3">Data Type</th>
                <th className="px-4 py-3">Missing Values</th>
                <th className="px-4 py-3">Mean</th>
                <th className="px-4 py-3">Median</th>
                <th className="px-4 py-3">Std Dev</th>
                <th className="px-4 py-3">Min</th>
                <th className="px-4 py-3">Max</th>
                <th className="px-4 py-3">Unique Values (Count)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-600">
              {data.columnInfos.map((col) => (
                <tr key={col.name} className="hover:bg-slate-650 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-100">{col.name}</td>
                  <td className="px-4 py-3">{col.type}</td>
                  <td className="px-4 py-3">{col.stats.missingCount} ({((col.stats.missingCount / data.rowCount) * 100).toFixed(1)}%)</td>
                  <td className="px-4 py-3">{col.stats.mean?.toFixed(2) ?? 'N/A'}</td>
                  <td className="px-4 py-3">{col.stats.median?.toFixed(2) ?? 'N/A'}</td>
                  <td className="px-4 py-3">{col.stats.stdDev?.toFixed(2) ?? 'N/A'}</td>
                  <td className="px-4 py-3">
                    {col.stats.min !== undefined && col.stats.min !== null
                      ? typeof col.stats.min === 'number'
                        ? col.stats.min.toFixed(2)
                        : String(col.stats.min)
                      : 'N/A'}
                  </td>
                  <td className="px-4 py-3">
                    {col.stats.max !== undefined && col.stats.max !== null
                      ? typeof col.stats.max === 'number'
                        ? col.stats.max.toFixed(2)
                        : String(col.stats.max)
                      : 'N/A'}
                  </td>
                  <td className="px-4 py-3">
                    {col.stats.uniqueValues ? `${col.stats.uniqueValues.length}` : 'N/A'}
                    {col.stats.valueCounts && col.type === 'string' && (
                        <div className="text-xs text-gray-400 truncate max-w-xs" title={Object.entries(col.stats.valueCounts).map(([k,v]) => `${k}: ${v}`).join(', ')}>
                           Top: {Object.entries(col.stats.valueCounts).sort((a,b) => b[1]-a[1]).slice(0,2).map(([k,v]) => `${k} (${v})`).join(', ')}
                        </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
