'use client';
import { Metadata } from 'next';
import { Input } from '@/components/ui/input';
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
import { getSession, signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { LoginInput, loginValidation } from '@/lib/validations/auth.validation';
import { Button } from '@/components/ui/button';
import { setCredentials, User } from '@/lib/store/authSlice/authSlice';
import IcTasSmall from '@/public/image/IcTas-Small.png';
import { useDispatch } from 'react-redux';
import Image from 'next/image';
import { FaUser, FaEye, FaEyeSlash } from 'react-icons/fa';
import { useLottie } from 'lottie-react';
import LoginAnimation from '@/public/image/lottie/login.json';
import { storeEmailVerificationFn } from '@/lib/apis/auth.api';
import { useAlert } from '@/lib/store/client/useAlert';
import {
  setLoaded,
  setLoading,
  setProcessed,
  setProcessing
} from '@/lib/store/loadingSlice/loadingSlice';
import { truncateSync } from 'fs';
import { setMenuData } from '@/lib/store/menuSlice/menuSlice';
import { api2 } from '@/lib/utils/AxiosInstance';
import { useFormFocusNavigation } from '@/hooks/use-form-focus-navigation';
export const metadata: Metadata = {
  title: 'Authentication',
  description: 'Authentication forms built using the components.'
};

export default function SignInViewPage() {
  const { toast } = useToast();
  const dispatch = useDispatch();
  const { data: session } = useSession();
  const { alert } = useAlert();
  const router = useRouter();
  const [loadings, setLoadings] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [pageLoadTime, setPageLoadTime] = useState<number | null>(2000);
  const forms = useForm<LoginInput>({
    resolver: zodResolver(loginValidation),
    mode: 'onTouched',
    defaultValues: {
      username: '',
      password: ''
    }
  });
  const onSubmitResetPassword = async () => {
    setLoadings(true);
    dispatch(setProcessing());
    const value = forms.getValues('username');
    try {
      const res = await storeEmailVerificationFn({ username: value ?? '' });
      if (res.status === 200 || res.status === 201) {
        alert({
          title: res?.data.message,
          variant: 'success',
          submitText: 'OK'
        });
      } else {
        const errorMessage =
          res.data?.message || 'Terjadi kesalahan, silakan coba lagi.';
        alert({
          title: errorMessage,
          variant: 'danger',
          submitText: 'OK'
        });
      }
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        'Terjadi kesalahan saat mereset password. Mohon coba lagi.';

      alert({
        title: errorMessage,
        variant: 'danger',
        submitText: 'OK'
      });
    } finally {
      setLoadings(false);
      dispatch(setProcessed());
    }
  };
  const onSubmit = async (values: LoginInput) => {
    setLoadings(true);
    dispatch(setProcessing());
    try {
      if (!values.username && !values.password) {
        alert({
          title: 'USERNAME DAN PASSWORD WAJIB DIISI',
          variant: 'danger',
          submitText: 'OK'
        });
        return;
      } else {
        if (!values.username) {
          alert({
            title: 'USERNAME WAJIB DIISI',
            variant: 'danger',
            submitText: 'OK'
          });
          return;
        }
        if (!values.password) {
          alert({
            title: 'PASSWORD WAJIB DIISI',
            variant: 'danger',
            submitText: 'OK'
          });
          return;
        }
      }

      const result = await signIn('credentials', {
        redirect: false,
        username: values.username,
        password: values.password
      });

      setLoadings(false);

      if (result?.error) {
        alert({
          title: result.error,
          variant: 'danger',
          submitText: 'OK'
        });
      } else {
        // Ambil session setelah login berhasil
        const session = await getSession();

        if (session?.user.id) {
          // Simpan kredensial ke Redux. Tanpa ini `state.auth` tidak pernah
          // terisi (setCredentials sudah di-import tapi belum pernah
          // dipanggil), sehingga `state.auth.id` selalu null — dan semua
          // komponen yang membacanya berhenti bekerja: ActionButton tidak
          // pernah mengambil permission sehingga tombol APPROVAL tidak
          // muncul, begitu juga hasPermission, DialogApproval, DialogLainnya,
          // dan ubah-password.
          dispatch(
            setCredentials({
              user: (session.user as User) ?? null,
              id: session.user.id ?? null,
              token: session.token ?? null,
              refreshToken: session.refreshToken ?? null,
              cabang_id: session.cabang_id ?? null,
              accessTokenExpires: session?.accessTokenExpires ?? undefined,
              autoLogoutExpires: Date.now()
            })
          );

          // Pre-fetch menu data dan simpan ke Redux
          try {
            const menuResponse = await api2.get(
              `/menu/sidebar?userId=${session.user.id}`
            );
            dispatch(setMenuData(menuResponse.data));
          } catch (error) {
            // Non-fatal: login already succeeded. The menu sidebar is
            // re-fetched on the dashboard, so a failure here (e.g. backend
            // unreachable) must not block the redirect or surface a red
            // Console Error overlay in dev. Log as a warning instead.
            console.warn('Failed to pre-fetch menu data:', error);
          }

          // Redirect ke dashboard
          router.replace('/dashboard');
        } else {
          router.push('/auth/signin');
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      dispatch(setProcessed());
      setLoadings(false);
    }
  };

  const options = {
    animationData: LoginAnimation,
    loop: true
  };

  const { View } = useLottie(options);

  useEffect(() => {
    const navigationEntries = performance.getEntriesByType('navigation');
    if (navigationEntries.length > 0) {
      const navigation = navigationEntries[0] as PerformanceNavigationTiming;
      const loadDuration = navigation.loadEventEnd - navigation.startTime;
      setPageLoadTime(loadDuration);
    } else {
      // Fallback untuk browser lama
      const timing = performance.timing;
      const loadDuration = timing.loadEventEnd - timing.navigationStart;
      setPageLoadTime(loadDuration);
    }
  }, []);
  const formRef = useRef<HTMLFormElement | null>(null); // Ref untuk form
  useFormFocusNavigation(formRef);

  return (
    <div
      className="relative flex max-h-screen min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-background-header"
      style={{
        maxHeight: '100vh', // Full screen height
        width: '100%' // Full width
      }}
    >
      <div className="flex w-full items-end justify-center">
        <div className="mb-5 flex flex-col items-center gap-2">
          <Image src={IcTasSmall} alt="icon tas" width={150} height={150} />
          <p className="text-header text-lg font-semibold tracking-wider">
            PT. TRANSPORINDO AGUNG SEJAHTERA
          </p>
          <p className="text-header text-base font-semibold tracking-wider text-red-500">
            TAS EMKL SYSTEM
          </p>
        </div>
      </div>

      <div className="3xl:w-[25%] mb-5 h-fit w-[95%] lg:h-fit lg:w-[40%] xl:w-[35%] 2xl:w-[27%]">
        <div className="flex h-full w-full flex-col items-center justify-between bg-background-card shadow-xl">
          <div className="w-full border border-border bg-background-form-header px-3 py-1">
            <h2 className="text-primary-text text-base">LOGIN</h2>
          </div>

          <div className="flex h-full w-full flex-row items-center justify-between px-4">
            <div className="hidden h-full w-[40%] lg:block">{View}</div>
            <div className="flex h-full w-full flex-col justify-center py-4 lg:w-[60%]">
              <Form {...forms}>
                <form
                  ref={formRef}
                  onSubmit={forms.handleSubmit(onSubmit)}
                  className="flex flex-col gap-2"
                >
                  <div className="flex flex-col gap-2">
                    {/* Username Field */}
                    <FormField
                      name="username"
                      control={forms.control}
                      render={({ field }) => (
                        <FormItem className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                          <FormLabel className="font-semibold lg:w-[15%]">
                            Username
                          </FormLabel>
                          <div className="flex flex-col lg:w-[70%]">
                            <FormControl>
                              <div className="flex flex-1 flex-row rounded-[3px] border border-input-border bg-background-input focus-within:border-input-border-focus focus-within:bg-background-input-focus">
                                <Input
                                  {...field}
                                  autoFocus
                                  value={field.value ?? ''}
                                  type="text"
                                  className="w-full rounded-[5px] border-none p-0 pl-2 text-sm placeholder:text-xs focus:outline-none focus:ring-0 focus-visible:ring-0"
                                />
                                <div className="flex w-10 items-center justify-center rounded-br-[3px] rounded-tr-[3px] bg-gray-200 text-gray-600">
                                  <FaUser />
                                </div>
                              </div>
                            </FormControl>
                          </div>
                        </FormItem>
                      )}
                    />

                    {/* Password Field */}
                    <FormField
                      name="password"
                      control={forms.control}
                      render={({ field }) => (
                        <FormItem className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                          <FormLabel className="font-semibold lg:w-[15%]">
                            Password
                          </FormLabel>
                          <div className="flex flex-col lg:w-[70%]">
                            <FormControl>
                              <div className="flex flex-1 flex-row rounded-[3px] border border-input-border bg-background-input focus-within:border-input-border-focus focus-within:bg-background-input-focus">
                                <input
                                  {...field}
                                  value={field.value ?? ''}
                                  type={showPassword ? 'text' : 'password'}
                                  className="h-9 w-full rounded-[5px] border-none bg-background-input p-0 pl-2 text-sm focus:bg-background-input-focus focus:outline-none focus:ring-0 focus-visible:ring-0"
                                />
                                <div
                                  onClick={() => setShowPassword(!showPassword)}
                                  className="flex w-10 cursor-pointer items-center justify-center rounded-br-[3px] rounded-tr-[3px] bg-gray-200 text-gray-600"
                                >
                                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                                </div>
                              </div>
                            </FormControl>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="mt-2 w-fit justify-end px-10 text-white"
                  >
                    Login
                  </Button>
                  <div className="mt-2 text-xs text-gray-600">
                    <p
                      onClick={onSubmitResetPassword}
                      className="cursor-pointer text-blue-600 hover:underline"
                    >
                      RESET PASSWORD
                    </p>
                  </div>
                </form>
              </Form>
            </div>
          </div>
        </div>
      </div>
      {pageLoadTime ? (
        <p className="text-primary-text mt-1">
          Halaman ini dimuat dalam{' '}
          <span className="font-semibold">
            {(pageLoadTime / 1000).toFixed(2)}
          </span>{' '}
          detik
        </p>
      ) : (
        <p className="text-primary-text mt-1">
          Halaman ini dimuat dalam <span className="font-semibold">0.2</span>{' '}
          detik
        </p>
      )}
      <p className="text-primary-text">
        Copyright &#169; {new Date().getFullYear()}
      </p>
    </div>
  );
}
