import { redirect } from "next/navigation";

export default function SelectRolePage() {
  // Role intent is selected before OTP issuance; this legacy route cannot alter it.
  redirect("/auth/login");
}
