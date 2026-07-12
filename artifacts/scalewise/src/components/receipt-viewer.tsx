import { useRef } from "react";
import { Button } from "@/components/ui/button";

const C = { blue: "#6395EE", mblue: "#90B8D6", green: "#88CFA8", mint: "#85DECB" };
const VAT_RATE = 0.16;

function fmtKES(n: number) {
  return `KES ${n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtDate(s: string | null | undefined) {
  if (!s) return "—";
  return new Date(s).toLocaleString("en-KE", {
    timeZone: "Africa/Nairobi", day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}
function fmtDateOnly(s: string | null | undefined) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-KE", {
    timeZone: "Africa/Nairobi", day: "2-digit", month: "long", year: "numeric",
  });
}

const SESSION_LABELS: Record<string, string> = {
  discovery: "Business Discovery",
  consultancy: "Consultancy",
  growth_3mo: "Growth Strategy (3 Months)",
  growth_6mo: "Growth Strategy (6 Months)",
};

// ── Shared receipt header ────────────────────────────────────────────────────
function ReceiptHeader({ receiptNumber, issuedAt }: { receiptNumber: string; issuedAt: string }) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b-2" style={{ borderColor: C.blue }}>
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-md"
          style={{ background: `linear-gradient(135deg, ${C.blue}, ${C.mint})` }}>S</div>
        <div>
          <div className="text-2xl font-bold" style={{ color: C.blue }}>ScaleWise</div>
          <div className="text-xs text-muted-foreground">Expert Marketplace</div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Receipt</div>
        <div className="font-mono font-bold text-lg" style={{ color: C.blue }}>{receiptNumber}</div>
        <div className="text-xs text-muted-foreground mt-1">{fmtDate(issuedAt)}</div>
      </div>
    </div>
  );
}

function ReceiptFooter() {
  return (
    <div className="mt-8 pt-4 border-t text-center text-xs text-muted-foreground space-y-1">
      <p className="font-semibold" style={{ color: C.blue }}>ScaleWise — Expert Marketplace</p>
      <p>hello@scalewise.co.ke · +254707346331 · Nairobi, Kenya</p>
      <p className="mt-2">This is an official payment receipt. Please retain for your records.</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-1.5 text-sm border-b border-dashed border-muted last:border-0">
      <span className="text-muted-foreground font-medium">{label}</span>
      <span className="font-semibold text-right max-w-[60%]">{value}</span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs font-bold uppercase tracking-widest mt-6 mb-2 pb-1 border-b"
      style={{ color: C.blue, borderColor: C.blue + "40" }}>{children}</div>
  );
}

// ── CLIENT BOOKING RECEIPT ───────────────────────────────────────────────────
export function ClientBookingReceiptView({ data }: { data: any }) {
  const b = data.booking;
  return (
    <div className="space-y-2">
      <div className="rounded-xl p-3 text-sm font-semibold text-center"
        style={{ backgroundColor: C.blue + "15", color: C.blue }}>
        Payment Confirmation
      </div>
      <SectionTitle>Billed To</SectionTitle>
      <InfoRow label="Name" value={data.client.name} />
      <InfoRow label="Email" value={data.client.email} />

      <SectionTitle>Session Details</SectionTitle>
      <InfoRow label="Session Type" value={SESSION_LABELS[b.sessionType] ?? b.sessionType} />
      <InfoRow label="Expert" value={b.expertName} />
      <InfoRow label="Industry" value={b.expertIndustry} />
      <InfoRow label="Duration" value={`${b.durationMinutes} minutes`} />
      <InfoRow label="Booked On" value={fmtDate(b.bookedOn)} />
      <InfoRow label="Scheduled Date & Time" value={<span className="font-bold" style={{ color: C.blue }}>{fmtDate(b.scheduledTime)}</span>} />
      {b.rescheduledAt && (
        <>
          <InfoRow label="Rescheduled On" value={fmtDate(b.rescheduledAt)} />
          <InfoRow label="Original Time" value={fmtDate(b.rescheduledFromTime)} />
          <InfoRow label="Rescheduled By" value={b.rescheduledBy} />
        </>
      )}
      <InfoRow label="Status" value={<span className="capitalize px-2 py-0.5 rounded-full text-xs font-bold"
        style={{ backgroundColor: C.green + "30", color: "#1a5730" }}>{b.status}</span>} />

      <SectionTitle>Payment</SectionTitle>
      <div className="flex justify-between items-center py-3 px-4 rounded-xl text-lg font-bold"
        style={{ backgroundColor: C.blue + "15" }}>
        <span style={{ color: C.blue }}>Amount Paid</span>
        <span style={{ color: C.blue }}>{fmtKES(b.amount)}</span>
      </div>
      <p className="text-xs text-muted-foreground px-1">Payment processed via M-Pesa</p>
    </div>
  );
}

// ── CLIENT REFUND RECEIPT ────────────────────────────────────────────────────
export function ClientRefundReceiptView({ data }: { data: any }) {
  const b = data.booking;
  return (
    <div className="space-y-2">
      <div className="rounded-xl p-3 text-sm font-semibold text-center"
        style={{ backgroundColor: "#fef3c7", color: "#92400e" }}>
        Refund Receipt
      </div>

      <SectionTitle>Refunded To</SectionTitle>
      <InfoRow label="Name" value={data.client.name} />
      <InfoRow label="Email" value={data.client.email} />

      <SectionTitle>Cancelled Session</SectionTitle>
      <InfoRow label="Session Type" value={SESSION_LABELS[b.sessionType] ?? b.sessionType} />
      <InfoRow label="Expert" value={b.expertName} />
      <InfoRow label="Booked On" value={fmtDate(b.bookedOn)} />
      <InfoRow label="Was Scheduled For" value={<span className="font-bold">{fmtDate(b.scheduledTime)}</span>} />
      <InfoRow label="Cancelled By" value={<span className="capitalize font-semibold text-red-700">{b.cancelledBy ?? "—"}</span>} />
      <InfoRow label="Session Status" value={<span className="capitalize px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">{b.status}</span>} />

      <SectionTitle>Refund Breakdown</SectionTitle>
      <InfoRow label="Original Amount Paid" value={fmtKES(b.originalAmount)} />
      <InfoRow label="Refund Policy Applied" value={`${b.refundPercent}% refund`} />
      <div className="flex justify-between items-center py-3 px-4 rounded-xl text-lg font-bold mt-2"
        style={{ backgroundColor: "#d1fae5" }}>
        <span className="text-green-800">Amount Refunded</span>
        <span className="text-green-800">{fmtKES(b.refundAmount)}</span>
      </div>
      <InfoRow label="Refund Paid On" value={<span className="font-bold text-green-700">{fmtDate(b.refundPaidAt)}</span>} />
      <p className="text-xs text-muted-foreground px-1">No VAT applies on client refunds.</p>
    </div>
  );
}

// ── EXPERT PAYOUT RECEIPT ────────────────────────────────────────────────────
export function ExpertPayoutReceiptView({ data }: { data: any }) {
  return (
    <div className="space-y-2">
      <div className="rounded-xl p-3 text-sm font-semibold text-center"
        style={{ backgroundColor: C.mint + "30", color: "#0f7a6a" }}>
        Expert Payout Receipt
      </div>

      <SectionTitle>Paid To</SectionTitle>
      <InfoRow label="Expert Name" value={data.expert.name} />
      <InfoRow label="Email" value={data.expert.email} />
      <InfoRow label="Industry" value={data.expert.industry} />

      <SectionTitle>Payout Period</SectionTitle>
      <InfoRow label="Period From" value={fmtDateOnly(data.period.start)} />
      <InfoRow label="Period To" value={fmtDateOnly(data.period.end)} />
      <InfoRow label="Payment Date" value={<span className="font-bold" style={{ color: C.blue }}>{fmtDate(data.paidAt)}</span>} />

      {data.sessionLines.length > 0 && (
        <>
          <SectionTitle>Completed Sessions</SectionTitle>
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ backgroundColor: C.blue + "15" }}>
                  <th className="px-3 py-2 text-left font-semibold">Session</th>
                  <th className="px-3 py-2 text-left font-semibold">Client</th>
                  <th className="px-3 py-2 text-left font-semibold">Date Held</th>
                  <th className="px-3 py-2 text-left font-semibold">Booked On</th>
                  <th className="px-3 py-2 text-right font-semibold">Gross</th>
                  <th className="px-3 py-2 text-right font-semibold">Platform Fee</th>
                  <th className="px-3 py-2 text-right font-semibold">Your Earn</th>
                </tr>
              </thead>
              <tbody>
                {data.sessionLines.map((line: any, i: number) => (
                  <tr key={i} className="border-t hover:bg-muted/20">
                    <td className="px-3 py-2">{line.sessionType}</td>
                    <td className="px-3 py-2">{line.clientName}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{fmtDate(line.scheduledTime)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{fmtDate(line.bookedOn)}</td>
                    <td className="px-3 py-2 text-right">{fmtKES(line.grossAmount)}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">
                      {fmtKES(line.commissionAmount)}<br />
                      <span className="text-[10px]">({(line.commissionRate * 100).toFixed(0)}%)</span>
                    </td>
                    <td className="px-3 py-2 text-right font-semibold" style={{ color: C.blue }}>
                      {fmtKES(line.netAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {data.cancellationLines.length > 0 && (
        <>
          <SectionTitle>Cancellation Earnings</SectionTitle>
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ backgroundColor: "#fef3c7" }}>
                  <th className="px-3 py-2 text-left font-semibold">Session</th>
                  <th className="px-3 py-2 text-left font-semibold">Client</th>
                  <th className="px-3 py-2 text-left font-semibold">Scheduled For</th>
                  <th className="px-3 py-2 text-left font-semibold">Booked On</th>
                  <th className="px-3 py-2 text-left font-semibold">Cancelled By</th>
                  <th className="px-3 py-2 text-right font-semibold">Session Amt</th>
                  <th className="px-3 py-2 text-right font-semibold">Client Refund</th>
                  <th className="px-3 py-2 text-right font-semibold">Your Earn</th>
                </tr>
              </thead>
              <tbody>
                {data.cancellationLines.map((line: any, i: number) => (
                  <tr key={i} className="border-t hover:bg-muted/20">
                    <td className="px-3 py-2">{line.sessionType}</td>
                    <td className="px-3 py-2">{line.clientName}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{fmtDate(line.scheduledTime)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{fmtDate(line.bookedOn)}</td>
                    <td className="px-3 py-2 capitalize font-medium text-red-700">{line.cancelledBy}</td>
                    <td className="px-3 py-2 text-right">{fmtKES(line.grossAmount)}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{fmtKES(line.clientRefundAmount)}</td>
                    <td className="px-3 py-2 text-right font-semibold" style={{ color: "#b45309" }}>
                      {fmtKES(line.expertEarning)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <SectionTitle>Payment Summary</SectionTitle>
      <div className="rounded-xl border overflow-hidden">
        <div className="divide-y">
          <div className="flex justify-between px-4 py-2.5 text-sm">
            <span className="text-muted-foreground">Sessions Earnings (before VAT)</span>
            <span className="font-medium">{fmtKES(data.sessionAmount)}</span>
          </div>
          {data.cancellationAmount > 0 && (
            <div className="flex justify-between px-4 py-2.5 text-sm">
              <span className="text-muted-foreground">Cancellation Earnings (before VAT)</span>
              <span className="font-medium">{fmtKES(data.cancellationAmount)}</span>
            </div>
          )}
          <div className="flex justify-between px-4 py-2.5 text-sm">
            <span className="text-muted-foreground">Subtotal (excl. VAT)</span>
            <span className="font-medium">{fmtKES(data.subtotal)}</span>
          </div>
          <div className="flex justify-between px-4 py-2.5 text-sm">
            <span className="text-muted-foreground">VAT ({(VAT_RATE * 100).toFixed(0)}%)</span>
            <span className="font-medium text-orange-700">{fmtKES(data.vatAmount)}</span>
          </div>
          <div className="flex justify-between px-4 py-3 text-base font-bold" style={{ backgroundColor: C.blue + "15" }}>
            <span style={{ color: C.blue }}>Total Paid to Expert</span>
            <span style={{ color: C.blue }}>{fmtKES(data.totalAmount)}</span>
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground px-1">VAT (16%) applies to all expert payments as required by KRA.</p>
    </div>
  );
}

// ── Print + PDF utils ────────────────────────────────────────────────────────
function useDownloadPDF(contentRef: React.RefObject<HTMLDivElement | null>, filename: string) {
  return async () => {
    const html2pdf = (await import("html2pdf.js")).default;
    if (!contentRef.current) return;
    html2pdf()
      .set({
        margin: 8,
        filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      })
      .from(contentRef.current)
      .save();
  };
}

function usePrint(contentRef: React.RefObject<HTMLDivElement | null>) {
  return () => {
    if (!contentRef.current) return;
    const html = contentRef.current.innerHTML;
    const w = window.open("", "_blank")!;
    w.document.write(`<!DOCTYPE html><html><head>
      <title>ScaleWise Receipt</title>
      <meta charset="utf-8">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', sans-serif; padding: 32px; color: #111827; background: white; }
        .receipt-wrap { max-width: 720px; margin: 0 auto; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th, td { padding: 6px 10px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        th { background: #eff6ff; font-weight: 600; }
        @media print { body { padding: 16px; } }
      </style>
    </head><body><div class="receipt-wrap">${html}</div></body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 500);
  };
}

// ── Main ReceiptModal component ───────────────────────────────────────────────
interface Props {
  data: any;
  onClose: () => void;
}

export function ReceiptModal({ data, onClose }: Props) {
  const contentRef = useRef<HTMLDivElement>(null);
  const receiptType: string = data?.receiptType ?? "";
  const filename = `${data?.receiptNumber ?? "receipt"}.pdf`;
  const downloadPDF = useDownloadPDF(contentRef, filename);
  const print = usePrint(contentRef);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl my-4 overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/30">
          <div>
            <h2 className="text-base font-bold" style={{ color: C.blue }}>Official Receipt</h2>
            <p className="text-xs text-muted-foreground">{data?.receiptNumber}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={print} className="text-xs gap-1.5">
              🖨️ Print
            </Button>
            <Button size="sm" onClick={downloadPDF} className="text-xs gap-1.5 text-white"
              style={{ backgroundColor: C.blue }}>
              ⬇ Download PDF
            </Button>
            <button onClick={onClose}
              className="ml-1 w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground text-lg">
              ×
            </button>
          </div>
        </div>

        {/* Receipt content */}
        <div className="overflow-y-auto max-h-[75vh] p-6 sm:p-8">
          <div ref={contentRef} className="space-y-2">
            <ReceiptHeader receiptNumber={data.receiptNumber} issuedAt={data.issuedAt} />

            {/* Company info band */}
            <div className="grid grid-cols-2 gap-4 py-3 text-xs text-muted-foreground">
              <div>
                <p className="font-semibold text-foreground text-sm">{data.company?.name}</p>
                <p>{data.company?.email}</p>
                <p>{data.company?.phone}</p>
                <p>{data.company?.address}</p>
              </div>
            </div>

            {receiptType === "client_booking" && <ClientBookingReceiptView data={data} />}
            {receiptType === "client_refund" && <ClientRefundReceiptView data={data} />}
            {receiptType === "expert_payout" && <ExpertPayoutReceiptView data={data} />}

            <ReceiptFooter />
          </div>
        </div>
      </div>
    </div>
  );
}
