import InvestmentDetail from "@/components/InvestmentDetail";

export default async function InvestmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <InvestmentDetail investmentId={id} />;
}
