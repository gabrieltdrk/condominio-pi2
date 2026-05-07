import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Megaphone,
  CircleDollarSign,
  Users,
  ClipboardList,
  UserRoundCheck,
  CalendarDays,
  ChevronUp,
  Menu,
  X,
  Building2,
} from "lucide-react";

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
// Smooth-scroll helper
// ---------------------------------------------------------------------------
function scrollTo(id: string) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth" });
}

// ---------------------------------------------------------------------------
// Navbar
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

  const navLinks = [
    { label: "Funcionalidades", action: () => { setMenuOpen(false); scrollTo("funcionalidades"); } },
    { label: "Preços", action: () => { setMenuOpen(false); navigate("/precos"); } },
    { label: "Contato", action: () => { setMenuOpen(false); scrollTo("contato"); } },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100 shadow-sm transition-transform duration-300 ${
        visible ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 md:px-8 flex items-center justify-between h-16">
        {/* Logo */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="flex items-center gap-2 font-bold text-xl text-[#223555]"
        >
          <Building2 className="w-6 h-6" />
          OmniLar
        </button>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((l) => (
            <button
              key={l.label}
              onClick={l.action}
              className="text-gray-600 hover:text-[#223555] font-medium transition-colors"
            >
              {l.label}
            </button>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden md:flex">
          <button
            onClick={() => navigate("/login")}
            className="px-5 py-2 rounded-lg bg-[#223555] text-white font-semibold hover:bg-[#1a2a44] transition-colors"
          >
            Entrar
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 text-[#223555]"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Menu"
        >
          {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 flex flex-col gap-4">
          {navLinks.map((l) => (
            <button
              key={l.label}
              onClick={l.action}
              className="text-left text-gray-700 font-medium hover:text-[#223555] transition-colors"
            >
              {l.label}
            </button>
          ))}
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
// Hero
// ---------------------------------------------------------------------------
function Hero() {
  return (
    <section className="pt-32 pb-20 px-4 md:px-8 bg-gradient-to-br from-white via-blue-50 to-indigo-50">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-12">
        {/* Text */}
        <div className="flex-1 text-center md:text-left">
          <span className="inline-block mb-4 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-sm font-semibold">
            Plataforma SaaS para condomínios
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-[#223555] leading-tight mb-6">
            Gestão inteligente para o seu condomínio
          </h1>
          <p className="text-gray-500 text-lg mb-8 max-w-lg mx-auto md:mx-0">
            Simplifique a administração, melhore a comunicação com moradores e tenha controle total das finanças — tudo em um único painel.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
            <button
              onClick={() => scrollTo("precos-section")}
              className="px-6 py-3 rounded-xl bg-[#223555] text-white font-bold hover:bg-[#1a2a44] transition-colors shadow-md"
            >
              Ver planos
            </button>
            <a
              href="https://wa.me/5513991161032"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 rounded-xl border-2 border-[#223555] text-[#223555] font-bold hover:bg-[#223555] hover:text-white transition-colors"
            >
              Falar com a equipe
            </a>
          </div>
        </div>

        {/* Mockup visual */}
        <div className="flex-1 flex justify-center md:justify-end">
          <div className="w-80 md:w-96 rounded-2xl bg-white shadow-2xl border border-gray-100 p-6 relative">
            {/* Fake header bar */}
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
              <div className="ml-2 flex-1 h-3 rounded bg-gray-100" />
            </div>
            {/* Fake sidebar + content */}
            <div className="flex gap-3">
              <div className="flex flex-col gap-2 w-10">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className={`w-10 h-8 rounded-md ${i === 0 ? "bg-[#223555]" : "bg-gray-100"}`} />
                ))}
              </div>
              <div className="flex-1 flex flex-col gap-3">
                <div className="h-6 rounded bg-indigo-100 w-3/4" />
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { color: "bg-blue-200", label: "Moradores" },
                    { color: "bg-green-200", label: "Finanças" },
                    { color: "bg-purple-200", label: "Avisos" },
                    { color: "bg-orange-200", label: "Áreas" },
                  ].map((c) => (
                    <div key={c.label} className={`${c.color} rounded-xl p-3 flex flex-col gap-1`}>
                      <div className="w-6 h-6 rounded-full bg-white/60" />
                      <div className="text-xs font-semibold text-gray-700">{c.label}</div>
                      <div className="h-2 rounded bg-white/50 w-8" />
                    </div>
                  ))}
                </div>
                <div className="h-16 rounded-xl bg-gray-50 border border-gray-100 flex items-center px-3 gap-2">
                  <div className="w-8 h-8 rounded-full bg-indigo-200" />
                  <div className="flex flex-col gap-1 flex-1">
                    <div className="h-2 rounded bg-gray-200 w-20" />
                    <div className="h-2 rounded bg-gray-100 w-12" />
                  </div>
                  <div className="w-2 h-2 rounded-full bg-green-400" />
                </div>
              </div>
            </div>
            {/* Floating badge */}
            <div className="absolute -top-4 -right-4 bg-[#223555] text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
              Online ✓
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Feature cards data
// ---------------------------------------------------------------------------
const features = [
  {
    icon: Megaphone,
    title: "Avisos e comunicados",
    desc: "Envie comunicados para todos os moradores de forma rápida e organizada, com confirmação de leitura.",
  },
  {
    icon: CircleDollarSign,
    title: "Controle financeiro",
    desc: "Gerencie taxas, boletos e despesas do condomínio com transparência e relatórios detalhados.",
  },
  {
    icon: Users,
    title: "Gestão de moradores",
    desc: "Cadastro completo de unidades, moradores e proprietários, com histórico de atividades.",
  },
  {
    icon: ClipboardList,
    title: "Ocorrências",
    desc: "Registre, acompanhe e resolva ocorrências internas com agilidade e rastreabilidade.",
  },
  {
    icon: UserRoundCheck,
    title: "Visitantes e portaria",
    desc: "Controle o acesso de visitantes com QR Code e autorização digital pelo morador.",
  },
  {
    icon: CalendarDays,
    title: "Agendamento de áreas",
    desc: "Moradores reservam salões, churrasqueiras e quadras diretamente pelo aplicativo.",
  },
];

// ---------------------------------------------------------------------------
// Funcionalidades
// ---------------------------------------------------------------------------
function Funcionalidades() {
  const { ref, inView } = useInView();

  return (
    <section id="funcionalidades" className="py-20 px-4 md:px-8 bg-white">
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(32px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-up {
          opacity: 0;
        }
        .fade-up.in-view {
          animation: fadeUp 0.6s ease forwards;
        }
      `}</style>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-extrabold text-[#223555] mb-4">
            Tudo que seu condomínio precisa
          </h2>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            Funcionalidades pensadas para síndicos, administradoras e moradores.
          </p>
        </div>
        <div ref={ref} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className={`fade-up ${inView ? "in-view" : ""} rounded-2xl border border-gray-100 bg-white shadow-sm p-6 hover:shadow-md transition-shadow`}
                style={{ animationDelay: inView ? `${i * 80}ms` : undefined }}
              >
                <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-indigo-600" />
                </div>
                <h3 className="font-bold text-[#223555] text-lg mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Como Funciona
// ---------------------------------------------------------------------------
function ComoFunciona() {
  const { ref, inView } = useInView();
  const steps = [
    {
      num: "01",
      title: "Cadastre seu condomínio",
      desc: "Informe os dados do condomínio, número de unidades e configure as áreas comuns em minutos.",
    },
    {
      num: "02",
      title: "Convide moradores e síndico",
      desc: "Envie convites por e-mail. Cada morador acessa com login individual e vê apenas suas informações.",
    },
    {
      num: "03",
      title: "Gerencie tudo em um painel",
      desc: "Controle finanças, comunicados, reservas e muito mais pelo dashboard completo do OmniLar.",
    },
  ];

  return (
    <section id="como-funciona" className="py-20 px-4 md:px-8 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-extrabold text-[#223555] mb-4">
            Como funciona
          </h2>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            Comece a usar em menos de 10 minutos, sem instalação.
          </p>
        </div>
        <div ref={ref} className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((s, i) => (
            <div
              key={s.num}
              className={`fade-up ${inView ? "in-view" : ""} flex flex-col items-center text-center`}
              style={{ animationDelay: inView ? `${i * 120}ms` : undefined }}
            >
              <div className="w-16 h-16 rounded-full bg-[#223555] text-white flex items-center justify-center text-2xl font-extrabold mb-5 shadow-lg">
                {s.num}
              </div>
              <h3 className="font-bold text-[#223555] text-xl mb-3">{s.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Depoimentos
// ---------------------------------------------------------------------------
function Depoimentos() {
  const { ref, inView } = useInView();
  const testimonials = [
    {
      name: "Ana Paula Ferreira",
      role: "Síndica — Condomínio Mirante do Sol, Santos/SP",
      quote:
        "O OmniLar transformou a administração do nosso condomínio. Em poucos dias já tínhamos todos os moradores cadastrados e as finanças organizadas.",
    },
    {
      name: "Carlos Eduardo Lima",
      role: "Administrador — Residencial Atlântico, Guarujá/SP",
      quote:
        "A funcionalidade de agendamento de áreas sozinha já valeu o investimento. Acabaram as confusões de reserva do salão de festas!",
    },
    {
      name: "Mariana Costa",
      role: "Moradora — Edifício Bela Vista, São Paulo/SP",
      quote:
        "Finalmente consigo acompanhar o extrato e os avisos do condomínio pelo celular. Muito mais transparência para os moradores.",
    },
  ];

  return (
    <section className="py-20 px-4 md:px-8 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-extrabold text-[#223555] mb-4">
            O que dizem nossos clientes
          </h2>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            Condomínios reais, resultados reais.
          </p>
        </div>
        <div ref={ref} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <div
              key={t.name}
              className={`fade-up ${inView ? "in-view" : ""} rounded-2xl border border-gray-100 bg-white shadow-sm p-6 hover:shadow-md transition-shadow flex flex-col gap-4`}
              style={{ animationDelay: inView ? `${i * 100}ms` : undefined }}
            >
              <p className="text-gray-600 text-sm leading-relaxed italic">"{t.quote}"</p>
              <div className="mt-auto flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-600">
                  {t.name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-[#223555] text-sm">{t.name}</p>
                  <p className="text-gray-400 text-xs">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// CTA final
// ---------------------------------------------------------------------------
function CTAFinal() {
  return (
    <section id="contato" className="py-20 px-4 md:px-8 bg-[#223555]">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
          Pronto para modernizar seu condomínio?
        </h2>
        <p className="text-blue-200 text-lg mb-8">
          Fale com nossa equipe e descubra como o OmniLar pode transformar a gestão do seu condomínio.
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
// Footer
// ---------------------------------------------------------------------------
function Footer() {
  const navigate = useNavigate();
  return (
    <footer className="bg-gray-900 text-gray-300 py-12 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between gap-8 mb-10">
          {/* Brand */}
          <div className="flex flex-col gap-3 max-w-xs">
            <div className="flex items-center gap-2 text-white font-bold text-xl">
              <Building2 className="w-6 h-6" />
              OmniLar
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              A plataforma completa para gestão inteligente de condomínios.
            </p>
          </div>
          {/* Links */}
          <div className="flex flex-col sm:flex-row gap-8">
            <div className="flex flex-col gap-2">
              <p className="text-white font-semibold mb-1">Produto</p>
              <button onClick={() => scrollTo("funcionalidades")} className="text-gray-400 hover:text-white text-sm text-left transition-colors">Funcionalidades</button>
              <button onClick={() => navigate("/precos")} className="text-gray-400 hover:text-white text-sm text-left transition-colors">Preços</button>
              <button onClick={() => scrollTo("como-funciona")} className="text-gray-400 hover:text-white text-sm text-left transition-colors">Como funciona</button>
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
// Page
// ---------------------------------------------------------------------------
export default function Landing() {
  useEffect(() => {
    document.documentElement.style.scrollBehavior = "smooth";
    return () => { document.documentElement.style.scrollBehavior = ""; };
  }, []);

  return (
    <div className="min-h-screen font-sans">
      <Navbar />
      <Hero />
      <Funcionalidades />
      <ComoFunciona />
      <Depoimentos />
      <div id="precos-section" />
      <CTAFinal />
      <Footer />
      <ScrollToTop />
    </div>
  );
}
