'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useDispatch, useSelector } from 'react-redux';
import { hydrateSession, User } from '@/lib/store/authSlice/authSlice';
import { RootState } from '@/lib/store/store';

/**
 * Menyalin session NextAuth ke redux `auth`.
 *
 * Sebelumnya pengisian itu HANYA ada di halaman login, dan halaman login yang
 * aktif (SignInViewPage) memang tidak pernah men-dispatch-nya — hanya varian
 * signin-view2 / sigin-view yang tidak dipakai. Akibatnya `auth.user.id` tetap
 * '' sepanjang sesi: saveGridConfig mengirim userId '' dan ditolak 400
 * "Invalid input" (susunan & lebar kolom grid tidak pernah tersimpan), dan
 * loadGridConfig — yang dipagari `if (user?.id)` — tidak pernah jalan.
 *
 * Dipasang di Providers (di dalam SessionProvider) supaya juga menutup kasus
 * cookie session masih hidup sementara localStorage redux-persist sudah hilang.
 */
export default function AuthSessionSync() {
  const dispatch = useDispatch();
  const { data: session } = useSession();
  const userId = useSelector((state: RootState) => state.auth.user?.id);
  const token = useSelector((state: RootState) => state.auth.token);

  useEffect(() => {
    if (!session?.user?.id) return;
    // Providers ter-mount dua kali (root + dashboard layout) dan session di-
    // refetch sendiri oleh next-auth; dispatch hanya saat nilainya beda supaya
    // tidak ada rerender beruntun.
    if (session.user.id === userId && (session.token ?? null) === token) return;

    dispatch(
      hydrateSession({
        user: session.user as User,
        id: session.user.id ?? null,
        token: session.token ?? null,
        refreshToken: session.refreshToken ?? null,
        cabang_id: session.cabang_id ?? null,
        accessTokenExpires: session.accessTokenExpires ?? undefined
      })
    );
  }, [session, userId, token, dispatch]);

  return null;
}
