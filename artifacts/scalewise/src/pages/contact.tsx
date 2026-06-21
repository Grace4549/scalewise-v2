import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Mail, MessageSquare, Clock, Phone, MapPin } from "lucide-react";

const P = {
  blue:   "#6395EE",
  mblue:  "#90B8D6",
  mgreen: "#88CFA8",
  mint:   "#85DECB",
};

const CONTACT_OPTIONS = [
  {
    icon: <Mail className="h-6 w-6" />,
    color: P.blue,
    title: "Email Us",
    desc: "For general enquiries, billing, or account support.",
    action: "support@scalewise.co.ke",
    href: "mailto:support@scalewise.co.ke",
    cta: "Send an Email",
  },
  {
    icon: <Phone className="h-6 w-6" />,
    color: P.mgreen,
    title: "Call Us",
    desc: "Speak directly with our team during business hours.",
    action: "+254 707 346 331",
    href: "tel:+254707346331",
    cta: "Call Now",
  },
  {
    icon: <Clock className="h-6 w-6" />,
    color: P.mint,
    title: "Working Hours",
    desc: "Our team is available Monday to Friday.",
    action: "Mon – Fri, 8am – 6pm EAT",
    href: null,
    cta: null,
  },
];

export default function Contact() {
  return (
    <div className="min-h-screen">

      {/* ── Hero ── */}
      <div
        className="relative overflow-hidden py-10"
        style={{ background: `linear-gradient(135deg, ${P.mint}0A, ${P.blue}0C)` }}
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-16 -right-10 h-[300px] w-[300px] rounded-full opacity-[0.11] blur-[100px]" style={{ background: P.mint }} />
          <div className="absolute bottom-0 -left-10 h-[240px] w-[240px] rounded-full opacity-[0.09] blur-[80px]" style={{ background: P.blue }} />
        </div>
        <div className="relative z-10 container mx-auto px-4 max-w-5xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-block rounded-full px-4 py-1.5 text-xs font-semibold mb-5" style={{ background: P.mint + "18", color: "#0c5a50" }}>
                We Are Here for You
              </span>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight mb-5 text-foreground">
                Get in <span style={{ color: P.blue }}>Touch</span>
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                Whether you have a question about the platform, need help with a booking, or just want to say hello — we are here and happy to help.
              </p>
              <div className="flex items-center gap-2 mt-6 text-sm" style={{ color: P.mgreen }}>
                <span className="font-bold">✓</span>
                <span className="text-muted-foreground">We respond within 24 hours on business days.</span>
              </div>
            </div>
            <div className="hidden md:block relative rounded-3xl overflow-hidden shadow-2xl aspect-[4/3]">
              <img
                src="/photos/contact-hero.png"
                alt="Friendly support team member ready to help"
                className="w-full h-full object-cover"
                loading="eager"
              />
              <div className="absolute inset-0 rounded-3xl" style={{ background: `linear-gradient(to bottom left, ${P.mint}18, transparent 60%)` }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Contact options ── */}
      <div className="container mx-auto px-4 max-w-4xl py-10">
        <div className="grid md:grid-cols-3 gap-5 mb-7">
          {CONTACT_OPTIONS.map((opt) => (
            <div
              key={opt.title}
              className="rounded-3xl border p-7 flex flex-col gap-3"
              style={{ borderColor: opt.color + "35", background: opt.color + "07" }}
            >
              <div
                className="h-11 w-11 rounded-2xl flex items-center justify-center text-white shrink-0"
                style={{ background: opt.color }}
              >
                {opt.icon}
              </div>
              <h3 className="text-lg font-bold" style={{ color: opt.color }}>{opt.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed flex-1">{opt.desc}</p>
              {opt.href ? (
                <a href={opt.href}>
                  <Button size="sm" className="rounded-xl mt-1 w-full" style={{ background: opt.color, color: opt.color === P.mint ? "#083d2e" : "white" }}>
                    {opt.cta}
                  </Button>
                </a>
              ) : (
                <p className="text-sm font-semibold mt-1" style={{ color: opt.color }}>{opt.action}</p>
              )}
            </div>
          ))}
        </div>

        {/* ── Direct contact card ── */}
        <div
          className="rounded-3xl border p-10"
          style={{ background: P.blue + "06", borderColor: P.blue + "28" }}
        >
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <div
                className="h-14 w-14 rounded-2xl flex items-center justify-center mb-5 text-white"
                style={{ background: P.blue }}
              >
                <Mail className="h-7 w-7" />
              </div>
              <h2 className="text-2xl font-bold mb-2" style={{ color: P.blue }}>Drop Us a Line</h2>
              <p className="text-muted-foreground mb-6">
                Our team reads every message and will get back to you as soon as possible.
              </p>
              <a href="mailto:support@scalewise.co.ke">
                <Button size="lg" className="rounded-xl px-8 h-13 text-lg" style={{ background: P.blue }}>
                  Email support@scalewise.co.ke
                </Button>
              </a>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 text-white" style={{ background: P.mgreen }}>
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <a href="tel:+254707346331" className="font-semibold hover:underline" style={{ color: P.mgreen }}>+254 707 346 331</a>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 text-white" style={{ background: P.mint }}>
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Location</p>
                  <p className="font-semibold" style={{ color: P.mint.replace("85", "0c5a") }}>Nairobi, Kenya</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 text-white" style={{ background: P.mblue }}>
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Working Hours</p>
                  <p className="font-semibold" style={{ color: P.mblue }}>Mon – Fri, 8am – 6pm EAT</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Also check FAQ ── */}
        <div className="mt-8 text-center">
          <p className="text-muted-foreground text-sm">
            Looking for quick answers?{" "}
            <Link href="/faq" className="font-semibold underline" style={{ color: P.mgreen }}>
              Browse our FAQ →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
