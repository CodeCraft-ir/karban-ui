export type RegistrationRole = "client" | "specialist";

export interface AccountSummary {
  id: number;
  displayName: string;
  role: RegistrationRole | null;
}
