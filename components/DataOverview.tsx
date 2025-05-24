


import React from 'react';
// FIX: Ensure ColumnStats is correctly imported from ../types. This was indicated as a potential fix for downstream type errors.
import { ParsedCsvData, ColumnInfo, ColumnStats } from '../types';
import { 
  InformationCircleIcon, TagIcon, Squares2X2Icon, PresentationChartBarIcon, CircleStackIcon, ListBulletIcon, HashtagIcon, CalendarDaysIcon, CheckBadgeIcon, QuestionMarkCircleIcon
} from '@heroicons/react/24/outline';

interface DataOverviewProps {
  data: ParsedCsvData;
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType; // Heroicon component
  iconColorClass?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, iconColorClass = "text-blue-500 dark:text-blue-400" }) => (
  <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-md flex items-center space-x-3 transition-colors duration-300">
    <div className={`p-2 rounded-full bg-opacity-20 ${iconColorClass.replace('text-', 'bg-')}`}>
      <Icon className={`w-6 h-6 ${iconColorClass}`} />
    </div>
    <div>
      <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
      <p className="text-xl font-semibold text-slate-700 dark:text-slate-200">{value}</p>
    </div>
  </div>
);

const getDataTypeIcon = (type: string): React.ElementType => {
  switch (type) {
    case 'number': return HashtagIcon;
    case 'string': return TagIcon;
    case 'boolean': return CheckBadgeIcon;
    case 'date': return CalendarDaysIcon;
    default: return QuestionMarkCircleIcon;
  }
};

export const DataOverview: React.FC<DataOverviewProps> = ({ data }) => {
  const sampleDataColumns = data.headers.map(header => ({
    title: header,
    key: header,
    dataIndex: header,
  }));

  const columnInfoColumns = [
    { title: 'Nama Kolom', dataIndex: 'name', key: 'name' },
    { title: 'Tipe Data', dataIndex: 'type', key: 'type', render: (type: string) => {
        const TypeIcon = getDataTypeIcon(type);
        return <div className="flex items-center space-x-1.5">
                  <TypeIcon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  <span className="capitalize">{type}</span>
               </div>;
      } 
    },
    { title: 'Data Hilang', dataIndex: 'missingCount', key: 'missingCount', render: (count: number, record: ColumnInfo) => `${count} (${((count / data.rowCount) * 100).toFixed(1)}%)` },
    { title: 'Nilai Unik', dataIndex: 'uniqueValues', key: 'uniqueValues', render: (values: (string | number)[] = [], record: ColumnInfo) => values.length },
    { title: 'Mean', dataIndex: 'mean', key: 'mean', render: (val?: number) => val?.toFixed(2) ?? '-' },
    { title: 'Median', dataIndex: 'median', key: 'median', render: (val?: number) => val?.toFixed(2) ?? '-' },
    { title: 'Modus', dataIndex: 'mode', key: 'mode', render: (val?: number | string) => val ?? '-' },
    { title: 'Min', dataIndex: 'min', key: 'min', render: (val?: number | string) => val ?? '-' },
    { title: 'Max', dataIndex: 'max', key: 'max', render: (val?: number | string) => val ?? '-' },
  ];
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Nama File" value={data.fileName.length > 20 ? `${data.fileName.substring(0,18)}...` : data.fileName} icon={InformationCircleIcon} />
        <StatCard title="Jumlah Baris" value={data.rowCount.toLocaleString('id-ID')} icon={ListBulletIcon} iconColorClass="text-green-500 dark:text-green-400" />
        <StatCard title="Jumlah Kolom" value={data.columnCount.toLocaleString('id-ID')} icon={Squares2X2Icon} iconColorClass="text-yellow-500 dark:text-yellow-400" />
        <StatCard title="Ukuran Estimasi" value={`${(JSON.stringify(data.rows).length / 1024).toFixed(2)} KB`} icon={CircleStackIcon} iconColorClass="text-purple-500 dark:text-purple-400" />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3 text-slate-700 dark:text-slate-300 flex items-center">
          <PresentationChartBarIcon className="w-6 h-6 mr-2 text-blue-500 dark:text-blue-400" />
          Informasi Kolom
        </h3>
        <div className="overflow-x-auto bg-white dark:bg-slate-800 shadow rounded-lg">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-700">
              <tr>
                {columnInfoColumns.map(col => (
                  <th key={col.key} scope="col" className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                    {col.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
              {data.columnInfos.map((info, rowIndex) => (
                <tr key={info.name} className={`${rowIndex % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-slate-50 dark:bg-slate-800/50'} hover:bg-slate-100 dark:hover:bg-slate-700/70 transition-colors`}>
                  {columnInfoColumns.map(col => (
                    <td key={col.key} className="px-4 py-3 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300">
                      {/* FIX: Safely access properties from info and info.stats using typed keys */}
                      {(() => {
                        const dataIndexStr = col.dataIndex as string;
                        let valueToRenderOrDisplay: any;

                        // Check if dataIndexStr is a key of info.stats (and an own property)
                        if (Object.prototype.hasOwnProperty.call(info.stats, dataIndexStr)) {
                           valueToRenderOrDisplay = info.stats[dataIndexStr as keyof ColumnStats];
                        } 
                        // Else, check if dataIndexStr is a key of info (and an own property)
                        else if (Object.prototype.hasOwnProperty.call(info, dataIndexStr)) {
                           valueToRenderOrDisplay = info[dataIndexStr as keyof ColumnInfo];
                        } else {
                           // Fallback if dataIndex is somehow not found (should not happen with current config)
                           valueToRenderOrDisplay = undefined;
                        }

                        if (col.render) {
                          // The render function expects the specific value and optionally the full record.
                          // The type of valueToRenderOrDisplay will be specific to the dataIndexStr.
                          return col.render(valueToRenderOrDisplay, info);
                        } else {
                          // Default rendering for columns without a specific render function (e.g., 'name')
                          // FIX: Ensure String conversion is safe. Given valueToRenderOrDisplay can be various types from ColumnInfo/ColumnStats,
                          // or undefined, `?? '-` handles undefined/null, and String() handles the rest.
                          // The 'never' error was likely a symptom of the missing ColumnStats type, making type inference problematic.
                          // With ColumnStats correctly imported and typed, valueToRenderOrDisplay should not be 'any' in a problematic way,
                          // and String() should handle its conversion correctly.
                          return String(valueToRenderOrDisplay ?? '-');
                        }
                      })()}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <div>
        <h3 className="text-lg font-semibold mb-3 text-slate-700 dark:text-slate-300 flex items-center">
          <ListBulletIcon className="w-6 h-6 mr-2 text-blue-500 dark:text-blue-400" />
          Data Sampel (10 Baris Pertama)
        </h3>
        {data.sampleRows.length > 0 ? (
          <div className="overflow-x-auto bg-white dark:bg-slate-800 shadow rounded-lg">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-700">
                <tr>
                  {sampleDataColumns.map(col => (
                    <th key={col.key} scope="col" className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider truncate max-w-[150px]" title={col.title}>
                      {col.title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                {data.sampleRows.map((row, rowIndex) => (
                  <tr key={rowIndex} className={`${rowIndex % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-slate-50 dark:bg-slate-800/50'} hover:bg-slate-100 dark:hover:bg-slate-700/70 transition-colors`}>
                    {data.headers.map(header => (
                      <td key={`${rowIndex}-${header}`} className="px-4 py-3 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300 truncate max-w-[150px]" title={String(row[header] ?? '-')}>
                        {String(row[header] ?? '-')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">Tidak ada data sampel untuk ditampilkan.</p>
        )}
      </div>
    </div>
  );
};