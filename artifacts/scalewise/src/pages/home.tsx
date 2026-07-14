import { usePageTitle } from "@/hooks/use-page-title";
import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useListExperts, useListReviews, useGetMe, useCreateReview } from "@workspace/api-client-react";
import { ExpertCard } from "@/components/expert-card";
import { ChevronLeft, ChevronRight, Search, Clock, Star, ShieldCheck, LayoutGrid, TrendingUp } from "lucide-react";

// ── Journey flow diagram ────────────────────────────────────────
function JourneyFlowDiagram() {
  return (
    <div className="w-full overflow-x-auto" style={{ WebkitOverflowScrolling: "touch" as const }}>
      <style>{`
        @keyframes sw-fa{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}
        @keyframes sw-fb{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
        @keyframes sw-fc{0%,100%{transform:translateY(0)}50%{transform:translateY(-11px)}}
        @keyframes sw-fd{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        @keyframes sw-fe{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        @keyframes sw-dash{to{stroke-dashoffset:-50}}
        @keyframes sw-glow{0%,100%{opacity:0.1}50%{opacity:0.26}}
        .sw-ga{animation:sw-fa 3.8s ease-in-out infinite;transform-box:fill-box;transform-origin:center}
        .sw-gb{animation:sw-fb 4.3s ease-in-out infinite .5s;transform-box:fill-box;transform-origin:center}
        .sw-gc{animation:sw-fc 3.5s ease-in-out infinite 1.0s;transform-box:fill-box;transform-origin:center}
        .sw-gd{animation:sw-fd 4.6s ease-in-out infinite .3s;transform-box:fill-box;transform-origin:center}
        .sw-ge{animation:sw-fe 4.0s ease-in-out infinite .8s;transform-box:fill-box;transform-origin:center}
        .sw-ap{stroke-dasharray:10 7;animation:sw-dash 1.6s linear infinite}
        .sw-gl{animation:sw-glow 3s ease-in-out infinite}
        .sw-sg{cursor:default;transition:filter .3s ease}
        .sw-sg:hover{filter:drop-shadow(0 6px 22px rgba(0,0,0,0.2))}
        .sw-ms{transition:transform .3s ease;transform-box:fill-box;transform-origin:center}
        .sw-sg:hover .sw-ms{transform:scale(1.06)}
      `}</style>
      <svg viewBox="0 0 1060 300" xmlns="http://www.w3.org/2000/svg"
           style={{ width:"100%", minWidth:520, display:"block" }}>
        <defs>
          <marker id="sw-arr" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <polygon points="0 1,7 3.5,0 6" fill="#b0c4d8" fillOpacity="0.75"/>
          </marker>
          <linearGradient id="sw-g5" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"   stopColor="#6395EE"/>
            <stop offset="45%"  stopColor="#88CFA8"/>
            <stop offset="100%" stopColor="#85DECB"/>
          </linearGradient>
          <clipPath id="sw-cp1"><path d="M -9,-78 C 29,-76 69,-47 76,-7 C 83,34 58,72 18,83 C -22,94 -67,72 -78,29 C -90,-13 -69,-56 -40,-76 C -25,-87 -47,-81 -9,-78 Z"/></clipPath>
          <clipPath id="sw-cp2"><path d="M -4,-85 C 34,-81 74,-52 78,-9 C 83,34 56,76 13,87 C -29,99 -74,72 -85,25 C -96,-22 -67,-67 -31,-83 C -16,-92 -43,-90 -4,-85 Z"/></clipPath>
          <clipPath id="sw-cp3"><path d="M -72,-47 C -72,-74 -43,-87 2,-85 C 47,-83 78,-63 83,-22 C 87,18 69,67 27,83 C -16,99 -65,78 -76,38 C -87,-2 -72,-20 -72,-47 Z"/></clipPath>
          <clipPath id="sw-cp4"><path d="M -2,-81 C 38,-78 76,-52 81,-7 C 85,38 58,76 16,87 C -27,99 -72,74 -81,29 C -90,-16 -67,-60 -34,-78 C -18,-90 -40,-83 -2,-81 Z"/></clipPath>
          <clipPath id="sw-cp5"><path d="M -4,-87 C 38,-83 81,-54 85,-7 C 90,40 60,85 16,94 C -29,103 -78,78 -90,29 C -101,-20 -74,-69 -38,-87 C -20,-99 -47,-92 -4,-87 Z"/></clipPath>
        </defs>

        {/* ── TOP STAGE LABELS ── */}
        <text x="112" y="20" textAnchor="middle" fontSize="11" fontWeight="800" fill="#90B8D6" letterSpacing="1">THE PROBLEM</text>
        <text x="308" y="20" textAnchor="middle" fontSize="11" fontWeight="800" fill="#6395EE" letterSpacing="1">EXPERTS APPEAR</text>
        <text x="530" y="20" textAnchor="middle" fontSize="11" fontWeight="800" fill="#88CFA8" letterSpacing="1">BOOK &amp; PAY</text>
        <text x="750" y="20" textAnchor="middle" fontSize="11" fontWeight="800" fill="#85DECB" letterSpacing="1">THE MEETING</text>
        <text x="948" y="20" textAnchor="middle" fontSize="11" fontWeight="800" fill="url(#sw-g5)" letterSpacing="1">SUCCESS ✓</text>

        {/* ── ANIMATED CONNECTOR PATHS ── */}
        <path d="M 190 152 C 200 128,216 128,226 152" fill="none" stroke="#90B8D6" strokeWidth="2.2" strokeOpacity="0.6" className="sw-ap" markerEnd="url(#sw-arr)"/>
        <path d="M 388 152 C 412 128,438 128,462 152" fill="none" stroke="#6395EE" strokeWidth="2.2" strokeOpacity="0.6" className="sw-ap" style={{animationDelay:".4s"}} markerEnd="url(#sw-arr)"/>
        <path d="M 616 152 C 638 128,654 128,672 152" fill="none" stroke="#88CFA8" strokeWidth="2.2" strokeOpacity="0.6" className="sw-ap" style={{animationDelay:".8s"}} markerEnd="url(#sw-arr)"/>
        <path d="M 834 152 C 844 128,852 128,862 152" fill="none" stroke="#85DECB" strokeWidth="2.2" strokeOpacity="0.6" className="sw-ap" style={{animationDelay:"1.2s"}} markerEnd="url(#sw-arr)"/>

        {/* ═══ STAGE 1 — THE PROBLEM ═══ */}
        <g transform="translate(112,152)" className="sw-sg">
          <g className="sw-ga" clipPath="url(#sw-cp1)">
            <ellipse cx="0" cy="6" rx="90" ry="74" fill="#90B8D6" fillOpacity="0.12" className="sw-gl"/>
            <path d="M -9,-78 C 29,-76 69,-47 76,-7 C 83,34 58,72 18,83 C -22,94 -67,72 -78,29 C -90,-13 -69,-56 -40,-76 C -25,-87 -47,-81 -9,-78 Z"
              fill="#90B8D6" fillOpacity="0.32" stroke="#90B8D6" strokeWidth="2" strokeOpacity="0.55" className="sw-ms"/>
            <rect x="-52" y="-64" rx="11" ry="11" width="104" height="27" fill="#90B8D6" fillOpacity="0.65"/>
            <text x="0" y="-46" textAnchor="middle" fontSize="12" fill="white" fontWeight="700">Pricing Confusion</text>
            <rect x="-22" y="-28" rx="11" ry="11" width="94" height="27" fill="#90B8D6" fillOpacity="0.72"/>
            <text x="25" y="-10" textAnchor="middle" fontSize="12" fill="white" fontWeight="700">Staff Turnover</text>
            <rect x="-44" y="8" rx="11" ry="11" width="84" height="27" fill="#90B8D6" fillOpacity="0.68"/>
            <text x="-2" y="26" textAnchor="middle" fontSize="12" fill="white" fontWeight="700">Slow Growth</text>
          </g>
        </g>

        {/* ═══ STAGE 2 — EXPERTS APPEAR ═══ */}
        <g transform="translate(308,144)" className="sw-sg">
          <g className="sw-gb" clipPath="url(#sw-cp2)">
            <ellipse cx="-10" cy="8" rx="92" ry="76" fill="#6395EE" fillOpacity="0.1" className="sw-gl" style={{animationDelay:".9s"}}/>
            <path d="M -4,-85 C 34,-81 74,-52 78,-9 C 83,34 56,76 13,87 C -29,99 -74,72 -85,25 C -96,-22 -67,-67 -31,-83 C -16,-92 -43,-90 -4,-85 Z"
              fill="#6395EE" fillOpacity="0.28" stroke="#6395EE" strokeWidth="2" strokeOpacity="0.5" className="sw-ms"/>
            <circle cx="-35" cy="-28" r="23" fill="#6395EE" fillOpacity="0.3" stroke="#6395EE" strokeWidth="2" strokeOpacity="0.55"/>
            <circle cx="-35" cy="-24" r="24" fill="none" stroke="#6395EE" strokeWidth="3.5" strokeOpacity="0.2" className="sw-gl" style={{animationDelay:".3s"}}/>
            <circle cx="-35" cy="-35" r="9" fill="#6395EE" fillOpacity="0.65"/>
            <ellipse cx="-35" cy="-17" rx="13" ry="7.5" fill="#6395EE" fillOpacity="0.52"/>
            <circle cx="14" cy="-36" r="23" fill="#6395EE" fillOpacity="0.36" stroke="#6395EE" strokeWidth="2" strokeOpacity="0.6"/>
            <circle cx="14" cy="-32" r="24" fill="none" stroke="#6395EE" strokeWidth="4" strokeOpacity="0.18" className="sw-gl" style={{animationDelay:"1.0s"}}/>
            <circle cx="14" cy="-44" r="9" fill="#6395EE" fillOpacity="0.7"/>
            <ellipse cx="14" cy="-25" rx="13" ry="7.5" fill="#6395EE" fillOpacity="0.56"/>
            <circle cx="58" cy="-24" r="20" fill="#6395EE" fillOpacity="0.24" stroke="#6395EE" strokeWidth="1.8" strokeOpacity="0.45"/>
            <circle cx="58" cy="-31" r="8" fill="#6395EE" fillOpacity="0.5"/>
            <ellipse cx="58" cy="-14" rx="11" ry="6.5" fill="#6395EE" fillOpacity="0.4"/>
            <rect x="-56" y="28" rx="11" ry="11" width="112" height="27" fill="#6395EE" fillOpacity="0.6"/>
            <text x="0" y="46" textAnchor="middle" fontSize="12" fill="white" fontWeight="700">3 Experts Ready</text>
          </g>
        </g>

        {/* ═══ STAGE 3 — BOOK & PAY ═══ */}
        <g transform="translate(530,152)" className="sw-sg">
          <g className="sw-gc" clipPath="url(#sw-cp3)">
            <ellipse cx="0" cy="6" rx="92" ry="76" fill="#88CFA8" fillOpacity="0.12" className="sw-gl" style={{animationDelay:"1.6s"}}/>
            <path d="M -72,-47 C -72,-74 -43,-87 2,-85 C 47,-83 78,-63 83,-22 C 87,18 69,67 27,83 C -16,99 -65,78 -76,38 C -87,-2 -72,-20 -72,-47 Z"
              fill="#88CFA8" fillOpacity="0.3" stroke="#88CFA8" strokeWidth="2" strokeOpacity="0.5" className="sw-ms"/>
            <rect x="-62" y="-62" rx="9" ry="9" width="52" height="52" fill="#88CFA8" fillOpacity="0.4" stroke="#88CFA8" strokeWidth="1.5" strokeOpacity="0.55"/>
            <line x1="-52" y1="-62" x2="-52" y2="-73" stroke="#88CFA8" strokeWidth="2.5" strokeOpacity="0.75" strokeLinecap="round"/>
            <line x1="-23" y1="-62" x2="-23" y2="-73" stroke="#88CFA8" strokeWidth="2.5" strokeOpacity="0.75" strokeLinecap="round"/>
            <line x1="-62" y1="-49" x2="-10" y2="-49" stroke="#88CFA8" strokeWidth="1.5" strokeOpacity="0.6"/>
            <path d="M -47,-38 L -39,-28 L -19,-47" fill="none" stroke="white" strokeWidth="3.5" strokeOpacity="0.95" strokeLinecap="round" strokeLinejoin="round"/>
            <rect x="4" y="-62" rx="9" ry="9" width="48" height="67" fill="#88CFA8" fillOpacity="0.38" stroke="#88CFA8" strokeWidth="1.5" strokeOpacity="0.55"/>
            <rect x="12" y="-55" rx="4" ry="4" width="32" height="42" fill="#88CFA8" fillOpacity="0.25"/>
            <text x="28" y="-36" textAnchor="middle" fontSize="18" fill="white" fontWeight="900" opacity="0.95">M</text>
            <text x="28" y="-20" textAnchor="middle" fontSize="11" fill="white" fontWeight="600" opacity="0.85">Pesa</text>
            <circle cx="28" cy="-5" r="4.5" fill="white" fillOpacity="0.55"/>
            <rect x="-52" y="30" rx="11" ry="11" width="104" height="27" fill="#88CFA8" fillOpacity="0.6"/>
            <text x="0" y="48" textAnchor="middle" fontSize="12" fill="white" fontWeight="700">Select &amp; Pay ✓</text>
          </g>
        </g>

        {/* ═══ STAGE 4 — THE MEETING ═══ */}
        <g transform="translate(750,144)" className="sw-sg">
          <g className="sw-gd" clipPath="url(#sw-cp4)">
            <ellipse cx="0" cy="8" rx="90" ry="75" fill="#85DECB" fillOpacity="0.12" className="sw-gl" style={{animationDelay:".6s"}}/>
            <path d="M -2,-81 C 38,-78 76,-52 81,-7 C 85,38 58,76 16,87 C -27,99 -72,74 -81,29 C -90,-16 -67,-60 -34,-78 C -18,-90 -40,-83 -2,-81 Z"
              fill="#85DECB" fillOpacity="0.28" stroke="#85DECB" strokeWidth="2" strokeOpacity="0.5" className="sw-ms"/>
            <rect x="-60" y="-44" rx="9" ry="9" width="67" height="52" fill="#85DECB" fillOpacity="0.38" stroke="#85DECB" strokeWidth="1.5" strokeOpacity="0.55"/>
            <path d="M 7,-38 L 38,-24 L 38,-6 L 7,8 Z" fill="#85DECB" fillOpacity="0.65"/>
            <rect x="-56" y="-38" rx="5" ry="5" width="56" height="38" fill="#85DECB" fillOpacity="0.2"/>
            <circle cx="-36" cy="-22" r="11" fill="#85DECB" fillOpacity="0.5"/>
            <circle cx="-36" cy="-30" r="5.5" fill="#85DECB" fillOpacity="0.75"/>
            <ellipse cx="-36" cy="-9" rx="9" ry="5" fill="#85DECB" fillOpacity="0.48"/>
            <circle cx="-12" cy="-22" r="11" fill="#85DECB" fillOpacity="0.5"/>
            <circle cx="-12" cy="-30" r="5.5" fill="#85DECB" fillOpacity="0.75"/>
            <ellipse cx="-12" cy="-9" rx="9" ry="5" fill="#85DECB" fillOpacity="0.48"/>
            <rect x="-62" y="26" rx="11" ry="11" width="124" height="27" fill="#85DECB" fillOpacity="0.55"/>
            <text x="0" y="44" textAnchor="middle" fontSize="12" fill="white" fontWeight="700">Google Meet Live</text>
          </g>
        </g>

        {/* ═══ STAGE 5 — SUCCESS ═══ */}
        <g transform="translate(948,152)" className="sw-sg">
          <g className="sw-ge" clipPath="url(#sw-cp5)">
            <ellipse cx="4" cy="6" rx="94" ry="78" fill="url(#sw-g5)" fillOpacity="0.12" className="sw-gl" style={{animationDelay:"1.2s"}}/>
            <path d="M -4,-87 C 38,-83 81,-54 85,-7 C 90,40 60,85 16,94 C -29,103 -78,78 -90,29 C -101,-20 -74,-69 -38,-87 C -20,-99 -47,-92 -4,-87 Z"
              fill="url(#sw-g5)" fillOpacity="0.28" stroke="url(#sw-g5)" strokeWidth="2" strokeOpacity="0.55" className="sw-ms"/>
            <rect x="-58" y="-74" rx="11" ry="11" width="116" height="27" fill="#6395EE" fillOpacity="0.65"/>
            <text x="0" y="-56" textAnchor="middle" fontSize="12" fill="white" fontWeight="700">Clear Pricing ✓</text>
            <rect x="-24" y="-36" rx="11" ry="11" width="100" height="27" fill="#88CFA8" fillOpacity="0.72"/>
            <text x="26" y="-18" textAnchor="middle" fontSize="12" fill="white" fontWeight="700">Loyal Team ✓</text>
            <rect x="-58" y="4" rx="11" ry="11" width="108" height="27" fill="#85DECB" fillOpacity="0.7"/>
            <text x="-4" y="22" textAnchor="middle" fontSize="12" fill="white" fontWeight="700">Growth Plan ✓</text>
          </g>
        </g>
      </svg>
    </div>
  );
}

// ── Brand palette ──────────────────────────────────────────────
const P = {
  blue:   "#6395EE",
  mblue:  "#90B8D6",
  mgreen: "#88CFA8",
  mint:   "#85DECB",
};

// ── Industries with distinct icons + colours ───────────────────
const INDUSTRIES = [
  { name: "Agriculture & Agribusiness",  icon: "🌾", color: P.mgreen },
  { name: "Beauty & Salons",             icon: "💄", color: P.mblue  },
  { name: "Construction & Contracting",  icon: "🏗️",  color: P.blue   },
  { name: "Education & Training",        icon: "📚", color: P.mint   },
  { name: "E-commerce & Retail",         icon: "🛍️",  color: P.mgreen },
  { name: "Financial Services",          icon: "💰", color: P.blue   },
  { name: "Healthcare & Clinics",        icon: "🏥", color: P.mblue  },
  { name: "Hospitality & Tourism",       icon: "🌴", color: P.mint   },
  { name: "Logistics & Transport",       icon: "🚛", color: P.blue   },
  { name: "Manufacturing & SMEs",        icon: "⚙️",  color: P.mgreen },
  { name: "Real Estate",                 icon: "🏘️",  color: P.mblue  },
  { name: "Restaurants & Food Business", icon: "🍽️",  color: P.mint   },
  { name: "Tech Startups",               icon: "💻", color: P.blue   },
];

const HOW_IT_WORKS = [
  {
    step: "01", color: P.blue,   bg: "rgba(99,149,238,0.07)",   border: "rgba(99,149,238,0.18)",
    title: "Describe your challenge",
    desc:  "Tell us what is keeping you up at night. Pricing, growth, staff, operations — any of it.",
  },
  {
    step: "02", color: P.mblue,  bg: "rgba(144,184,214,0.09)",  border: "rgba(144,184,214,0.22)",
    title: "Browse matched experts",
    desc:  "Filter by industry and session type. Every expert is vetted and approved by our team.",
  },
  {
    step: "03", color: P.mgreen, bg: "rgba(136,207,168,0.09)",  border: "rgba(136,207,168,0.22)",
    title: "Book & pay via M-Pesa",
    desc:  "Pick a time, pay securely via M-Pesa, and receive a Google Meet link straight to your inbox — ready to go.",
  },
  {
    step: "04", color: P.mint,   bg: "rgba(133,222,203,0.09)",  border: "rgba(133,222,203,0.22)",
    title: "Get unstuck",
    desc:  "Real conversation. Actionable answers. Every time.",
  },
];

const SESSION_TYPES = [
  {
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#6395EE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="7"/>
        <path d="m21 21-4.35-4.35"/>
      </svg>
    ),
    color: P.blue, bg: "rgba(99,149,238,0.06)",
    name: "Business Discovery", tagline: "Open conversation",
    desc: "Honest, expert perspective on your biggest challenge. No agenda — just real talk.",
    duration: "60 min", best: "Getting unstuck fast",
  },
  {
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#88CFA8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <circle cx="12" cy="12" r="6"/>
        <circle cx="12" cy="12" r="2"/>
      </svg>
    ),
    color: P.mgreen, bg: "rgba(136,207,168,0.06)",
    name: "Consultancy", tagline: "Focused problem-solving",
    desc: "Deep dive into one specific challenge. Walk away with a clear, actionable plan.",
    duration: "60 min", best: "Solving a specific problem",
  },
  {
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#90B8D6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
        <polyline points="16 7 22 7 22 13"/>
      </svg>
    ),
    color: P.mint, bg: "rgba(133,222,203,0.06)",
    name: "Growth Strategy", tagline: "3 or 6 month program",
    desc: "Weekly touchpoints, milestone tracking, and accountability all the way to scale.",
    duration: "3 or 6 months", best: "Scaling your business",
  },
];

const WHY_SCALEWISE = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6395EE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
    label: "Industry-Specific Matching",
    text: "We don't match you with a generic business coach. We match you with someone who has run a salon, a restaurant, a farm, a tech startup, or a business — exactly like yours.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6395EE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        <polyline points="9 12 11 14 15 10"/>
      </svg>
    ),
    label: "Real Operators, Not Theorists",
    text: "Every expert on ScaleWise has built and run a real business. Their advice comes from experience, not from a textbook or a certification.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6395EE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
      </svg>
    ),
    label: "Pay Only for What You Need",
    text: "No monthly retainers, no long-term contracts, no pressure. Book one session, a focused consultancy, or a full growth plan — only when you need it.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6395EE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
    label: "The Conversation Continues",
    text: "After your session, you keep the thread. Message your expert directly through the platform with follow-up questions, progress updates, or your next challenge.",
  },
];

const FALLBACK_REVIEWS = [
  { id: -1, rating: 5, body: "I had been stuck on my pricing for eight months. After one session, I had a clear model that actually worked. The ROI was immediate.", reviewerName: "Grace Wanjiru" },
  { id: -2, rating: 5, body: "I was skeptical at first. Then I walked away from a discovery call with a staffing playbook I started using the same week.", reviewerName: "David Mwangi" },
  { id: -3, rating: 5, body: "My restaurant was bleeding money every weekend. My expert spotted the problem in 20 minutes that I had missed for a year.", reviewerName: "Amina Hassan" },
  { id: -4, rating: 5, body: "Finally someone who has actually run a business. Not a theory — a real plan I could execute immediately.", reviewerName: "Peter Kamau" },
  { id: -5, rating: 5, body: "I came in thinking I had a cash flow problem. Turns out I had a pricing problem. That distinction changed everything.", reviewerName: "Ruth Nyambura" },
];

// ── Live SVG ticking clock ─────────────────────────────────────
function TickingClock() {
  const [tick, setTick] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setTick(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const s = tick.getSeconds();
  const m = tick.getMinutes();
  const h = tick.getHours() % 12;
  const sDeg = s * 6;
  const mDeg = m * 6 + s * 0.1;
  const hDeg = h * 30 + m * 0.5;

  const hand = (deg: number, len: number, w: number, col: string) => {
    const r = deg * Math.PI / 180;
    return (
      <line
        x1="40" y1="40"
        x2={40 + len * Math.sin(r)} y2={40 - len * Math.cos(r)}
        stroke={col} strokeWidth={w} strokeLinecap="round"
        style={{ transition: deg === sDeg ? "all 0.12s linear" : "all 0.4s ease" }}
      />
    );
  };

  return (
    <svg width="80" height="80" viewBox="0 0 80 80" className="shrink-0">
      <circle cx="40" cy="40" r="36" fill="none" stroke={P.mint}  strokeWidth="2.5" opacity="0.45" />
      <circle cx="40" cy="40" r="36" fill="none" stroke={P.blue}  strokeWidth="1"   strokeDasharray="4 6" opacity="0.25" />
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i * 30) * Math.PI / 180;
        const r1 = 30, r2 = 33;
        return (
          <line key={i}
            x1={40 + r1 * Math.sin(a)} y1={40 - r1 * Math.cos(a)}
            x2={40 + r2 * Math.sin(a)} y2={40 - r2 * Math.cos(a)}
            stroke={P.mblue} strokeWidth={i % 3 === 0 ? 2 : 1} opacity="0.55"
          />
        );
      })}
      {hand(hDeg, 16, 3,   P.blue)}
      {hand(mDeg, 22, 2,   P.mgreen)}
      {hand(sDeg, 26, 1.5, P.mint)}
      <circle cx="40" cy="40" r="3" fill={P.blue} />
    </svg>
  );
}

// ── Scroll reveal ──────────────────────────────────────────────
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, visible } = useReveal();
  return (
    <div ref={ref} className={className} style={{
      opacity:    visible ? 1 : 0,
      transform:  visible ? "translateY(0)" : "translateY(24px)",
      transition: `opacity 0.55s ease ${delay}ms, transform 0.55s ease ${delay}ms`,
    }}>
      {children}
    </div>
  );
}

// ── RoleLoginBanner ────────────────────────────────────────────
function RoleLoginBanner() {
  const { data: user } = useGetMe();
  const [, navigate] = useLocation();

  if (user) {
    const dashboardPath =
      user.role === "admin"  ? "/admin" :
      user.role === "expert" ? "/expert/dashboard" : "/dashboard";

    return (
      <div className="bg-primary/5 border border-primary/20 rounded-2xl px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm font-medium">
          Welcome back, <strong>{user.name}</strong>! Ready to continue?
        </p>
        <Button size="sm" onClick={() => navigate(dashboardPath)}>
          Go to My Dashboard →
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-card border rounded-2xl px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
      <p className="text-sm text-muted-foreground font-medium">Already have an account? Jump right in:</p>
      <div className="flex flex-wrap gap-2">
        <Link href="/login">
          <Button size="sm" variant="outline" className="rounded-xl text-sm" style={{ color: P.blue, borderColor: P.blue + "55" }}>
            I am a Business Owner
          </Button>
        </Link>
        <Link href="/login?role=expert">
          <Button size="sm" variant="outline" className="rounded-xl text-sm" style={{ color: P.mgreen, borderColor: P.mgreen + "55" }}>
            I am an Expert
          </Button>
        </Link>
      </div>
    </div>
  );
}

// ── Reviews Carousel ───────────────────────────────────────────
type ReviewItem = { id: number; rating: number; body: string; reviewerName: string; businessName?: string | null };

function ReviewsCarousel({ reviews }: { reviews: ReviewItem[] }) {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const n = reviews.length;

  const prev = useCallback(() => setCurrent(c => (c - 1 + n) % n), [n]);
  const next = useCallback(() => setCurrent(c => (c + 1) % n), [n]);

  // Reset auto-advance
  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(next, 4500);
  }, [next]);

  useEffect(() => {
    resetTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [resetTimer]);

  const handlePrev = () => { prev(); resetTimer(); };
  const handleNext = () => { next(); resetTimer(); };

  const CARD_SCHEMES = [
    { border: P.blue,   bg: "rgba(99,149,238,0.07)",   star: P.blue,   badge: "rgba(99,149,238,0.12)"  },
    { border: P.mgreen, bg: "rgba(136,207,168,0.08)",  star: P.mgreen, badge: "rgba(136,207,168,0.14)" },
    { border: P.mint,   bg: "rgba(133,222,203,0.08)",  star: P.mint,   badge: "rgba(133,222,203,0.14)" },
    { border: P.mblue,  bg: "rgba(144,184,214,0.08)",  star: P.mblue,  badge: "rgba(144,184,214,0.12)" },
  ];

  const getCard = (offset: -1 | 0 | 1) => {
    const idx = (current + offset + n) % n;
    const r = reviews[idx];
    const isCenter = offset === 0;
    const scheme = CARD_SCHEMES[idx % CARD_SCHEMES.length];
    return (
      <div
        key={r.id}
        style={{
          transform:   isCenter ? "scale(1)"   : "scale(0.87)",
          opacity:     isCenter ? 1            : 0.45,
          transition:  "all 0.45s ease",
          flex:        "0 0 33.333%",
          background:  isCenter ? scheme.bg    : "rgba(255,255,255,0.5)",
          borderColor: isCenter ? scheme.border : "transparent",
          borderWidth: isCenter ? 2            : 1,
          borderStyle: "solid",
        }}
        className={`rounded-3xl p-7 flex flex-col ${isCenter ? "shadow-xl" : "shadow-sm bg-card"}`}
      >
        {/* Accent bar at top */}
        {isCenter && (
          <div className="h-1 w-12 rounded-full mb-5" style={{ background: scheme.border }} />
        )}
        <div className="flex gap-0.5 mb-4">
          {Array.from({ length: r.rating }).map((_, j) => (
            <Star key={j} className="h-4 w-4 fill-current" style={{ color: scheme.star }} />
          ))}
        </div>
        <p className="italic text-muted-foreground text-sm leading-relaxed flex-1">"{r.body}"</p>
        <div className="mt-5 pt-4 border-t">
          <div className="font-semibold text-foreground text-sm">{r.reviewerName}{r.businessName ? `, ${r.businessName}` : ""}</div>
        </div>
      </div>
    );
  };

  if (n < 3) {
    return (
      <div className="grid md:grid-cols-3 gap-6">
        {reviews.map((r, i) => {
          const col = CARD_SCHEMES[i % CARD_SCHEMES.length].star;
          return (
            <div key={r.id} className="p-6 rounded-3xl bg-card border shadow-sm flex flex-col">
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: r.rating }).map((_, j) => <Star key={j} className="h-4 w-4 fill-current" style={{ color: col }} />)}
              </div>
              <p className="italic text-muted-foreground text-sm leading-relaxed flex-1">"{r.body}"</p>
              <div className="mt-5 pt-4 border-t">
                <div className="font-semibold text-foreground text-sm">{r.reviewerName}{r.businessName ? `, ${r.businessName}` : ""}</div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Carousel track */}
      <div className="overflow-hidden px-4">
        <div className="flex gap-6" style={{ willChange: "transform" }}>
          {getCard(-1)}
          {getCard(0)}
          {getCard(1)}
        </div>
      </div>

      {/* Arrows */}
      <button
        onClick={handlePrev}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 h-10 w-10 rounded-full bg-card border shadow-md flex items-center justify-center hover:bg-primary/5 transition-colors z-10"
        aria-label="Previous review"
      >
        <ChevronLeft className="h-5 w-5 text-foreground" />
      </button>
      <button
        onClick={handleNext}
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 h-10 w-10 rounded-full bg-card border shadow-md flex items-center justify-center hover:bg-primary/5 transition-colors z-10"
        aria-label="Next review"
      >
        <ChevronRight className="h-5 w-5 text-foreground" />
      </button>

      {/* Dots */}
      <div className="flex justify-center gap-2 mt-6">
        {reviews.map((_, i) => (
          <button
            key={i}
            onClick={() => { setCurrent(i); resetTimer(); }}
            className="rounded-full transition-all"
            style={{
              width:      i === current ? 20 : 8,
              height:     8,
              background: i === current ? P.blue : "#d1daf0",
            }}
          />
        ))}
      </div>

    </div>
  );
}

// ── Leave a Review inline form ──────────────────────────────────
function LeaveReviewForm() {
  const [open,     setOpen]     = useState(false);
  const [name,     setName]     = useState("");
  const [business, setBusiness] = useState("");
  const [rating,   setRating]   = useState(5);
  const [body,     setBody]     = useState("");
  const [done,     setDone]     = useState(false);
  const createReview = useCreateReview();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !body.trim()) return;
    createReview.mutate(
      { data: { reviewerName: name.trim(), businessName: business.trim() || undefined, rating, body: body.trim() } },
      {
        onSuccess: () => {
          setDone(true);
          setName(""); setBusiness(""); setRating(5); setBody("");
        },
      }
    );
  };

  if (done) {
    return (
      <div className="text-center mt-8 p-6 rounded-3xl border" style={{ background: P.mgreen + "10", borderColor: P.mgreen + "40" }}>
        <div className="text-3xl mb-2">🙏</div>
        <p className="font-semibold text-lg" style={{ color: P.mgreen }}>Thank you for your review!</p>
        <p className="text-sm text-muted-foreground mt-1">Your experience helps other business owners find the right expert.</p>
        <button onClick={() => setDone(false)} className="text-sm underline mt-3" style={{ color: P.mgreen }}>
          Leave another review
        </button>
      </div>
    );
  }

  return (
    <div className="mt-10 text-center">
      {!open ? (
        <>
          <p className="text-sm text-muted-foreground mb-3">Had a session? Share your experience — no account needed.</p>
          <Button variant="outline" className="rounded-xl" onClick={() => setOpen(true)}
            style={{ borderColor: P.mgreen + "60", color: P.mgreen }}>
            Leave a Review →
          </Button>
        </>
      ) : (
        <form onSubmit={handleSubmit}
          className="text-left max-w-xl mx-auto p-7 rounded-3xl border shadow-sm"
          style={{ background: P.mgreen + "08", borderColor: P.mgreen + "30" }}>
          <h3 className="font-bold text-lg mb-5 text-center">Share Your Experience</h3>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Your Name <span className="text-red-500">*</span></label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Jane Doe" required />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Your business or role <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <Input value={business} onChange={e => setBusiness(e.target.value)}
              placeholder="e.g. Salon owner, Westlands or Restaurant founder, Nairobi." />
          </div>

          {/* Star rating */}
          <div className="mb-5">
            <label className="block text-sm font-medium mb-2">Rating</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(s => (
                <button key={s} type="button" onClick={() => setRating(s)}
                  className="text-3xl transition-transform hover:scale-110 focus:outline-none">
                  <span style={{ color: s <= rating ? P.mgreen : "#d1d5db" }}>★</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-1">Your Review <span className="text-red-500">*</span></label>
            <Textarea value={body} onChange={e => setBody(e.target.value)}
              placeholder="Tell us about your experience with ScaleWise…" rows={3} required />
          </div>

          <div className="flex gap-3">
            <Button type="submit" className="flex-1"
              disabled={createReview.isPending || !name.trim() || !body.trim()}
              style={{ background: P.mgreen, color: "#083d2e" }}>
              {createReview.isPending ? "Submitting…" : "Submit Review"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </form>
      )}
    </div>
  );
}

// ── Industries with search ─────────────────────────────────────
function IndustriesSection() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = query.trim()
    ? INDUSTRIES.filter(ind => ind.name.toLowerCase().includes(query.toLowerCase()))
    : INDUSTRIES;

  const handleInput = (val: string) => {
    setQuery(val);
    if (val.trim()) {
      const matches = INDUSTRIES
        .map(i => i.name)
        .filter(n => n.toLowerCase().includes(val.toLowerCase()) && n.toLowerCase() !== val.toLowerCase())
        .slice(0, 5);
      setSuggestions(matches);
      setShowSuggestions(matches.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const pickSuggestion = (name: string) => {
    setQuery(name);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <Reveal>
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-3">
            Whatever Your Business Is,{" "}
            <span style={{ color: P.blue }}>Someone Here</span> Has{" "}
            <span style={{ color: P.mint }}>Lived It</span>
          </h2>
          <p className="text-center text-muted-foreground mb-8">13 industries. Verified experts in every one.</p>
        </Reveal>

        {/* Search bar */}
        <Reveal delay={80}>
          <div className="relative max-w-md mx-auto mb-10">
            <div className="flex items-center gap-2 bg-card border rounded-2xl px-4 py-3 shadow-sm">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                placeholder="Search industries..."
                value={query}
                onChange={e => handleInput(e.target.value)}
                onFocus={() => query && setShowSuggestions(suggestions.length > 0)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              />
              {query && (
                <button onClick={() => { setQuery(""); setSuggestions([]); }} className="text-muted-foreground hover:text-foreground text-xs transition-colors">✕</button>
              )}
            </div>
            {showSuggestions && (
              <div className="absolute top-full mt-1 left-0 right-0 bg-card border rounded-xl shadow-lg z-20 overflow-hidden">
                {suggestions.map(s => (
                  <button
                    key={s}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted/60 transition-colors"
                    onMouseDown={() => pickSuggestion(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </Reveal>

        {/* Industry grid — static, no animation */}
        <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
          {filtered.length > 0 ? filtered.map((ind, i) => (
            <Reveal key={ind.name} delay={i * 30}>
              <Link href={`/experts?industry=${encodeURIComponent(ind.name)}`}>
                <div
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border cursor-pointer font-medium text-sm shadow-sm transition-all hover:scale-105 hover:shadow-md"
                  style={{
                    borderColor: ind.color + "45",
                    background:  ind.color + "0F",
                    color:       ind.color === P.mblue ? "#2d6a8a" : ind.color,
                  }}
                >
                  <span>{ind.icon}</span>
                  <span className="text-foreground">{ind.name}</span>
                </div>
              </Link>
            </Reveal>
          )) : (
            <p className="text-muted-foreground text-sm py-4">No industries match "{query}"</p>
          )}
        </div>
      </div>
    </section>
  );
}

// ── Main Page ──────────────────────────────────────────────────
const CYCLING_PHRASES = [
  "Stuck on pricing?",
  "Losing your best staff?",
  "Stalled on growth?",
  "Not sure what's wrong?",
  "Struggling to scale?",
  "Overwhelmed and unsure where to start?",
];

export default function Home() {
  usePageTitle("ScaleWise — Connect With Verified Business Experts");
  const [phraseIdx, setPhraseIdx]         = useState(0);
  const [phraseVisible, setPhraseVisible] = useState(true);
  useEffect(() => {
    const id = setInterval(() => {
      setPhraseVisible(false);
      setTimeout(() => {
        setPhraseIdx(i => (i + 1) % CYCLING_PHRASES.length);
        setPhraseVisible(true);
      }, 400);
    }, 2500);
    return () => clearInterval(id);
  }, []);
  const [search, setSearch]       = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchWrapperRef          = useRef<HTMLDivElement>(null);
  const trustRef                  = useRef<HTMLDivElement>(null);
  const [trustVisible, setTrustVisible] = useState(false);
  const [industryCount, setIndustryCount] = useState(0);
  const [, navigate]              = useLocation();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const el = trustRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setTrustVisible(true); obs.disconnect(); }
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!trustVisible) return;
    let n = 0;
    const target = 13;
    const interval = setInterval(() => {
      n += 1;
      setIndustryCount(n);
      if (n >= target) clearInterval(interval);
    }, 60);
    return () => clearInterval(interval);
  }, [trustVisible]);
  const { data: expertData, isLoading: expertsLoading } = useListExperts({ limit: 3 });
  const { data: reviewsData } = useListReviews();

  const reviews: ReviewItem[] = reviewsData && reviewsData.length > 0
    ? reviewsData.map(r => ({ id: r.id, rating: r.rating, body: r.body, reviewerName: r.reviewerName }))
    : FALLBACK_REVIEWS;

  const handleSearch = () => {
    if (search.trim()) navigate(`/experts?search=${encodeURIComponent(search.trim())}`);
    else navigate("/experts");
  };

  return (
    <div className="flex flex-col min-h-screen">

      {/* ── HERO ── */}
      <section className="relative overflow-hidden bg-background">
        {/* Animated blobs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -left-20 h-[520px] w-[520px] rounded-full opacity-[0.13] blur-[120px] animate-blob" style={{ background: P.blue }} />
          <div className="absolute top-10 -right-10 h-[440px] w-[440px] rounded-full opacity-[0.12] blur-[110px] animate-blob animation-delay-2000" style={{ background: P.mint }} />
          <div className="absolute -bottom-10 left-1/3 h-[360px] w-[360px] rounded-full opacity-[0.10] blur-[100px] animate-blob animation-delay-4000" style={{ background: P.mgreen }} />
        </div>

        <div className="container relative z-10 mx-auto px-4 md:px-6 pt-6 pb-4">
          <RoleLoginBanner />
        </div>

        <div className="container relative z-10 mx-auto px-4 md:px-6 pt-8 pb-20 sm:pb-28">
          {/* Top row: copy left, image right */}
          <div className="grid md:grid-cols-2 gap-12 items-center mb-10">
            <div className="space-y-7">
              <Reveal>
                <span className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
                  For Business Owners Who Are Tired of Guessing
                </span>
              </Reveal>
              <Reveal delay={60}>
                <h1 className="text-5xl md:text-[58px] font-extrabold tracking-tight text-foreground leading-[1.05]">
                  Finally, Someone<br />
                  <span style={{ color: P.blue }}>Who</span> Gets <span style={{ color: P.mint }}>It</span>
                </h1>
              </Reveal>
              <p
                className="text-xl font-semibold"
                style={{
                  color: P.blue,
                  opacity: phraseVisible ? 1 : 0,
                  transition: "opacity 0.4s ease",
                  minHeight: "1.75rem",
                }}
              >
                {CYCLING_PHRASES[phraseIdx]}
              </p>
              <Reveal delay={120}>
                <p className="text-lg text-muted-foreground leading-relaxed max-w-xl">
                  Stuck on <strong style={{ color: P.mgreen }}>pricing</strong>? Losing <strong style={{ color: P.blue }}>staff</strong>? Stalled on <strong style={{ color: P.mint }}>growth</strong>? Or wrestling with a problem you can&apos;t even put into words yet?{" "}
                  Talk to someone who has already solved it. Not a textbook. Not a guess. Real answers, from people who have built exactly what you are building.
                </p>
              </Reveal>
            </div>

            <div className="relative hidden md:block">
              <div className="absolute inset-0 rounded-3xl" style={{ background: `linear-gradient(135deg, ${P.blue}18, ${P.mint}18)` }} />
              <img
                src="/photos/hero-video-call.png"
                alt="Business owner on a coaching video call"
                className="w-full rounded-3xl shadow-2xl object-cover aspect-video relative z-10"
                loading="eager"
              />
              <div className="absolute -bottom-4 -left-4 bg-card border rounded-2xl shadow-lg px-4 py-3 z-20">
                <p className="text-xs text-muted-foreground">Session just ended</p>
                <p className="font-semibold text-sm">★ 5.0 — Incredibly useful advice</p>
              </div>
            </div>
          </div>

          {/* Full-width search bar + trust indicators */}
          <Reveal delay={180}>
            <div className="flex flex-col items-center gap-4">
              <div ref={searchWrapperRef} className="relative w-full max-w-3xl">
                <div className="flex gap-3 p-2 bg-card rounded-2xl shadow-lg border w-full">
                  <Input
                    type="text"
                    value={search}
                    onChange={e => { setSearch(e.target.value); setShowSuggestions(true); }}
                    onFocus={() => setShowSuggestions(true)}
                    onKeyDown={e => {
                      if (e.key === "Enter") { setShowSuggestions(false); handleSearch(); }
                      if (e.key === "Escape") setShowSuggestions(false);
                    }}
                    placeholder="Search by industry or challenge, e.g. Beauty & Salons or Growth"
                    className="border-0 shadow-none focus-visible:ring-0 text-base h-11 min-w-0"
                  />
                  <Button size="lg" className="rounded-xl h-11 px-6 whitespace-nowrap shrink-0"
                    onClick={() => { setShowSuggestions(false); handleSearch(); }}>
                    Find My Expert
                  </Button>
                </div>

                {/* Industry autocomplete dropdown */}
                {showSuggestions && (() => {
                  const q = search.trim().toLowerCase();
                  const matches = INDUSTRIES.filter(ind => !q || ind.name.toLowerCase().includes(q));
                  return matches.length > 0 ? (
                    <div className="absolute left-0 right-0 top-full mt-2 bg-card border rounded-2xl shadow-xl z-50 overflow-hidden">
                      <p className="px-4 pt-3 pb-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Industries</p>
                      {matches.map(ind => (
                        <button
                          key={ind.name}
                          className="flex items-center gap-3 w-full px-4 py-2.5 text-sm hover:bg-muted/60 transition-colors text-left"
                          onMouseDown={e => {
                            e.preventDefault();
                            setSearch(ind.name);
                            setShowSuggestions(false);
                            navigate(`/experts?search=${encodeURIComponent(ind.name)}`);
                          }}
                        >
                          <span className="text-base leading-none">{ind.icon}</span>
                          <span className="font-medium" style={{ color: ind.color }}>{ind.name}</span>
                        </button>
                      ))}
                      {q && (
                        <>
                          <div className="mx-4 my-1 border-t" />
                          <button
                            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm hover:bg-muted/60 transition-colors text-left"
                            onMouseDown={e => {
                              e.preventDefault();
                              setShowSuggestions(false);
                              handleSearch();
                            }}
                          >
                            <span className="text-base leading-none">🔍</span>
                            <span className="text-muted-foreground">Search for <strong className="text-foreground">&ldquo;{search}&rdquo;</strong> as a challenge</span>
                          </button>
                        </>
                      )}
                    </div>
                  ) : null;
                })()}
              </div>

              <div ref={trustRef} className="flex flex-wrap items-center justify-center gap-4">
                {/* Verified practitioners */}
                <div
                  className="group flex items-center gap-3 bg-card border rounded-2xl px-5 py-3 cursor-default
                    shadow-[0_4px_18px_rgba(0,0,0,0.08)]
                    transition-all duration-200 hover:-translate-y-2 hover:shadow-[0_10px_32px_rgba(0,0,0,0.13)]"
                  style={trustVisible
                    ? { animation: "trust-card-in 0.45s ease both", animationDelay: "0ms" }
                    : { opacity: 0 }}
                >
                  <div className="flex items-center justify-center w-9 h-9 rounded-full shrink-0"
                    style={{ background: `linear-gradient(135deg, #b8d4fa 0%, #4d7de8 100%)` }}>
                    <ShieldCheck size={18} color="#fff" strokeWidth={2.2} />
                  </div>
                  <span className="text-sm font-semibold text-foreground">Verified practitioners</span>
                </div>

                {/* 13 industries — animated count */}
                <div
                  className="group flex items-center gap-3 bg-card border rounded-2xl px-5 py-3 cursor-default
                    shadow-[0_4px_18px_rgba(0,0,0,0.08)]
                    transition-all duration-200 hover:-translate-y-2 hover:shadow-[0_10px_32px_rgba(0,0,0,0.13)]"
                  style={trustVisible
                    ? { animation: "trust-card-in 0.45s ease both", animationDelay: "120ms" }
                    : { opacity: 0 }}
                >
                  <div className="flex items-center justify-center w-9 h-9 rounded-full shrink-0"
                    style={{ background: `linear-gradient(135deg, #c4ecda 0%, #4fae7e 100%)` }}>
                    <LayoutGrid size={18} color="#fff" strokeWidth={2.2} />
                  </div>
                  <span className="text-sm font-semibold text-foreground flex items-baseline gap-1">
                    <span className="text-2xl font-black tabular-nums leading-none" style={{ color: P.mgreen }}>
                      {industryCount}
                    </span>
                    industries
                  </span>
                </div>

                {/* Real results */}
                <div
                  className="group flex items-center gap-3 bg-card border rounded-2xl px-5 py-3 cursor-default
                    shadow-[0_4px_18px_rgba(0,0,0,0.08)]
                    transition-all duration-200 hover:-translate-y-2 hover:shadow-[0_10px_32px_rgba(0,0,0,0.13)]"
                  style={trustVisible
                    ? { animation: "trust-card-in 0.45s ease both", animationDelay: "240ms" }
                    : { opacity: 0 }}
                >
                  <div className="flex items-center justify-center w-9 h-9 rounded-full shrink-0"
                    style={{ background: `linear-gradient(135deg, #c0f0e8 0%, #3cb8a5 100%)` }}>
                    <TrendingUp size={18} color="#fff" strokeWidth={2.2} />
                  </div>
                  <span className="text-sm font-semibold text-foreground">Real results</span>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── VERIFICATION TRUST BANNER ── */}
      <div
        style={{
          background: "rgba(99,149,238,0.09)",
          borderTop: "1px solid rgba(99,149,238,0.14)",
          borderBottom: "1px solid rgba(99,149,238,0.14)",
        }}
      >
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-start sm:items-center justify-center gap-3 max-w-4xl mx-auto">
            <svg
              className="shrink-0 mt-0.5 sm:mt-0"
              width="18" height="18" viewBox="0 0 24 24"
              fill="none" stroke="#6395EE" strokeWidth="2.2"
              strokeLinecap="round" strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <polyline points="9 12 11 14 15 10"/>
            </svg>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Every expert on ScaleWise is manually reviewed by our team. We check their background, their industry experience, and their track record before approving them. No unverified profiles. No generic advice. Just real experience, matched to your exact challenge.
            </p>
          </div>
        </div>
      </div>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-12 bg-muted/30" style={{ scrollMarginTop: "72px" }}>
        <div className="container mx-auto px-4">
          <Reveal>
            <div className="text-center max-w-3xl mx-auto mb-7">
              <h2 className="text-3xl md:text-4xl font-bold mb-3">
                Your Solution Is{" "}
                <span style={{ color: P.blue }}>One Call Away</span>
              </h2>
              <p className="text-lg text-muted-foreground">No long forms. No waiting. Real help, fast.</p>
            </div>
          </Reveal>

          <div className="grid md:grid-cols-4 gap-5 mb-6">
            {HOW_IT_WORKS.map((s, i) => (
              <Reveal key={s.step} delay={i * 80}>
                <div
                  className="p-6 rounded-3xl border shadow-sm h-full flex flex-col transition-all hover:shadow-md hover:-translate-y-1"
                  style={{ background: s.bg, borderColor: s.border }}
                >
                  <div className="text-[48px] font-black leading-none mb-4 opacity-25" style={{ color: s.color }}>{s.step}</div>
                  <h3 className="text-lg font-bold mb-2 text-foreground">{s.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>

          {/* Journey flow diagram */}
          <Reveal delay={120}>
            <div style={{ width: "100%", maxWidth: "100%", overflowX: "auto", WebkitOverflowScrolling: "touch" as const }}>
              <JourneyFlowDiagram />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── TICKING CLOCK URGENCY BANNER ── */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <Reveal>
            <div
              className="rounded-3xl border p-8 flex flex-col md:flex-row items-center gap-7"
              style={{ background: `rgba(133,222,203,0.07)`, borderColor: P.mint + "40" }}
            >
              <TickingClock />
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-xl font-extrabold text-foreground mb-2 leading-snug">
                  Every minute you wait is a minute your{" "}
                  <span style={{ color: P.mint }}>competitor isn't.</span>
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed max-w-lg">
                  The business problem keeping you up tonight? Someone on ScaleWise has already solved it. Help is one call away. Stop losing time to uncertainty.
                </p>
              </div>
              <Link href="/experts">
                <Button size="lg" className="rounded-xl whitespace-nowrap shrink-0" style={{ background: P.mint, color: "#0c4a3a" }}>
                  Book a Call Now →
                </Button>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── SESSION TYPES ── */}
      <section className="py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <Reveal>
            <div className="text-center max-w-3xl mx-auto mb-7">
              <h2 className="text-3xl md:text-4xl font-bold mb-3">
                Three Ways to <span style={{ color: P.mgreen }}>Get Help</span>
              </h2>
              <p className="text-lg text-muted-foreground">Pick the format that matches where you are right now.</p>
            </div>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {SESSION_TYPES.map((t, i) => (
              <Reveal key={t.name} delay={i * 90}>
                <div
                  className="p-8 rounded-3xl border shadow-sm hover:shadow-md transition-all hover:-translate-y-1 flex flex-col h-full"
                  style={{ background: t.bg, borderColor: t.color + "35" }}
                >
                  <div className="mb-4">{t.icon}</div>
                  <div className="text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: t.color }}>{t.tagline}</div>
                  <h3 className="text-xl font-bold mb-3 text-foreground">{t.name}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed flex-1">{t.desc}</p>
                  <div className="mt-6 pt-5 border-t flex justify-between text-sm">
                    <span className="text-muted-foreground">⏱ {t.duration}</span>
                    <span className="font-medium" style={{ color: P.mgreen }}>Best for: {t.best}</span>
                  </div>
                  <Link href="/experts" className="mt-4 block">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full rounded-xl text-sm font-medium"
                      style={{ color: P.blue, borderColor: P.blue + "55" }}
                    >
                      Find an Expert →
                    </Button>
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY SCALEWISE ── */}
      <section className="py-16" style={{ background: "#F8FAFC" }}>
        <div className="container mx-auto px-4">
          <Reveal>
            <div className="text-center max-w-3xl mx-auto mb-12">
              <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: P.blue }}>
                Why ScaleWise
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Not Another Generic Platform</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Most advice platforms connect you with coaches and consultants who've read about your problem. ScaleWise connects you with people who've actually lived it — in your exact industry.
              </p>
            </div>
          </Reveal>
          <div className="grid md:grid-cols-2 gap-5 max-w-4xl mx-auto">
            {WHY_SCALEWISE.map((point, i) => (
              <Reveal key={point.label} delay={i * 80}>
                <div className="flex gap-4 p-6 rounded-2xl bg-white border shadow-sm hover:shadow-md transition-shadow h-full">
                  <div className="shrink-0 mt-0.5">{point.icon}</div>
                  <div>
                    <div className="font-bold text-sm mb-1.5" style={{ color: P.blue }}>{point.label}</div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{point.text}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── INDUSTRIES ── */}
      <IndustriesSection />

      {/* ── FEATURED EXPERTS ── */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <Reveal>
            <div className="flex justify-between items-end mb-6">
              <h2 className="text-3xl md:text-4xl font-bold max-w-lg">
                The People Who Have{" "}
                <span style={{ color: P.mgreen }}>Actually</span>{" "}
                <span style={{ color: P.blue }}>Done It</span>
              </h2>
              <Link href="/experts">
                <Button variant="outline" className="hidden md:flex rounded-xl">Browse All Experts →</Button>
              </Link>
            </div>
          </Reveal>

          {expertsLoading ? (
            <div className="grid md:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => <div key={i} className="h-64 rounded-3xl bg-muted animate-pulse" />)}
            </div>
          ) : expertData?.experts?.length ? (
            <>
              <div className="grid md:grid-cols-3 gap-6">
                {expertData.experts.map(expert => (
                  <ExpertCard key={expert.id} expert={expert as any} />
                ))}
              </div>
              <div className="text-center mt-10">
                <Link href="/experts">
                  <Button variant="outline" size="lg" className="rounded-xl">View All Experts</Button>
                </Link>
              </div>
            </>
          ) : (
            <div className="text-center p-12 bg-card rounded-3xl border max-w-2xl mx-auto">
              <h3 className="text-xl font-semibold mb-4">We are building our founding roster</h3>
              <p className="text-muted-foreground mb-8">
                We are hand-picking our very first experts — people who have genuinely run businesses like yours.
              </p>
              <Link href="/apply-expert">
                <Button>Apply as a Founding Expert</Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ── REVIEWS CAROUSEL ── */}
      <section id="reviews" className="py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <Reveal>
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-3">
              Business Owners, <span style={{ color: P.mgreen }}>Telling It Like It Is</span>
            </h2>
            <p className="text-center text-muted-foreground mb-7">Real experiences from real people.</p>
          </Reveal>
          <ReviewsCarousel reviews={reviews} />
          <LeaveReviewForm />
        </div>
      </section>

      {/* ── EXPERT CTA ── */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <Reveal className="w-full">
            <div
              className="relative rounded-3xl border overflow-hidden w-full"
              style={{ background: `linear-gradient(135deg, ${P.blue}07, rgba(255,255,255,0.6), ${P.mgreen}0F)`, borderColor: P.mgreen + "35" }}
            >
              {/* Decorative blob */}
              <div className="pointer-events-none absolute -top-24 -right-24 h-[280px] w-[280px] rounded-full opacity-[0.18] blur-[80px]" style={{ background: P.mgreen }} />

              <div className="relative z-10 grid md:grid-cols-2 gap-8 items-center p-5 sm:p-8 md:p-14">
                <div className="relative hidden md:block">
                  <img
                    src="/photos/expert-cta.png"
                    alt="Expert advisor ready to help"
                    className="w-full rounded-3xl shadow-xl object-cover aspect-[4/3]"
                    loading="lazy"
                  />
                </div>
                <div className="space-y-5">
                  <span className="inline-block rounded-full px-4 py-1.5 text-sm font-semibold" style={{ background: P.mgreen + "18", color: P.mgreen }}>
                    For Industry Practitioners
                  </span>
                  <h2 className="text-3xl md:text-4xl font-extrabold text-foreground">
                    Turn Your <span style={{ color: P.mgreen }}>Experience</span><br />
                    Into <span style={{ color: P.blue }}>Income</span>
                  </h2>
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    You have spent years building something real. Other business owners need exactly what you know. Join ScaleWise as a verified expert, set your own rates, and start earning on your schedule.
                  </p>
                  <ul className="space-y-2 text-muted-foreground text-sm">
                    {[
                      ["Set your own prices and availability",              P.mgreen],
                      ["Get matched with business owners in your industry", P.blue  ],
                      ["Earn from Discovery, Consultancy, and Growth sessions", P.mint ],
                      ["Build your reputation with verified client reviews", P.mblue ],
                    ].map(([text, col]) => (
                      <li key={text} className="flex items-center gap-2.5">
                        <span className="h-5 w-5 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: col }}>✓</span>
                        {text}
                      </li>
                    ))}
                  </ul>
                  <Link href="/apply-expert">
                    <Button
                      size="lg"
                      className="rounded-2xl px-8 text-base font-bold shadow-lg mt-2"
                      style={{ background: `linear-gradient(135deg, ${P.mgreen}, ${P.mint})`, color: "#083d2e", boxShadow: `0 8px 28px ${P.mgreen}50` }}
                    >
                      🚀 Apply as a Founding Expert →
                    </Button>
                  </Link>
                  <p className="text-xs" style={{ color: P.mgreen }}>
                    Limited spots available — we are hand-picking our first cohort.
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
