import { FaSort, FaSortUp, FaSortDown } from 'react-icons/fa';
import FilterOptions from './FilterOptions';
import { ReactElement } from 'react';

type SortDirection = 'asc' | 'desc' | '';

interface FilterState {
  sortBy: string;
  sortDirection: SortDirection;
  [key: string]: any;
}

interface RowData {
  [key: string]: any;
}

interface GenerateStatusColumnsParams {
  fields: string[];
  filters: FilterState;
  handleSort: (field: string) => void;
  handleContextMenu: (e: React.MouseEvent) => void;
  handleColumnFilterChange: (field: string, value: any) => void;
}

interface ColumnDefinition {
  key: string;
  name: string;
  resizable: boolean;
  draggable: boolean;
  headerCellClass: string;
  width: number;
  renderHeaderCell: () => ReactElement<any>;
  renderCell: (props: { row: RowData }) => ReactElement<any>;
}

export const generateStatusColumns = ({
  fields,
  filters,
  handleSort,
  handleContextMenu,
  handleColumnFilterChange
}: GenerateStatusColumnsParams): ColumnDefinition[] => {
  return fields.map((field) => {
    const headerLabel = field.replace(/_/g, ' ').toUpperCase();

    return {
      key: field,
      name: field,
      resizable: true,
      draggable: true,
      headerCellClass: 'column-headers',
      width: 200,
      renderHeaderCell: (): ReactElement<any> => (
        <div className="flex h-full cursor-pointer flex-col items-center gap-1">
          <div
            className="headers-cell h-[50%]"
            onClick={() => handleSort(field)}
            onContextMenu={handleContextMenu}
          >
            <p
              className={`text-sm ${
                filters.sortBy === field ? 'font-bold' : 'font-normal'
              }`}
            >
              {headerLabel}
            </p>
            <div className="ml-2">
              {filters.sortBy === field && filters.sortDirection === 'asc' ? (
                <FaSortUp className="font-bold" />
              ) : filters.sortBy === field &&
                filters.sortDirection === 'desc' ? (
                <FaSortDown className="font-bold" />
              ) : (
                <FaSort className="text-zinc-400" />
              )}
            </div>
          </div>

          <div className="relative h-[50%] w-full px-1">
            <FilterOptions
              columnKey={field}
              endpoint="parameter"
              value="id"
              label="text"
              filterBy={{ grp: 'STATUS NILAI', subgrp: 'STATUS NILAI' }}
              onChange={(value: any) =>
                handleColumnFilterChange(`${field}_nama`, value)
              }
            />
          </div>
        </div>
      ),
      renderCell: ({ row }: { row: RowData }): ReactElement<any> => {
        const memoField = `${field}_memo`;
        const memoData = row[memoField] ? JSON.parse(row[memoField]) : null;
        if (memoData) {
          return (
            <div className="flex h-full w-full items-center justify-center py-1">
              <div
                className="m-0 flex h-full w-fit cursor-pointer items-center justify-center p-0"
                style={{
                  backgroundColor: memoData.WARNA,
                  color: memoData.WARNATULISAN,
                  padding: '2px 6px',
                  borderRadius: '2px',
                  textAlign: 'left',
                  fontWeight: '600'
                }}
              >
                <p style={{ fontSize: '13px' }}>{memoData.SINGKATAN}</p>
              </div>
            </div>
          );
        }

        return <div className="text-xs text-gray-500">N/A</div>;
      }
    };
  });
};
