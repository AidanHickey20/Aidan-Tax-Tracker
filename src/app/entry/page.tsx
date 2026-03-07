import { Suspense } from "react";
import WeeklyEntryForm from "@/components/WeeklyEntryForm";

export default function EntryPage() {
  return (
    <Suspense fallback={<div className="text-slate-400">Loading form...</div>}>
      <WeeklyEntryForm />
    </Suspense>
  );
}
