import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Check, ChevronDown, ChevronUp, Menu, X } from "lucide-react";

// ---------------------------------------------------------------------------
// useInView hook
// ---------------------------------------------------------------------------
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return { ref, inView };
}

// ---------------------------------------------------------------------------
// Navbar (duplicated for independence)
// ---------------------------------------------------------------------------
function Navbar() {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      setVisible(currentY < lastY.current || currentY < 60);
      lastY.current = currentY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100 shadow-sm transition-transform duration-300 ${
        visible ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 md:px-8 flex items-center justify-between h-16">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 font-bold text-xl text-[#223555]"
        >
          <Building2 className="w-6 h-6" />
          OmniLar
        </button>

        <div className="hidden md:flex items-center gap-8">
          <button
            onClick={() => navigate("/#funcionalidades")}
            className="text-gray-600 hover:text-[#223555] font-medium transition-colors"
          >
            Funcionalidades
          </button>
          <button
            onClick={() => navigate("/precos")}
            className="text-[#223555] font-semibold transition-colors underline underline-offset-4"
          >
            Preços
          </button>
          <a
            href="https://wa.me/5513991161032"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-600 hover:text-[#223555] font-medium transition-colors"
          >
            Contato
          </a>
        </div>

        <div className="hidden md:flex">
          <button
            onClick={() => navigate("/login")}
            className="px-5 py-2 rounded-lg bg-[#223555] text-white font-semibold hover:bg-[#1a2a44] transition-colors"
          >
            Entrar
          </button>
        </div>

        <button
          className="md:hidden p-2 text-[#223555]"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Menu"
        >
          {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 flex flex-col gap-4">
          <button
            onClick={() => { setMenuOpen(false); navigate("/"); }}
            className="text-left text-gray-700 font-medium hover:text-[#223555] transition-colors"
          >
            Funcionalidades
          </button>
          <button
            onClick={() => { setMenuOpen(false); navigate("/precos"); }}
            className="text-left text-[#223555] font-semibold"
          >
            Preços
          </button>
          <a
            href="https://wa.me/5513991161032"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-700 font-medium hover:text-[#223555] transition-colors"
            onClick={() => setMenuOpen(false)}
          >
            Contato
          </a>
          <button
            onClick={() => { setMenuOpen(false); navigate("/login"); }}
            className="mt-2 px-5 py-2 rounded-lg bg-[#223555] text-white font-semibold hover:bg-[#1a2a44] transition-colors w-full"
          >
            Entrar
          </button>
        </div>
      )}
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Footer (duplicated)
// ---------------------------------------------------------------------------
function Footer() {
  const navigate = useNavigate();
  return (
    <footer className="bg-gray-900 text-gray-300 py-12 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between gap-8 mb-10">
          <div className="flex flex-col gap-3 max-w-xs">
            <div className="flex items-center gap-2 text-white font-bold text-xl">
              <Building2 className="w-6 h-6" />
              OmniLar
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              A plataforma completa para gestão inteligente de condomínios.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-8">
            <div className="flex flex-col gap-2">
              <p className="text-white font-semibold mb-1">Produto</p>
              <button onClick={() => navigate("/")} className="text-gray-400 hover:text-white text-sm text-left transition-colors">Funcionalidades</button>
              <button onClick={() => navigate("/precos")} className="text-gray-400 hover:text-white text-sm text-left transition-colors">Preços</button>
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-white font-semibold mb-1">Empresa</p>
              <a href="https://wa.me/5513991161032" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white text-sm transition-colors">Contato</a>
              <button onClick={() => navigate("/login")} className="text-gray-400 hover:text-white text-sm text-left transition-colors">Entrar</button>
            </div>
          </div>
        </div>
        <div className="border-t border-gray-700 pt-6 text-center text-gray-500 text-sm">
          © OmniLar 2026. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}

// ---------------------------------------------------------------------------
// ScrollToTop button
// ---------------------------------------------------------------------------
function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > 300);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-[#223555] text-white shadow-lg flex items-center justify-center hover:bg-[#1a2a44] transition-colors"
      aria-label="Ir ao topo"
    >
      <ChevronUp className="w-6 h-6" />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Plan data
// ---------------------------------------------------------------------------
type Plan = {
  id: string;
  name: string;
  price: string | null;
  priceAnnual: string | null;
  annualNote?: string;
  highlight: boolean;
  badge?: string;
  features: string[];
  ctaLabel: string;
  ctaWhatsApp?: boolean;
};

const plans: Plan[] = [
  {
    id: "go",
    name: "OmniGO",
    price: "R$ 109,99",
    priceAnnual: "R$ 87,99",
    highlight: false,
    features: [
      "Até 20 moradores",
      "1 administrador",
      "Suporte por e-mail",
      "Funcionalidades básicas",
      "Avisos e comunicados",
      "Agendamento de áreas",
    ],
    ctaLabel: "Assinar agora",
  },
  {
    id: "plus",
    name: "Omni+",
    price: "R$ 169,99",
    priceAnnual: "R$ 135,99",
    highlight: true,
    badge: "Mais popular",
    features: [
      "Até 100 moradores",
      "3 administradores",
      "Suporte prioritário",
      "Relatórios incluídos",
      "Controle financeiro",
      "Gestão de ocorrências",
    ],
    ctaLabel: "Assinar agora",
  },
  {
    id: "ultra",
    name: "OmniUltra",
    price: "Sob consulta",
    priceAnnual: "Sob consulta",
    highlight: false,
    features: [
      "Moradores ilimitados",
      "Admins ilimitados",
      "Suporte dedicado",
      "Relatórios avançados",
      "SLA garantido",
    ],
    ctaLabel: "Falar com a equipe",
    ctaWhatsApp: true,
  },
];

// ---------------------------------------------------------------------------
// Comparison table features
// ---------------------------------------------------------------------------
const comparisonFeatures = [
  { label: "Avisos e comunicados", go: true, plus: true, ultra: true },
  { label: "Controle financeiro básico", go: true, plus: true, ultra: true },
  { label: "Agendamento de áreas", go: true, plus: true, ultra: true },
  { label: "Gestão de ocorrências", go: false, plus: true, ultra: true },
  { label: "Relatórios financeiros", go: false, plus: true, ultra: true },
  { label: "Suporte prioritário", go: false, plus: true, ultra: true },
{ label: "Relatórios avançados", go: false, plus: false, ultra: true },
  { label: "Suporte dedicado (SLA)", go: false, plus: false, ultra: true },
];

// ---------------------------------------------------------------------------
// Pricing Hero
// ---------------------------------------------------------------------------
function PricingHero() {
  return (
    <section className="pt-32 pb-16 px-4 md:px-8 bg-gradient-to-br from-white via-blue-50 to-indigo-50 text-center">
      <div className="max-w-3xl mx-auto">
        <span className="inline-block mb-4 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-sm font-semibold">
          Planos e preços
        </span>
        <h1 className="text-4xl md:text-5xl font-extrabold text-[#223555] leading-tight mb-4">
          Planos simples, sem surpresas
        </h1>
        <p className="text-gray-500 text-lg max-w-xl mx-auto">
          Escolha o plano ideal para o seu condomínio. Sem taxas ocultas, sem contratos longos.
        </p>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Toggle
// ---------------------------------------------------------------------------
function BillingToggle({
  annual,
  onToggle,
}: {
  annual: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-center gap-4 py-6">
      <span className={`font-semibold text-sm ${!annual ? "text-[#223555]" : "text-gray-400"}`}>
        Mensal
      </span>
      <button
        onClick={onToggle}
        className={`relative w-14 h-7 rounded-full transition-colors ${
          annual ? "bg-[#223555]" : "bg-gray-200"
        }`}
        aria-label="Alternar cobrança anual"
      >
        <span
          className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
            annual ? "translate-x-7" : "translate-x-0"
          }`}
        />
      </button>
      <span className={`font-semibold text-sm ${annual ? "text-[#223555]" : "text-gray-400"}`}>
        Anual
      </span>
      {annual && (
        <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-bold">
          20% off
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Plan Cards
// ---------------------------------------------------------------------------
function PlanCards({ annual }: { annual: boolean }) {
  const navigate = useNavigate();
  const { ref, inView } = useInView();

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(32px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-up { opacity: 0; }
        .fade-up.in-view { animation: fadeUp 0.6s ease forwards; }
      `}</style>
      <div
        ref={ref}
        className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto px-4 md:px-8 pb-16"
      >
        {plans.map((plan, i) => (
          <div
            key={plan.id}
            className={`fade-up ${inView ? "in-view" : ""} relative flex flex-col rounded-2xl border shadow-sm p-8 transition-shadow hover:shadow-md ${
              plan.highlight
                ? "bg-[#223555] border-[#223555] text-white"
                : "bg-white border-gray-100 text-gray-800"
            }`}
            style={{ animationDelay: inView ? `${i * 100}ms` : undefined }}
          >
            {/* Badge */}
            {plan.badge && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-indigo-600 text-white text-xs font-bold shadow">
                {plan.badge}
              </span>
            )}

            {/* Plan name */}
            <h3 className={`text-2xl font-extrabold mb-1 ${plan.highlight ? "text-white" : "text-[#223555]"}`}>
              {plan.name}
            </h3>

            {/* Price */}
            <div className="mb-6">
              {plan.price === "Sob consulta" ? (
                <div>
                  <span className={`text-4xl font-extrabold ${plan.highlight ? "text-white" : "text-[#223555]"}`}>
                    Sob consulta
                  </span>
                </div>
              ) : (
                <>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className={`text-4xl font-extrabold ${plan.highlight ? "text-white" : "text-[#223555]"}`}>
                      {annual ? plan.priceAnnual : plan.price}
                    </span>
                    <span className={`text-sm ${plan.highlight ? "text-blue-200" : "text-gray-400"}`}>
                      /mês
                    </span>
                    {annual && plan.priceAnnual !== plan.price && (
                      <span className={`text-sm line-through ${plan.highlight ? "text-blue-300" : "text-gray-300"}`}>
                        {plan.price}
                      </span>
                    )}
                  </div>
                  {annual ? (
                    <p className={`text-xs mt-1 font-medium ${plan.highlight ? "text-blue-200" : "text-indigo-500"}`}>
                      20% de desconto · cobrado anualmente
                    </p>
                  ) : (
                    <p className={`text-xs mt-1 ${plan.highlight ? "text-blue-200" : "text-gray-400"}`}>
                      cobrado mensalmente
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Features */}
            <ul className="flex flex-col gap-3 mb-8 flex-1">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <Check
                    className={`w-4 h-4 shrink-0 ${
                      plan.highlight ? "text-green-300" : "text-indigo-600"
                    }`}
                  />
                  <span className={plan.highlight ? "text-blue-100" : "text-gray-600"}>{f}</span>
                </li>
              ))}
            </ul>

            {/* CTA */}
            {plan.ctaWhatsApp ? (
              <a
                href="https://wa.me/5513991161032"
                target="_blank"
                rel="noopener noreferrer"
                className={`block text-center px-6 py-3 rounded-xl font-bold transition-colors ${
                  plan.highlight
                    ? "bg-white text-[#223555] hover:bg-blue-50"
                    : "bg-[#223555] text-white hover:bg-[#1a2a44]"
                }`}
              >
                {plan.ctaLabel}
              </a>
            ) : (
              <button
                onClick={() => navigate("/login")}
                className={`px-6 py-3 rounded-xl font-bold transition-colors ${
                  plan.highlight
                    ? "bg-white text-[#223555] hover:bg-blue-50"
                    : "bg-[#223555] text-white hover:bg-[#1a2a44]"
                }`}
              >
                {plan.ctaLabel}
              </button>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Comparison Table
// ---------------------------------------------------------------------------
function ComparisonTable() {
  const { ref, inView } = useInView();

  return (
    <section className="py-16 px-4 md:px-8 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-extrabold text-[#223555] text-center mb-10">
          Comparação de funcionalidades
        </h2>
        <div
          ref={ref}
          className={`fade-up ${inView ? "in-view" : ""} overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm`}
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-4 px-6 text-gray-500 font-semibold w-1/2">Funcionalidade</th>
                <th className="py-4 px-4 text-center text-[#223555] font-bold">OmniGO</th>
                <th className="py-4 px-4 text-center text-[#223555] font-bold bg-indigo-50">Omni+</th>
                <th className="py-4 px-4 text-center text-[#223555] font-bold">OmniUltra</th>
              </tr>
            </thead>
            <tbody>
              {comparisonFeatures.map((row, i) => (
                <tr
                  key={row.label}
                  className={`border-b border-gray-50 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}
                >
                  <td className="py-3 px-6 text-gray-600">{row.label}</td>
                  <td className="py-3 px-4 text-center">
                    {row.go ? (
                      <Check className="w-5 h-5 text-green-500 mx-auto" />
                    ) : (
                      <span className="text-gray-300 text-lg">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center bg-indigo-50/50">
                    {row.plus ? (
                      <Check className="w-5 h-5 text-green-500 mx-auto" />
                    ) : (
                      <span className="text-gray-300 text-lg">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {row.ultra ? (
                      <Check className="w-5 h-5 text-green-500 mx-auto" />
                    ) : (
                      <span className="text-gray-300 text-lg">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// FAQ
// ---------------------------------------------------------------------------
const faqItems = [
  {
    q: "O que é o OmniLar?",
    a: "O OmniLar é uma plataforma SaaS completa para gestão de condomínios. Permite que síndicos, administradoras e moradores gerenciem comunicados, finanças, ocorrências, reservas de áreas e muito mais em um único painel online.",
  },
  {
    q: "Posso cancelar a qualquer momento?",
    a: "Sim. Não há fidelidade obrigatória nos planos mensais. Você pode cancelar quando quiser, sem multas. Para planos anuais, o cancelamento encerra a renovação, mas o acesso permanece até o fim do período pago.",
  },
  {
    q: "Funciona para condomínios pequenos?",
    a: "Sim! O plano OmniGO foi desenvolvido especialmente para condomínios menores, com até 20 moradores. Você tem acesso às funcionalidades essenciais com um custo acessível.",
  },
  {
    q: "Como funciona o suporte?",
    a: "O suporte varia por plano. OmniGO conta com suporte por e-mail em horário comercial. Omni+ tem suporte prioritário com tempo de resposta reduzido. OmniUltra tem suporte dedicado com SLA garantido.",
  },
  {
    q: "Há período de teste gratuito?",
    a: "Sim! O plano OmniGO pode ser iniciado gratuitamente por 14 dias, sem necessidade de cartão de crédito. Ao final do período, você escolhe continuar com um plano pago ou exportar seus dados.",
  },
];

function FAQ() {
  const [open, setOpen] = useState<number | null>(null);
  const { ref, inView } = useInView();

  return (
    <section className="py-20 px-4 md:px-8 bg-white">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-extrabold text-[#223555] text-center mb-10">
          Perguntas frequentes
        </h2>
        <div ref={ref} className={`fade-up ${inView ? "in-view" : ""} flex flex-col gap-3`}>
          {faqItems.map((item, i) => (
            <div
              key={item.q}
              className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden"
            >
              <button
                className="w-full flex items-center justify-between px-6 py-4 text-left font-semibold text-[#223555] hover:bg-gray-50 transition-colors"
                onClick={() => setOpen(open === i ? null : i)}
              >
                <span>{item.q}</span>
                {open === i ? (
                  <ChevronUp className="w-5 h-5 text-gray-400 shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" />
                )}
              </button>
              {open === i && (
                <div className="px-6 pb-5 text-gray-500 text-sm leading-relaxed border-t border-gray-50">
                  <p className="pt-4">{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// CTA Final
// ---------------------------------------------------------------------------
function CTAFinal() {
  return (
    <section className="py-20 px-4 md:px-8 bg-[#223555]">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
          Ainda com dúvidas?
        </h2>
        <p className="text-blue-200 text-lg mb-8">
          Nossa equipe está pronta para ajudar você a escolher o plano ideal para o seu condomínio.
        </p>
        <a
          href="https://wa.me/5513991161032"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block px-8 py-4 rounded-xl bg-white text-[#223555] font-bold text-lg hover:bg-blue-50 transition-colors shadow-lg"
        >
          Falar pelo WhatsApp
        </a>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function Precos() {
  const [annual, setAnnual] = useState(false);

  useEffect(() => {
    document.documentElement.style.scrollBehavior = "smooth";
    return () => { document.documentElement.style.scrollBehavior = ""; };
  }, []);

  return (
    <div className="min-h-screen font-sans">
      <Navbar />
      <PricingHero />
      <BillingToggle annual={annual} onToggle={() => setAnnual((v) => !v)} />
      <PlanCards annual={annual} />
      <ComparisonTable />
      <FAQ />
      <CTAFinal />
      <Footer />
      <ScrollToTop />
    </div>
  );
}
