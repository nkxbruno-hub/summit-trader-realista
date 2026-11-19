import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createHmac, timingSafeEqual } from "node:crypto";
import path from "node:path";

type Material = { title: string; keywords: string[]; content: string };
type MentorData = {
  mentor: { name: string; method: string; tone: string; handoff: string };
  materials: Material[];
};
type StudentProfile = { name?: string; goal?: string; level?: string; blockers?: string[] };

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const data: MentorData = JSON.parse(await readFile(path.join(root, "data", "mentor.json"), "utf8"));

async function loadDotEnv(): Promise<void> {
  try {
    const content = await readFile(path.join(root, ".env"), "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separator = trimmed.indexOf("=");
      if (separator <= 0) continue;
      const key = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "");
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // .env é opcional: variáveis do ambiente continuam sendo aceitas.
  }
}

await loadDotEnv();
const port = Number(process.env.PORT ?? 3000);
const students = new Map<string, StudentProfile>();
const processedMessageIds = new Set<string>();

function landingPage(): string {
  const checkoutUrl = process.env.CHECKOUT_URL ?? "https://www.instagram.com/traderrealista/";
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="description" content="Summit Trader Realista: um dia inteiro para construir sua base no trade e transformar conhecimento em processo." />
  <title>Summit Trader Realista | Black Friday</title>
  <style>
    body{padding-top:46px}.countdown{position:fixed;inset:0 0 auto;z-index:10;background:linear-gradient(90deg,#ff5e4f,#ef3f4e 55%,#c92a49);box-shadow:0 8px 30px #0006;color:#fff}.countdown .wrap{min-height:46px;display:flex;align-items:center;justify-content:center;gap:18px}.countdown-label{font-size:.72rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase}.countdown-time{display:flex;gap:7px;align-items:center}.countdown-unit{display:flex;align-items:baseline;gap:2px}.countdown-unit strong{font-size:1.05rem;line-height:1;font-variant-numeric:tabular-nums}.countdown-unit span{font-size:.62rem;font-weight:800;text-transform:uppercase;opacity:.75}.countdown-separator{font-weight:900;opacity:.55}.countdown-ended{display:none}@media(max-width:560px){.countdown .wrap{gap:8px}.countdown-label{font-size:.58rem;letter-spacing:.06em}.countdown-time{gap:3px}.countdown-unit strong{font-size:.9rem}.countdown-unit span{font-size:.5rem}}
    :root{--bg:#07100d;--surface:#0d1a15;--surface-2:#12231b;--line:#244233;--text:#f3f8f3;--muted:#a7b9ad;--green:#62e58c;--green-2:#1ca85d;--red:#ff666d;--gold:#ffc96b;--shadow:0 22px 80px #0008}
    .credibility{background:linear-gradient(180deg,#0b1912,#07100d)}.credibility-grid{display:grid;grid-template-columns:.75fr 1.25fr;gap:48px;align-items:center}.experience{border:1px solid #62e58c55;background:#10271a;border-radius:22px;padding:28px;box-shadow:var(--shadow)}.experience strong{display:block;color:var(--green);font-size:clamp(3rem,7vw,5.5rem);line-height:.9;letter-spacing:-.08em}.experience span{display:block;margin-top:16px;color:var(--text);font-weight:800}.experience small{display:block;color:var(--muted);margin-top:8px}.trust-list{display:grid;grid-template-columns:repeat(2,1fr);gap:13px;margin-top:25px}.trust-item{border:1px solid #ffffff12;background:#ffffff05;border-radius:14px;padding:16px;color:var(--muted);font-size:.9rem}.trust-item b{display:block;color:var(--text);margin-bottom:4px}.reviews{margin-top:40px}.reviews-head{display:flex;justify-content:space-between;align-items:end;gap:20px}.carousel-controls{display:flex;gap:8px}.carousel-controls button{width:38px;height:38px;border-radius:50%;border:1px solid #ffffff25;background:#ffffff0a;color:var(--text);font-size:1.15rem;cursor:pointer}.review-track{display:flex;gap:16px;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;margin-top:20px;padding-bottom:8px}.review-track::-webkit-scrollbar{display:none}.review-card{flex:0 0 calc((100% - 32px)/3);scroll-snap-align:start;background:var(--surface);border:1px solid #ffffff14;border-radius:18px;padding:22px;min-height:205px}.stars{color:var(--gold);letter-spacing:.13em;font-size:1rem}.review-card blockquote{margin:17px 0;color:var(--text);font-size:.96rem}.review-card cite{font-style:normal;color:var(--green);font-weight:800;font-size:.85rem}@media(max-width:800px){.credibility-grid{grid-template-columns:1fr;gap:30px}.review-card{flex-basis:82%}.trust-list{grid-template-columns:1fr}}
    *{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:radial-gradient(circle at 80% 0,#183f2a66,transparent 35%),var(--bg);color:var(--text);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.5}a{color:inherit;text-decoration:none}.wrap{width:min(1140px,calc(100% - 40px));margin:auto}.topbar{border-bottom:1px solid #ffffff12;background:#07100dcc;backdrop-filter:blur(14px);position:relative;z-index:2}.topbar .wrap{height:68px;display:flex;align-items:center;justify-content:space-between}.brand{font-weight:900;letter-spacing:-.04em}.brand span{color:var(--green)}.pill{border:1px solid #ffffff25;border-radius:100px;padding:8px 14px;color:var(--muted);font-size:.78rem}.hero{position:relative;overflow:hidden;padding:76px 0 96px}.hero-grid{display:grid;grid-template-columns:1.05fr .95fr;gap:60px;align-items:center}.eyebrow{color:var(--green);font-size:.78rem;font-weight:800;letter-spacing:.16em;text-transform:uppercase}.hero h1{font-size:clamp(2.6rem,6vw,5.55rem);line-height:.96;letter-spacing:-.075em;margin:18px 0 24px;max-width:720px}.hero h1 em{color:var(--green);font-style:normal}.hero p{font-size:1.16rem;color:var(--muted);max-width:590px;margin:0 0 30px}.cta-row{display:flex;gap:13px;flex-wrap:wrap;align-items:center}.btn{border:0;border-radius:12px;padding:15px 21px;font-weight:850;font-size:.96rem;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;transition:.2s transform,.2s background}.btn:hover{transform:translateY(-2px)}.btn-primary{background:var(--green);color:#041109;box-shadow:0 10px 35px #62e58c2b}.btn-primary:hover{background:#83efa4}.btn-secondary{background:transparent;border:1px solid #ffffff2a;color:var(--text)}.micro{font-size:.78rem;color:#7e9386;margin-top:15px}.chart-card{background:linear-gradient(145deg,#11271b,#0b1511);border:1px solid #ffffff17;border-radius:24px;padding:20px;box-shadow:var(--shadow);transform:rotate(1.5deg)}.chart-head{display:flex;justify-content:space-between;color:var(--muted);font-size:.78rem;margin-bottom:18px}.chart-head strong{color:var(--green)}.chart{height:300px;display:flex;align-items:flex-end;justify-content:space-around;gap:9px;border-bottom:1px solid #ffffff1c;background:repeating-linear-gradient(to bottom,transparent 0 59px,#ffffff0d 60px);position:relative}.chart:after{content:"";position:absolute;inset:28% -2% auto;height:2px;background:var(--green);opacity:.5;transform:rotate(-11deg)}.candle{width:14px;height:var(--h);background:var(--c);position:relative;border-radius:2px;box-shadow:0 0 12px color-mix(in srgb,var(--c),transparent 70%)}.candle:before,.candle:after{content:"";position:absolute;width:2px;background:var(--c);left:6px}.candle:before{height:var(--top);top:calc(var(--top) * -1)}.candle:after{height:var(--bottom);bottom:calc(var(--bottom) * -1)}.chart-label{display:flex;justify-content:space-between;padding-top:13px;color:#708579;font-size:.72rem}.ticker{display:flex;gap:22px;overflow:hidden;border-block:1px solid #ffffff10;padding:14px 0;color:#8ca095;font-size:.75rem;text-transform:uppercase;letter-spacing:.1em}.ticker b{color:var(--green)}section{padding:96px 0}.section-kicker{color:var(--gold);font-size:.75rem;text-transform:uppercase;letter-spacing:.16em;font-weight:800}.section-title{font-size:clamp(2rem,4vw,3.5rem);letter-spacing:-.06em;line-height:1.02;margin:14px 0 18px}.section-copy{color:var(--muted);max-width:650px}.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:38px}.card{background:var(--surface);border:1px solid #ffffff12;border-radius:18px;padding:25px}.card .num{color:var(--green);font-weight:900;font-size:2rem}.card h3{margin:16px 0 8px;font-size:1.12rem}.card p{color:var(--muted);font-size:.93rem;margin:0}.dark{background:#091510}.agenda{display:grid;grid-template-columns:.8fr 1.2fr;gap:54px;align-items:start}.timeline{border-left:1px solid var(--line);padding-left:28px}.slot{position:relative;padding:0 0 29px}.slot:before{content:"";position:absolute;width:9px;height:9px;border-radius:50%;background:var(--green);left:-33px;top:7px;box-shadow:0 0 0 5px #62e58c1a}.slot time{font-size:.78rem;color:var(--green);font-weight:800}.slot h3{margin:4px 0 5px}.slot p{margin:0;color:var(--muted);font-size:.92rem}.offer{display:grid;grid-template-columns:1fr .8fr;gap:28px;align-items:center;background:linear-gradient(130deg,#143524,#0c1812);border:1px solid #62e58c42;border-radius:26px;padding:38px;box-shadow:var(--shadow)}.offer h2{font-size:clamp(2rem,4vw,3.5rem);line-height:1;letter-spacing:-.06em;margin:10px 0 15px}.offer p{color:var(--muted)}.price{background:#07100d;border:1px solid #ffffff18;border-radius:18px;padding:26px;text-align:center}.price small{color:var(--muted);text-decoration:line-through}.price strong{display:block;font-size:2.7rem;letter-spacing:-.06em;color:var(--green);margin:4px 0 16px}.spots{color:var(--gold);font-size:.8rem;font-weight:800;margin-bottom:17px}.faq{max-width:780px;margin-top:35px}.faq details{border-bottom:1px solid #ffffff18;padding:20px 0}.faq summary{cursor:pointer;font-weight:750}.faq p{color:var(--muted);margin:12px 0 0}.footer{padding:30px 0 50px;border-top:1px solid #ffffff10;color:#728579;font-size:.8rem;display:flex;justify-content:space-between;gap:20px}.footer a{color:var(--green)}@media(max-width:800px){.hero{padding:55px 0 65px}.hero-grid,.agenda,.offer{grid-template-columns:1fr;gap:32px}.hero h1{font-size:clamp(2.8rem,14vw,4.7rem)}.chart-card{transform:none}.cards{grid-template-columns:1fr}.offer{padding:26px}.footer{flex-direction:column}.topbar .pill{display:none}}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}.btn{transition:none}}
  </style>
</head>
<body>
  <div class="countdown" role="status" aria-live="polite" data-deadline="2026-11-27T23:59:00-03:00"><div class="wrap"><span class="countdown-label">Black Friday termina em</span><div class="countdown-time" data-countdown><span class="countdown-unit"><strong data-days>00</strong><span>dias</span></span><b class="countdown-separator">:</b><span class="countdown-unit"><strong data-hours>00</strong><span>h</span></span><b class="countdown-separator">:</b><span class="countdown-unit"><strong data-minutes>00</strong><span>min</span></span><b class="countdown-separator">:</b><span class="countdown-unit"><strong data-seconds>00</strong><span>s</span></span></div><strong class="countdown-ended">Oferta encerrada</strong></div></div>
  <header class="topbar"><div class="wrap"><a class="brand" href="#top">TRADER<span>REALISTA</span></a><div class="pill">BLACK FRIDAY · 10 VAGAS</div></div></header>
  <main id="top">
    <section class="hero"><div class="wrap hero-grid"><div><div class="eyebrow">19 de dezembro · Barra Funda, SP</div><h1>O mercado não precisa ser um <em>palpite.</em></h1><p>Um dia inteiro para sair da confusão, entender o trade do zero e construir uma estratégia positiva com processo, gestão e consistência.</p><div class="cta-row"><a class="btn btn-primary" href="#vagas">Quero minha vaga →</a><a class="btn btn-secondary" href="#agenda">Ver programação</a></div><div class="micro">Das 09h às 16h · Evento presencial · Conteúdo prático</div></div><div class="chart-card" aria-label="Gráfico decorativo de candles de alta e baixa"><div class="chart-head"><span>TRADER REALISTA / SUMMIT</span><strong>PROCESSO + CONSISTÊNCIA</strong></div><div class="chart">${[38,68,45,82,57,108,73,130,92,157,117,177,142,193].map((h, i) => `<i class="candle" style="--h:${h}px;--top:${10 + i % 4 * 5}px;--bottom:${8 + (i + 2) % 4 * 4}px;--c:${i % 4 === 1 ? 'var(--red)' : 'var(--green)'}"></i>`).join("")}</div><div class="chart-label"><span>BASE</span><span>ESTRATÉGIA</span><span>EXECUÇÃO</span></div></div></div></section>
    <div class="ticker"><div class="wrap"><span>LEITURA DE MERCADO</span> <b>▲ PROCESSO ANTES DO CLIQUE</b> <span>GESTÃO DE RISCO</span> <b>▲ DECISÃO COM CLAREZA</b></div></div>
    <section><div class="wrap"><div class="section-kicker">A virada de chave</div><h2 class="section-title">Você não precisa de mais uma promessa.<br/>Precisa de um método.</h2><p class="section-copy">O Summit Trader Realista foi desenhado para organizar o que parece complexo e transformar informação solta em uma rotina de decisão mais consciente — sem atalhos mágicos.</p><div class="cards"><article class="card"><div class="num">01</div><h3>Comece do ponto certo</h3><p>Entenda fundamentos, contexto e os principais conceitos para parar de operar no escuro.</p></article><article class="card"><div class="num">02</div><h3>Encontre sua estratégia</h3><p>Aprenda a conectar leitura, entrada, saída e gestão em um plano que possa ser testado.</p></article><article class="card"><div class="num">03</div><h3>Construa consistência</h3><p>Troque impulso por processo, registro e disciplina para evoluir operação após operação.</p></article></div></div></section>
    <section class="dark" id="agenda"><div class="wrap agenda"><div><div class="section-kicker">Um dia de imersão</div><h2 class="section-title">Da primeira vela à sua próxima decisão.</h2><p class="section-copy">Uma jornada progressiva, com linguagem direta e espaço para perguntas. Você sai com clareza sobre o que estudar e como praticar.</p></div><div class="timeline"><div class="slot"><time>09:00 · ABERTURA</time><h3>O jogo real do mercado</h3><p>Expectativas, erros comuns e o que realmente sustenta uma evolução.</p></div><div class="slot"><time>10:30 · FUNDAMENTOS</time><h3>Como ler o preço</h3><p>Estrutura, contexto e candles para interpretar movimentos com mais critério.</p></div><div class="slot"><time>13:30 · ESTRATÉGIA</time><h3>Do cenário ao plano</h3><p>Filtros, gatilhos, risco e como transformar uma ideia em regra testável.</p></div><div class="slot"><time>15:00 · CONSISTÊNCIA</time><h3>O plano de evolução</h3><p>Diário, revisão e próximos passos para praticar com responsabilidade.</p></div></div></div></section>
    <section id="vagas"><div class="wrap"><div class="offer"><div><div class="section-kicker">Condição especial de Black Friday</div><h2>10 pessoas.<br/>Uma sala. Um novo processo.</h2><p>As vagas são limitadas para manter a experiência próxima e permitir interação durante o dia. Reserve seu interesse pelo canal oficial do Trader Realista.</p><a class="btn btn-primary" href="${checkoutUrl}" target="_blank" rel="noreferrer">Garantir minha vaga →</a><div class="micro">A inscrição e os valores serão confirmados no canal oficial.</div></div><div class="price"><div class="spots">● RESTAM APENAS 10 VAGAS</div><small>BLACK FRIDAY</small><strong>SUMMIT 2026</strong><span style="color:var(--muted);font-size:.85rem">19/12 · 09h–16h<br/>Barra Funda · São Paulo</span></div></div></div></section>
    <section><div class="wrap"><div class="section-kicker">Perguntas rápidas</div><h2 class="section-title">Antes de tomar sua decisão.</h2><div class="faq"><details open><summary>Preciso já saber operar?</summary><p>Não. O conteúdo começa pela base e avança até a construção de uma estratégia. O importante é chegar disposto a aprender e praticar.</p></details><details><summary>O evento promete lucro?</summary><p>Não. Trade envolve risco e não existe garantia de resultado. O foco do Summit é educação, processo, gestão e tomada de decisão responsável.</p></details><details><summary>Onde será exatamente?</summary><p>Na região da Barra Funda, em São Paulo. O endereço completo e as orientações serão enviados após a confirmação da inscrição.</p></details><details><summary>Como faço para reservar?</summary><p>Clique em “Garantir minha vaga” e fale com o perfil oficial @traderrealista para confirmar disponibilidade e condições.</p></details></div></div></section>
  </main>
  <section class="credibility"><div class="wrap credibility-grid"><div class="experience"><strong>10+</strong><span>anos de experiência no trade da B3</span><small>Uma trajetória construída com estudo, tela, registro e aprendizado contínuo.</small></div><div><div class="section-kicker">Por que confiar no processo</div><h2 class="section-title">Experiência para simplificar o que parece difícil.</h2><p class="section-copy">O Summit é conduzido por quem vive o mercado brasileiro há mais de uma década e entende que consistência nasce de método, não de promessa.</p><div class="trust-list"><div class="trust-item"><b>Base antes da estratégia</b>Clareza para quem está começando.</div><div class="trust-item"><b>Gestão de risco</b>Decisões mais conscientes e sustentáveis.</div><div class="trust-item"><b>Processo testável</b>Regras que podem ser revistas e aprimoradas.</div><div class="trust-item"><b>Comunidade realista</b>Menos hype, mais responsabilidade.</div></div></div></div><div class="wrap reviews"><div class="reviews-head"><div><div class="section-kicker">Experiências de alunos</div><h2 class="section-title">Quem aprende, sente a diferença.</h2></div><div class="carousel-controls"><button type="button" data-review-prev aria-label="Ver avaliações anteriores">‹</button><button type="button" data-review-next aria-label="Ver próximas avaliações">›</button></div></div><div class="review-track" data-review-track aria-label="Avaliações 5 estrelas de alunos"><article class="review-card"><div class="stars" aria-label="5 estrelas">★★★★★</div><blockquote>“[Depoimento real autorizado sobre clareza e processo.]”</blockquote><cite>[Nome Sobrenome]</cite></article><article class="review-card"><div class="stars" aria-label="5 estrelas">★★★★★</div><blockquote>“[Depoimento real autorizado sobre disciplina e gestão.]”</blockquote><cite>[Nome Sobrenome]</cite></article><article class="review-card"><div class="stars" aria-label="5 estrelas">★★★★★</div><blockquote>“[Depoimento real autorizado sobre sair da confusão para um plano.]”</blockquote><cite>[Nome Sobrenome]</cite></article><article class="review-card"><div class="stars" aria-label="5 estrelas">★★★★★</div><blockquote>“[Depoimento real autorizado sobre evolução e consistência.]”</blockquote><cite>[Nome Sobrenome]</cite></article></div><div class="micro">Use apenas depoimentos reais, com autorização dos alunos, antes da campanha.</div></div></section>
  <footer class="footer wrap"><span>© 2026 Trader Realista · Conteúdo educacional, não recomendação de investimento.</span><a href="https://www.instagram.com/traderrealista/" target="_blank" rel="noreferrer">@traderrealista ↗</a></footer>
  <script>
    (() => {
      const polish = document.createElement("style");
      polish.textContent = '.friendly-proof{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:26px}.friendly-proof div{border:1px solid #ffffff14;background:#ffffff06;border-radius:14px;padding:14px 16px}.friendly-proof b{display:block;color:var(--green);font-size:.86rem}.friendly-proof span{display:block;color:var(--muted);font-size:.82rem;margin-top:3px}.how-it-works{background:linear-gradient(180deg,#0d1a15,#07100d)}.how-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:34px}.how-step{background:#ffffff06;border:1px solid #ffffff12;border-radius:18px;padding:24px}.how-step strong{display:block;color:var(--gold);font-size:.78rem;letter-spacing:.12em;text-transform:uppercase}.how-step h3{margin:12px 0 8px}.how-step p{margin:0;color:var(--muted);font-size:.94rem}.soft-note{color:var(--muted);font-size:.9rem;max-width:650px;margin-top:18px}.offer .btn-primary{width:100%;font-size:1rem;padding:17px}.offer .micro{text-align:center}.mobile-cta{display:none}@media(max-width:800px){.friendly-proof,.how-grid{grid-template-columns:1fr}.mobile-cta{display:flex;position:fixed;bottom:14px;left:14px;right:14px;z-index:9;justify-content:center;background:var(--green);color:#041109;border-radius:12px;padding:14px 18px;font-weight:900;box-shadow:0 12px 30px #0008}.footer{padding-bottom:88px}}';
      document.head.appendChild(polish);
      const track = document.querySelector("[data-review-track]");
      const previous = document.querySelector("[data-review-prev]");
      const next = document.querySelector("[data-review-next]");
      const step = () => track ? Math.max(280, track.clientWidth * 0.84) : 320;
      previous?.addEventListener("click", () => track?.scrollBy({ left: -step(), behavior: "smooth" }));
      next?.addEventListener("click", () => track?.scrollBy({ left: step(), behavior: "smooth" }));
    })();
    (() => {
      const testimonials = [
        ["Com o ensinamento do Bruno consegui ter o meu primeiro ano positivo.", "Guilherme Vasconcelos"],
        ["Após o treinamento do Trader Realista, fechei o meu primeiro mês positivo. Estou muito feliz.", "Marcia Costa"],
        ["Com o treinamento finalmente entendi que não preciso estar 100% certo o tempo todo.", "Felipe Araujo"]
      ];
      document.querySelectorAll(".review-card").forEach((card, index) => {
        const testimonial = testimonials[index];
        if (!testimonial) return;
        const quote = card.querySelector("blockquote");
        const author = card.querySelector("cite");
        if (quote) quote.textContent = "“" + testimonial[0] + "”";
        if (author) author.textContent = testimonial[1];
      });
    })();
    (() => {
      document.querySelector("#agenda")?.remove();
      const heroEyebrow = document.querySelector(".hero .eyebrow");
      const heroTitle = document.querySelector(".hero h1");
      const heroCopy = document.querySelector(".hero p");
      const heroMicro = document.querySelector(".hero .micro");
      const secondaryCta = document.querySelector('.hero .btn-secondary');
      const topPill = document.querySelector('.topbar .pill');
      if (heroEyebrow) heroEyebrow.textContent = "Mentoria individual online";
      if (heroTitle) heroTitle.innerHTML = "Do primeiro passo à sua evolução no <em>trade.</em>";
      if (heroCopy) heroCopy.textContent = "Uma mentoria individual online para entender o trade do zero, construir um processo e avançar com acompanhamento por 12 meses e acesso à IA Trader Realista.";
      if (heroMicro) heroMicro.textContent = "Mentoria online · Acesso à IA por 12 meses · Método prático";
      if (secondaryCta) { secondaryCta.textContent = "Ver oferta"; secondaryCta.setAttribute("href", "#vagas"); }
      if (topPill) topPill.textContent = "BLACK FRIDAY · VAGAS LIMITADAS";
      if (heroEyebrow) heroEyebrow.textContent = "Mentoria individual online · para começar com direção";
      if (heroTitle) heroTitle.innerHTML = "Pare de operar no escuro. Comece a construir seu <em>processo.</em>";
      if (heroCopy) heroCopy.textContent = "Voc\u00ea n\u00e3o precisa saber tudo para come\u00e7ar \u2014 precisa de uma sequ\u00eancia clara. Aprenda a ler o mercado, organizar suas decis\u00f5es e praticar com mais consci\u00eancia, com mentoria individual e IA Trader Realista por 12 meses.";
      if (heroMicro) heroMicro.textContent = "Do b\u00e1sico ao plano de opera\u00e7\u00e3o \u00b7 linguagem simples \u00b7 sem promessa de lucro";
      if (secondaryCta) { secondaryCta.textContent = "Como funciona"; secondaryCta.setAttribute("href", "#como-funciona"); }
      if (topPill) topPill.textContent = "BLACK FRIDAY · CONDIÇÃO ESPECIAL";
      const heroWrap = document.querySelector(".hero .wrap");
      if (heroWrap && !document.querySelector(".friendly-proof")) heroWrap.insertAdjacentHTML("beforeend", '<div class="friendly-proof"><div><b>Começa do zero</b><span>Sem precisar já operar.</span></div><div><b>Plano passo a passo</b><span>Você sabe o que estudar.</span></div><div><b>12 meses de IA</b><span>Suporte para continuar praticando.</span></div></div>');
      const ticker = document.querySelector(".ticker");
      if (ticker && !document.querySelector("#como-funciona")) ticker.insertAdjacentHTML("afterend", '<section class="how-it-works" id="como-funciona"><div class="wrap"><div class="section-kicker">Sem complicação</div><h2 class="section-title">Um caminho simples para você saber o próximo passo.</h2><p class="section-copy">A mentoria foi pensada para quem cansou de consumir informação solta e quer transformar aprendizado em prática organizada.</p><div class="how-grid"><article class="how-step"><strong>01 · Entender</strong><h3>Você aprende a base</h3><p>Candlestick, contexto, risco e os conceitos que ajudam a enxergar o mercado com mais clareza.</p></article><article class="how-step"><strong>02 · Organizar</strong><h3>Você monta seu plano</h3><p>Leitura, estratégia, entrada, saída e registro: tudo conectado em um processo que pode ser revisado.</p></article><article class="how-step"><strong>03 · Praticar</strong><h3>Você evolui com método</h3><p>Use o diário e a IA Trader Realista para tirar dúvidas, revisar decisões e manter constância.</p></article></div><p class="soft-note">A meta não é acertar todas as operações. É aprender a tomar decisões melhores e mais conscientes ao longo do tempo.</p></div></section>');
      const offer = document.querySelector("#vagas .offer");
      const offerTitle = offer?.querySelector("h2");
      const offerCopy = offer?.querySelector("p");
      const offerMicro = offer?.querySelector(".micro");
      const priceOld = offer?.querySelector(".price small");
      const priceNew = offer?.querySelector(".price strong");
      const priceDetails = offer?.querySelector(".price span");
      if (offerTitle) offerTitle.innerHTML = "Mentoria individual.<br/>Seu processo começa agora.";
      if (offerTitle) offerTitle.innerHTML = "Comece com dire\u00e7\u00e3o.<br/>Evolua com consist\u00eancia.";
      if (offerCopy) offerCopy.textContent = "Uma condi\u00e7\u00e3o especial para aprender com clareza, organizar seu processo e ter uma ferramenta de apoio durante 12 meses. Voc\u00ea entra para construir base \u2014 n\u00e3o para perseguir promessa f\u00e1cil.";
      if (offerMicro) offerMicro.textContent = "Fale com o perfil oficial para confirmar disponibilidade e receber os pr\u00f3ximos passos.";
      if (spots) spots.textContent = "● CONDIÇÃO ESPECIAL DE BLACK FRIDAY";
      const offerSection = document.querySelector("#vagas");
      if (offerSection) {
        offerSection.insertAdjacentHTML("beforebegin", '<section class="dark mentor-path"><div class="wrap"><div class="section-kicker">O que você recebe</div><h2 class="section-title">Um caminho claro para construir consistência.</h2><p class="section-copy">Materiais e etapas para organizar seus estudos, registrar decisões e evoluir com responsabilidade.</p><div class="cards"><article class="card"><div class="num">01</div><h3>Manual 1x1x1 de Consistência</h3><p>Um método simples para transformar intenção em rotina: uma prioridade, uma decisão e um registro por vez.</p></article><article class="card"><div class="num">02</div><h3>Diário do Trader Disciplinado</h3><p>Um espaço para registrar contexto, entrada, saída, risco, emoções e aprendizados de cada operação.</p></article><article class="card"><div class="num">03</div><h3>Plano da mentoria</h3><p>Da leitura do candlestick e fundamentos até estratégia, gestão, prática guiada e evolução rumo ao primeiro mês positivo.</p></article></div><div class="trust-list"><div class="trust-item"><b>Etapa 1 · Fundamentos</b>Entenda o que é um candlestick, preço, contexto e risco.</div><div class="trust-item"><b>Etapa 2 · Leitura e estratégia</b>Conecte cenário, entrada, saída e regras testáveis.</div><div class="trust-item"><b>Etapa 3 · Prática disciplinada</b>Use o diário para revisar decisões e reduzir o improviso.</div><div class="trust-item"><b>Etapa 4 · Evolução</b>Construa uma rotina de revisão e acompanhe sua jornada até o primeiro mês positivo.</div></div></div></section>');
      }
      if (offerCopy) offerCopy.textContent = "Uma condição especial para entrar na mentoria individual online Trader Realista com acesso à IA Trader Realista durante 12 meses.";
      if (offerMicro) offerMicro.textContent = "Vagas e condições confirmadas pelo canal oficial.";
      if (priceOld) priceOld.textContent = "De R$ 15.000,00";
      if (priceNew) priceNew.textContent = "R$ 297,00";
      if (priceDetails) priceDetails.innerHTML = "Mentoria individual online<br/>Acesso à IA Trader Realista por 12 meses";
      const offerKicker = offer?.querySelector(".section-kicker");
      if (offerKicker) offerKicker.textContent = "Condição especial de Black Friday";
      const spots = offer?.querySelector(".spots");
      if (spots) spots.textContent = "● ACESSO INDIVIDUAL";
      const faq = document.querySelector(".faq");
      if (faq) {
        faq.innerHTML = "<details open><summary>Preciso já saber operar?</summary><p>Não. A mentoria começa pela base e avança até a construção de um processo de decisão.</p></details><details><summary>O que está incluído?</summary><p>Mentoria individual online e acesso à IA Trader Realista pelo período de 12 meses.</p></details><details><summary>O programa promete lucro?</summary><p>Não. Trade envolve risco e não existe garantia de resultado. O foco é educação, processo, gestão e tomada de decisão responsável.</p></details><details><summary>Como faço para reservar?</summary><p>Clique em “Garantir minha vaga” e fale com o perfil oficial @traderrealista para confirmar disponibilidade e condições.</p></details>";
      }
    })();
    (() => {
      const faq = document.querySelector(".faq");
      if (faq) faq.innerHTML = "<details open><summary>Preciso j\u00e1 saber operar?</summary><p>N\u00e3o. A mentoria come\u00e7a pela base e avan\u00e7a at\u00e9 a constru\u00e7\u00e3o de um processo de decis\u00e3o.</p></details><details><summary>O que est\u00e1 inclu\u00eddo?</summary><p>Mentoria individual online e acesso \u00e0 IA Trader Realista pelo per\u00edodo de 12 meses.</p></details><details><summary>E se eu tiver pouco tempo?</summary><p>O plano \u00e9 organizado em passos objetivos para voc\u00ea estudar, registrar e revisar no seu ritmo.</p></details><details><summary>O programa promete lucro?</summary><p>N\u00e3o. Trade envolve risco e n\u00e3o existe garantia de resultado. O foco \u00e9 educa\u00e7\u00e3o, processo, gest\u00e3o e tomada de decis\u00e3o respons\u00e1vel.</p></details><details><summary>Como fa\u00e7o para come\u00e7ar?</summary><p>Clique em “Garantir minha vaga” e fale com o perfil oficial @traderrealista para confirmar disponibilidade e condi\u00e7\u00f5es.</p></details>";
      if (!document.querySelector(".mobile-cta")) document.body.insertAdjacentHTML("beforeend", '<a class="mobile-cta" href="#vagas">Quero conhecer a mentoria</a>');
      const banner = document.querySelector(".countdown");
      if (!banner) return;
      const deadline = new Date(banner.dataset.deadline).getTime();
      const pad = value => String(value).padStart(2, "0");
      const update = () => {
        const remaining = Math.max(0, deadline - Date.now());
        const totalSeconds = Math.floor(remaining / 1000);
        banner.querySelector("[data-days]").textContent = pad(Math.floor(totalSeconds / 86400));
        banner.querySelector("[data-hours]").textContent = pad(Math.floor((totalSeconds % 86400) / 3600));
        banner.querySelector("[data-minutes]").textContent = pad(Math.floor((totalSeconds % 3600) / 60));
        banner.querySelector("[data-seconds]").textContent = pad(totalSeconds % 60);
        if (remaining === 0) {
          banner.querySelector("[data-countdown]").style.display = "none";
          banner.querySelector(".countdown-ended").style.display = "inline";
        }
      };
      update();
      window.setInterval(update, 1000);
    })();
  </script>
</body></html>`;
}

function normalize(value: string): string {
  return value.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function selectMaterial(message: string): Material | undefined {
  const normalized = normalize(message);
  const best = data.materials
    .map((material) => ({ material, score: material.keywords.filter((keyword) => normalized.includes(normalize(keyword))).length }))
    .sort((a, b) => b.score - a.score)[0];
  return best && best.score > 0 ? best.material : undefined;
}

function limitToFourLines(text: string): string {
  return text.replace(/\r/g, "").split("\n").map((line) => line.trim()).filter(Boolean).slice(0, 4).join("\n");
}

function fallbackReply(message: string, profile: StudentProfile): string {
  const material = selectMaterial(message);
  if (!material) return limitToFourLines(`${data.mentor.handoff}\n${data.mentor.name} poderá orientar o próximo passo.`);
  const context = [profile.name && ` ${profile.name}`, profile.goal && `, pensando em ${profile.goal}`].filter(Boolean).join("");
  return limitToFourLines(`Entendi${context}.\n${material.content}\nComece pelo menor passo possível hoje e me conte como foi.`);
}

async function ollamaReply(message: string, profile: StudentProfile, material?: Material): Promise<string | undefined> {
  const url = process.env.OLLAMA_URL;
  const model = process.env.OLLAMA_MODEL;
  if (!url || !model) return undefined;
  const prompt = [
    `Você é o assistente de ${data.mentor.name}. Seja ${data.mentor.tone}.`,
    "Responda em português brasileiro, em no máximo 4 linhas curtas.",
    "Use somente o contexto fornecido. Não invente. Se não houver resposta segura, encaminhe ao mentor.",
    `Perfil do aluno: ${JSON.stringify(profile)}`,
    `Material relevante: ${material?.content ?? "nenhum"}`,
    `Pergunta: ${message}`
  ].join("\n");
  try {
    const response = await fetch(`${url}/api/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model, prompt, stream: false })
    });
    if (!response.ok) return undefined;
    const body = await response.json() as { response?: string };
    return body.response ? limitToFourLines(body.response) : undefined;
  } catch {
    return undefined;
  }
}

async function jsonBody(request: IncomingMessage): Promise<Record<string, unknown>> {
  const body = await rawBody(request);
  return body ? JSON.parse(body) as Record<string, unknown> : {};
}

async function rawBody(request: IncomingMessage): Promise<string> {
  let body = "";
  for await (const chunk of request) body += chunk;
  return body;
}

function send(response: ServerResponse, status: number, payload: unknown): void {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function isValidMetaSignature(raw: string, signature: string | undefined): boolean {
  const secret = process.env.META_APP_SECRET;
  if (!secret) return true;
  if (!signature?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", secret).update(raw).digest("hex");
  const received = signature.slice("sha256=".length);
  return received.length === expected.length && timingSafeEqual(Buffer.from(received), Buffer.from(expected));
}

async function sendWhatsAppText(to: string, text: string): Promise<void> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    console.warn("WhatsApp não configurado: resposta gerada para", to, text);
    return;
  }
  const version = process.env.META_GRAPH_VERSION ?? "v27.0";
  const result = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body: text } })
  });
  if (!result.ok) throw new Error(`Falha ao enviar WhatsApp: ${result.status} ${await result.text()}`);
}

async function processWhatsAppWebhook(body: Record<string, unknown>): Promise<void> {
  const entries = Array.isArray(body.entry) ? body.entry as Record<string, unknown>[] : [];
  for (const entry of entries) {
    const changes = Array.isArray(entry.changes) ? entry.changes as Record<string, unknown>[] : [];
    for (const change of changes) {
      const value = (change.value ?? {}) as Record<string, unknown>;
      const messages = Array.isArray(value.messages) ? value.messages as Record<string, unknown>[] : [];
      const contacts = Array.isArray(value.contacts) ? value.contacts as Record<string, unknown>[] : [];
      for (const incoming of messages) {
        if (incoming.type !== "text" || typeof incoming.from !== "string") continue;
        if (typeof incoming.id === "string") {
          if (processedMessageIds.has(incoming.id)) continue;
          processedMessageIds.add(incoming.id);
          if (processedMessageIds.size > 5000) processedMessageIds.delete(processedMessageIds.values().next().value as string);
        }
        const text = ((incoming.text ?? {}) as Record<string, unknown>).body;
        if (typeof text !== "string" || !text.trim()) continue;
        const contact = (contacts[0]?.profile ?? {}) as Record<string, unknown>;
        const existing = students.get(incoming.from) ?? {};
        const profile: StudentProfile = { ...existing, name: typeof contact.name === "string" ? contact.name : existing.name };
        students.set(incoming.from, profile);
        const material = selectMaterial(text);
        const answer = await ollamaReply(text, profile, material) ?? fallbackReply(text, profile);
        await sendWhatsAppText(incoming.from, answer);
      }
    }
  }
}

const server = createServer(async (request, response) => {
  try {
    if (request.method === "GET" && (request.url === "/" || request.url === "/index.html")) {
      response.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=300" });
      return response.end(landingPage());
    }
    if (request.method === "GET" && request.url === "/health") return send(response, 200, { ok: true });
    if (request.method === "POST" && request.url === "/chat") {
      const body = await jsonBody(request);
      const message = typeof body.message === "string" ? body.message.trim() : "";
      const profile = (body.profile ?? {}) as StudentProfile;
      if (!message) return send(response, 400, { error: "Envie uma mensagem em 'message'." });
      const material = selectMaterial(message);
      const answer = await ollamaReply(message, profile, material) ?? fallbackReply(message, profile);
      return send(response, 200, { answer, mentor: data.mentor.name, material: material?.title ?? null, maxLines: 4 });
    }
    if (request.method === "POST" && request.url === "/webhook/whatsapp") {
      const raw = await rawBody(request);
      const signatureHeader = request.headers["x-hub-signature-256"];
      const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;
      if (!isValidMetaSignature(raw, signature)) return send(response, 403, { error: "Assinatura inválida." });
      const body = JSON.parse(raw) as Record<string, unknown>;
      send(response, 200, { received: true });
      void processWhatsAppWebhook(body).catch((error) => console.error("Falha ao processar webhook WhatsApp:", error));
      return;
    }
    if (request.method === "GET" && request.url?.startsWith("/webhook/whatsapp")) {
      const url = new URL(request.url, `http://${request.headers.host ?? "localhost"}`);
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge");
      if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN && challenge) {
        response.writeHead(200, { "content-type": "text/plain" });
        return response.end(challenge);
      }
      return send(response, 403, { error: "Verificação inválida." });
    }
    send(response, 404, { error: "Rota não encontrada." });
  } catch (error) {
    console.error(error);
    send(response, 400, { error: "Não foi possível processar a requisição." });
  }
});

server.listen(port, () => console.log(`Mentor AI MVP rodando em http://localhost:${port}`));
