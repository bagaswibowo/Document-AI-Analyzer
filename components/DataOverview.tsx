
import React from 'react';
import { ParsedCsvData } from '../types';
import { Card } from './common/Card';
import { InformationCircleIcon, HashtagIcon, ChartPieIcon, CalculatorIcon, ListBulletIcon } from '@heroicons/react/24/outline';

interface DataOverviewProps {
  data: ParsedCsvData;
}

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ElementType }> = ({ title, value, icon: Icon }) => (
  <div className="bg-slate-650 p-5 rounded-lg shadow-lg flex items-center transition-all hover:shadow-primary-500/20 hover:scale-105">
    <div className="p-3 bg-primary-500/10 rounded-full mr-4">
      <Icon className="h-7 w-7 text-primary-400" />
    </div>
    <div>
      <p className="text-sm text-slate-400">{title}</p>
      <p className="text-2xl font-semibold text-slate-100">{value}</p>
    </div>
  </div>
);


export const DataOverview: React.FC<DataOverviewProps> = ({ data }) => {
  return (
    <div className="space-y-8">
      <Card title={`Overview: ${data.fileName}`} icon={InformationCircleIcon}>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
            <StatCard title="Total Rows" value={data.rowCount.toLocaleString()} icon={HashtagIcon} />
            <StatCard title="Total Columns" value={data.columnCount.toLocaleString()} icon={ListBulletIcon} />
            <StatCard title="File Size (Est.)" value={`${(data.rows.reduce((acc, row) => acc + JSON.stringify(row).length, 0) / 1024).toFixed(2)} KB`} icon={CalculatorIcon} />
            <StatCard title="Sample Rows" value={data.sampleRows.length} icon={ChartPieIcon} />
        </div>
        
        <h3 className="text-xl font-semibold mb-3 text-slate-100">Sample Data (First {data.sampleRows.length} Rows)</h3>
        <div className="overflow-x-auto bg-slate-750 rounded-lg shadow-md">
          <table className="min-w-full text-sm text-left text-slate-300">
            <thead className="bg-slate-650 text-xs text-slate-400 uppercase tracking-wider">
              <tr>
                {data.headers.map((header) => (
                  <th key={header} scope="col" className="px-5 py-3 whitespace-nowrap font-medium">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-600">
              {data.sampleRows.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-slate-650/70 transition-colors duration-150">
                  {data.headers.map((header) => (
                    <td key={`${rowIndex}-${header}`} className="px-5 py-3 whitespace-nowrap">
                      {String(row[header] ?? 'N/A')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Column Information & Statistics" icon={ListBulletIcon}>
        <div className="overflow-x-auto bg-slate-750 rounded-lg shadow-md">
          <table className="min-w-full text-sm text-left text-slate-300">
            <thead className="bg-slate-650 text-xs text-slate-400 uppercase tracking-wider">
              <tr>
                <th scope="col" className="px-5 py-3 font-medium">Column Name</th>
                <th scope="col" className="px-5 py-3 font-medium">Data Type</th>
                <th scope="col" className="px-5 py-3 font-medium">Missing</th>
                <th scope="col" className="px-5 py-3 font-medium">Mean</th>
                <th scope="col" className="px-5 py-3 font-medium">Median</th>
                <th scope="col" className="px-5 py-3 font-medium">Std Dev</th>
                <th scope="col" className="px-5 py-3 font-medium">Min</th>
                <th scope="col" className="px-5 py-3 font-medium">Max</th>
                <th scope="col" className="px-5 py-3 font-medium">Unique (Count)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-600">
              {data.columnInfos.map((col) => (
                <tr key={col.name} className="hover:bg-slate-650/70 transition-colors duration-150">
                  <td className="px-5 py-3 font-medium text-slate-100">{col.name}</td>
                  <td className="px-5 py-3 capitalize">{col.type}</td>
                  <td className="px-5 py-3">{col.stats.missingCount} <span className="text-slate-400">({((col.stats.missingCount / data.rowCount) * 100).toFixed(1)}%)</span></td>
                  <td className="px-5 py-3">{col.stats.mean?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) ?? <span className="text-slate-500">N/A</span>}</td>
                  <td className="px-5 py-3">{col.stats.median?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) ?? <span className="text-slate-500">N/A</span>}</td>
                  <td className="px-5 py-3">{col.stats.stdDev?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) ?? <span className="text-slate-500">N/A</span>}</td>
                  <td className="px-5 py-3">
                    {col.stats.min !== undefined && col.stats.min !== null
                      ? typeof col.stats.min === 'number'
                        ? col.stats.min.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})
                        : String(col.stats.min)
                      : <span className="text-slate-500">N/A</span>}
                  </td>
                  <td className="px-5 py-3">
                    {col.stats.max !== undefined && col.stats.max !== null
                      ? typeof col.stats.max === 'number'
                        ? col.stats.max.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})
                        : String(col.stats.max)
                      : <span className="text-slate-500">N/A</span>}
                  </td>
                  <td className="px-5 py-3">
                    {col.stats.uniqueValues ? `${col.stats.uniqueValues.length.toLocaleString()}` : <span className="text-slate-500">N/A</span>}
                    {col.stats.valueCounts && (col.type === 'string' || col.type === 'boolean') && col.stats.uniqueValues && col.stats.uniqueValues.length < data.rowCount && (
                        <div className="text-xs text-slate-400 truncate max-w-xs mt-1" title={Object.entries(col.stats.valueCounts).map(([k,v]) => `${k}: ${v.toLocaleString()}`).join(', ')}>
                           Top: {Object.entries(col.stats.valueCounts).sort((a,b) => b[1]-a[1]).slice(0,2).map(([k,v]) => `${k} (${v.toLocaleString()})`).join(', ')}
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
