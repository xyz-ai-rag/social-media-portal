import { Metadata } from "next";
import ForgotPasswordPage from "@/components/auth/ForgotPassword";

export const metadata: Metadata = {
  title: "Forgot Password | Hyprdata Client Portal",
  description: "Reset your password for the Hyprdata client portal",
};

export default function Page() {
  return <ForgotPasswordPage />;
}