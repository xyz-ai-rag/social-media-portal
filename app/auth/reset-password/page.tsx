import { Metadata } from "next";
import ResetPasswordPage from "@/components/auth/ResetPassword";

export const metadata: Metadata = {
  title: "Reset Password | Hyprdata Client Portal",
  description: "Set a new password for your Hyprdata client portal account",
};

export default function Page() {
  return <ResetPasswordPage />;
}