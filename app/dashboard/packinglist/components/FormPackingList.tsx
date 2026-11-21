/* eslint-disable @typescript-eslint/no-explicit-any */
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { useGetMenu } from '@/lib/server/useMenu';
import FormFooterButtons from '@/components/custom-ui/FormFooterButtons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';
import LookUp from '@/components/custom-ui/LookUp';
import { Input } from '@/components/ui/input';
import { IoMdClose, IoMdRefresh } from 'react-icons/io';
import { FaTrashAlt } from 'react-icons/fa';
import InputMask from '@mona-health/react-input-mask';
import DataGrid, {
  CellKeyDownArgs,
  Column,
  DataGridHandle
} from 'react-data-grid';
import {
  formatCurrency,
  formatDateCalendar,
  formatDateToDDMMYYYY,
  isLeapYear,
  parseCurrency,
  parseDateFromDDMMYYYY
} from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { parse } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';
import InputDatePicker from '@/components/custom-ui/InputDatePicker';
import { KasGantungDetail } from '@/lib/types/kasgantungheader.type';
import { FaRegSquarePlus } from 'react-icons/fa6';
import { Textarea } from '@/components/ui/textarea';
import { useGetKasGantungDetail } from '@/lib/server/useKasGantung';
import InputCurrency from '@/components/custom-ui/InputCurrency';
import LookUpModal from '@/components/custom-ui/LookUpModal';
import { useGetJurnalUmumDetail } from '@/lib/server/useJurnalUmum';
import { JurnalUmumDetail } from '@/lib/types/jurnalumumheader.type';
import { useGetAllOrderanMuatan } from '@/lib/server/useOrderanHeader';
import { filterOrderanMuatan } from '@/lib/types/orderanHeader.type';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useGetPackingListDetail,
  useGetPackingListDetailRincian
} from '@/lib/server/usePackingList';
import { useTheme } from 'next-themes';
import { EmptyRowsRenderer } from '@/components/EmptyRows';
import { useShiftHorizontalScroll } from '@/hooks/use-shift-horizontal-scroll';
const createKeteranganColumns = (
  rows: any[],
  activeTab: string,
  handleInputChangeTab: (
    tab: string,
    index: number,
    field: string,
    value: string
  ) => void,
  inputStopPropagation: (e: React.KeyboardEvent) => void,
  addRowTab: (tabName: string) => void,
  deleteRowTab: (tabName: string, index: number) => void
): Column<any>[] => {
  return [
    {
      key: 'aksi',
      name: 'AKSI',
      width: 65,
      resizable: true,
      cellClass: 'form-input',
      renderHeaderCell: (column: any) => (
        <div className="flex h-full w-full flex-col justify-center">
          <p className="text-sm font-normal">Aksi</p>
        </div>
      ),
      renderCell: (props: any) => {
        if (props.row.isAddRow) {
          return (
            <div className="m-0 flex h-full w-full cursor-pointer items-center justify-center p-0 text-xs">
              <button
                type="button"
                className="items-center justify-center rounded bg-transparent text-[#076fde]"
                onClick={() => addRowTab(activeTab)}
              >
                <FaRegSquarePlus className="text-2xl" />
              </button>
            </div>
          );
        }

        return (
          <div className="m-0 flex h-full w-full cursor-pointer items-center justify-center p-0 text-xs">
            <button
              type="button"
              className="rounded bg-transparent text-xs text-red-500"
              onClick={() => deleteRowTab(activeTab, props.rowIdx)}
            >
              <FaTrashAlt className="text-xl" />
            </button>
          </div>
        );
      }
    },
    {
      key: 'nomor',
      name: 'NO',
      width: 50,
      resizable: true,
      cellClass: 'form-input',
      renderHeaderCell: (column: any) => (
        <div className="flex h-full w-full flex-col justify-center">
          <p className="text-sm font-normal">No.</p>
        </div>
      ),
      renderCell: (props: any) => {
        return (
          <div className="flex h-full w-full items-center justify-center text-sm font-normal">
            {props.row.isAddRow ? '' : props.rowIdx + 1}
          </div>
        );
      }
    },
    {
      key: 'jobmuatan',
      name: 'JOBMUATAN',
      resizable: true,
      cellClass: 'form-input',
      width: 200,
      renderHeaderCell: (column: any) => (
        <div className="flex h-full w-full flex-col justify-center">
          <p className="text-sm font-normal">Jobmuatan</p>
        </div>
      ),
      renderCell: (props: any) => {
        if (props.row.isAddRow) {
          return null;
        } else {
          return (
            <div className="m-0 flex h-full w-full items-center p-0">
              <Input
                value={props.row.jobmuatan}
                disabled
                onKeyDown={inputStopPropagation}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) =>
                  handleInputChangeTab(
                    activeTab,
                    props.rowIdx,
                    'jobmuatan',
                    e.target.value
                  )
                }
                className="min-h-9 w-full rounded border border-gray-300"
              />
            </div>
          );
        }
      }
    },
    {
      key: 'bongkarke',
      name: 'BONGKARKE',
      resizable: true,
      cellClass: 'form-input',
      width: 100,
      renderHeaderCell: (column: any) => (
        <div className="flex h-full w-full flex-col justify-center">
          <p className="text-sm font-normal">Bongkarke</p>
        </div>
      ),
      renderCell: (props: any) => {
        if (props.row.isAddRow) {
          return null;
        } else {
          return (
            <div className="m-0 flex h-full w-full items-center p-0">
              <Input
                value={props.row.bongkarke}
                disabled
                onKeyDown={inputStopPropagation}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) =>
                  handleInputChangeTab(
                    activeTab,
                    props.rowIdx,
                    'bongkarke',
                    e.target.value
                  )
                }
                className="min-h-9 w-full rounded border border-gray-300"
              />
            </div>
          );
        }
      }
    },
    {
      key: 'keterangan',
      name: 'KETERANGAN',
      resizable: true,
      cellClass: 'form-input',
      width: 350,
      renderHeaderCell: (column: any) => (
        <div className="flex h-full w-full flex-col justify-center">
          <p className="text-sm font-normal">Keterangan</p>
        </div>
      ),
      renderCell: (props: any) => {
        if (props.row.isAddRow) {
          return null;
        } else {
          return (
            <div className="m-0 flex h-full w-full items-center p-0">
              <Input
                value={props.row.keterangan}
                onKeyDown={inputStopPropagation}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) =>
                  handleInputChangeTab(
                    activeTab,
                    props.rowIdx,
                    'keterangan',
                    e.target.value
                  )
                }
                className="min-h-9 w-full rounded border border-gray-300"
              />
            </div>
          );
        }
      }
    }
  ];
};
const createRincianColumns = (
  rows: any[],
  activeTab: string,
  handleInputChangeTab: (
    tab: string,
    index: number,
    field: string,
    value: string
  ) => void,
  inputStopPropagation: (e: React.KeyboardEvent) => void,
  addRowTab: (tabName: string) => void,
  deleteRowTab: (tabName: string, index: number) => void
): Column<any>[] => {
  return [
    {
      key: 'aksi',
      name: 'AKSI',
      width: 65,
      resizable: true,
      cellClass: 'form-input',
      renderHeaderCell: (column: any) => (
        <div className="flex h-full w-full flex-col justify-center">
          <p className="text-sm font-normal">Aksi</p>
        </div>
      ),
      renderCell: (props: any) => {
        if (props.row.isAddRow) {
          return (
            <div className="m-0 flex h-full w-full cursor-pointer items-center justify-center p-0 text-xs">
              <button
                type="button"
                className="items-center justify-center rounded bg-transparent text-[#076fde]"
                onClick={() => addRowTab(activeTab)}
              >
                <FaRegSquarePlus className="text-2xl" />
              </button>
            </div>
          );
        }

        return (
          <div className="m-0 flex h-full w-full cursor-pointer items-center justify-center p-0 text-xs">
            <button
              type="button"
              className="rounded bg-transparent text-xs text-red-500"
              onClick={() => deleteRowTab(activeTab, props.rowIdx)}
            >
              <FaTrashAlt className="text-xl" />
            </button>
          </div>
        );
      }
    },
    {
      key: 'nomor',
      name: 'NO',
      width: 50,
      resizable: true,
      cellClass: 'form-input',
      renderHeaderCell: (column: any) => (
        <div className="flex h-full w-full flex-col justify-center">
          <p className="text-sm font-normal">No.</p>
        </div>
      ),
      renderCell: (props: any) => {
        return (
          <div className="flex h-full w-full items-center justify-center text-sm font-normal">
            {props.row.isAddRow ? '' : props.rowIdx + 1}
          </div>
        );
      }
    },
    {
      key: 'jobmuatan',
      name: 'JOBMUATAN',
      resizable: true,
      cellClass: 'form-input',
      width: 180,
      renderHeaderCell: (column: any) => (
        <div className="flex h-full w-full flex-col justify-center">
          <p className="text-sm font-normal">Jobmuatan</p>
        </div>
      ),
      renderCell: (props: any) => {
        if (props.row.isAddRow) {
          return null;
        } else {
          return (
            <div className="m-0 flex h-full w-full items-center p-0">
              <Input
                value={props.row.jobmuatan}
                disabled
                onKeyDown={inputStopPropagation}
                onClick={(e) => e.stopPropagation()}
                className="min-h-9 w-full rounded border border-gray-300"
              />
            </div>
          );
        }
      }
    },
    {
      key: 'bongkarke',
      name: 'BONGKARKE',
      resizable: true,
      cellClass: 'form-input',
      width: 100,
      renderHeaderCell: (column: any) => (
        <div className="flex h-full w-full flex-col justify-center">
          <p className="text-sm font-normal">Bongkarke</p>
        </div>
      ),
      renderCell: (props: any) => {
        if (props.row.isAddRow) {
          return null;
        } else {
          return (
            <div className="m-0 flex h-full w-full items-center p-0">
              <Input
                value={props.row.bongkarke}
                disabled
                onKeyDown={inputStopPropagation}
                onClick={(e) => e.stopPropagation()}
                className="min-h-9 w-full rounded border border-gray-300"
              />
            </div>
          );
        }
      }
    },
    {
      key: 'keterangan',
      name: 'KETERANGAN',
      resizable: true,
      cellClass: 'form-input',
      width: 250,
      renderHeaderCell: (column: any) => (
        <div className="flex h-full w-full flex-col justify-center">
          <p className="text-sm font-normal">Keterangan</p>
        </div>
      ),
      renderCell: (props: any) => {
        if (props.row.isAddRow) {
          return null;
        } else {
          return (
            <div className="m-0 flex h-full w-full items-center p-0">
              <Input
                value={props.row.keterangan || ''}
                onKeyDown={inputStopPropagation}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) =>
                  handleInputChangeTab(
                    activeTab,
                    props.rowIdx,
                    'keterangan',
                    e.target.value
                  )
                }
                className="min-h-9 w-full rounded border border-gray-300"
              />
            </div>
          );
        }
      }
    },
    {
      key: 'banyak',
      name: 'BANYAK',
      resizable: true,
      cellClass: 'form-input',
      width: 120,
      renderHeaderCell: (column: any) => (
        <div className="flex h-full w-full flex-col justify-center">
          <p className="text-sm font-normal">Banyak</p>
        </div>
      ),
      renderCell: (props: any) => {
        console.log('props', props);
        if (props.row.isAddRow) {
          return null;
        } else {
          return (
            <div className="m-0 flex h-full w-full items-center p-0">
              <Input
                type="text"
                value={props.row.banyak || ''}
                onKeyDown={inputStopPropagation}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) =>
                  handleInputChangeTab(
                    activeTab,
                    props.rowIdx,
                    'banyak',
                    e.target.value
                  )
                }
                className="min-h-9 w-full rounded border border-gray-300"
              />
            </div>
          );
        }
      }
    },
    {
      key: 'berat',
      name: 'BERAT',
      resizable: true,
      cellClass: 'form-input',
      width: 120,
      renderHeaderCell: (column: any) => (
        <div className="flex h-full w-full flex-col justify-center">
          <p className="text-sm font-normal">Berat</p>
        </div>
      ),
      renderCell: (props: any) => {
        if (props.row.isAddRow) {
          return null;
        } else {
          return (
            <div className="m-0 flex h-full w-full items-center p-0">
              <Input
                type="text"
                value={props.row.berat || ''}
                onKeyDown={inputStopPropagation}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) =>
                  handleInputChangeTab(
                    activeTab,
                    props.rowIdx,
                    'berat',
                    e.target.value
                  )
                }
                className="min-h-9 w-full rounded border border-gray-300"
              />
            </div>
          );
        }
      }
    }
  ];
};

const FormPackingList = ({
  popOver,
  setPopOver,
  forms,
  onSubmit,
  mode,
  handleClose,
  isLoadingCreate,
  isLoadingUpdate,
  isLoadingDelete
}: any) => {
  const { theme, resolvedTheme } = useTheme();
  const isDark = theme === 'dark' || resolvedTheme === 'dark';
  // Shift + scroll = geser horizontal. Grid ini lebih lebar dari modal dan
  // react-remove-scroll bawaan Radix Dialog membatalkan wheel-nya.
  useShiftHorizontalScroll();

  const [selectedRow, setSelectedRow] = useState<number>(0);
  const [popOverTglSampai, setPopOverTglSampai] = useState<boolean>(false);
  const [selectedRowJob, setSelectedRowJob] = useState<number>(0);
  const [selectedJobData, setSelectedJobData] = useState<any>(null);
  const [selectedData, setSelectedData] = useState<any>(null);
  const [editingRowId, setEditingRowId] = useState<number | null>(null); // Menyimpan ID baris yang sedang diedit
  const [selectedDetailData, setSelectedDetailData] = useState<any>(null);
  const [editableValues, setEditableValues] = useState<Map<number, string>>(
    new Map()
  ); // Nilai yang sedang diedit untuk setiap baris
  const [modifiedTabs, setModifiedTabs] = useState<Set<string>>(new Set());
  const [jobDataMap, setJobDataMap] = useState<Map<string, any[]>>(new Map());
  const selectedDataRef = useRef(selectedData);
  // Tambahkan state untuk menyimpan data tab per jobmuatan dan bongkarke
  const [tabDataMap, setTabDataMap] = useState<Map<string, any>>(new Map());
  const getJobKey = (jobmuatan: string) => jobmuatan;
  const getTabKey = (jobmuatan: string, bongkarke: number, tabName: string) =>
    `${jobmuatan}_${bongkarke}_${tabName}`;
  const [activeTab, setActiveTab] = useState('penerima'); // Track tab aktif
  const [rowsPenerima, setRowsPenerima] = useState<any[]>([]);
  const [rowsLampiran, setRowsLampiran] = useState<any[]>([]);
  const [rowsKeteranganTambahan, setRowsKeteranganTambahan] = useState<any[]>(
    []
  );
  const [rowsQtyBarang, setRowsQtyBarang] = useState<any[]>([]);
  const [rowsUangBongkar, setRowsUangBongkar] = useState<any[]>([]);
  const [rowsRincian, setRowsRincian] = useState<any[]>([]);
  const [checkedRows, setCheckedRows] = useState<Set<string>>(new Set());

  const [dataGridKey, setDataGridKey] = useState(0);

  const headerData = useSelector((state: RootState) => state.header.headerData);
  const gridRef = useRef<DataGridHandle>(null);
  const {
    data: allData,
    isLoading: isLoadingData,
    refetch
  } = useGetAllOrderanMuatan({
    filters: {
      schedule_id: forms.getValues('schedule_id') ?? ''
    }
  });
  const {
    data: detailDetail,
    isLoading: isLoadingDetail,
    refetch: refetchDetail
  } = useGetPackingListDetail({
    filters: { nobukti: forms.getValues('nobukti') ?? '' }
  });
  const queryFiltersRincian = useMemo(() => {
    if (!selectedDetailData) {
      return {
        nobukti: '',
        packinglistdetail_id: '',
        statuspackinglist_id: '', // Kosong = fetch semua status
        keterangan: '',
        banyak: '',
        berat: '',
        info: '',
        modifiedby: '',
        created_at: '',
        updated_at: ''
      };
    }

    return {
      nobukti: selectedDetailData.nobukti ?? forms.getValues('nobukti') ?? '',
      packinglistdetail_id: '',
      statuspackinglist_id: '', // ✅ Fetch semua status sekaligus
      keterangan: '',
      banyak: '',
      berat: '',
      info: '',
      modifiedby: '',
      created_at: '',
      updated_at: ''
    };
  }, [selectedDetailData, forms.watch('nobukti')]);

  const {
    data: detailRincian,
    isLoading: isLoadingRincian,
    refetch: refetchRincian
  } = useGetPackingListDetailRincian({
    filters: queryFiltersRincian
  });
  const [rows, setRows] = useState<any[]>([]);
  const [rowsJob, setRowsJob] = useState<any[]>([]);
  const statusPackingListMapping: { [key: string]: number } = {
    penerima: 215,
    lampiran: 216,
    keterangantambahan: 217,
    qtybarang: 218,
    uangbongkar: 219,
    rincian: 220
  };
  const collectAllRincianData = (jobmuatan: string, bongkarke: number) => {
    const tabs = [
      'penerima',
      'lampiran',
      'keterangantambahan',
      'qtybarang',
      'uangbongkar',
      'rincian'
    ];

    const allRincian: any[] = [];

    tabs.forEach((tabName) => {
      const tabKey = getTabKey(jobmuatan, bongkarke, tabName);
      const tabData = tabDataMap.get(tabKey);

      if (tabData && tabData.length > 0) {
        // Filter data yang memiliki keterangan (tidak kosong)
        const validData = tabData.filter(
          (item: any) => item.keterangan && item.keterangan.trim() !== ''
        );

        validData.forEach((item: any) => {
          allRincian.push({
            id: item.id || 0,
            statuspackinglist_id: statusPackingListMapping[tabName].toString(),
            keterangan: item.keterangan || '',
            banyak: item.banyak || '',
            berat: item.berat || ''
          });
        });
      }
    });

    return allRincian;
  };
  const addRowTab = (tabName: string) => {
    if (!selectedData || !selectedJobData) return;

    const tabKey = getTabKey(
      selectedData.jobmuatan,
      selectedJobData.bongkarke,
      tabName
    );

    const setterMap: {
      [key: string]: React.Dispatch<React.SetStateAction<any[]>>;
    } = {
      penerima: setRowsPenerima,
      lampiran: setRowsLampiran,
      keterangantambahan: setRowsKeteranganTambahan,
      qtybarang: setRowsQtyBarang,
      uangbongkar: setRowsUangBongkar,
      rincian: setRowsRincian
    };

    const setter = setterMap[tabName];
    if (setter) {
      setter((prevRows) => {
        const filteredRows = prevRows.filter((row) => !row.isAddRow);
        const newRow = {
          id: 0,
          keterangan: '',
          banyak: tabName === 'rincian' ? '' : undefined,
          berat: tabName === 'rincian' ? '' : undefined,
          jobmuatan: selectedData.jobmuatan,
          bongkarke: selectedJobData.bongkarke,
          isNew: true
        };

        const updatedRows = [
          ...filteredRows,
          newRow,
          { isAddRow: true, id: 'add_row' }
        ];

        setTabDataMap((prevMap) => {
          const newMap = new Map(prevMap);
          newMap.set(
            tabKey,
            updatedRows.filter((row) => !row.isAddRow)
          );
          return newMap;
        });

        setModifiedTabs((prev) => new Set(prev).add(tabKey));

        return updatedRows;
      });
    }
  };

  const deleteRowTab = (tabName: string, index: number) => {
    if (!selectedData || !selectedJobData) return;

    const tabKey = getTabKey(
      selectedData.jobmuatan,
      selectedJobData.bongkarke,
      tabName
    );

    const setterMap: {
      [key: string]: React.Dispatch<React.SetStateAction<any[]>>;
    } = {
      penerima: setRowsPenerima,
      lampiran: setRowsLampiran,
      keterangantambahan: setRowsKeteranganTambahan,
      qtybarang: setRowsQtyBarang,
      uangbongkar: setRowsUangBongkar,
      rincian: setRowsRincian
    };

    const setter = setterMap[tabName];
    if (setter) {
      setter((prevRows) => {
        const filteredRows = prevRows.filter((_, i) => i !== index);
        const dataRows = filteredRows.filter((row) => !row.isAddRow);
        const addRowButton = filteredRows.find((row) => row.isAddRow);

        const updatedRows = addRowButton
          ? [...dataRows, addRowButton]
          : dataRows.length > 0
          ? dataRows
          : [
              {
                id: 0,
                keterangan: '',
                jobmuatan: selectedData.jobmuatan,
                bongkarke: selectedJobData.bongkarke
              }
            ];

        setTabDataMap((prevMap) => {
          const newMap = new Map(prevMap);
          newMap.set(
            tabKey,
            updatedRows.filter((row) => !row.isAddRow)
          );
          return newMap;
        });

        setModifiedTabs((prev) => new Set(prev).add(tabKey));

        return updatedRows;
      });
    }
  };

  function handleCellClick(args: { row: any }) {
    const clickedRow = args.row;
    const foundRow = rows.find((r) => r.id === clickedRow.id);
    const rowIndex = rows.findIndex((r) => r.id === clickedRow.id);

    if (rowIndex !== -1) {
      setSelectedRow(rowIndex);
      setSelectedData(foundRow);

      const jobKey = getJobKey(foundRow.jobmuatan);
      const existingJobData = jobDataMap.get(jobKey);

      console.log('🎯 handleCellClick:', {
        jobmuatan: foundRow.jobmuatan,
        hasExistingJobData: !!existingJobData
      });

      if (existingJobData) {
        setRowsJob(existingJobData);

        const firstJobRow = existingJobData.find((row: any) => !row.isAddRow);
        if (firstJobRow) {
          setSelectedRowJob(0);
          setSelectedJobData(firstJobRow);

          // ✅ SELALU update tampilan tab dari tabDataMap
          updateTabDataForBongkar(foundRow.jobmuatan, firstJobRow.bongkarke);

          // Update selectedDetailData untuk tracking
          if (
            (mode === 'edit' || mode === 'view' || mode === 'delete') &&
            firstJobRow._detailData
          ) {
            setSelectedDetailData(firstJobRow._detailData);
          }
        }
      } else {
        // Mode add - buat data default
        const defaultJobData = [
          {
            id: 0,
            jobmuatan: foundRow.jobmuatan,
            bongkarke: 1,
            isNew: true,
            _detailData: null
          },
          { isAddRow: true, id: 'add_row', isNew: false }
        ];

        setRowsJob(defaultJobData);
        setSelectedRowJob(0);
        setSelectedJobData(defaultJobData[0]);
        setJobDataMap((prev) => new Map(prev).set(jobKey, defaultJobData));

        updateTabDataForBongkar(foundRow.jobmuatan, 1);
      }
    }
  }
  const updateTabDataForBongkar = (jobmuatan: string, bongkarke: number) => {
    const tabs = [
      'penerima',
      'lampiran',
      'keterangantambahan',
      'qtybarang',
      'uangbongkar',
      'rincian'
    ];

    tabs.forEach((tabName) => {
      const tabKey = getTabKey(jobmuatan, bongkarke, tabName);
      const existingData = tabDataMap.get(tabKey);

      console.log(`📂 Tab ${tabName} (${tabKey}):`, existingData);

      // PERBAIKAN: Hanya 1 row data + 1 row button add
      const defaultData =
        existingData && existingData.length > 0
          ? [...existingData, { isAddRow: true, id: 'add_row' }]
          : [
              {
                id: 0,
                keterangan: '',
                banyak: tabName === 'rincian' ? '' : undefined,
                berat: tabName === 'rincian' ? '' : undefined,
                jobmuatan,
                bongkarke
              },
              { isAddRow: true, id: 'add_row' }
            ];

      switch (tabName) {
        case 'penerima':
          setRowsPenerima([...defaultData]);
          break;
        case 'lampiran':
          setRowsLampiran([...defaultData]);
          break;
        case 'keterangantambahan':
          setRowsKeteranganTambahan([...defaultData]);
          break;
        case 'qtybarang':
          setRowsQtyBarang([...defaultData]);
          break;
        case 'uangbongkar':
          setRowsUangBongkar([...defaultData]);
          break;
        case 'rincian':
          setRowsRincian([...defaultData]);
          break;
      }
    });

    console.log('✨ Tab data updated for bongkarke:', bongkarke);
  };

  function handleCellClickJob(args: { row: any }) {
    const clickedRow = args.row;

    if (clickedRow.isAddRow) return;

    const rowIndex = rowsJob.findIndex(
      (r) => r.bongkarke === clickedRow.bongkarke
    );
    const foundRow = rowsJob.find((r) => r.bongkarke === clickedRow.bongkarke);

    if (rowIndex !== -1 && selectedData) {
      setSelectedRowJob(rowIndex);
      setSelectedJobData(foundRow);

      console.log('🎯 handleCellClickJob:', {
        jobmuatan: selectedData.jobmuatan,
        bongkarke: clickedRow.bongkarke,
        hasDetailData: !!foundRow._detailData,
        mode
      });

      // ✅ SELALU update tampilan tab dari tabDataMap yang sudah di-fetch
      // Tidak perlu fetch lagi karena data sudah ada
      updateTabDataForBongkar(selectedData.jobmuatan, clickedRow.bongkarke);

      // Update selectedDetailData untuk tracking (opsional, tidak trigger fetch lagi)
      if (
        (mode === 'edit' || mode === 'view' || mode === 'delete') &&
        foundRow._detailData
      ) {
        setSelectedDetailData(foundRow._detailData);
      }
    }
  }
  function getRowClassJob(row: any) {
    const rowIndex = rowsJob.findIndex((r) => r.bongkarke === row.bongkarke);
    return rowIndex === selectedRowJob ? 'selected-row' : '';
  }
  function getRowClass(row: any) {
    const rowIndex = rows.findIndex((r) => r.id === row.id);
    return rowIndex === selectedRow ? 'selected-row' : '';
  }

  const handleInputChange = (
    index: number,
    field: string,
    value: string | number
  ) => {
    setRows((prevRows) => {
      const updatedData = [...prevRows];

      updatedData[index][field] = value;

      if (
        updatedData[index].isNew &&
        Object.values(updatedData[index]).every((val) => val !== '')
      ) {
        updatedData[index].isNew = false;
      }

      return updatedData;
    });
  };
  const handleInputChangeTab = (
    tabName: string,
    index: number,
    field: string,
    value: string
  ) => {
    if (!selectedData || !selectedJobData) return;

    const tabKey = getTabKey(
      selectedData.jobmuatan,
      selectedJobData.bongkarke,
      tabName
    );

    const setterMap: {
      [key: string]: React.Dispatch<React.SetStateAction<any[]>>;
    } = {
      penerima: setRowsPenerima,
      lampiran: setRowsLampiran,
      keterangantambahan: setRowsKeteranganTambahan,
      qtybarang: setRowsQtyBarang,
      uangbongkar: setRowsUangBongkar,
      rincian: setRowsRincian
    };

    const setter = setterMap[tabName];
    if (setter) {
      setter((prevRows) => {
        const updatedData = [...prevRows];
        updatedData[index][field] = value;
        updatedData[index]['jobmuatan'] = selectedData.jobmuatan;
        updatedData[index]['bongkarke'] = selectedJobData.bongkarke;

        // ✅ PENTING: Simpan ke tabDataMap
        setTabDataMap((prevMap) => {
          const newMap = new Map(prevMap);
          newMap.set(tabKey, updatedData);
          return newMap;
        });

        // ✅ MARK tab sebagai modified
        setModifiedTabs((prev) => new Set(prev).add(tabKey));

        return updatedData;
      });
    }
  };
  const lookupPropsSchedule = [
    {
      columns: [
        { key: 'id', name: 'ID', width: 50 },
        { key: 'voyberangkat', name: 'VOY BERANGKAT', width: 100 },
        { key: 'kapal_nama', name: 'KAPAL' },
        { key: 'tglberangkat', name: 'TGL BERANGKAT' },
        { key: 'tujuankapal_nama', name: 'TUJUAN' }
      ],
      extendSize: '200',
      selectedRequired: false,
      endpoint: 'schedule-kapal',
      dataToPost: 'id',
      singleColumn: false,
      pageSize: 20,
      showOnButton: true,
      postData: 'id'
    }
  ];

  const addRow = () => {
    const currentSelectedData = selectedDataRef.current;

    if (!currentSelectedData) return;

    const jobKey = getJobKey(currentSelectedData.jobmuatan);

    setRowsJob((prevRows) => {
      const filteredRows = prevRows.filter((row) => !row.isAddRow);
      let nextBongkarKe = 1;
      if (filteredRows.length > 0) {
        const prevRow = filteredRows[filteredRows.length - 1];
        nextBongkarKe = (prevRow.bongkarke ?? 0) + 1;
      }

      const newRow: any = {
        id: 0,
        jobmuatan: currentSelectedData.jobmuatan,
        bongkarke: nextBongkarKe,
        isNew: true,
        _detailData: null // Row baru belum punya detail di DB
      };

      const updatedRows = [
        ...filteredRows,
        newRow,
        prevRows[prevRows.length - 1]
      ];

      setJobDataMap((prev) => new Map(prev).set(jobKey, updatedRows));

      // ✅ Initialize empty tab data untuk SEMUA TAB sekaligus
      const tabs = [
        'penerima',
        'lampiran',
        'keterangantambahan',
        'qtybarang',
        'uangbongkar',
        'rincian'
      ];
      setTabDataMap((prev) => {
        const newMap = new Map(prev);
        tabs.forEach((tabName) => {
          const tabKey = getTabKey(
            currentSelectedData.jobmuatan,
            nextBongkarKe,
            tabName
          );
          newMap.set(tabKey, [
            {
              id: 0,
              keterangan: '',
              jobmuatan: currentSelectedData.jobmuatan,
              bongkarke: nextBongkarKe
            }
          ]);
        });
        return newMap;
      });
      return updatedRows;
    });
  };

  const deleteRow = (index: number) => {
    if (!selectedData) return;

    const jobKey = getJobKey(selectedData.jobmuatan);

    setRowsJob((prevRows) => {
      const filteredRows = prevRows.filter((_, i) => i !== index);
      const dataRows = filteredRows.filter((row) => !row.isAddRow);
      const addRowButton = filteredRows.find((row) => row.isAddRow);

      const updatedRows = dataRows.map((row, idx) => ({
        ...row,
        bongkarke: idx + 1
      }));

      const finalRows = addRowButton
        ? [...updatedRows, addRowButton]
        : updatedRows;

      // Simpan ke map
      setJobDataMap((prev) => new Map(prev).set(jobKey, finalRows));

      return finalRows;
    });
  };
  const inputStopPropagation = (e: React.KeyboardEvent) => {
    e.stopPropagation();
  };
  // Columns untuk tab-tab (Penerima, Lampiran, dll)
  const columnsPenerima = useMemo((): Column<any>[] => {
    return createKeteranganColumns(
      rowsPenerima,
      'penerima',
      handleInputChangeTab,
      inputStopPropagation,
      addRowTab, // ← TAMBAH
      deleteRowTab // ← TAMBAH
    );
  }, [rowsPenerima]);

  const columnsLampiran = useMemo((): Column<any>[] => {
    return createKeteranganColumns(
      rowsLampiran,
      'lampiran',
      handleInputChangeTab,
      inputStopPropagation,
      addRowTab, // ← TAMBAH
      deleteRowTab // ← TAMBAH
    );
  }, [rowsLampiran]);

  const columnsKeteranganTambahan = useMemo((): Column<any>[] => {
    return createKeteranganColumns(
      rowsKeteranganTambahan,
      'keterangantambahan',
      handleInputChangeTab,
      inputStopPropagation,
      addRowTab, // ← TAMBAH
      deleteRowTab // ← TAMBAH
    );
  }, [rowsKeteranganTambahan]);

  const columnsQtyBarang = useMemo((): Column<any>[] => {
    return createKeteranganColumns(
      rowsQtyBarang,
      'qtybarang',
      handleInputChangeTab,
      inputStopPropagation,
      addRowTab, // ← TAMBAH
      deleteRowTab // ← TAMBAH
    );
  }, [rowsQtyBarang]);

  const columnsUangBongkar = useMemo((): Column<any>[] => {
    return createKeteranganColumns(
      rowsUangBongkar,
      'uangbongkar',
      handleInputChangeTab,
      inputStopPropagation,
      addRowTab, // ← TAMBAH
      deleteRowTab // ← TAMBAH
    );
  }, [rowsUangBongkar]);

  const columnsRincian = useMemo((): Column<any>[] => {
    return createRincianColumns(
      rowsRincian,
      'rincian',
      handleInputChangeTab,
      inputStopPropagation,
      addRowTab,
      deleteRowTab
    );
  }, [rowsRincian]);
  const columns = useMemo((): Column<JurnalUmumDetail>[] => {
    return [
      {
        key: 'nomor',
        name: 'NO',
        width: 50,
        resizable: true,
        draggable: true,
        cellClass: 'form-input',

        renderHeaderCell: (column: any) => (
          <div className="flex h-[100%] w-full flex-col justify-center">
            <p className={`text-left text-sm font-normal`}>No.</p>
          </div>
        ),
        renderCell: (props: any) => {
          return (
            <div className="flex h-full w-full cursor-pointer items-center justify-center text-sm font-normal">
              {props.row.isAddRow ? '' : props.rowIdx + 1}
            </div>
          );
        }
      },
      {
        key: 'jobmuatan',

        resizable: true,
        cellClass: 'form-input',
        draggable: true,

        width: 300,
        renderHeaderCell: (column: any) => (
          <div className="flex h-[100%] w-full flex-col justify-center">
            <p className={`text-left text-sm font-normal`}>JOB MUATAN</p>
          </div>
        ),
        name: 'JOB MUATAN',
        renderCell: (props: any) => {
          const rowIdx = props.rowIdx;
          const cellValue = props.row.jobmuatan;

          return (
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="m-0 flex h-full cursor-pointer items-center p-0 text-sm">
                    {cellValue}
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  className="rounded-none border border-zinc-400 bg-white text-sm text-zinc-900"
                >
                  <p>{cellValue}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        }
      },
      {
        key: 'shipper',

        resizable: true,
        cellClass: 'form-input',
        draggable: true,

        width: 300,
        renderHeaderCell: (column: any) => (
          <div className="flex h-[100%] w-full flex-col justify-center">
            <p className={`text-left text-sm font-normal`}>SHIPPER</p>
          </div>
        ),
        name: 'SHIPPER',
        renderCell: (props: any) => {
          const rowIdx = props.rowIdx;
          const cellValue = props.row.shipper_nama;
          return (
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="m-0 flex h-full cursor-pointer items-center p-0 text-sm">
                    {cellValue}
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  className="rounded-none border border-zinc-400 bg-white text-sm text-zinc-900"
                >
                  <p>{cellValue}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        }
      },
      {
        key: 'lokasibongkar',

        resizable: true,
        cellClass: 'form-input',
        draggable: true,

        width: 300,
        renderHeaderCell: (column: any) => (
          <div className="flex h-[100%] w-full flex-col justify-center">
            <p className={`text-left text-sm font-normal`}>LOKASI BONGKAR</p>
          </div>
        ),
        name: 'LOKASI BONGKAR',
        renderCell: (props: any) => {
          const rowIdx = props.rowIdx;
          const cellValue = props.row.lokasibongkar_nama;
          return (
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="m-0 flex h-full cursor-pointer items-center p-0 text-sm">
                    {cellValue}
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  className="rounded-none border border-zinc-400 bg-white text-sm text-zinc-900"
                >
                  <p>{cellValue}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        }
      },
      {
        key: 'marketing',

        resizable: true,
        cellClass: 'form-input',
        draggable: true,

        width: 300,
        renderHeaderCell: (column: any) => (
          <div className="flex h-[100%] w-full flex-col justify-center">
            <p className={`text-left text-sm font-normal`}>MARKETING</p>
          </div>
        ),
        name: 'MARKETING',
        renderCell: (props: any) => {
          const rowIdx = props.rowIdx;
          const cellValue = props.row.marketing_nama;
          return (
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="m-0 flex h-full cursor-pointer items-center p-0 text-sm">
                    {cellValue}
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  className="rounded-none border border-zinc-400 bg-white text-sm text-zinc-900"
                >
                  <p>{cellValue}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        }
      },
      {
        key: 'nocontainer',

        resizable: true,
        cellClass: 'form-input',
        draggable: true,

        width: 300,
        renderHeaderCell: (column: any) => (
          <div className="flex h-[100%] w-full flex-col justify-center">
            <p className={`text-left text-sm font-normal`}>NO CONTAINER</p>
          </div>
        ),
        name: 'NO CONTAINER',
        renderCell: (props: any) => {
          const rowIdx = props.rowIdx;
          const cellValue = props.row.lokasibongkar_nama;
          return (
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="m-0 flex h-full cursor-pointer items-center p-0 text-sm">
                    {cellValue}
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  className="rounded-none border border-zinc-400 bg-white text-sm text-zinc-900"
                >
                  <p>{cellValue}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        }
      },
      {
        key: 'noseal',

        resizable: true,
        cellClass: 'form-input',
        draggable: true,

        width: 300,
        renderHeaderCell: (column: any) => (
          <div className="flex h-[100%] w-full flex-col justify-center">
            <p className={`text-left text-sm font-normal`}>NO SEAL</p>
          </div>
        ),
        name: 'NO SEAL',
        renderCell: (props: any) => {
          const rowIdx = props.rowIdx;
          const cellValue = props.row.noseal_nama;
          return (
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="m-0 flex h-full cursor-pointer items-center p-0 text-sm">
                    {cellValue}
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  className="rounded-none border border-zinc-400 bg-white text-sm text-zinc-900"
                >
                  <p>{cellValue}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        }
      }
    ];
  }, [rows]);

  const columnsJob = useMemo((): Column<any>[] => {
    return [
      {
        key: 'aksi',
        cellClass: 'form-input',
        width: 65,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full w-full cursor-pointer flex-col justify-center px-1">
            <p className="text-sm font-normal">aksi</p>
          </div>
        ),
        name: 'aksi',

        renderCell: (props: any) => {
          // If this row is the "Add Row" row, display the Add Row button
          if (props.row.isAddRow) {
            return (
              <div className="m-0 flex h-full w-full cursor-pointer items-center justify-center p-0 text-xs">
                <button
                  type="button"
                  className="items-center justify-center rounded bg-transparent text-[#076fde]"
                  onClick={addRow}
                >
                  <FaRegSquarePlus className="text-2xl" />
                </button>
              </div>
            );
          }

          // Otherwise, render the delete button for rows with data
          const rowIndex = rows.findIndex((row) => row.id === props.row.id);
          return (
            <div className="m-0 flex h-full w-full cursor-pointer items-center justify-center p-0 text-xs">
              <button
                type="button"
                className="rounded bg-transparent text-xs text-red-500"
                onClick={() => deleteRow(props.rowIdx)}
              >
                <FaTrashAlt className="text-2xl" />
              </button>
            </div>
          );
        }
      },
      {
        key: 'nomor',
        name: 'NO',
        width: 50,
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        renderHeaderCell: (column: any) => (
          <div className="flex h-[100%] w-full flex-col justify-center">
            <p className={`text-sm font-normal`}>No.</p>
          </div>
        ),
        renderCell: (props: any) => {
          return (
            <div className="flex h-full w-full cursor-pointer items-center justify-center text-sm font-normal">
              {props.row.isAddRow ? '' : props.rowIdx + 1}
            </div>
          );
        }
      },
      {
        key: 'jobmuatan',

        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 250,
        renderHeaderCell: (column: any) => (
          <div className="flex h-[100%] w-full flex-col justify-center">
            <p className={`text-sm font-normal`}>Job Muatan</p>
          </div>
        ),
        name: 'Job Muatan',
        renderCell: (props: any) => {
          return (
            <div className="m-0 flex h-full w-full cursor-pointer items-center p-0 text-xs">
              {props.row.isAddRow ? (
                ''
              ) : (
                <Input
                  type="text"
                  value={props.row.jobmuatan}
                  onKeyDown={inputStopPropagation}
                  onClick={(e) => e.stopPropagation()}
                  readOnly
                  onChange={(e) =>
                    handleInputChange(
                      props.rowIdx,
                      'keterangan',
                      e.target.value
                    )
                  }
                  className="h-2 min-h-9 w-full rounded border border-gray-300"
                />
              )}
            </div>
          );
        }
      },
      {
        key: 'bongkarke',

        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 250,
        renderHeaderCell: (column: any) => (
          <div className="flex h-[100%] w-full flex-col justify-center">
            <p className={`text-sm font-normal`}>Bongkar Ke</p>
          </div>
        ),
        name: 'Bongkar Ke',
        renderCell: (props: any) => {
          return (
            <div className="m-0 flex h-full w-full cursor-pointer items-center p-0 text-xs">
              {props.row.isAddRow ? (
                ''
              ) : (
                <Input
                  type="text"
                  value={props.row.bongkarke}
                  onKeyDown={inputStopPropagation}
                  readOnly
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) =>
                    handleInputChange(
                      props.rowIdx,
                      'keterangan',
                      e.target.value
                    )
                  }
                  className="h-2 min-h-9 w-full rounded border border-gray-300"
                />
              )}
            </div>
          );
        }
      }
    ];
  }, [rows, checkedRows, editingRowId, editableValues]);

  const formRef = useRef<HTMLFormElement | null>(null); // Ref untuk form
  const openName = useSelector((state: RootState) => state.lookup.openName);
  const normalizeDetailData = (detailData: any[], detailRincianData: any[]) => {
    const jobDataMap = new Map<string, any[]>();
    const tabDataMap = new Map<string, any>();

    // Group data by jobmuatan
    const groupedByJob = detailData.reduce((acc, item) => {
      const jobKey = item.orderanmuatan_nobukti;
      if (!acc[jobKey]) {
        acc[jobKey] = [];
      }
      acc[jobKey].push(item);
      return acc;
    }, {});

    // Process each job group
    Object.entries(groupedByJob).forEach(
      ([jobmuatan, jobItems]: [string, any]) => {
        const jobKey = getJobKey(jobmuatan);

        // Sort by bongkarke
        const sortedItems = jobItems.sort(
          (a: any, b: any) => Number(a.bongkarke) - Number(b.bongkarke)
        );

        // Create job rows with add button
        const jobRows = [
          ...sortedItems.map((item: any) => ({
            id: item.id,
            jobmuatan: item.orderanmuatan_nobukti,
            bongkarke: Number(item.bongkarke),
            isNew: false
          })),
          { isAddRow: true, id: 'add_row', isNew: false }
        ];

        jobDataMap.set(jobKey, jobRows);

        // Process rincian data for each bongkarke
        sortedItems.forEach((item: any) => {
          const bongkarke = Number(item.bongkarke);

          // Find all rincian for this detail
          const rincianItems = detailRincianData.filter(
            (rincian: any) => rincian.packinglistdetail_id === item.id
          );

          // Group rincian by statuspackinglist_id
          const groupedRincian = rincianItems.reduce((acc, rincian) => {
            const statusId = Number(rincian.statuspackinglist_id);
            if (!acc[statusId]) {
              acc[statusId] = [];
            }
            acc[statusId].push(rincian);
            return acc;
          }, {});

          // Map status IDs to tab names
          const statusToTabMap: { [key: number]: string } = {
            215: 'penerima',
            216: 'lampiran',
            217: 'keterangantambahan',
            218: 'qtybarang',
            219: 'uangbongkar',
            220: 'rincian'
          };

          // Create tab data for each status
          Object.entries(statusToTabMap).forEach(([statusId, tabName]) => {
            const tabKey = getTabKey(jobmuatan, bongkarke, tabName);
            const rincianForTab = groupedRincian[Number(statusId)] || [];

            const tabData =
              rincianForTab.length > 0
                ? rincianForTab.map((rincian: any, index: number) => ({
                    id: rincian.id,
                    keterangan: rincian.keterangan || '',
                    jobmuatan,
                    bongkarke
                  }))
                : [
                    {
                      id: 0,
                      keterangan: '',
                      jobmuatan,
                      bongkarke
                    }
                  ];

            tabDataMap.set(tabKey, tabData);
          });
        });
      }
    );

    return { jobDataMap, tabDataMap };
  };
  useEffect(() => {
    // Fungsi untuk menangani pergerakan fokus berdasarkan tombol
    const handleKeyDown = (event: KeyboardEvent) => {
      // Jika popOverDate ada nilainya, jangan lakukan apa-apa
      if (openName) {
        return;
      }

      const form = formRef.current;

      if (!form) return;

      const inputs = Array.from(
        form.querySelectorAll('input, select, textarea, button')
      ).filter(
        (element) =>
          element.id !== 'image-dropzone' &&
          element.tagName !== 'BUTTON' &&
          !element.hasAttribute('readonly') // Pengecualian jika input readonly
      ) as HTMLElement[]; // Ambil semua input dalam form kecuali button dan readonly inputs

      const focusedElement = document.activeElement as HTMLElement;

      // Cek apakah elemen yang difokuskan adalah dropzone
      const isImageDropzone =
        document.querySelector('input#image-dropzone') === focusedElement;
      const isFileInput =
        document.querySelector('input#file-input') === focusedElement;

      if (isImageDropzone || isFileInput) return; // Jangan pindah fokus jika elemen fokus adalah dropzone atau input file

      let nextElement: HTMLElement | null = null;

      if (event.key === 'ArrowDown' || event.key === 'Tab') {
        nextElement = getNextFocusableElement(inputs, focusedElement, 'down');
        if (event.key === 'Tab') {
          event.preventDefault(); // Cegah default tab behavior jika ingin mengontrol pergerakan fokus
        }
      } else if (
        event.key === 'ArrowUp' ||
        (event.shiftKey && event.key === 'Tab')
      ) {
        nextElement = getNextFocusableElement(inputs, focusedElement, 'up');
      }
      // Jika ditemukan input selanjutnya, pindahkan fokus
      if (nextElement) {
        nextElement.focus();
      }
    };

    // Fungsi untuk mendapatkan elemen input selanjutnya berdasarkan arah (down atau up)
    const getNextFocusableElement = (
      inputs: HTMLElement[],
      currentElement: HTMLElement,
      direction: 'up' | 'down'
    ): HTMLElement | null => {
      const index = Array.from(inputs).indexOf(currentElement as any);

      if (direction === 'down') {
        // Jika sudah di input terakhir, tidak perlu pindah fokus
        if (index === inputs.length - 1) {
          return null; // Tidak ada elemen selanjutnya
        }
        return inputs[index + 1]; // Fokus pindah ke input setelahnya
      } else {
        return inputs[index - 1]; // Fokus pindah ke input sebelumnya
      }
    };

    // Menambahkan event listener untuk keydown
    document.addEventListener('keydown', handleKeyDown);

    // Membersihkan event listener ketika komponen tidak lagi digunakan
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openName]); // Tambahkan popOverDate sebagai dependen

  // useEffect 1: Load detail data dan build jobDataMap saat mode edit
  useEffect(() => {
    if (mode === 'edit' && popOver && detailDetail && rows.length > 0) {
      const details = detailDetail.data || [];

      if (details.length > 0) {
        // ✅ Cukup cek details saja
        const newJobDataMap = new Map<string, any[]>();

        // Group details by orderanmuatan_nobukti (jobmuatan)
        const groupedByJob = details.reduce((acc: any, detail: any) => {
          const jobKey = detail.orderanmuatan_nobukti;
          if (!acc[jobKey]) {
            acc[jobKey] = [];
          }
          acc[jobKey].push(detail);
          return acc;
        }, {});

        // Process each job group
        Object.entries(groupedByJob).forEach(
          ([jobmuatan, jobDetails]: [string, any]) => {
            const jobKey = getJobKey(jobmuatan);

            // Sort by bongkarke
            const sortedDetails = (jobDetails as any[]).sort(
              (a, b) => Number(a.bongkarke) - Number(b.bongkarke)
            );

            // Create job rows dengan menyimpan full detail data
            const jobRows = [
              ...sortedDetails.map((detail) => ({
                id: detail.id,
                jobmuatan: detail.orderanmuatan_nobukti,
                bongkarke: Number(detail.bongkarke),
                isNew: false,
                _detailData: detail // Store full detail untuk query rincian
              })),
              { isAddRow: true, id: 'add_row', isNew: false }
            ];

            newJobDataMap.set(jobKey, jobRows);
          }
        );

        setJobDataMap(newJobDataMap);

        // Initialize first selection
        const firstRow = rows[0];
        const jobKey = getJobKey(firstRow.jobmuatan);
        const jobData = newJobDataMap.get(jobKey);

        if (jobData) {
          setRowsJob(jobData);

          const firstJobRow = jobData.find((row: any) => !row.isAddRow);
          if (firstJobRow) {
            setSelectedRowJob(0);
            setSelectedJobData(firstJobRow);

            // Set selectedDetailData untuk trigger fetch rincian
            setSelectedDetailData(firstJobRow._detailData);
          }
        }

        setSelectedRow(0);
        setSelectedData(firstRow);
      }
    }
  }, [mode, popOver, detailDetail, rows]);

  useEffect(() => {
    if (allData || popOver) {
      if (
        allData &&
        (allData.data?.length ?? 0) > 0 &&
        forms.getValues('schedule_id')
      ) {
        const formattedRows = allData.data.map((item: any) => ({
          id: Number(item.id),
          jobmuatan: item.nobukti ?? '',
          shipper_nama: item.shipper_nama ?? '',
          lokasibongkar: item.lokasistuffing_nama ?? '',
          marketing_nama: item.marketing_nama ?? '',
          nocontainer: item.nocontainer ?? '',
          noseal: item.noseal ?? ''
        }));

        setRows(formattedRows);

        if (mode === 'add' && formattedRows.length > 0) {
          const firstJob = formattedRows[0];
          const jobKey = getJobKey(firstJob.jobmuatan);
          const defaultJobData = [
            {
              id: 0,
              jobmuatan: firstJob.jobmuatan,
              bongkarke: 1,
              isNew: true
            },
            { isAddRow: true, id: 'add_row', isNew: false }
          ];

          setRowsJob(defaultJobData);
          setJobDataMap(new Map().set(jobKey, defaultJobData));

          const tabs = [
            'penerima',
            'lampiran',
            'keterangantambahan',
            'qtybarang',
            'uangbongkar',
            'rincian'
          ];
          const newTabDataMap = new Map<string, any>();

          tabs.forEach((tabName) => {
            const tabKey = getTabKey(firstJob.jobmuatan, 1, tabName);
            // PERBAIKAN: Hanya 1 row data default
            newTabDataMap.set(tabKey, [
              {
                id: 0,
                keterangan: '',
                banyak: tabName === 'rincian' ? '' : undefined,
                berat: tabName === 'rincian' ? '' : undefined,
                jobmuatan: firstJob.jobmuatan,
                bongkarke: 1
              }
            ]);
          });

          setTabDataMap(newTabDataMap);
          updateTabDataForBongkar(firstJob.jobmuatan, 1);

          setSelectedRow(0);
          setSelectedData(firstJob);
          setSelectedRowJob(0);
          setSelectedJobData(defaultJobData[0]);

          setTimeout(() => {
            gridRef?.current?.selectCell({ rowIdx: 0, idx: 1 });
          }, 100);
        }
      } else {
        setRows([]);
        setRowsJob([]);
        setJobDataMap(new Map());
        setTabDataMap(new Map());
        setRowsPenerima([]);
        setRowsLampiran([]);
        setRowsKeteranganTambahan([]);
        setRowsQtyBarang([]);
        setRowsUangBongkar([]);
        setRowsRincian([]);
      }
    }
  }, [allData, headerData?.id, popOver, mode]);
  useEffect(() => {
    selectedDataRef.current = selectedData;
  }, [selectedData]);
  // Ganti useEffect yang ada untuk sync forms.details ini:
  useEffect(() => {
    if (rows.length > 0) {
      const details: any[] = [];
      rows.forEach((row) => {
        const jobKey = getJobKey(row.jobmuatan);
        const jobData = jobDataMap.get(jobKey);
        console.log('jobData', jobData);

        if (jobData && jobData.length > 0) {
          const validJobRows = jobData.filter(
            (item) => !item.isAddRow && item.jobmuatan === row.jobmuatan
          );
          if (validJobRows.length > 0) {
            validJobRows.forEach((jobRow) => {
              console.log('jobRow', jobRow);
              const rincianData = collectAllRincianData(
                row.jobmuatan,
                jobRow.bongkarke
              );
              details.push({
                id: jobRow.id || 0,
                orderanmuatan_nobukti: row.jobmuatan,
                bongkarke: jobRow.bongkarke.toString(),
                rincian: rincianData.length > 0 ? rincianData : []
              });
            });
          } else {
            details.push({
              id: 0,
              orderanmuatan_nobukti: row.jobmuatan,
              bongkarke: '1',
              banyak: '',
              berat: '',
              rincian: []
            });
          }
        } else {
          details.push({
            id: 0,
            orderanmuatan_nobukti: row.jobmuatan,
            bongkarke: '1',
            banyak: '',
            berat: '',
            rincian: []
          });
        }
      });
      forms.setValue('details', details);
    } else {
      forms.setValue('details', []);
    }
  }, [rows, jobDataMap, tabDataMap]); // ✅ Tambahkan tabDataMap sebagai dependency
  useEffect(() => {
    if (popOver && mode === 'edit' && forms.getValues('nobukti')) {
      refetchDetail();
      // refetchRincian akan di-trigger otomatis karena dependency pada selectedData
    }
  }, [popOver, mode]);

  // Ganti useEffect rincian dengan ini:
  useEffect(() => {
    if (
      (mode === 'edit' || mode === 'view' || mode === 'delete') &&
      detailDetail &&
      detailRincian &&
      popOver
    ) {
      const details = detailDetail.data || [];
      const allRincian = detailRincian.data || [];

      if (details.length === 0) return;

      // ✅ STEP 1: Buat mapping packinglistdetail_id ke detail info
      const detailMap = new Map<string, any>();
      details.forEach((detail: any) => {
        detailMap.set(detail.id, {
          jobmuatan: detail.orderanmuatan_nobukti,
          bongkarke: Number(detail.bongkarke),
          detailId: detail.id
        });
      });

      // ✅ STEP 2: Group rincian by packinglistdetail_id
      const rincianByDetailId = allRincian.reduce((acc: any, rincian: any) => {
        const detailId = rincian.packinglistdetail_id;
        if (!acc[detailId]) {
          acc[detailId] = [];
        }
        acc[detailId].push(rincian);
        return acc;
      }, {});

      // ✅ STEP 3: Status mapping
      const statusToTabMap: { [key: number]: string } = {
        215: 'penerima',
        216: 'lampiran',
        217: 'keterangantambahan',
        218: 'qtybarang',
        219: 'uangbongkar',
        220: 'rincian'
      };

      // ✅ STEP 4: Process setiap rincian dan set ke tab yang sesuai
      const newTabDataMap = new Map<string, any[]>();

      // Initialize empty arrays untuk semua kombinasi detail + tab
      details.forEach((detail: any) => {
        const jobmuatan = detail.orderanmuatan_nobukti;
        const bongkarke = Number(detail.bongkarke);

        Object.values(statusToTabMap).forEach((tabName) => {
          const tabKey = getTabKey(jobmuatan, bongkarke, tabName);
          newTabDataMap.set(tabKey, []);
        });
      });

      // Fill dengan data rincian
      allRincian.forEach((rincian: any) => {
        const detailId = rincian.packinglistdetail_id;
        const detailInfo = detailMap.get(detailId);

        if (!detailInfo) {
          console.warn(
            `⚠️ Detail not found for packinglistdetail_id: ${detailId}`
          );
          return;
        }

        const { jobmuatan, bongkarke } = detailInfo;
        const statusId = Number(rincian.statuspackinglist_id);
        const tabName = statusToTabMap[statusId];

        if (!tabName) {
          console.warn(
            `⚠️ Tab not found for statuspackinglist_id: ${statusId}`
          );
          return;
        }

        const tabKey = getTabKey(jobmuatan, bongkarke, tabName);

        // Get existing data atau init array baru
        const existingData = newTabDataMap.get(tabKey) || [];

        // ✅ PERBAIKAN: Tambahkan banyak dan berat untuk tab rincian
        const rowData: any = {
          id: rincian.id,
          keterangan: rincian.keterangan || '',
          statuspackinglist_id: rincian.statuspackinglist_id,
          jobmuatan,
          bongkarke
        };

        // Tambahkan banyak dan berat hanya untuk tab rincian (status 220)
        if (tabName === 'rincian') {
          rowData.banyak = rincian.banyak || '';
          rowData.berat = rincian.berat || '';
        }

        existingData.push(rowData);

        newTabDataMap.set(tabKey, existingData);
      });

      // ✅ STEP 5: Tambahkan default row untuk tab yang kosong DAN add row button
      newTabDataMap.forEach((data, tabKey) => {
        const parts = tabKey.split('_');
        const tabName = parts.pop();
        const bongkarkeStr = parts.pop();
        const jobmuatan = parts.join('_');
        const bongkarke = parseInt(bongkarkeStr || '1');

        if (data.length === 0) {
          // Jika tidak ada data, tambahkan 1 row kosong
          const defaultRow: any = {
            id: 0,
            keterangan: '',
            jobmuatan,
            bongkarke
          };

          if (tabName === 'rincian') {
            defaultRow.banyak = '';
            defaultRow.berat = '';
          }

          newTabDataMap.set(tabKey, [defaultRow]);
        }

        // ✅ TAMBAHKAN: Selalu tambahkan add row button di mode edit
        if (mode === 'edit') {
          const currentData = newTabDataMap.get(tabKey) || [];
          newTabDataMap.set(tabKey, [
            ...currentData,
            { isAddRow: true, id: 'add_row' }
          ]);
        }
      });

      // ✅ STEP 6: Update tabDataMap state
      setTabDataMap(newTabDataMap);

      // ✅ STEP 7: Update tampilan untuk selected row
      const targetJobmuatan =
        selectedData?.jobmuatan || details[0]?.orderanmuatan_nobukti;
      const targetBongkarke =
        selectedJobData?.bongkarke || Number(details[0]?.bongkarke) || 1;

      if (targetJobmuatan && targetBongkarke) {
        const tabs = [
          'penerima',
          'lampiran',
          'keterangantambahan',
          'qtybarang',
          'uangbongkar',
          'rincian'
        ];

        tabs.forEach((tabName) => {
          const tabKey = getTabKey(targetJobmuatan, targetBongkarke, tabName);
          const tabDataRaw = newTabDataMap.get(tabKey) || [];

          // ✅ PERBAIKAN: Pastikan add row button ada di data yang ditampilkan
          const tabData =
            mode === 'edit'
              ? tabDataRaw // Sudah include add row dari STEP 5
              : tabDataRaw.filter((row: any) => !row.isAddRow); // View/delete: hilangkan add row

          switch (tabName) {
            case 'penerima':
              setRowsPenerima([...tabData]);
              break;
            case 'lampiran':
              setRowsLampiran([...tabData]);
              break;
            case 'keterangantambahan':
              setRowsKeteranganTambahan([...tabData]);
              break;
            case 'qtybarang':
              setRowsQtyBarang([...tabData]);
              break;
            case 'uangbongkar':
              setRowsUangBongkar([...tabData]);
              break;
            case 'rincian':
              setRowsRincian([...tabData]);
              break;
          }
        });
      }

      console.log('✨ All rincian data loaded and set to tabs!');
    }
  }, [detailDetail, detailRincian, mode, popOver]);
  useEffect(() => {
    if (!popOver) {
      // Reset modified tabs saat dialog ditutup
      setModifiedTabs(new Set());
    }
  }, [popOver]);
  console.log('detailRincian', detailRincian);
  return (
    <Dialog open={popOver} onOpenChange={setPopOver}>
      <DialogTitle hidden={true}>Title</DialogTitle>
      <DialogContent className="flex h-full min-w-full flex-col overflow-hidden border border-border bg-background">
        <div className="flex items-center justify-between bg-background-form-header px-2 py-2">
          <h2 className="text-sm font-semibold">
            {mode === 'add'
              ? 'Tambah Packing List'
              : mode === 'edit'
              ? 'Edit Packing List'
              : mode === 'delete'
              ? 'Delete Packing List'
              : 'View Packing List'}
          </h2>
          <div
            className="cursor-pointer rounded-md border border-zinc-200 bg-red-500 p-0 hover:bg-red-400"
            onClick={() => {
              setPopOver(false);
              handleClose();
            }}
          >
            <IoMdClose className="h-5 w-5 font-bold text-white" />
          </div>
        </div>
        <div className="h-full flex-1 overflow-y-auto bg-background-card pl-1 pr-2">
          <div className="h-full bg-background-card px-5 py-3">
            <Form {...forms}>
              <form
                ref={formRef}
                onSubmit={onSubmit}
                className="flex h-full flex-col gap-6"
              >
                <div className="flex h-[100%] flex-col gap-2 lg:gap-3">
                  <div className="flex flex-row">
                    <FormField
                      name="nobukti"
                      control={forms.control}
                      render={({ field }) => (
                        <FormItem className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                          <FormLabel className="font-semibold lg:w-[30%]">
                            NO BUKTI
                          </FormLabel>
                          <div className="flex flex-col lg:w-[70%]">
                            <FormControl>
                              <Input
                                {...field}
                                disabled
                                value={field.value ?? ''}
                                type="text"
                                readOnly={mode === 'view' || mode === 'delete'}
                              />
                            </FormControl>
                            <FormMessage />
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      name="tglbukti"
                      control={forms.control}
                      render={({ field }) => (
                        <FormItem className="flex w-full flex-col justify-between lg:ml-4 lg:flex-row lg:items-center">
                          <FormLabel
                            required={true}
                            className="font-semibold lg:w-[30%]"
                          >
                            TGL BUKTI
                          </FormLabel>
                          <div className="flex flex-col lg:w-[70%]">
                            <FormControl>
                              <InputDatePicker
                                value={field.value}
                                disabled={
                                  mode === 'view' ||
                                  mode === 'delete' ||
                                  mode === 'edit'
                                }
                                onChange={field.onChange}
                                showCalendar
                                onSelect={(date) =>
                                  forms.setValue('tglbukti', date)
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                    <div className="w-full lg:w-[15%]">
                      <FormLabel className="text-sm font-semibold">
                        SCHEDULE KAPAL
                      </FormLabel>
                    </div>
                    <div className="w-full lg:w-[85%]">
                      {lookupPropsSchedule.map((props, index) => (
                        <LookUp
                          key={index}
                          {...props}
                          label="SCHEDULE KAPAL"
                          lookupValue={(value: any) => {
                            forms.setValue('schedule_id', value);
                          }}
                          onSelectRow={(val) => {
                            forms.setValue('kapal_nama', val?.kapal_nama);
                            forms.setValue('voyberangkat', val?.voyberangkat);
                            forms.setValue('tglberangkat', val?.tglberangkat);
                            forms.setValue(
                              'tujuan_nama',
                              val?.tujuankapal_nama
                            );
                          }}
                          onClear={() => {
                            forms.setValue('kapal_nama', '');
                            forms.setValue('voyberangkat', '');
                            forms.setValue('tglberangkat', '');
                            forms.setValue('tujuan_nama', '');
                            setRows([]);
                            setRowsJob([]);
                            setJobDataMap(new Map());
                            setTabDataMap(new Map());
                            setRowsPenerima([]);
                            setRowsLampiran([]);
                            setRowsKeteranganTambahan([]);
                            setRowsQtyBarang([]);
                            setRowsUangBongkar([]);
                            setRowsRincian([]);
                          }}
                          name="schedule_id"
                          forms={forms}
                          lookupNama={forms.getValues('schedule_id')}
                        />
                      ))}
                    </div>
                  </div>
                  <FormField
                    name="voyberangkat"
                    control={forms.control}
                    render={({ field }) => (
                      <FormItem className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                        <FormLabel className="font-semibold lg:w-[15%]">
                          VOY BERANGKAT
                        </FormLabel>
                        <div className="flex flex-col lg:w-[85%]">
                          <FormControl>
                            <Input
                              {...field}
                              disabled
                              value={field.value ?? ''}
                              type="text"
                              readOnly={mode === 'view' || mode === 'delete'}
                            />
                          </FormControl>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />
                  <FormField
                    name="tglberangkat"
                    control={forms.control}
                    render={({ field }) => (
                      <FormItem className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                        <FormLabel className="font-semibold lg:w-[15%]">
                          TGL BERANGKAT
                        </FormLabel>
                        <div className="flex flex-col lg:w-[85%]">
                          <FormControl>
                            <InputDatePicker
                              {...field}
                              disabled
                              value={field.value ?? ''}
                              type="text"
                              readOnly={mode === 'view' || mode === 'delete'}
                            />
                          </FormControl>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />
                  <FormField
                    name="tujuan_nama"
                    control={forms.control}
                    render={({ field }) => (
                      <FormItem className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                        <FormLabel className="font-semibold lg:w-[15%]">
                          TUJUAN
                        </FormLabel>
                        <div className="flex flex-col lg:w-[85%]">
                          <FormControl>
                            <Input
                              {...field}
                              disabled
                              value={field.value ?? ''}
                              type="text"
                              readOnly={mode === 'view' || mode === 'delete'}
                            />
                          </FormControl>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />
                  <FormField
                    name="kapal_nama"
                    control={forms.control}
                    render={({ field }) => (
                      <FormItem className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                        <FormLabel className="font-semibold lg:w-[15%]">
                          KAPAL
                        </FormLabel>
                        <div className="flex flex-col lg:w-[85%]">
                          <FormControl>
                            <Input
                              {...field}
                              disabled
                              value={field.value ?? ''}
                              type="text"
                              readOnly={mode === 'view' || mode === 'delete'}
                            />
                          </FormControl>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />
                  <div className="h-[400px] min-h-[400px]">
                    <div className="flex h-[100%] w-full flex-col rounded-sm border border-border bg-background">
                      <div className="flex h-[38px] w-full flex-row items-center rounded-t-sm border-b border-border bg-background-grid-header px-2"></div>

                      <DataGrid
                        key={dataGridKey}
                        ref={gridRef}
                        columns={columns as any[]}
                        rows={rows}
                        headerRowHeight={30}
                        rowHeight={35}
                        onCellClick={handleCellClick}
                        onSelectedCellChange={(args) => {
                          handleCellClick({ row: args.row });
                        }}
                        rowClass={getRowClass}
                        renderers={{ noRowsFallback: <EmptyRowsRenderer /> }}
                        className={`${
                          isDark ? 'rdg-dark' : 'rdg-light'
                        } fill-grid`}
                        enableVirtualization={false}
                      />
                      <div className="flex flex-row justify-between border border-x-0 border-b-0 border-border bg-background-grid-header p-2"></div>
                    </div>
                  </div>
                  <div className="h-[400px] min-h-[400px]">
                    <div className="flex h-[100%] w-full flex-col rounded-sm border border-border bg-background">
                      <div className="flex h-[38px] w-full flex-row items-center rounded-t-sm border-b border-border bg-background-grid-header px-2">
                        <p className="text-sm font-semibold">PACKING LIST</p>
                      </div>

                      <DataGrid
                        key={dataGridKey}
                        ref={gridRef}
                        columns={columnsJob as any[]}
                        rows={rowsJob}
                        headerRowHeight={30}
                        rowHeight={35}
                        onCellClick={handleCellClickJob}
                        onSelectedCellChange={(args) => {
                          handleCellClickJob({ row: args.row });
                        }}
                        renderers={{ noRowsFallback: <EmptyRowsRenderer /> }}
                        className={`${
                          isDark ? 'rdg-dark' : 'rdg-light'
                        } fill-grid`}
                        enableVirtualization={false}
                        rowClass={getRowClassJob}
                      />
                      <div className="flex flex-row justify-between border border-x-0 border-b-0 border-border bg-background-grid-header p-2"></div>
                    </div>
                  </div>
                  <Tabs
                    defaultValue={activeTab}
                    onValueChange={setActiveTab}
                    className="h-full w-full"
                  >
                    <TabsList className="flex w-full flex-row flex-wrap justify-start gap-1 rounded-t-sm border border-border bg-background-form-header">
                      <TabsTrigger value="penerima">Penerima</TabsTrigger>
                      <TabsTrigger value="lampiran">Lampiran</TabsTrigger>
                      <TabsTrigger value="keterangantambahan">
                        Keterangan Tambahan
                      </TabsTrigger>
                      <TabsTrigger value="qtybarang">QTY Barang</TabsTrigger>
                      <TabsTrigger value="uangbongkar">
                        Uang Bongkar
                      </TabsTrigger>
                      <TabsTrigger value="rincian">Rincian</TabsTrigger>
                    </TabsList>

                    <TabsContent value="penerima" className="h-full">
                      <div className="h-[200px] min-h-[200px]">
                        <div className="flex h-full w-full flex-col rounded-sm border border-border bg-background">
                          <DataGrid
                            columns={columnsPenerima as any[]}
                            rows={rowsPenerima}
                            headerRowHeight={30}
                            rowHeight={40}
                            className={`${
                              isDark ? 'rdg-dark' : 'rdg-light'
                            } fill-grid text-sm`}
                            enableVirtualization={false}
                            renderers={{
                              noRowsFallback: <EmptyRowsRenderer />
                            }}
                          />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="lampiran" className="h-full">
                      <div className="h-[200px] min-h-[200px]">
                        <div className="flex h-full w-full flex-col rounded-sm border border-border bg-background">
                          <DataGrid
                            columns={columnsLampiran as any[]}
                            rows={rowsLampiran}
                            headerRowHeight={30}
                            rowHeight={40}
                            className={`${
                              isDark ? 'rdg-dark' : 'rdg-light'
                            } fill-grid text-sm`}
                            enableVirtualization={false}
                            renderers={{
                              noRowsFallback: <EmptyRowsRenderer />
                            }}
                          />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="keterangantambahan" className="h-full">
                      <div className="h-[200px] min-h-[200px]">
                        <div className="flex h-full w-full flex-col rounded-sm border border-border bg-background">
                          <DataGrid
                            columns={columnsKeteranganTambahan as any[]}
                            rows={rowsKeteranganTambahan}
                            headerRowHeight={30}
                            rowHeight={40}
                            className={`${
                              isDark ? 'rdg-dark' : 'rdg-light'
                            } fill-grid text-sm`}
                            enableVirtualization={false}
                            renderers={{
                              noRowsFallback: <EmptyRowsRenderer />
                            }}
                          />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="qtybarang" className="h-full">
                      <div className="h-[200px] min-h-[200px]">
                        <div className="flex h-full w-full flex-col rounded-sm border border-border bg-background">
                          <DataGrid
                            columns={columnsQtyBarang as any[]}
                            rows={rowsQtyBarang}
                            headerRowHeight={30}
                            rowHeight={40}
                            className={`${
                              isDark ? 'rdg-dark' : 'rdg-light'
                            } fill-grid text-sm`}
                            enableVirtualization={false}
                            renderers={{
                              noRowsFallback: <EmptyRowsRenderer />
                            }}
                          />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="uangbongkar" className="h-full">
                      <div className="h-[200px] min-h-[200px]">
                        <div className="flex h-full w-full flex-col rounded-sm border border-border bg-background">
                          <DataGrid
                            columns={columnsUangBongkar as any[]}
                            rows={rowsUangBongkar}
                            headerRowHeight={30}
                            rowHeight={40}
                            className={`${
                              isDark ? 'rdg-dark' : 'rdg-light'
                            } fill-grid text-sm`}
                            enableVirtualization={false}
                            renderers={{
                              noRowsFallback: <EmptyRowsRenderer />
                            }}
                          />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="rincian" className="h-full">
                      <div className="h-[200px] min-h-[200px]">
                        <div className="flex h-full w-full flex-col rounded-sm border border-border bg-background">
                          <DataGrid
                            columns={columnsRincian as any[]}
                            rows={rowsRincian}
                            headerRowHeight={30}
                            rowHeight={40}
                            className={`${
                              isDark ? 'rdg-dark' : 'rdg-light'
                            } fill-grid text-sm`}
                            enableVirtualization={false}
                            renderers={{
                              noRowsFallback: <EmptyRowsRenderer />
                            }}
                          />
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              </form>
            </Form>
          </div>
        </div>
        <FormFooterButtons
          mode={mode}
          onSave={onSubmit}
          onCancel={handleClose}
          isLoadingCreate={isLoadingCreate}
          isLoadingUpdate={isLoadingUpdate}
          isLoadingDelete={isLoadingDelete}
          hideSaveAndAdd
        />
      </DialogContent>
    </Dialog>
  );
};

export default FormPackingList;
