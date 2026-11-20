import React, { useState, useEffect, useRef } from 'react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { api2 } from '@/lib/utils/AxiosInstance';
import { usePathname } from 'next/navigation';

interface SelectOptionProps {
  endpoint: string;
  columnKey: string;
  filterBy?: Record<string, string>;
  onChange: (value: string) => void;
  value?: string;
  label?: string;
  defaultValue?: string;
  selectedValue?: string;
}

const CONFIG_PATH =
  process.env.NEXT_PUBLIC_FILTERING_CONFIG_PATH ??
  '/config/default-filter.json';

// Sentinel value untuk opsi "ALL" — Radix Select tidak mengizinkan value=""
const ALL_VALUE = '__ALL__';

// ── Module-level cache: TIDAK reset saat komponen remount ──
const configCache: { data: Record<string, any> | null } = { data: null };
const optionsCache: Record<string, { value: string; label: string }[]> = {};
// Simpan apakah default sudah pernah di-apply per halaman+kolom (bertahan lintas
// remount). Kuncinya WAJIB ikut slug: daftarbl, divisi dan jenisorderan sama-sama
// memakai columnKey 'statusaktif', kalau hanya columnKey maka modul yang dibuka
// belakangan ikut tertandai sudah apply dan default-nya tidak pernah terpasang.
const appliedKeys: Record<string, boolean> = {};

const FilterOptions: React.FC<SelectOptionProps> = ({
  columnKey,
  endpoint,
  filterBy,
  value: valueKey = '',
  label: labelKey = '',
  defaultValue: defaultValueProp = '',
  selectedValue,
  onChange
}) => {
  const pathname = usePathname();
  const slug = pathname.split('/').pop() ?? '';
  const appliedKey = `${slug}__${columnKey}`;
  const cacheKey = `${endpoint}__${JSON.stringify(
    filterBy
  )}__${valueKey}__${labelKey}`;

  const [options, setOptions] = useState<{ value: string; label: string }[]>(
    optionsCache[cacheKey] ?? []
  );

  // Internal state menggunakan sentinel ALL_VALUE, bukan empty string
  const [localSelectedValue, setLocalSelectedValue] = useState<string>(
    selectedValue !== undefined
      ? selectedValue === ''
        ? ALL_VALUE
        : selectedValue
      : ALL_VALUE
  );

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // ── Apply default (hanya sekali per halaman+kolom, tahan remount) ──
  const tryApplyDefault = (
    currentOptions: { value: string; label: string }[],
    defaultVal: string
  ) => {
    if (appliedKeys[appliedKey]) return; // sudah pernah apply → skip
    if (selectedValue !== undefined) return; // parent controlled → skip
    if (!defaultVal || !currentOptions.length) return;

    const dv = defaultVal.toLowerCase();
    // Cari match, skip sentinel ALL_VALUE
    const match =
      currentOptions.find(
        (o) => o.value !== ALL_VALUE && o.value.toLowerCase() === dv
      ) ||
      currentOptions.find(
        (o) => o.value !== ALL_VALUE && o.label.toLowerCase() === dv
      );

    if (match) {
      appliedKeys[appliedKey] = true; // tandai sudah apply
      setLocalSelectedValue(match.value);
      onChangeRef.current(match.value); // emit value asli ke parent (bukan sentinel)
    }
  };

  // ── 1. Load config + options secara paralel, apply saat keduanya siap ──
  useEffect(() => {
    let configDefault = defaultValueProp;
    let configReady = false;
    let optionsReady = false;
    let loadedOptions: { value: string; label: string }[] = [];

    const checkAndApply = () => {
      if (configReady && optionsReady) {
        tryApplyDefault(loadedOptions, configDefault);
      }
    };

    // Load config
    const loadConfig = async () => {
      if (configCache.data) {
        const section = configCache.data[slug];
        configDefault =
          extractFromSection(section, columnKey) ?? defaultValueProp;
        configReady = true;
        checkAndApply();
      } else {
        try {
          const res = await fetch(CONFIG_PATH);
          configCache.data = res.ok ? await res.json() : {};
          const section = configCache.data![slug];
          configDefault =
            extractFromSection(section, columnKey) ?? defaultValueProp;
        } catch {
          configDefault = defaultValueProp;
        }
        configReady = true;
        checkAndApply();
      }
    };

    // Load options
    const loadOptions = async () => {
      if (optionsCache[cacheKey]) {
        loadedOptions = optionsCache[cacheKey];
        setOptions(loadedOptions);
        optionsReady = true;
        checkAndApply();
      } else {
        try {
          const response = await api2.get(`/${endpoint}`, { params: filterBy });
          const optionsData = (response.data?.data ?? response.data ?? []).map(
            (item: any) => ({
              value: String(item[valueKey] ?? ''),
              label: String(item[labelKey] ?? '')
            })
          );
          // Gunakan ALL_VALUE sebagai sentinel, bukan empty string
          const finalOptions = [
            { value: ALL_VALUE, label: 'ALL' },
            ...optionsData
          ];
          optionsCache[cacheKey] = finalOptions;
          loadedOptions = finalOptions;
          setOptions(finalOptions);
        } catch (error) {
          console.error('Error fetching parameter data:', error);
        }
        optionsReady = true;
        checkAndApply();
      }
    };

    loadConfig();
    loadOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ← hanya sekali saat mount pertama kali

  // ── 2. Sinkronkan nilai dari parent (controlled) ──
  // Parent masih menggunakan '' untuk ALL — konversi ke sentinel secara internal
  useEffect(() => {
    if (selectedValue !== undefined) {
      const normalized = selectedValue === '' ? ALL_VALUE : selectedValue;
      if (normalized !== localSelectedValue) {
        setLocalSelectedValue(normalized);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedValue]);

  // Emit ke parent: konversi sentinel kembali ke '' (kontrak API tidak berubah)
  const handleChange = (val: string) => {
    setLocalSelectedValue(val);
    onChangeRef.current(val === ALL_VALUE ? '' : val);
  };

  const selectedLabel =
    localSelectedValue === ALL_VALUE
      ? 'ALL'
      : options.find((o) => o.value === localSelectedValue)?.label ??
        localSelectedValue;
  return (
    <Select value={localSelectedValue} onValueChange={handleChange}>
      <SelectTrigger className="filter-select z-[999999] mr-1 h-8 w-full cursor-pointer overflow-hidden rounded-none border border-input-border bg-background-input p-1 text-xs font-thin ">
        <SelectValue>{selectedLabel}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {options.map((option, idx) => (
            <SelectItem
              key={`${option.value}-${idx}`}
              className="cursor-pointer text-xs"
              value={option.value}
            >
              <p className="text-sm font-normal">{option.label}</p>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};

// Helper ekstrak nilai default dari section config
function extractFromSection(
  section: any,
  columnKey: string
): string | undefined {
  if (!section) return undefined;
  if (Array.isArray(section)) {
    const matched = section.find(
      (obj: Record<string, string>) => obj[columnKey] !== undefined
    );
    return matched?.[columnKey];
  }
  if (typeof section === 'object') {
    return section[columnKey];
  }
  return undefined;
}

export default FilterOptions;
