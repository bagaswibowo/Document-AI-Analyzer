
import React from 'react';
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
  icon: React.ElementType; 
  iconColorClass?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, iconColorClass = "text-blue-500" }) => (
  <div className="bg-white p-4 rounded-lg shadow-md flex items-center space-x-3 transition-colors duration-300">
    <div className={`p-2 rounded-full bg-opacity-20 ${iconColorClass.replace('text-', 'bg-')}`}>
      <Icon className={`w-6 h-6 ${iconColorClass}`} />
    </div>
    <div>
      <p className="text-sm text-slate-600">{title}</p>
      <p className="text-xl font-semibold text-slate-700">{value}</p>
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
                  <TypeIcon className="w-4 h-4 text-slate-500" />
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
        <StatCard title="Jumlah Baris" value={data.rowCount.toLocaleString('id-ID')} icon={ListBulletIcon} iconColorClass="text-green-500" />
        <StatCard title="Jumlah Kolom" value={data.columnCount.toLocaleString('id-ID')} icon={Squares2X2Icon} iconColorClass="text-yellow-500" />
        <StatCard title="Ukuran Estimasi" value={`${(JSON.stringify(data.rows).length / 1024).toFixed(2)} KB`} icon={CircleStackIcon} iconColorClass="text-purple-500" />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3 text-slate-700 flex items-center">
          <PresentationChartBarIcon className="w-6 h-6 mr-2 text-emerald-600" />
          Informasi Kolom
        </h3>
        <div className="overflow-x-auto bg-white shadow rounded-lg">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-gray-100">
              <tr>
                {columnInfoColumns.map(col => (
                  <th key={col.key} scope="col" className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    {col.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {data.columnInfos.map((info, rowIndex) => (
                <tr key={info.name} className={`${rowIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-slate-100 transition-colors`}>
                  {columnInfoColumns.map(col => (
                    <td key={col.key} className="px-4 py-3 whitespace-nowrap text-xs text-slate-600">
                      {(() => {
                        const dataIndexStr = col.dataIndex as string; 
                        let valueToRenderOrDisplay;

                        if (Object.prototype.hasOwnProperty.call(info.stats, dataIndexStr)) {
                           valueToRenderOrDisplay = info.stats[dataIndexStr as keyof ColumnStats];
                        } 
                        else if (Object.prototype.hasOwnProperty.call(info, dataIndexStr)) {
                           valueToRenderOrDisplay = info[dataIndexStr as keyof ColumnInfo];
                        } else {
                           valueToRenderOrDisplay = undefined;
                        }

                        if (col.render) {
                          return (col.render as any)(valueToRenderOrDisplay, info);
                        } else {
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
        <h3 className="text-lg font-semibold mb-3 text-slate-700 flex items-center">
          <ListBulletIcon className="w-6 h-6 mr-2 text-emerald-600" />
          Data Sampel (10 Baris Pertama)
        </h3>
        {data.sampleRows.length > 0 ? (
          <div className="overflow-x-auto bg-white shadow rounded-lg">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-gray-100">
                <tr>
                  {sampleDataColumns.map(col => (
                    <th key={col.key} scope="col" className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase tracking-wider truncate max-w-[150px]" title={col.title}>
                      {col.title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {data.sampleRows.map((row, rowIndex) => (
                  <tr key={rowIndex} className={`${rowIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-slate-100 transition-colors`}>
                    {data.headers.map(header => (
                      <td key={`${rowIndex}-${header}`} className="px-4 py-3 whitespace-nowrap text-xs text-slate-600 truncate max-w-[150px]" title={String(row[header] ?? '-')}>
                        {String(row[header] ?? '-')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-600">Tidak ada data sampel untuk ditampilkan.</p>
        )}
      </div>
    </div>
  );
};