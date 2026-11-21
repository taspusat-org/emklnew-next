import React, { useEffect, useState } from 'react';
import { Input } from '../ui/input';
import { LoginInput, loginValidation } from '@/lib/validations/auth.validation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { FaUser, FaEye, FaEyeSlash, FaSave } from 'react-icons/fa';
import {
  setProcessed,
  setProcessing
} from '@/lib/store/loadingSlice/loadingSlice';
import { useDispatch } from 'react-redux';
import { useToast } from '@/hooks/use-toast';
import { verifyForceEditFn } from '@/lib/apis/global.api';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';
import { getParameterApprovalFn } from '@/lib/apis/parameter.api';
import { Button } from '../ui/button';
import useDisableBodyScroll from '@/lib/hooks/useDisableBodyScroll';
import { Icons } from '../icons';
import { useApprovalDialog } from '@/lib/store/client/useDialogApproval';
import { IoMdClose } from 'react-icons/io';
import {
  approvalFn,
  checkApproveFn,
  nonApprovalFn
} from '@/lib/apis/approval.api';
import { useAlert } from '@/lib/store/client/useAlert';
import { useQueryClient } from 'react-query';
import { Textarea } from '../ui/textarea';
import { getPermissionFn } from '@/lib/apis/menu.api';
import InputDatePicker from './InputDatePicker';

const DialogApproval: React.FC = ({}) => {
  const [showErrorKeterangan, setShowErrorKeterangan] = useState(false);
  const [dataParameter, setDataParameter] = useState<any>([]);
  const [showTanggalDialog, setShowTanggalDialog] = useState(false);
  const [showKeteranganDialog, setShowKeteranganDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [tanggal, setTanggal] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const { id } = useSelector((state: RootState) => state.auth);
  const headerData = useSelector((state: RootState) => state.header.headerData);
  const urlApproval = useSelector(
    (state: RootState) => state.header.urlApproval
  );

  const { open, module, closeDialog, mode, checkedRows } = useApprovalDialog();
  const queryClient = useQueryClient();
  const formattedModule = module?.replace(/-/g, ' ');
  const { alert } = useAlert();
  const dispatch = useDispatch();
  const { toast } = useToast();

  const handleButtonClick = async (item: any) => {
    // Validasi checkedRows terlebih dahulu
    if ((checkedRows?.size ?? 0) <= 0) {
      useApprovalDialog.setState({ open: false });
      alert({
        title:
          mode === 'APPROVAL'
            ? 'PILIH DATA YANG INGIN DI APPROVE'
            : 'PILIH DATA YANG INGIN DI NON APPROVE',
        variant: 'danger',
        submitText: 'OK'
      });
      return;
    }
    // Prepare payload untuk check API
    const checkPayload = {
      tableName: item.subgrp,
      id: item.id,
      transaksi_id: Array.from(checkedRows || []),
      value: mode === 'APPROVAL' ? item.nilai_ya : item.nilai_tidak,
      mode: mode,
      text: item.text
    };
    try {
      // ========================================
      // CALL CHECK API FIRST
      // ========================================
      dispatch(setProcessing());

      const checkResponse = await checkApproveFn(checkPayload);

      // Jika status 400 atau ada error, tampilkan alert
      if (checkResponse.status === 400 || !checkResponse.isValid) {
        alert({
          title: checkResponse.message || 'Data tidak valid untuk diproses',
          variant: 'danger',
          submitText: 'OK'
        });
        dispatch(setProcessed());
        useApprovalDialog.setState({ open: false });

        return;
      }
      // ========================================
      // JIKA VALIDASI BERHASIL, LANJUTKAN PROSES
      // ========================================
      dispatch(setProcessed());

      // Check apakah keterangan wajib diisi
      if (item.keterangan_wajib_isi === 'YA') {
        setSelectedItem(item);
        setShowKeteranganDialog(true);
        setKeterangan('');
        useApprovalDialog.setState({ open: false });
      } else if (
        item.keterangan_wajib_isi === 'TIDAK' &&
        item.tanggal_wajib_isi === 'YA'
      ) {
        if (mode === 'APPROVAL') {
          setSelectedItem(item);
          setShowTanggalDialog(true);
          setTanggal('');
          useApprovalDialog.setState({ open: false });
        } else {
          setSelectedItem(item);
          setShowTanggalDialog(false);
          setTanggal('');
          useApprovalDialog.setState({ open: false });
          onSubmitWithDate(item, '');
        }
      } else {
        // Langsung submit tanpa dialog keterangan
        onSubmit(item, '');
      }
    } catch (error) {
      dispatch(setProcessed());
      console.error('Error checking approval:', error);
      alert({
        title: 'Terjadi kesalahan saat validasi data. Silakan coba lagi.',
        variant: 'danger',
        submitText: 'OK'
      });
    }
  };
  // Modifikasi handleKeteranganSubmit untuk re-open dialog jika perlu
  const handleKeteranganSubmit = () => {
    if (!keterangan.trim()) {
      setShowErrorKeterangan(true);
      return;
    }
    setShowKeteranganDialog(false);
    onSubmit(selectedItem, keterangan);
    setKeterangan('');
    setSelectedItem(null);
  };
  const handleTanggalSubmit = () => {
    if (!tanggal.trim()) {
      setShowErrorKeterangan(true);
      return;
    }
    setShowTanggalDialog(false);
    onSubmitWithDate(selectedItem, tanggal);
    setTanggal('');
    setSelectedItem(null);
  };

  const onSubmit = async (item: any, keteranganValue: string) => {
    if (mode === 'APPROVAL') {
      const payload = {
        tableName: item.subgrp,
        id: item.id,
        transaksi_id: Array.from(checkedRows || []),
        value: item.nilai_ya,
        text: item.text,
        keterangan:
          keteranganValue?.toUpperCase() || item.keterangan?.toUpperCase() || ''
      };
      try {
        dispatch(setProcessing());
        const res = await approvalFn(payload);

        if (res.status === 400) {
          alert({
            title: res.message,
            variant: 'danger',
            submitText: 'OK'
          });
          closeDialog();
        } else {
          // queryClient.invalidateQueries({ queryKey: ['jurnalumum'] });
          useApprovalDialog.setState({ successApproved: true });
          closeDialog();
        }
      } catch (error) {
        alert({
          title: 'Terjadi Kesalahan saat memproses, coba lagi beberapa saat',
          variant: 'danger',
          submitText: 'OK'
        });
        closeDialog();
      } finally {
        dispatch(setProcessed());
        closeDialog();
      }
    } else {
      const payload = {
        tableName: item.subgrp,
        id: item.id,
        transaksi_id: Array.from(checkedRows || []),
        value: item.nilai_tidak,
        text: item.text,
        keterangan:
          keteranganValue?.toUpperCase() || item.keterangan?.toUpperCase() || ''
      };
      try {
        dispatch(setProcessing());
        const res = await nonApprovalFn(payload);

        if (res.status === 400) {
          alert({
            title: res.message,
            variant: 'danger',
            submitText: 'OK'
          });
        } else {
          queryClient.invalidateQueries({
            predicate: () => true
          });
          useApprovalDialog.setState({ successApproved: true });
          closeDialog();
        }
      } catch (error) {
        alert({
          title: 'Terjadi Kesalahan saat memproses, coba lagi beberapa saat',
          variant: 'danger',
          submitText: 'OK'
        });
      } finally {
        dispatch(setProcessed());
      }
    }
  };

  const onSubmitWithDate = async (item: any, tgl: string) => {
    if (mode === 'APPROVAL') {
      const payload = {
        tableName: item.subgrp,
        id: item.id,
        transaksi_id: Array.from(checkedRows || []),
        value: item.nilai_ya,
        text: item.text,
        tanggal: tgl ? tgl : '',
        mode: mode,
        jenisorder_id: headerData?.jenisorder_id,
        marketing_id: headerData?.marketing_id,
        tujuankapal_id: headerData?.tujuankapal_id,
        bookingheader_id: headerData?.header_id,
        booking_id: headerData?.id
      };
      try {
        dispatch(setProcessing());
        const res = await approvalFn(payload, urlApproval);

        if (res.status === 400) {
          alert({
            title: res.message,
            variant: 'danger',
            submitText: 'OK'
          });
          closeDialog();
        } else {
          useApprovalDialog.setState({ successApproved: true });
          closeDialog();
        }
      } catch (error) {
        alert({
          title: 'Terjadi Kesalahan saat memproses, coba lagi beberapa saat',
          variant: 'danger',
          submitText: 'OK'
        });
        closeDialog();
      } finally {
        dispatch(setProcessed());
        closeDialog();
      }
    } else {
      const payload = {
        tableName: item.subgrp,
        id: item.id,
        transaksi_id: Array.from(checkedRows || []),
        value: item.nilai_tidak,
        text: item.text,
        tanggal: tgl ? tgl : '',
        mode: mode,
        jenisorder_id: headerData?.jenisorder_id,
        orderan_nobukti: headerData?.orderan_nobukti
      };
      try {
        dispatch(setProcessing());
        const res = await nonApprovalFn(payload, urlApproval);

        if (res.status === 400) {
          alert({
            title: res.message,
            variant: 'danger',
            submitText: 'OK'
          });
        } else {
          queryClient.invalidateQueries({
            predicate: () => true
          });
          closeDialog();
        }
      } catch (error) {
        alert({
          title: 'Terjadi Kesalahan saat memproses, coba lagi beberapa saat',
          variant: 'danger',
          submitText: 'OK'
        });
      } finally {
        dispatch(setProcessed());
      }
    }
  };

  const fetchData = async () => {
    dispatch(setProcessing());
    try {
      const data = await getParameterApprovalFn({
        filters: { grp: 'DATA PENDUKUNG', subgrp: formattedModule }
      });
      const res = await getPermissionFn(String(id));

      if (res?.abilities) {
        if (mode === 'APPROVAL') {
          const filteredPermission = res.abilities.filter((item: any) =>
            item.action.includes('-> YA')
          );
          // Bandingkan sebagai teks: acos.id sekarang UUIDv7, dan Number(uuid)
          // menghasilkan NaN di kedua sisi — sedangkan NaN === NaN selalu
          // false, jadi tidak ada satu pun baris yang lolos dan dialog
          // approval tampil kosong.
          const filteredData = data.data.filter((item: any) =>
            filteredPermission.some(
              (filteredItem: any) =>
                filteredItem.subject === item.subgrp &&
                String(filteredItem.id) === String(item.role_ya)
            )
          );
          setDataParameter(filteredData);
        } else {
          const filteredPermission = res.abilities.filter((item: any) =>
            item.action.includes('-> TIDAK')
          );
          // Sama seperti cabang APPROVAL: bandingkan sebagai teks.
          const filteredData = data.data.filter((item: any) =>
            filteredPermission.some(
              (filteredItem: any) =>
                String(filteredItem.id) === String(item.role_tidak)
            )
          );
          setDataParameter(filteredData);
        }
      }
    } catch (error) {
      dispatch(setProcessed());
      console.error('Error fetching data:', error);
      alert({
        title: 'Terjadi kesalahan saat memproses, coba lagi beberapa saat',
        variant: 'danger',
        submitText: 'OK'
      });
    } finally {
      dispatch(setProcessed());
    }
  };
  useEffect(() => {
    if (formattedModule) {
      fetchData();
    }
  }, [formattedModule, mode, id]);
  useDisableBodyScroll(open || showKeteranganDialog);
  useEffect(() => {
    if (keterangan) {
      setShowErrorKeterangan(false);
    }
  }, [keterangan]);
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeDialog(); // Reset the mode to empty
        setShowErrorKeterangan(false);
        setShowKeteranganDialog(false);
        setSelectedItem(null);
        setKeterangan('');
        setTanggal('');
      }
    };

    // Add event listener for keydown when the component is mounted
    document.addEventListener('keydown', handleEscape);

    // Cleanup event listener when the component is unmounted or the effect is re-run
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);
  return (
    <>
      {open && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget && !showKeteranganDialog) {
              closeDialog();
            }
          }}
          className="fixed inset-0 z-50 flex items-center justify-center border-border bg-gray-500 bg-opacity-50 p-4"
        >
          <div
            className="max-h-[500px] min-h-[100px] w-full max-w-[400px] rounded bg-background-grid-header shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex h-[38px] w-full flex-row items-center justify-between rounded-t-sm border-b border-border px-2">
              <p className="text-sm font-semibold">{mode}</p>
              <div
                className="cursor-pointer rounded-md border border-border bg-red-500 p-0 hover:bg-red-400"
                onClick={closeDialog}
              >
                <IoMdClose className="h-5 w-5 font-bold text-white" />
              </div>
            </div>
            <div className="flex h-fit max-h-[500px] w-full overflow-hidden bg-background px-5 py-5">
              <div className="flex h-fit max-h-[450px] w-full flex-col gap-1 overflow-y-auto bg-background">
                {dataParameter.map((item: any, index: any) => (
                  <Button
                    key={index}
                    className="w-full gap-1 py-2"
                    onClick={() => handleButtonClick(item)}
                    style={{
                      backgroundColor: item.warna
                    }}
                  >
                    <Icons name={item.icon} />
                    <p
                      className="text-sm font-semibold"
                      style={{ color: item.warna_tulisan }}
                    >
                      {item.memo_nama}
                    </p>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showKeteranganDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center border-blue-500 bg-gray-500 bg-opacity-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowKeteranganDialog(false);
              setSelectedItem(null);
              setShowErrorKeterangan(false);
              setKeterangan('');
            }
          }}
        >
          <div
            className="max-h-[500px] min-h-[100px] w-full max-w-[400px] rounded bg-white shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex h-[38px] w-full flex-row items-center justify-between rounded-t-sm border-b border-blue-500 px-2"
              style={{
                background:
                  'linear-gradient(to bottom, #eff5ff 0%, #e0ecff 100%)'
              }}
            >
              <p className="text-sm font-semibold text-zinc-800">{mode}</p>
              <div
                className="cursor-pointer rounded-md border border-zinc-200 bg-red-500 p-0 hover:bg-red-400"
                onClick={() => {
                  setShowKeteranganDialog(false);
                  setSelectedItem(null);
                  setKeterangan('');
                  setShowErrorKeterangan(false);
                }}
              >
                <IoMdClose className="h-5 w-5 font-bold text-white" />
              </div>
            </div>
            <div className="mb-4 p-4">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Keterangan <span className="text-red-500">*</span>
              </label>
              <Textarea
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                className="h-24 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Masukkan keterangan..."
                autoFocus
              />
              {showErrorKeterangan ? (
                <p className="text-[0.8rem] text-destructive">
                  KETERANGAN WAJIB DIISI
                </p>
              ) : null}
            </div>

            <div className="flex justify-end gap-2 p-4">
              <Button
                variant="outline"
                className="flex w-fit items-center gap-1 bg-zinc-500 text-sm text-white hover:bg-zinc-400"
                onClick={() => {
                  setShowKeteranganDialog(false);
                  setSelectedItem(null);
                  setKeterangan('');
                  setShowErrorKeterangan(false);
                }}
              >
                <IoMdClose /> <p className="text-center text-white">Cancel</p>
              </Button>
              <Button
                type="submit"
                onClick={handleKeteranganSubmit}
                className="flex w-fit items-center gap-1 text-sm"
              >
                <FaSave />
                <p className="text-center">SUBMIT</p>
              </Button>
            </div>
          </div>
        </div>
      )}

      {showTanggalDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center border-border bg-gray-500 bg-opacity-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowTanggalDialog(false);
              setSelectedItem(null);
              setShowErrorKeterangan(false);
              setTanggal('');
            }
          }}
        >
          <div
            className="max-h-[500px] min-h-[100px] w-full max-w-[400px] rounded bg-background-grid-header shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex h-[38px] w-full flex-row items-center justify-between rounded-t-sm border-b border-border px-2"
              // style={{
              //   background:
              //     'linear-gradient(to bottom, #eff5ff 0%, #e0ecff 100%)'
              // }}
            >
              <p className="text-sm font-semibold">{mode}</p>
              <div
                className="cursor-pointer rounded-md border border-border bg-red-500 p-0 hover:bg-red-400"
                onClick={() => {
                  setShowTanggalDialog(false);
                  setSelectedItem(null);
                  setTanggal('');
                  setShowErrorKeterangan(false);
                }}
              >
                <IoMdClose className="h-5 w-5 font-bold text-white" />
              </div>
            </div>
            <div className="bg-background p-4">
              <label className="mb-2 block text-sm font-medium">
                Tanggal Approval <span className="text-red-500">*</span>
              </label>
              {/* <Textarea
                value={keterangan}
                onChange={(e) => setTanggal(e.target.value)}
                className="h-24 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Masukkan keterangan..."
                autoFocus
              /> */}
              <InputDatePicker
                // Sisa dari <Textarea> keterangan yang dikomentari di atas:
                // value-nya masih menunjuk ke state `keterangan`, padahal
                // yang diisi onSelect/onChange adalah `tanggal`. InputDatePicker
                // controlled penuh, jadi tanggal yang dipilih tersimpan di
                // state tapi input tetap tampil kosong.
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                showCalendar={true}
                onSelect={(date) => {
                  setTanggal(String(date));
                  setShowErrorKeterangan(false);
                }}
              />
              {showErrorKeterangan ? (
                <p className="bg-background text-[0.8rem] text-destructive">
                  TANGGAL WAJIB DIISI
                </p>
              ) : null}
            </div>

            <div className="flex justify-end gap-2 bg-background p-4">
              <Button
                variant="cancel"
                onClick={() => {
                  setShowTanggalDialog(false);
                  setSelectedItem(null);
                  setTanggal('');
                  setShowErrorKeterangan(false);
                }}
              >
                <p className="text-center">Cancel</p>
              </Button>
              <Button
                type="submit"
                onClick={handleTanggalSubmit}
                className="flex w-fit items-center gap-1 text-sm"
              >
                <FaSave />
                <p className="text-center">SUBMIT</p>
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DialogApproval;
