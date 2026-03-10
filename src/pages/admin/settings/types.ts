export interface SettingsTabProps {
  error: string;
  setError: (msg: string) => void;
  success: string;
  setSuccess: (msg: string) => void;
  loading: string | null;
  setLoading: (val: string | null) => void;
}
