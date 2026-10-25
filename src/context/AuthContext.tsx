import { findDepartmentByName } from '../data/departments';
import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import type { UserProfile, UserRole } from '../types';
import {
  MOCK_REGISTERED_PATIENT,
  MOCK_STAFF_USER,
  createMockGuestUser,
} from '../data/mockUserData';

export function deriveNameFromEmail(email?: string): string {
  if (!email) return 'Registered Patient';
  const localPart = email.split('@')[0];
  if (!localPart) return 'Registered Patient';
  const cleaned = localPart
    .replace(/[0-9]+/g, ' ')
    .replace(/[._-]+/g, ' ')
    .trim();
  if (!cleaned) return 'Registered Patient';
  const words = cleaned
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  return words.length > 0 ? words.join(' ') : 'Registered Patient';
}

interface AuthContextValue {
  user: UserProfile | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  loginAsDemoPatient: (
    phone: string,
    email?: string,
    name?: string
  ) => UserProfile;
  loginAsGuest: () => UserProfile;
  loginAsStaff: (staffId: string, password?: string) => Promise<boolean>;
  logout: () => void;
  updateUserProfile: (updates: Partial<UserProfile>) => void;
  getDisplayName: (customUser?: UserProfile | null) => string;
}

const STORAGE_KEY = 'vd-auth-user';

function loadStoredUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const profile = JSON.parse(raw) as UserProfile;
    return {
      ...profile,
      visits: profile.visits?.map((visit) => {
        const dept = findDepartmentByName(
          visit.departmentName,
          visit.doctorName
        );
        return dept
          ? {
              ...visit,
              departmentName: dept.name,
              doctorName: dept.doctorName || visit.doctorName,
            }
          : visit;
      }),
    };
  } catch {
    return null;
  }
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(loadStoredUser);

  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [user]);

  const updateUserProfile = (updates: Partial<UserProfile>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      return updated;
    });
  };

  // Demo sign-in creates a local profile, without verifying contact details.
  const loginAsDemoPatient = (
    phone: string,
    email?: string,
    name?: string
  ): UserProfile => {
    const normalizedPhone = phone.replace(/\D/g, '');
    const normalizedEmail = email?.trim().toLowerCase() || undefined;
    const existingPatient =
      user?.role === 'registered' && user.phone === normalizedPhone
        ? user
        : normalizedPhone === MOCK_REGISTERED_PATIENT.phone
          ? MOCK_REGISTERED_PATIENT
          : undefined;

    const cleanName =
      name?.trim() ||
      existingPatient?.name ||
      deriveNameFromEmail(normalizedEmail) ||
      'Registered Patient';

    const registeredUser: UserProfile = {
      ...existingPatient,
      id: existingPatient?.id || `demo-pat-${normalizedPhone}`,
      name: cleanName,
      phone: normalizedPhone,
      email: normalizedEmail,
      emailVerified: false,
      role: 'registered',
      isGuest: false,
      visits: existingPatient?.visits || [],
      reports: existingPatient?.reports || [],
    };

    setUser(registeredUser);
    return registeredUser;
  };

  const loginAsGuest = (): UserProfile => {
    const guestUser = createMockGuestUser();
    setUser(guestUser);
    return guestUser;
  };

  const loginAsStaff = async (
    staffId: string,
    _password?: string
  ): Promise<boolean> => {
    await new Promise((resolve) => setTimeout(resolve, 350));
    const staffUser: UserProfile = {
      ...MOCK_STAFF_USER,
      staffId: staffId || MOCK_STAFF_USER.staffId,
    };
    setUser(staffUser);
    return true;
  };

  const logout = () => {
    setUser(null);
  };

  const getDisplayName = (customUser?: UserProfile | null): string => {
    const target = customUser !== undefined ? customUser : user;
    if (!target) return 'Not signed in';
    return target.isGuest ? `${target.name} (Guest)` : target.name;
  };

  const value: AuthContextValue = {
    user,
    role: user?.role ?? null,
    isAuthenticated: !!user,
    isGuest: !!user?.isGuest,
    loginAsDemoPatient,
    loginAsGuest,
    loginAsStaff,
    logout,
    updateUserProfile,
    getDisplayName,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
