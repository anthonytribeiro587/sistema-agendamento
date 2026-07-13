import type { ReactNode } from "react";
import AdminCalendarMondayFirst from "@/components/AdminCalendarMondayFirst";

type AdminLayoutProps = {
  children: ReactNode;
};

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <>
      <AdminCalendarMondayFirst />
      {children}
    </>
  );
}
