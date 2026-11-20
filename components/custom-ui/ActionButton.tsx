'use client';
import React, { useEffect, useState, useMemo } from 'react';
import { MdDelete, MdEdit } from 'react-icons/md';
import { FaPlus } from 'react-icons/fa6';
import { Button } from '../ui/button';
import { BsEye, BsEyeFill } from 'react-icons/bs';
import { FaFileExport, FaPrint } from 'react-icons/fa';
import { IoMdArrowDropdown, IoMdArrowDropup } from 'react-icons/io';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger
} from '../ui/dropdown-menu';
import { LoadingOverlay } from './LoadingOverlay';
import usePermissions from '@/hooks/hasPermission';
import { getParameterApprovalFn } from '@/lib/apis/parameter.api';
import { useApprovalDialog } from '@/lib/store/client/useDialogApproval';
import { getPermissionFn } from '@/lib/apis/menu.api';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';
import { useLainnyaDialog } from '@/lib/store/client/useDialogLainnya';
import { useHotkeys } from '../providers/hotkeys-provider';

const renderLabelWithShortcutUnderline = (
  label: string,
  shortcut?: string
): React.ReactNode => {
  const key = (shortcut ?? '').trim();
  if (!key) return label;

  const needle = key[0]?.toLowerCase();
  if (!needle) return label;

  const haystack = label.toLowerCase();
  const matchIndex = haystack.indexOf(needle);
  if (matchIndex < 0) return label;

  return (
    <>
      {label.slice(0, matchIndex)}
      <span className="text-sm underline">{label[matchIndex]}</span>
      {label.slice(matchIndex + 1)}
    </>
  );
};

interface CustomAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'success' | 'warning' | 'destructive' | 'outline';
  className?: string;
  disabled?: boolean;
  shortcut?: string;
}

interface DropdownAction {
  label: string;
  onClick: () => void;
  className?: string;
}

interface DropdownMenuItem {
  label: string;
  actions: DropdownAction[];
  className?: string;
  icon?: React.ReactNode;
}

interface BaseActionProps {
  onDelete?: () => void;
  onEdit?: () => void;
  onAdd?: () => void;
  onExport?: () => void;
  onReport?: () => void;
  onView?: () => void;
  customActions?: CustomAction[];
  dropdownMenus?: DropdownMenuItem[];

  shortcutAdd?: string;
  shortcutEdit?: string;
  shortcutDelete?: string;
  shortcutView?: string;
  shortcutExport?: string;
  shortcutReport?: string;
  shortcutModifier?: 'alt' | 'ctrl' | 'meta';
  allowHotkeysInInput?: boolean;

  module?: string;
  checkedRows?: Set<number>;
  disableAdd?: boolean;
  disableEdit?: boolean;
  isApproval?: boolean;
  disableApproval?: boolean;
  disableDelete?: boolean;
  disableView?: boolean;
  disableExport?: boolean;
  disableReport?: boolean;
  rowsLength?: number;
  totalItems?: number;
  startRow?: number;
}

const ActionButton = ({
  onDelete,
  onEdit,
  onAdd,
  onExport,
  onReport,
  onView,
  rowsLength = 0,
  totalItems = 0,
  startRow = 1,
  checkedRows,
  module = '',
  customActions = [],
  dropdownMenus = [],
  disableAdd = false,
  isApproval = false,
  disableApproval = false,
  disableEdit = false,
  disableDelete = false,
  disableView = false,
  disableExport = false,
  disableReport = false,
  shortcutAdd = 'A',
  shortcutEdit = 'E',
  shortcutDelete = 'D',
  shortcutView = 'V',
  shortcutExport,
  shortcutReport,
  shortcutModifier = 'alt',
  allowHotkeysInInput = true
}: BaseActionProps) => {
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const { hasPermission, loading } = usePermissions();
  const [dataParameter, setDataParameter] = useState<any>([]);
  const { openDialog: openDialog } = useApprovalDialog();
  const { open, openDialog: openDialogLainnya } = useLainnyaDialog();
  const { id } = useSelector((state: RootState) => state.auth);

  // State untuk permissions
  const [permissions, setPermissions] = useState<any[]>([]);
  const [hasApprovalPermission, setHasApprovalPermission] = useState(false);
  const [hasNonApprovalPermission, setHasNonApprovalPermission] =
    useState(false);
  const [hasDataLainnyaPermission, setHasDataLainnyaPermission] =
    useState(false);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(true);

  // State untuk memisahkan data APPROVAL dan NON APPROVAL
  const [approvalData, setApprovalData] = useState<any[]>([]);
  const [nonApprovalData, setNonApprovalData] = useState<any[]>([]);
  const [dataLainnya, setDataLainnya] = useState<any[]>([]);

  const handleDropdownClick = (index: number) => {
    setOpenMenu(openMenu === index ? null : index);
  };

  const hotkeyBindings = useMemo(() => {
    const bindings: Record<string, any> = {};
    const mod = shortcutModifier;
    const allowInInput = allowHotkeysInInput;

    const toCombo = (key?: string) => {
      const k = (key ?? '').trim().toLowerCase();
      if (!k) return null;
      return `${mod}+${k}`;
    };

    const addCombo = toCombo(shortcutAdd);
    if (addCombo && onAdd) {
      bindings[addCombo] = {
        allowInInput,
        handler: () => {
          if (!disableAdd) onAdd();
        }
      };
    }

    const editCombo = toCombo(shortcutEdit);
    if (editCombo && onEdit) {
      bindings[editCombo] = {
        allowInInput,
        handler: () => {
          if (!disableEdit) onEdit();
        }
      };
    }

    const deleteCombo = toCombo(shortcutDelete);
    if (deleteCombo && onDelete) {
      bindings[deleteCombo] = {
        allowInInput,
        handler: () => {
          if (!disableDelete) onDelete();
        }
      };
    }

    const viewCombo = toCombo(shortcutView);
    if (viewCombo && onView) {
      bindings[viewCombo] = {
        allowInInput,
        handler: () => {
          if (!disableView) onView();
        }
      };
    }

    const exportCombo = toCombo(shortcutExport);
    if (exportCombo && onExport) {
      bindings[exportCombo] = {
        allowInInput,
        handler: () => {
          if (!disableExport) onExport();
        }
      };
    }

    const reportCombo = toCombo(shortcutReport);
    if (reportCombo && onReport) {
      bindings[reportCombo] = {
        allowInInput,
        handler: () => {
          if (!disableReport) onReport();
        }
      };
    }

    for (const action of customActions) {
      const combo = toCombo(action.shortcut);
      if (!combo) continue;
      bindings[combo] = {
        allowInInput,
        handler: () => {
          if (!(action.disabled ?? false)) action.onClick();
        }
      };
    }

    return bindings;
  }, [
    shortcutModifier,
    allowHotkeysInInput,
    shortcutAdd,
    shortcutEdit,
    shortcutDelete,
    shortcutView,
    shortcutExport,
    shortcutReport,
    onAdd,
    onEdit,
    onDelete,
    onView,
    onExport,
    onReport,
    disableAdd,
    disableEdit,
    disableDelete,
    disableView,
    disableExport,
    disableReport,
    customActions
  ]);

  useHotkeys(hotkeyBindings, {
    enabled: Object.keys(hotkeyBindings).length > 0
  });

  const formattedModule = module?.replace(/-/g, ' ');

  const onClick = (value: any) => {
    openDialog({
      module: module,
      mode: value,
      checkedRows: checkedRows
    });
  };

  const onClickLainnya = (value: any) => {
    openDialogLainnya({
      module: module,
      mode: value,
      checkedRows: checkedRows
    });
  };

  // Function untuk check permissions berdasarkan data permission user
  const checkPermissions = (permissionData: any[]) => {
    // Filter permissions yang relevant dengan module saat ini

    const relevantPermissions = permissionData.filter((permission) => {
      const formattedSubject = permission.subject?.replace(/-/g, ' ');
      return formattedSubject?.toUpperCase() === formattedModule?.toUpperCase();
    });
    const hasYA = relevantPermissions.some(
      (permission) =>
        permission.action &&
        (permission.action.includes('-> YA') ||
          permission.action.toUpperCase().includes('YA'))
    );
    const hasTIDAK = relevantPermissions.some(
      (permission) =>
        permission.action &&
        (permission.action.includes('-> TIDAK') ||
          permission.action.toUpperCase().includes('TIDAK'))
    );

    const hasLAINNYA = relevantPermissions.some(
      (permission) =>
        permission.action &&
        (permission.action.includes('DATA LAINNYA -> YA') ||
          permission.action.toUpperCase().includes('DATA LAINNYA -> YA'))
    );

    setHasApprovalPermission(hasYA);
    setHasNonApprovalPermission(hasTIDAK);
    setHasDataLainnyaPermission(hasLAINNYA);

    return { hasYA, hasTIDAK, hasLAINNYA };
  };

  // Function untuk filter data parameter berdasarkan permissions
  const filterParameterByPermission = (
    data: any[],
    hasYA: boolean,
    hasTIDAK: boolean
  ) => {
    const approvalItems: any[] = [];
    const nonApprovalItems: any[] = [];

    data.forEach((item) => {
      // Categorize berdasarkan nama atau field tertentu
      // Sesuaikan logic ini dengan struktur data Anda
      if (
        item.memo_nama?.toUpperCase().includes('APPROVAL') &&
        !item.memo_nama?.toUpperCase().includes('NON')
      ) {
        if (hasYA) {
          approvalItems.push(item);
        }
      } else if (
        item.memo_nama?.toUpperCase().includes('NON APPROVAL') ||
        item.memo_nama?.toUpperCase().includes('UN')
      ) {
        if (hasTIDAK) {
          nonApprovalItems.push(item);
        }
      }
    });

    setApprovalData(approvalItems);
    setNonApprovalData(nonApprovalItems);
  };

  // Fetch all required data
  const fetchData = async () => {
    // `id` berasal dari redux-persist yang rehydrate SESUDAH render pertama,
    // jadi pada mount pertama nilainya masih null. Dulu di sini hanya `return`
    // tanpa mematikan isLoadingPermissions (nilai awalnya true), sementara
    // useEffect di bawah tidak memantau `id` sehingga tidak pernah dicoba
    // ulang saat rehydrate selesai. Akibatnya isLoadingPermissions macet di
    // true dan tombol APPROVAL — yang dirender dengan syarat
    // `!isLoadingPermissions` — tidak pernah muncul, bahkan untuk user yang
    // haknya lengkap.
    if (!id) {
      setIsLoadingPermissions(false);
      return;
    }

    setIsLoadingPermissions(true);
    try {
      const hakApprovalResponse = await getParameterApprovalFn({
        filters: { grp: 'HAK APPROVAL' }
      });

      const res = await getPermissionFn(String(id));

      if (hakApprovalResponse?.data) {
        setDataParameter(hakApprovalResponse.data);
      }

      if (res?.abilities) {
        setPermissions(res.abilities);
        const { hasYA, hasTIDAK, hasLAINNYA } = checkPermissions(res.abilities);
        if (hakApprovalResponse?.data) {
          filterParameterByPermission(
            hakApprovalResponse.data,
            hasYA,
            hasTIDAK
          );
        }
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
      setHasApprovalPermission(false);
      setHasNonApprovalPermission(false);
      setHasDataLainnyaPermission(false);
    } finally {
      setIsLoadingPermissions(false);
    }
  };

  useEffect(() => {
    if (formattedModule) {
      fetchData();
    }
    // `id` WAJIB ikut di sini: tanpa itu permission tidak pernah diambil ulang
    // setelah redux-persist selesai rehydrate.
  }, [formattedModule, id]);

  // Computed value untuk menentukan apakah show dropdown
  const showApprovalDropdown = useMemo(() => {
    if (disableApproval) return false;
    return hasApprovalPermission || hasNonApprovalPermission;
  }, [disableApproval, hasApprovalPermission, hasNonApprovalPermission]);

  // Computed value untuk data yang akan ditampilkan di dropdown
  const filteredApprovalData = useMemo(() => {
    const combinedData: any[] = [];

    // Tambahkan APPROVAL items jika ada permission
    if (hasApprovalPermission && approvalData.length > 0) {
      combinedData.push(...approvalData);
    }

    // Tambahkan NON APPROVAL items jika ada permission
    if (hasNonApprovalPermission && nonApprovalData.length > 0) {
      combinedData.push(...nonApprovalData);
    }

    return combinedData;
  }, [
    hasApprovalPermission,
    hasNonApprovalPermission,
    approvalData,
    nonApprovalData
  ]);

  // Computed value untuk label button
  const approvalButtonLabel = useMemo(() => {
    if (hasApprovalPermission && hasNonApprovalPermission) {
      return 'APPROVAL/NON';
    } else if (hasApprovalPermission) {
      return 'APPROVAL';
    } else if (hasNonApprovalPermission) {
      return 'NON APPROVAL';
    }
    return 'APPROVAL/NON';
  }, [hasApprovalPermission, hasNonApprovalPermission]);

  // ⚠️ DIAGNOSTIK SEMENTARA — HAPUS setelah tombol APPROVAL ketemu masalahnya.
  // Mencetak semua nilai yang menentukan tampil/tidaknya tombol approval.
  console.log('### DIAG APPROVAL ###', {
    module,
    formattedModule,
    authId: id ?? '(KOSONG)',
    isLoadingPermissions,
    hasApprovalPermission,
    hasNonApprovalPermission,
    showApprovalDropdown,
    jumlahPermissions: permissions.length,
    jumlahPermissionModulIni: permissions.filter(
      (p: any) =>
        String(p.subject ?? '')
          .replace(/-/g, ' ')
          .toUpperCase() === String(formattedModule ?? '').toUpperCase()
    ).length,
    jumlahDataParameter: dataParameter?.length ?? 0,
    jumlahIsiDropdown: filteredApprovalData.length,
    TOMBOL_TAMPIL: showApprovalDropdown && !isLoadingPermissions
  });

  return (
    <div className="flex w-full flex-col justify-between lg:flex-row">
      <div className="flex w-full flex-row gap-1 overflow-scroll lg:overflow-hidden">
        {onAdd && (
          <Button
            onClick={onAdd}
            disabled={disableAdd}
            variant="default"
            className="bg-[#0f82e1] text-sm font-thin hover:bg-[#105892] disabled:opacity-50"
          >
            <FaPlus />
            <p className="text-sm font-normal">
              {renderLabelWithShortcutUnderline('Add', shortcutAdd)}
            </p>
          </Button>
        )}

        {onEdit && (
          <Button
            onClick={onEdit}
            disabled={disableEdit}
            variant="warning"
            className="text-sm font-thin disabled:opacity-50"
          >
            <MdEdit />
            <p className="text-center text-sm">
              {renderLabelWithShortcutUnderline('Edit', shortcutEdit)}
            </p>
          </Button>
        )}

        {onDelete && (
          <Button
            onClick={onDelete}
            disabled={disableDelete}
            variant="destructive"
            className="gap-1 text-sm font-thin disabled:opacity-50"
          >
            <MdDelete />
            <p className="text-center text-sm">
              {renderLabelWithShortcutUnderline('Delete', shortcutDelete)}
            </p>
          </Button>
        )}

        {onView && (
          <Button
            onClick={onView}
            disabled={disableView}
            variant="default"
            className="gap-1 bg-orange-500 text-sm font-thin hover:bg-orange-700 disabled:opacity-50"
          >
            <BsEyeFill />
            <p className="text-center text-sm">
              {renderLabelWithShortcutUnderline('View', shortcutView)}
            </p>
          </Button>
        )}

        {onExport && (
          <Button
            onClick={onExport}
            disabled={disableExport}
            variant="default"
            className="gap-1 bg-green-600 text-sm font-thin hover:bg-green-700 disabled:opacity-50"
          >
            <FaFileExport />
            <p className="text-center text-sm">
              {renderLabelWithShortcutUnderline('Export', shortcutExport)}
            </p>
          </Button>
        )}

        {onReport && (
          <Button
            onClick={onReport}
            disabled={disableReport}
            variant="default"
            className="gap-1 bg-cyan-500 text-sm font-thin hover:bg-cyan-700 disabled:opacity-50"
          >
            <FaPrint />
            <p className="text-center text-sm">
              {renderLabelWithShortcutUnderline('Report', shortcutReport)}
            </p>
          </Button>
        )}

        {customActions.map((action, idx) => (
          <Button
            key={idx}
            onClick={action.onClick}
            disabled={action.disabled ?? false}
            variant={action.variant || 'default'}
            className={`gap-1 text-sm font-thin ${action.className || ''} ${
              action.disabled ? 'disabled:opacity-50' : ''
            }`}
          >
            {action.icon}{' '}
            <p className="text-center text-sm">
              {renderLabelWithShortcutUnderline(action.label, action.shortcut)}
            </p>
          </Button>
        ))}

        {dropdownMenus.length > 0 &&
          dropdownMenus.map((menu, index) => (
            <DropdownMenu
              key={index}
              open={openMenu === index}
              onOpenChange={() =>
                setOpenMenu(openMenu === index ? null : index)
              }
            >
              <DropdownMenuTrigger asChild>
                <Button
                  variant="default"
                  className={`w-fit gap-1 text-sm font-normal ${
                    menu.className || ''
                  }`}
                >
                  {menu.icon}
                  {menu.label} <IoMdArrowDropup />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="flex flex-col gap-1 border border-blue-500"
                side="top"
              >
                {menu.actions.map((action, actionIndex) => (
                  <Button
                    key={actionIndex}
                    onClick={() => {
                      action.onClick();
                      handleDropdownClick(index);
                    }}
                    variant="default"
                    className={`w-full p-2 text-left text-sm font-thin ${
                      action.className || ''
                    }`}
                  >
                    <p className="text-center text-sm font-normal">
                      {action.label}
                    </p>
                  </Button>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ))}

        {/* APPROVAL/NON APPROVAL Dropdown - Only show if has permission */}
        {showApprovalDropdown && !isLoadingPermissions && (
          <DropdownMenu
            open={openMenu === 999} // Use unique index for approval dropdown
            onOpenChange={() => setOpenMenu(openMenu === 999 ? null : 999)}
          >
            <DropdownMenuTrigger asChild>
              <Button
                variant="default"
                className={`w-fit gap-1 bg-purple-700 text-sm font-normal hover:bg-purple-800`}
              >
                {approvalButtonLabel}
                <IoMdArrowDropup />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="flex flex-col gap-1 border border-blue-500"
              side="top"
            >
              {filteredApprovalData.length > 0 ? (
                filteredApprovalData.map((item: any, index: number) => (
                  <Button
                    key={`approval-${index}`}
                    onClick={() => {
                      onClick(item.memo_nama);
                      handleDropdownClick(999);
                    }}
                    variant="default"
                    style={{
                      backgroundColor: item?.warna,
                      color: item.warna_tulisan
                    }}
                    className={`w-full p-2 text-left text-sm font-thin`}
                  >
                    <p className="text-center text-sm font-normal">
                      {item.memo_nama}
                    </p>
                  </Button>
                ))
              ) : (
                <div className="p-2 text-center text-sm text-gray-500">
                  Tidak ada opsi tersedia
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {hasDataLainnyaPermission && !isLoadingPermissions && (
          <Button
            key={`lainnya`}
            variant="default"
            className={`w-fit gap-1 bg-gray-500 text-sm font-normal hover:bg-gray-600`}
            onClick={() => {
              onClickLainnya('lainnya');
            }}
          >
            LAINNYA
            <IoMdArrowDropup />
          </Button>
        )}
      </div>
      {rowsLength > 0 && totalItems > 0 && (
        <div className="flex h-fit w-[150px] items-center justify-center lg:h-full lg:justify-end">
          <p className="text-primary-text text-xs">
            View {rowsLength > 0 ? startRow : null} -{' '}
            {startRow > 1 ? startRow + rowsLength - 1 : rowsLength} of{' '}
            {totalItems ?? null}
          </p>
        </div>
      )}
    </div>
  );
};

export default ActionButton;
