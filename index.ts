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
    // .env Ã© opcional: variÃ¡veis do ambiente continuam sendo aceitas.
  }
}

await loadDotEnv();
const port = Number(process.env.PORT ?? 3000);
const students = new Map<string, StudentProfile>();
const processedMessageIds = new Set<string>();

function landingPage(): string {
  const checkoutUrl = process.env.CHECKOUT_URL ?? "https://payfast.greenn.com.br/205806/offer/nXYAha";
  const exitCheckoutUrl = process.env.EXIT_CHECKOUT_URL ?? "https://payfast.greenn.com.br/205806/offer/zM8TUT";
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
  <header class="topbar"><div class="wrap"><a class="brand" href="#top">TRADER<span>REALISTA</span></a><div class="pill">BLACK FRIDAY Â· 10 VAGAS</div></div></header>
  <main id="top">
    <section class="hero"><div class="wrap hero-grid"><div><div class="eyebrow">19 de dezembro Â· Barra Funda, SP</div><h1>O mercado nÃ£o precisa ser um <em>palpite.</em></h1><p>Um dia inteiro para sair da confusÃ£o, entender o trade do zero e construir uma estratÃ©gia positiva com processo, gestÃ£o e consistÃªncia.</p><div class="cta-row"><a class="btn btn-primary" href="#vagas">Quero minha vaga â†’</a><a class="btn btn-secondary" href="#agenda">Ver programaÃ§Ã£o</a></div><div class="micro">Das 09h Ã s 16h Â· Evento presencial Â· ConteÃºdo prÃ¡tico</div></div><div class="chart-card" aria-label="GrÃ¡fico decorativo de candles de alta e baixa"><div class="chart-head"><span>TRADER REALISTA / SUMMIT</span><strong>PROCESSO + CONSISTÃŠNCIA</strong></div><div class="chart">${[38,68,45,82,57,108,73,130,92,157,117,177,142,193].map((h, i) => `<i class="candle" style="--h:${h}px;--top:${10 + i % 4 * 5}px;--bottom:${8 + (i + 2) % 4 * 4}px;--c:${i % 4 === 1 ? 'var(--red)' : 'var(--green)'}"></i>`).join("")}</div><div class="chart-label"><span>BASE</span><span>ESTRATÃ‰GIA</span><span>EXECUÃ‡ÃƒO</span></div></div></div></section>
    <div class="ticker"><div class="wrap"><span>LEITURA DE MERCADO</span> <b>â–² PROCESSO ANTES DO CLIQUE</b> <span>GESTÃƒO DE RISCO</span> <b>â–² DECISÃƒO COM CLAREZA</b></div></div>
    <section><div class="wrap"><div class="section-kicker">A virada de chave</div><h2 class="section-title">VocÃª nÃ£o precisa de mais uma promessa.<br/>Precisa de um mÃ©todo.</h2><p class="section-copy">O Summit Trader Realista foi desenhado para organizar o que parece complexo e transformar informaÃ§Ã£o solta em uma rotina de decisÃ£o mais consciente â€” sem atalhos mÃ¡gicos.</p><div class="cards"><article class="card"><div class="num">01</div><h3>Comece do ponto certo</h3><p>Entenda fundamentos, contexto e os principais conceitos para parar de operar no escuro.</p></article><article class="card"><div class="num">02</div><h3>Encontre sua estratÃ©gia</h3><p>Aprenda a conectar leitura, entrada, saÃ­da e gestÃ£o em um plano que possa ser testado.</p></article><article class="card"><div class="num">03</div><h3>Construa consistÃªncia</h3><p>Troque impulso por processo, registro e disciplina para evoluir operaÃ§Ã£o apÃ³s operaÃ§Ã£o.</p></article></div></div></section>
    <section class="dark" id="agenda"><div class="wrap agenda"><div><div class="section-kicker">Um dia de imersÃ£o</div><h2 class="section-title">Da primeira vela Ã  sua prÃ³xima decisÃ£o.</h2><p class="section-copy">Uma jornada progressiva, com linguagem direta e espaÃ§o para perguntas. VocÃª sai com clareza sobre o que estudar e como praticar.</p></div><div class="timeline"><div class="slot"><time>09:00 Â· ABERTURA</time><h3>O jogo real do mercado</h3><p>Expectativas, erros comuns e o que realmente sustenta uma evoluÃ§Ã£o.</p></div><div class="slot"><time>10:30 Â· FUNDAMENTOS</time><h3>Como ler o preÃ§o</h3><p>Estrutura, contexto e candles para interpretar movimentos com mais critÃ©rio.</p></div><div class="slot"><time>13:30 Â· ESTRATÃ‰GIA</time><h3>Do cenÃ¡rio ao plano</h3><p>Filtros, gatilhos, risco e como transformar uma ideia em regra testÃ¡vel.</p></div><div class="slot"><time>15:00 Â· CONSISTÃŠNCIA</time><h3>O plano de evoluÃ§Ã£o</h3><p>DiÃ¡rio, revisÃ£o e prÃ³ximos passos para praticar com responsabilidade.</p></div></div></div></section>
    <section id="vagas"><div class="wrap"><div class="offer"><div><div class="section-kicker">CondiÃ§Ã£o especial de Black Friday</div><h2>10 pessoas.<br/>Uma sala. Um novo processo.</h2><p>As vagas sÃ£o limitadas para manter a experiÃªncia prÃ³xima e permitir interaÃ§Ã£o durante o dia. Reserve seu interesse pelo canal oficial do Trader Realista.</p><a class="btn btn-primary" href="${checkoutUrl}" target="_blank" rel="noreferrer">Garantir minha vaga â†’</a><div class="micro">A inscriÃ§Ã£o e os valores serÃ£o confirmados no canal oficial.</div></div><div class="price"><div class="spots">â— RESTAM APENAS 10 VAGAS</div><small>BLACK FRIDAY</small><strong>SUMMIT 2026</strong><span style="color:var(--muted);font-size:.85rem">19/12 Â· 09hâ€“16h<br/>Barra Funda Â· SÃ£o Paulo</span></div></div></div></section>
    <section><div class="wrap"><div class="section-kicker">Perguntas rÃ¡pidas</div><h2 class="section-title">Antes de tomar sua decisÃ£o.</h2><div class="faq"><details open><summary>Preciso jÃ¡ saber operar?</summary><p>NÃ£o. O conteÃºdo comeÃ§a pela base e avanÃ§a atÃ© a construÃ§Ã£o de uma estratÃ©gia. O importante Ã© chegar disposto a aprender e praticar.</p></details><details><summary>O evento promete lucro?</summary><p>NÃ£o. Trade envolve risco e nÃ£o existe garantia de resultado. O foco do Summit Ã© educaÃ§Ã£o, processo, gestÃ£o e tomada de decisÃ£o responsÃ¡vel.</p></details><details><summary>Onde serÃ¡ exatamente?</summary><p>Na regiÃ£o da Barra Funda, em SÃ£o Paulo. O endereÃ§o completo e as orientaÃ§Ãµes serÃ£o enviados apÃ³s a confirmaÃ§Ã£o da inscriÃ§Ã£o.</p></details><details><summary>Como faÃ§o para reservar?</summary><p>Clique em â€œGarantir minha vagaâ€ e fale com o perfil oficial @traderrealista para confirmar disponibilidade e condiÃ§Ãµes.</p></details></div></div></section>
  </main>
  <section class="credibility"><div class="wrap credibility-grid"><div class="experience"><strong>10+</strong><span>anos de experiÃªncia no trade da B3</span><small>Uma trajetÃ³ria construÃ­da com estudo, tela, registro e aprendizado contÃ­nuo.</small></div><div><div class="section-kicker">Por que confiar no processo</div><h2 class="section-title">ExperiÃªncia para simplificar o que parece difÃ­cil.</h2><p class="section-copy">O Summit Ã© conduzido por quem vive o mercado brasileiro hÃ¡ mais de uma dÃ©cada e entende que consistÃªncia nasce de mÃ©todo, nÃ£o de promessa.</p><div class="trust-list"><div class="trust-item"><b>Base antes da estratÃ©gia</b>Clareza para quem estÃ¡ comeÃ§ando.</div><div class="trust-item"><b>GestÃ£o de risco</b>DecisÃµes mais conscientes e sustentÃ¡veis.</div><div class="trust-item"><b>Processo testÃ¡vel</b>Regras que podem ser revistas e aprimoradas.</div><div class="trust-item"><b>Comunidade realista</b>Menos hype, mais responsabilidade.</div></div></div></div><div class="wrap reviews"><div class="reviews-head"><div><div class="section-kicker">ExperiÃªncias de alunos</div><h2 class="section-title">Quem aprende, sente a diferenÃ§a.</h2></div><div class="carousel-controls"><button type="button" data-review-prev aria-label="Ver avaliaÃ§Ãµes anteriores">â€¹</button><button type="button" data-review-next aria-label="Ver prÃ³ximas avaliaÃ§Ãµes">â€º</button></div></div><div class="review-track" data-review-track aria-label="AvaliaÃ§Ãµes 5 estrelas de alunos"><article class="review-card"><div class="stars" aria-label="5 estrelas">â˜…â˜…â˜…â˜…â˜…</div><blockquote>â€œ[Depoimento real autorizado sobre clareza e processo.]â€</blockquote><cite>[Nome Sobrenome]</cite></article><article class="review-card"><div class="stars" aria-label="5 estrelas">â˜…â˜…â˜…â˜…â˜…</div><blockquote>â€œ[Depoimento real autorizado sobre disciplina e gestÃ£o.]â€</blockquote><cite>[Nome Sobrenome]</cite></article><article class="review-card"><div class="stars" aria-label="5 estrelas">â˜…â˜…â˜…â˜…â˜…</div><blockquote>â€œ[Depoimento real autorizado sobre sair da confusÃ£o para um plano.]â€</blockquote><cite>[Nome Sobrenome]</cite></article><article class="review-card"><div class="stars" aria-label="5 estrelas">â˜…â˜…â˜…â˜…â˜…</div><blockquote>â€œ[Depoimento real autorizado sobre evoluÃ§Ã£o e consistÃªncia.]â€</blockquote><cite>[Nome Sobrenome]</cite></article></div><div class="micro">Use apenas depoimentos reais, com autorizaÃ§Ã£o dos alunos, antes da campanha.</div></div></section>
  <footer class="footer wrap"><span>Â© 2026 Trader Realista Â· ConteÃºdo educacional, nÃ£o recomendaÃ§Ã£o de investimento.</span><a href="https://www.instagram.com/traderrealista/" target="_blank" rel="noreferrer">@traderrealista â†—</a></footer>
  <script>
    (() => {
      const polish = document.createElement("style");
      polish.textContent = '.friendly-proof{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:26px}.friendly-proof div{border:1px solid #ffffff14;background:#ffffff06;border-radius:14px;padding:14px 16px}.friendly-proof b{display:block;color:var(--green);font-size:.86rem}.friendly-proof span{display:block;color:var(--muted);font-size:.82rem;margin-top:3px}.how-it-works{background:linear-gradient(180deg,#0d1a15,#07100d)}.how-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:34px}.how-step{background:#ffffff06;border:1px solid #ffffff12;border-radius:18px;padding:24px}.how-step strong{display:block;color:var(--gold);font-size:.78rem;letter-spacing:.12em;text-transform:uppercase}.how-step h3{margin:12px 0 8px}.how-step p{margin:0;color:var(--muted);font-size:.94rem}.soft-note{color:var(--muted);font-size:.9rem;max-width:650px;margin-top:18px}.offer .btn-primary{width:100%;font-size:1rem;padding:17px}.offer .micro{text-align:center}.inspired-nav{display:flex;gap:18px;align-items:center;margin-left:auto;margin-right:18px;font-size:.76rem;color:var(--muted)}.inspired-nav a:hover{color:var(--green)}.proof-strip{padding:28px 0;background:#0b1812;border-block:1px solid #ffffff10}.proof-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:#ffffff12;border:1px solid #ffffff12;border-radius:18px;overflow:hidden}.proof-item{background:#0d1a15;padding:22px;text-align:center}.proof-item strong{display:block;color:var(--green);font-size:1.55rem;letter-spacing:-.04em}.proof-item span{display:block;color:var(--muted);font-size:.78rem;margin-top:4px}.ecosystem{padding-top:68px}.ecosystem-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:30px}.ecosystem-card{border:1px solid #ffffff12;border-radius:18px;background:linear-gradient(145deg,#12241a,#0b1511);padding:23px}.ecosystem-card b{color:var(--gold);font-size:.75rem;letter-spacing:.13em;text-transform:uppercase}.ecosystem-card h3{margin:12px 0 8px}.ecosystem-card p{margin:0;color:var(--muted);font-size:.9rem}.market-panel .candle{transform-box:fill-box;transform-origin:center;animation:candleFloat 2.6s ease-in-out infinite;animation-delay:calc(var(--i, 0) * -120ms)}@keyframes candleFloat{0%,100%{transform:translateY(0) scaleY(1)}50%{transform:translateY(-7px) scaleY(1.04)}}.market-stamp{position:absolute;right:10px;top:9px;width:72px;height:72px;border:2px solid var(--gold);border-radius:50%;display:grid;place-items:center;text-align:center;color:var(--gold);font-size:.46rem;line-height:1.05;font-weight:900;letter-spacing:.08em;transform:rotate(10deg);background:#07100dcc;box-shadow:0 0 0 4px #ffc96b22,inset 0 0 0 3px #ffc96b18;z-index:2}.market-panel{position:relative}.mobile-cta{display:none}@media(max-width:800px){.friendly-proof,.how-grid,.proof-grid,.ecosystem-grid{grid-template-columns:1fr}.inspired-nav{display:none}.mobile-cta{display:flex;position:fixed;bottom:14px;left:14px;right:14px;z-index:9;justify-content:center;background:var(--green);color:#041109;border-radius:12px;padding:14px 18px;font-weight:900;box-shadow:0 12px 30px #0008}.footer{padding-bottom:88px}}';
      document.head.appendChild(polish);
      const marketStyle = document.createElement("style");
      marketStyle.textContent = '.market-board{background:#07100d;border:1px solid #ffffff18;border-radius:18px;overflow:hidden}.market-toolbar{display:flex;justify-content:space-between;gap:12px;padding:12px 14px;border-bottom:1px solid #ffffff12;color:var(--muted);font-size:.72rem}.market-toolbar b{color:var(--green)}.market-panels{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:#ffffff12}.market-panel{background:#091510;padding:14px}.market-panel h4{margin:0 0 8px;color:var(--text);font-size:.78rem;display:flex;justify-content:space-between}.market-panel h4 span{color:var(--green);font-weight:700}.market-panel svg{width:100%;height:auto;display:block;background:repeating-linear-gradient(to bottom,transparent 0 28px,#ffffff0d 29px),repeating-linear-gradient(to right,transparent 0 46px,#ffffff08 47px)}.market-caption{padding:10px 14px;color:#789083;font-size:.7rem;border-top:1px solid #ffffff12}@media(max-width:560px){.market-panels{grid-template-columns:1fr}.market-panel:nth-child(2){border-top:1px solid #ffffff12}}.cta-center{display:flex;justify-content:center;margin-top:30px}.cta-center .btn{min-width:230px}.cta-soft{border:1px solid #62e58c55;background:#62e58c0d;color:var(--green);border-radius:12px;padding:15px 21px;font-weight:850;display:inline-flex;justify-content:center}.cta-soft:hover{background:#62e58c18}';
      document.head.appendChild(marketStyle);
      const visualStyle = document.createElement("style");
      visualStyle.textContent = '.hero{background:radial-gradient(circle at 78% 16%,#1d4d3280 0,#10281d55 25%,transparent 52%),linear-gradient(135deg,#08110d 0%,#0b1b13 58%,#06100b 100%);box-shadow:inset 0 -1px 0 #ffffff12}.market-board{box-shadow:0 26px 70px #0009,0 0 0 1px #62e58c12}.market-intro{display:flex;justify-content:space-between;align-items:end;gap:20px;padding:18px 18px 14px;border-bottom:1px solid #ffffff12;background:linear-gradient(90deg,#12291c,#0b1711)}.market-intro strong{display:block;color:#f4fff7;font-size:.9rem;letter-spacing:.03em}.market-intro span{display:block;margin-top:5px;color:#91ad9b;font-size:.72rem}.market-intro b{color:#ffc96b;font-size:.65rem;letter-spacing:.12em;text-transform:uppercase;white-space:nowrap}.market-panel{background:linear-gradient(145deg,#0d1d15,#07100c);box-shadow:inset 0 1px 0 #ffffff08}.market-panel h4{letter-spacing:.02em}.market-panel svg{filter:drop-shadow(0 7px 9px #0006)}.proof-strip{background:linear-gradient(180deg,#102419,#09140f);box-shadow:inset 0 1px 0 #ffffff0d,inset 0 -1px 0 #0008}.ecosystem-card,.how-step,.card,.review-card{box-shadow:0 18px 42px #0005, inset 0 1px 0 #ffffff0a}';
      document.head.appendChild(visualStyle);
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
        ["ApÃ³s o treinamento do Trader Realista, fechei o meu primeiro mÃªs positivo. Estou muito feliz.", "Marcia Costa"],
        ["Com o treinamento finalmente entendi que nÃ£o preciso estar 100% certo o tempo todo.", "Felipe Araujo"]
      ];
      document.querySelectorAll(".review-card").forEach((card, index) => {
        const testimonial = testimonials[index];
        if (!testimonial) return;
        const quote = card.querySelector("blockquote");
        const author = card.querySelector("cite");
        if (quote) quote.textContent = "â€œ" + testimonial[0] + "â€";
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
      if (heroTitle) heroTitle.innerHTML = "Do primeiro passo Ã  sua evoluÃ§Ã£o no <em>trade.</em>";
      if (heroCopy) heroCopy.textContent = "Uma mentoria individual online para entender o trade do zero, construir um processo e avanÃ§ar com acompanhamento por 12 meses e acesso Ã  IA Trader Realista.";
      if (heroMicro) heroMicro.textContent = "Mentoria online Â· Acesso Ã  IA por 12 meses Â· MÃ©todo prÃ¡tico";
      if (secondaryCta) { secondaryCta.textContent = "Ver oferta"; secondaryCta.setAttribute("href", "#vagas"); }
      if (topPill) topPill.textContent = "BLACK FRIDAY Â· VAGAS LIMITADAS";
      if (heroEyebrow) heroEyebrow.textContent = "Mentoria individual online Â· para comeÃ§ar com direÃ§Ã£o";
      if (heroTitle) heroTitle.innerHTML = "Pare de operar no escuro. Comece a construir seu <em>processo.</em>";
      if (heroCopy) heroCopy.textContent = "Voc\u00ea n\u00e3o precisa saber tudo para come\u00e7ar \u2014 precisa de uma sequ\u00eancia clara. Aprenda a ler o mercado, organizar suas decis\u00f5es e praticar com mais consci\u00eancia, com mentoria individual e IA Trader Realista por 12 meses.";
      if (heroMicro) heroMicro.textContent = "Do b\u00e1sico ao plano de opera\u00e7\u00e3o \u00b7 linguagem simples \u00b7 sem promessa de lucro";
      if (secondaryCta) { secondaryCta.textContent = "Como funciona"; secondaryCta.setAttribute("href", "#como-funciona"); }
      if (topPill) topPill.textContent = "BLACK FRIDAY Â· CONDIÃ‡ÃƒO ESPECIAL";
      const heroWrap = document.querySelector(".hero .wrap");
      if (heroWrap && !document.querySelector(".friendly-proof")) heroWrap.insertAdjacentHTML("beforeend", '<div class="friendly-proof"><div><b>ComeÃ§a do zero</b><span>Sem precisar jÃ¡ operar.</span></div><div><b>Plano passo a passo</b><span>VocÃª sabe o que estudar.</span></div><div><b>12 meses de IA</b><span>Suporte para continuar praticando.</span></div></div>');
      const ticker = document.querySelector(".ticker");
      const topbar = document.querySelector(".topbar .wrap");
      document.querySelector(".reviews")?.setAttribute("id", "depoimentos");
      if (topbar && !document.querySelector(".inspired-nav")) topbar.insertAdjacentHTML("beforeend", '<nav class="inspired-nav" aria-label="NavegaÃ§Ã£o rÃ¡pida"><a href="#como-funciona">MÃ©todo</a><a href="#vagas">Oferta</a><a href="#depoimentos">Alunos</a></nav>');
      if (ticker && !document.querySelector("#proof-strip")) ticker.insertAdjacentHTML("afterend", '<section class="proof-strip" id="proof-strip"><div class="wrap proof-grid"><div class="proof-item"><strong>10+ anos</strong><span>vivendo o mercado da B3</span></div><div class="proof-item"><strong>1 a 1</strong><span>mentoria online com direÃ§Ã£o</span></div><div class="proof-item"><strong>12 meses</strong><span>de acesso Ã  IA Trader Realista</span></div></div></section><section class="ecosystem"><div class="wrap"><div class="section-kicker">Um ecossistema para praticar melhor</div><h2 class="section-title">Tudo conectado para vocÃª nÃ£o estudar sozinho.</h2><p class="section-copy">ConteÃºdo, registro e apoio no mesmo caminho: menos informaÃ§Ã£o solta, mais clareza para executar e revisar.</p><div class="ecosystem-grid"><article class="ecosystem-card"><b>01 Â· Base</b><h3>Aprenda a ler o mercado</h3><p>Candlesticks, contexto e risco explicados de um jeito que conversa com a sua rotina.</p></article><article class="ecosystem-card"><b>02 Â· Processo</b><h3>Transforme estudo em plano</h3><p>Organize regras, entradas, saÃ­das e critÃ©rios para tomar decisÃµes mais conscientes.</p></article><article class="ecosystem-card"><b>03 Â· EvoluÃ§Ã£o</b><h3>Revise com apoio</h3><p>Use o diÃ¡rio e a IA Trader Realista para tirar dÃºvidas e enxergar seus prÃ³ximos passos.</p></article></div></div></section>');
      if (ticker && !document.querySelector("#como-funciona")) ticker.insertAdjacentHTML("afterend", '<section class="how-it-works" id="como-funciona"><div class="wrap"><div class="section-kicker">Sem complicaÃ§Ã£o</div><h2 class="section-title">Um caminho simples para vocÃª saber o prÃ³ximo passo.</h2><p class="section-copy">A mentoria foi pensada para quem cansou de consumir informaÃ§Ã£o solta e quer transformar aprendizado em prÃ¡tica organizada.</p><div class="how-grid"><article class="how-step"><strong>01 Â· Entender</strong><h3>VocÃª aprende a base</h3><p>Candlestick, contexto, risco e os conceitos que ajudam a enxergar o mercado com mais clareza.</p></article><article class="how-step"><strong>02 Â· Organizar</strong><h3>VocÃª monta seu plano</h3><p>Leitura, estratÃ©gia, entrada, saÃ­da e registro: tudo conectado em um processo que pode ser revisado.</p></article><article class="how-step"><strong>03 Â· Praticar</strong><h3>VocÃª evolui com mÃ©todo</h3><p>Use o diÃ¡rio e a IA Trader Realista para tirar dÃºvidas, revisar decisÃµes e manter constÃ¢ncia.</p></article></div><p class="soft-note">A meta nÃ£o Ã© acertar todas as operaÃ§Ãµes. Ã‰ aprender a tomar decisÃµes melhores e mais conscientes ao longo do tempo.</p></div></section>');
      const chartCard = document.querySelector(".chart-card");
      if (chartCard) chartCard.innerHTML = '<div class="market-board"><div class="market-toolbar"><span>LEITURA DE MERCADO</span><b>SIMULAÃ‡ÃƒO EDUCACIONAL</b></div><div class="market-panels"><div class="market-panel"><div class="market-stamp">TRADER<br/>REALISTA<br/>EDU</div><h4>WIN Â· Mini Ã­ndice <span>+0,42%</span></h4><svg viewBox="0 0 320 170" role="img" aria-label="GrÃ¡fico ilustrativo do mini Ã­ndice"><path d="M0 132 L26 118 L44 126 L66 94 L82 104 L104 76 L122 88 L143 58 L161 73 L181 42 L202 56 L224 31 L244 46 L266 22 L286 35 L320 15" fill="none" stroke="#62e58c" stroke-width="3"/><path d="M0 132 L26 118 L44 126 L66 94 L82 104 L104 76 L122 88 L143 58 L161 73 L181 42 L202 56 L224 31 L244 46 L266 22 L286 35 L320 15 L320 170 L0 170Z" fill="#62e58c12"/><line x1="0" y1="126" x2="320" y2="126" stroke="#ffc96b" stroke-dasharray="5 5"/><text x="8" y="160" fill="#789083" font-size="10">09:00</text><text x="260" y="160" fill="#789083" font-size="10">17:00</text></svg></div><div class="market-panel"><div class="market-stamp">TRADER<br/>REALISTA<br/>EDU</div><h4>WDO Â· Mini dÃ³lar <span style="color:var(--red)">-0,18%</span></h4><svg viewBox="0 0 320 170" role="img" aria-label="GrÃ¡fico ilustrativo do mini dÃ³lar"><path d="M0 42 L24 54 L48 47 L72 69 L94 60 L116 82 L138 72 L160 98 L182 86 L204 112 L226 104 L248 130 L270 118 L294 142 L320 134" fill="none" stroke="#ff666d" stroke-width="3"/><path d="M0 42 L24 54 L48 47 L72 69 L94 60 L116 82 L138 72 L160 98 L182 86 L204 112 L226 104 L248 130 L270 118 L294 142 L320 134 L320 170 L0 170Z" fill="#ff666d12"/><line x1="0" y1="86" x2="320" y2="86" stroke="#ffc96b" stroke-dasharray="5 5"/><text x="8" y="160" fill="#789083" font-size="10">09:00</text><text x="260" y="160" fill="#789083" font-size="10">17:00</text></svg></div></div><div class="market-caption">Exemplo visual para explicar contexto, tendÃªncia e risco. NÃ£o Ã© recomendaÃ§Ã£o de operaÃ§Ã£o.</div></div>';
      const candleSets = [
        [{x:18,o:128,c:112,h:104,l:138,up:true},{x:42,o:112,c:120,h:101,l:132,up:false},{x:66,o:120,c:92,h:84,l:132,up:true},{x:90,o:92,c:100,h:78,l:114,up:false},{x:114,o:100,c:72,h:61,l:108,up:true},{x:138,o:72,c:84,h:63,l:96,up:false},{x:162,o:84,c:58,h:48,l:94,up:true},{x:186,o:58,c:68,h:42,l:78,up:false},{x:210,o:68,c:42,h:32,l:76,up:true},{x:234,o:42,c:51,h:28,l:60,up:false},{x:258,o:51,c:27,h:19,l:62,up:true},{x:282,o:27,c:38,h:15,l:47,up:false}],
        [{x:18,o:42,c:57,h:31,l:68,up:false},{x:42,o:57,c:49,h:39,l:73,up:true},{x:66,o:49,c:74,h:37,l:88,up:false},{x:90,o:74,c:61,h:52,l:86,up:true},{x:114,o:61,c:91,h:48,l:104,up:false},{x:138,o:91,c:78,h:67,l:110,up:true},{x:162,o:78,c:108,h:65,l:122,up:false},{x:186,o:108,c:94,h:82,l:124,up:true},{x:210,o:94,c:128,h:79,l:142,up:false},{x:234,o:128,c:116,h:105,l:141,up:true},{x:258,o:116,c:143,h:101,l:155,up:false},{x:282,o:143,c:132,h:120,l:151,up:true}]
      ];
      const styleTradingSvg = (svg) => {
        const content = svg.innerHTML;
        svg.innerHTML = '<rect class="chart-bg" x="0" y="0" width="320" height="170" fill="#29415d"/><g class="chart-grid"><path d="M0 28H320M0 60H320M0 92H320M0 124H320M64 0V150M128 0V150M192 0V150M256 0V150"/></g>' + content + '<path class="ma-green" d="M0 126 C35 118 55 100 86 113 S125 95 158 78 S210 65 250 52 S290 38 320 24"/><path class="ma-orange" d="M0 118 C40 130 70 125 105 120 S170 112 210 100 S270 91 320 78"/><g class="price-labels"><text x="282" y="24">210.835</text><text x="282" y="57">210.505</text><text x="282" y="90">210.021</text><text x="282" y="123">209.485</text></g>';
        svg.querySelectorAll('.candle').forEach((candle) => { const rect = candle.querySelector('rect'); const line = candle.querySelector('line'); if (rect) { rect.setAttribute('fill', '#f4f6f4'); rect.setAttribute('stroke', '#f4f6f4'); rect.setAttribute('stroke-width', '1'); } if (line) line.setAttribute('stroke', '#f4f6f4'); });
      };
      document.querySelectorAll(".market-panel svg").forEach((svg, panelIndex) => {
        const candles = candleSets[panelIndex] || candleSets[0];
        svg.innerHTML = candles.map((c, i) => '<g class="candle" style="--i:' + i + '"><line x1="' + c.x + '" y1="' + c.h + '" x2="' + c.x + '" y2="' + c.l + '" stroke="' + (c.up ? '#62e58c' : '#ff666d') + '" stroke-width="2"/><rect x="' + (c.x - 5) + '" y="' + Math.min(c.o,c.c) + '" width="10" height="' + Math.max(7,Math.abs(c.c-c.o)) + '" rx="2" fill="' + (c.up ? '#62e58c' : '#ff666d') + '"/></g>').join('') + '<line x1="0" y1="126" x2="320" y2="126" stroke="#ffc96b" stroke-dasharray="5 5"/><text x="8" y="160" fill="#789083" font-size="10">09:00</text><text x="260" y="160" fill="#789083" font-size="10">17:00</text>';
        styleTradingSvg(svg);
      });
      const marketBoard = document.querySelector(".market-board");
      marketBoard?.querySelectorAll(".market-stamp").forEach((stamp) => stamp.remove());
      const marketPanels = marketBoard?.querySelector(".market-panels");
      if (marketBoard && marketPanels && !marketBoard.querySelector(".market-intro")) marketPanels.insertAdjacentHTML("beforebegin", '<div class="market-intro"><div><strong>Leitura visual do mercado</strong><span>WIN e WDO em candles Â· exemplo educacional para estudar contexto e movimento</span></div><b>PLATAFORMA DE ESTUDO</b></div>');
      const galleryStyle = document.createElement("style");
      galleryStyle.textContent = '.market-gallery{padding:82px 0;background:linear-gradient(180deg,#07110c,#102319 48%,#07100b);border-block:1px solid #ffffff12}.gallery-head{display:flex;justify-content:space-between;align-items:end;gap:20px;margin-bottom:28px}.gallery-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}.gallery-card{position:relative;background:linear-gradient(145deg,#12271b,#08130e);border:1px solid #ffffff18;border-radius:20px;padding:18px;box-shadow:0 24px 60px #0008,inset 0 1px 0 #ffffff0c}.gallery-card:after{content:"";position:absolute;inset:0;border-radius:20px;pointer-events:none;box-shadow:inset 0 0 0 1px #62e58c12}.gallery-card h3{margin:0;color:#f4fff7;font-size:1rem}.gallery-card p{margin:6px 0 16px;color:#91ad9b;font-size:.76rem}.gallery-card .terminal-meta{display:flex;justify-content:space-between;color:#789083;font-size:.68rem;margin-bottom:10px}.gallery-card svg{width:100%;height:auto;display:block;border:1px solid #ffffff12;border-radius:12px;background:repeating-linear-gradient(to bottom,transparent 0 30px,#ffffff0d 31px),repeating-linear-gradient(to right,transparent 0 48px,#ffffff08 49px);filter:drop-shadow(0 8px 12px #0008)}.market-gallery .candle{transform-box:fill-box;transform-origin:center;animation:candleFloat 2.6s ease-in-out infinite;animation-delay:calc(var(--i, 0) * -120ms)}.floating-buy{position:fixed;right:24px;bottom:24px;z-index:20;display:inline-flex;align-items:center;gap:9px;padding:15px 20px;border-radius:999px;background:linear-gradient(135deg,#7af29c,#3cbd70);color:#041109;font-weight:900;text-decoration:none;box-shadow:0 16px 38px #000b,0 0 0 4px #62e58c1c;transition:transform .2s ease,box-shadow .2s ease}.floating-buy:hover{transform:translateY(-3px);box-shadow:0 22px 44px #000c,0 0 0 6px #62e58c24}@media(max-width:700px){.gallery-head{display:block}.gallery-grid{grid-template-columns:1fr}.floating-buy{left:16px;right:16px;bottom:16px;justify-content:center}}';
      document.head.appendChild(galleryStyle);
      const chartLook = document.createElement("style");
      chartLook.textContent = '.market-panel svg{background:#29415d!important}.gallery-card svg{background:repeating-linear-gradient(to bottom,transparent 0 30px,#ffffff0d 31px),repeating-linear-gradient(to right,transparent 0 48px,#ffffff08 49px)!important}.chart-grid path{fill:none;stroke:#b6c8d955;stroke-width:1;stroke-dasharray:2 4}.market-panel svg .candle,.market-gallery svg .candle{position:relative}.ma-green{fill:none;stroke:#11e87e;stroke-width:1.5;filter:drop-shadow(0 0 3px #11e87e88)}.ma-orange{fill:none;stroke:#f17b24;stroke-width:1.5;filter:drop-shadow(0 0 3px #f17b2488)}.price-labels text{fill:#e6edf2;font-size:8px;font-family:Arial,sans-serif}';
      document.head.appendChild(chartLook);
      const buyUrl = "${checkoutUrl}";
      const exitBuyUrl = "${exitCheckoutUrl}";
      const exitOfferStyle = document.createElement("style");
      exitOfferStyle.textContent = '.exit-offer{position:fixed;inset:0;z-index:50;display:none;place-items:center;padding:20px;background:#020604cc;backdrop-filter:blur(10px)}.exit-offer.is-open{display:grid}.exit-offer-backdrop{position:absolute;inset:0}.exit-offer-panel{position:relative;width:min(520px,100%);padding:34px;border:1px solid #62e58c66;border-radius:24px;background:radial-gradient(circle at 100% 0,#245c3a,#0d1c14 54%,#07100d);box-shadow:0 30px 100px #000c,0 0 0 1px #ffffff0c;color:var(--text);text-align:center;animation:exitOfferIn .24s ease-out}.exit-offer-close{position:absolute;top:12px;right:14px;width:34px;height:34px;border:1px solid #ffffff22;border-radius:50%;background:#ffffff0a;color:var(--text);font-size:1.35rem;cursor:pointer}.exit-offer-kicker{color:var(--gold);font-size:.7rem;font-weight:900;letter-spacing:.14em;text-transform:uppercase}.exit-offer-panel h2{margin:13px 0 10px;font-size:clamp(1.8rem,5vw,2.7rem);line-height:1;letter-spacing:-.06em}.exit-offer-panel p{margin:0 auto 20px;max-width:410px;color:var(--muted)}.exit-offer-timer{display:inline-flex;gap:5px;align-items:baseline;margin:3px 0 21px;padding:10px 17px;border:1px solid #ffc96b55;border-radius:12px;background:#ffc96b12;color:var(--gold);font-variant-numeric:tabular-nums}.exit-offer-timer strong{font-size:1.55rem;line-height:1}.exit-offer-panel .btn{width:100%;background:var(--green);color:#041109;box-shadow:0 12px 35px #62e58c38}.exit-offer-note{display:block;margin-top:13px;color:#8ca095;font-size:.75rem}@keyframes exitOfferIn{from{opacity:0;transform:translateY(12px) scale(.98)}to{opacity:1;transform:none}}@media(max-width:560px){.exit-offer-panel{padding:30px 20px 24px}.exit-offer-panel h2{font-size:2.05rem}}';
      document.head.appendChild(exitOfferStyle);
      const exitOffer = document.createElement("div");
      exitOffer.className = "exit-offer";
      exitOffer.setAttribute("aria-hidden", "true");
      exitOffer.innerHTML = '<div class="exit-offer-backdrop" data-exit-close></div><div class="exit-offer-panel" role="dialog" aria-modal="true" aria-labelledby="exit-offer-title"><button class="exit-offer-close" type="button" data-exit-close aria-label="Fechar oferta">Ã—</button><div class="exit-offer-kicker">Oferta especial de saÃ­da</div><h2 id="exit-offer-title">Antes de ir, dÃª uma chance ao seu processo.</h2><p>Desbloqueie a mentoria individual online por uma condiÃ§Ã£o especial de <strong>R$ 199,99</strong>. Esta condiÃ§Ã£o fica disponÃ­vel por apenas 5 minutos.</p><div class="exit-offer-timer" aria-label="Tempo restante da oferta"><strong data-exit-minutes>05</strong><span>:</span><strong data-exit-seconds>00</strong></div><a class="btn" data-exit-buy href="' + exitBuyUrl + '" target="_blank" rel="noreferrer">Aproveitar por R$ 199,99</a><small class="exit-offer-note">ConteÃºdo educacional. NÃ£o existe promessa de lucro ou resultado.</small></div>';
      document.body.appendChild(exitOffer);
      (() => {
        const seenKey = "traderrealista_exit_offer_seen";
        const deadlineKey = "traderrealista_exit_offer_deadline";
        let timerId = 0;
        const close = () => { exitOffer.classList.remove("is-open"); exitOffer.setAttribute("aria-hidden", "true"); window.clearInterval(timerId); };
        const open = () => {
          if (sessionStorage.getItem(seenKey)) return;
          let deadline = Number(sessionStorage.getItem(deadlineKey));
          if (!deadline) { deadline = Date.now() + 5 * 60 * 1000; sessionStorage.setItem(deadlineKey, String(deadline)); }
          if (deadline <= Date.now()) return;
          sessionStorage.setItem(seenKey, "1");
          exitOffer.classList.add("is-open");
          exitOffer.setAttribute("aria-hidden", "false");
          const update = () => {
            const remaining = Math.max(0, deadline - Date.now());
            const seconds = Math.floor(remaining / 1000);
            exitOffer.querySelector("[data-exit-minutes]").textContent = String(Math.floor(seconds / 60)).padStart(2, "0");
            exitOffer.querySelector("[data-exit-seconds]").textContent = String(seconds % 60).padStart(2, "0");
            if (!remaining) { exitOffer.querySelector("[data-exit-buy]").textContent = "Oferta encerrada"; exitOffer.querySelector("[data-exit-buy]").setAttribute("aria-disabled", "true"); close(); }
          };
          update();
          timerId = window.setInterval(update, 1000);
        };
        document.addEventListener("mouseout", (event) => { if (event.clientY <= 0 && !event.relatedTarget) open(); });
        exitOffer.querySelectorAll("[data-exit-close]").forEach((element) => element.addEventListener("click", close));
        document.addEventListener("keydown", (event) => { if (event.key === "Escape") close(); });
      })();
      const galleryAnchor = document.querySelector(".ecosystem");
      if (galleryAnchor && !document.querySelector(".market-gallery")) {
        galleryAnchor.insertAdjacentHTML("afterend", '<section class="market-gallery"><div class="wrap"><div class="gallery-head"><div><div class="section-kicker">Contexto visual</div><h2 class="section-title">Veja o mercado em dois cenÃ¡rios.</h2><p class="section-copy">PainÃ©is separados para estudar leitura, direÃ§Ã£o e risco no mini Ã­ndice e no mini dÃ³lar.</p></div><span class="micro">SIMULAÃ‡ÃƒO EDUCACIONAL Â· SEM RECOMENDAÃ‡ÃƒO</span></div><div class="gallery-grid"><article class="gallery-card"><div class="terminal-meta"><span>WIN Â· MINI ÃNDICE</span><b style="color:var(--green)">ALTA Â· +0,42%</b></div><h3>Movimento comprador</h3><p>Exemplo de candles mostrando sequÃªncia, correÃ§Ã£o e retomada.</p><svg viewBox="0 0 320 170" role="img" aria-label="SimulaÃ§Ã£o educacional de candles do mini Ã­ndice"></svg></article><article class="gallery-card"><div class="terminal-meta"><span>WDO Â· MINI DÃ“LAR</span><b style="color:var(--red)">BAIXA Â· -0,18%</b></div><h3>Movimento vendedor</h3><p>Exemplo de candles mostrando pressÃ£o, repique e continuidade.</p><svg viewBox="0 0 320 170" role="img" aria-label="SimulaÃ§Ã£o educacional de candles do mini dÃ³lar"></svg></article></div></div></section>');
        document.querySelectorAll(".market-gallery svg").forEach((svg, panelIndex) => {
          const candles = candleSets[panelIndex] || candleSets[0];
          svg.innerHTML = candles.map((c, i) => '<g class="candle" style="--i:' + i + '"><line x1="' + c.x + '" y1="' + c.h + '" x2="' + c.x + '" y2="' + c.l + '" stroke="' + (c.up ? '#62e58c' : '#ff666d') + '" stroke-width="2"/><rect x="' + (c.x - 5) + '" y="' + Math.min(c.o,c.c) + '" width="10" height="' + Math.max(7,Math.abs(c.c-c.o)) + '" rx="2" fill="' + (c.up ? '#62e58c' : '#ff666d') + '"/></g>').join('') + '<line x1="0" y1="126" x2="320" y2="126" stroke="#ffc96b" stroke-dasharray="5 5"/><text x="8" y="160" fill="#789083" font-size="10">09:00</text><text x="260" y="160" fill="#789083" font-size="10">17:00</text>';
        });
      }
      if (!document.querySelector(".floating-buy")) document.body.insertAdjacentHTML("beforeend", '<a class="floating-buy" href="' + buyUrl + '" target="_blank" rel="noreferrer">Garantir minha vaga <span aria-hidden="true">â†’</span></a>');
      document.querySelectorAll('a[href="#vagas"]').forEach((link) => { link.setAttribute("href", buyUrl); link.setAttribute("target", "_blank"); link.setAttribute("rel", "noreferrer"); });
      const howSection = document.querySelector("#como-funciona .wrap");
      if (howSection && !document.querySelector("#cta-how")) howSection.insertAdjacentHTML("beforeend", '<div class="cta-center" id="cta-how"><a class="btn btn-primary" href="' + buyUrl + '" target="_blank" rel="noreferrer">Quero comeÃ§ar com direÃ§Ã£o</a></div>');
      const offer = document.querySelector("#vagas .offer");
      const spots = offer?.querySelector(".spots");
      const offerTitle = offer?.querySelector("h2");
      const offerCopy = offer?.querySelector("p");
      const offerMicro = offer?.querySelector(".micro");
      const priceOld = offer?.querySelector(".price small");
      const priceNew = offer?.querySelector(".price strong");
      const priceDetails = offer?.querySelector(".price span");
      if (offerTitle) offerTitle.innerHTML = "Mentoria individual.<br/>Seu processo comeÃ§a agora.";
      if (offerTitle) offerTitle.innerHTML = "Comece com dire\u00e7\u00e3o.<br/>Evolua com consist\u00eancia.";
      if (offerCopy) offerCopy.textContent = "Uma condi\u00e7\u00e3o especial para aprender com clareza, organizar seu processo e ter uma ferramenta de apoio durante 12 meses. Voc\u00ea entra para construir base \u2014 n\u00e3o para perseguir promessa f\u00e1cil.";
      if (offerMicro) offerMicro.textContent = "Fale com o perfil oficial para confirmar disponibilidade e receber os pr\u00f3ximos passos.";
      if (spots) spots.textContent = "â— CONDIÃ‡ÃƒO ESPECIAL DE BLACK FRIDAY";
      const offerSection = document.querySelector("#vagas");
      if (offerSection) {
        offerSection.insertAdjacentHTML("beforebegin", '<section class="dark mentor-path"><div class="wrap"><div class="section-kicker">O que vocÃª recebe</div><h2 class="section-title">Um caminho claro para construir consistÃªncia.</h2><p class="section-copy">Materiais e etapas para organizar seus estudos, registrar decisÃµes e evoluir com responsabilidade.</p><div class="cards"><article class="card"><div class="num">01</div><h3>Manual 1x1x1 de ConsistÃªncia</h3><p>Um mÃ©todo simples para transformar intenÃ§Ã£o em rotina: uma prioridade, uma decisÃ£o e um registro por vez.</p></article><article class="card"><div class="num">02</div><h3>DiÃ¡rio do Trader Disciplinado</h3><p>Um espaÃ§o para registrar contexto, entrada, saÃ­da, risco, emoÃ§Ãµes e aprendizados de cada operaÃ§Ã£o.</p></article><article class="card"><div class="num">03</div><h3>Plano da mentoria</h3><p>Da leitura do candlestick e fundamentos atÃ© estratÃ©gia, gestÃ£o, prÃ¡tica guiada e evoluÃ§Ã£o rumo ao primeiro mÃªs positivo.</p></article></div><div class="trust-list"><div class="trust-item"><b>Etapa 1 Â· Fundamentos</b>Entenda o que Ã© um candlestick, preÃ§o, contexto e risco.</div><div class="trust-item"><b>Etapa 2 Â· Leitura e estratÃ©gia</b>Conecte cenÃ¡rio, entrada, saÃ­da e regras testÃ¡veis.</div><div class="trust-item"><b>Etapa 3 Â· PrÃ¡tica disciplinada</b>Use o diÃ¡rio para revisar decisÃµes e reduzir o improviso.</div><div class="trust-item"><b>Etapa 4 Â· EvoluÃ§Ã£o</b>Construa uma rotina de revisÃ£o e acompanhe sua jornada atÃ© o primeiro mÃªs positivo.</div></div></div></section>');
        offerSection.previousElementSibling?.querySelector('.wrap')?.insertAdjacentHTML("beforeend", '<div class="cta-center"><a class="cta-soft" href="' + buyUrl + '" target="_blank" rel="noreferrer">Ver a condiÃ§Ã£o especial</a></div>');
      }
      if (offerCopy) offerCopy.textContent = "Uma condiÃ§Ã£o especial para entrar na mentoria individual online Trader Realista com acesso Ã  IA Trader Realista durante 12 meses.";
      if (offerMicro) offerMicro.textContent = "Vagas e condiÃ§Ãµes confirmadas pelo canal oficial.";
      if (priceOld) priceOld.textContent = "De R$ 15.000,00";
      if (priceNew) priceNew.textContent = "R$ 297,00";
      if (priceDetails) priceDetails.innerHTML = "Mentoria individual online<br/>Acesso Ã  IA Trader Realista por 12 meses";
      const offerKicker = offer?.querySelector(".section-kicker");
      if (offerKicker) offerKicker.textContent = "CondiÃ§Ã£o especial de Black Friday";
      if (spots) spots.textContent = "â— ACESSO INDIVIDUAL";
      const faq = document.querySelector(".faq");
      if (faq) {
        faq.innerHTML = "<details open><summary>Preciso jÃ¡ saber operar?</summary><p>NÃ£o. A mentoria comeÃ§a pela base e avanÃ§a atÃ© a construÃ§Ã£o de um processo de decisÃ£o.</p></details><details><summary>O que estÃ¡ incluÃ­do?</summary><p>Mentoria individual online e acesso Ã  IA Trader Realista pelo perÃ­odo de 12 meses.</p></details><details><summary>O programa promete lucro?</summary><p>NÃ£o. Trade envolve risco e nÃ£o existe garantia de resultado. O foco Ã© educaÃ§Ã£o, processo, gestÃ£o e tomada de decisÃ£o responsÃ¡vel.</p></details><details><summary>Como faÃ§o para reservar?</summary><p>Clique em â€œGarantir minha vagaâ€ e fale com o perfil oficial @traderrealista para confirmar disponibilidade e condiÃ§Ãµes.</p></details>";
      }
    })();
    (() => {
      const faq = document.querySelector(".faq");
      if (faq) faq.innerHTML = "<details open><summary>Preciso j\u00e1 saber operar?</summary><p>N\u00e3o. A mentoria come\u00e7a pela base e avan\u00e7a at\u00e9 a constru\u00e7\u00e3o de um processo de decis\u00e3o.</p></details><details><summary>O que est\u00e1 inclu\u00eddo?</summary><p>Mentoria individual online e acesso \u00e0 IA Trader Realista pelo per\u00edodo de 12 meses.</p></details><details><summary>E se eu tiver pouco tempo?</summary><p>O plano \u00e9 organizado em passos objetivos para voc\u00ea estudar, registrar e revisar no seu ritmo.</p></details><details><summary>O programa promete lucro?</summary><p>N\u00e3o. Trade envolve risco e n\u00e3o existe garantia de resultado. O foco \u00e9 educa\u00e7\u00e3o, processo, gest\u00e3o e tomada de decis\u00e3o respons\u00e1vel.</p></details><details><summary>Como fa\u00e7o para come\u00e7ar?</summary><p>Clique em â€œGarantir minha vagaâ€ e fale com o perfil oficial @traderrealista para confirmar disponibilidade e condi\u00e7\u00f5es.</p></details>";
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
  if (!material) return limitToFourLines(`${data.mentor.handoff}\n${data.mentor.name} poderÃ¡ orientar o prÃ³ximo passo.`);
  const context = [profile.name && ` ${profile.name}`, profile.goal && `, pensando em ${profile.goal}`].filter(Boolean).join("");
  return limitToFourLines(`Entendi${context}.\n${material.content}\nComece pelo menor passo possÃ­vel hoje e me conte como foi.`);
}

async function ollamaReply(message: string, profile: StudentProfile, material?: Material): Promise<string | undefined> {
  const url = process.env.OLLAMA_URL;
  const model = process.env.OLLAMA_MODEL;
  if (!url || !model) return undefined;
  const prompt = [
    `VocÃª Ã© o assistente de ${data.mentor.name}. Seja ${data.mentor.tone}.`,
    "Responda em portuguÃªs brasileiro, em no mÃ¡ximo 4 linhas curtas.",
    "Use somente o contexto fornecido. NÃ£o invente. Se nÃ£o houver resposta segura, encaminhe ao mentor.",
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
    console.warn("WhatsApp nÃ£o configurado: resposta gerada para", to, text);
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
      response.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
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
      if (!isValidMetaSignature(raw, signature)) return send(response, 403, { error: "Assinatura invÃ¡lida." });
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
      return send(response, 403, { error: "VerificaÃ§Ã£o invÃ¡lida." });
    }
    send(response, 404, { error: "Rota nÃ£o encontrada." });
  } catch (error) {
    console.error(error);
    send(response, 400, { error: "NÃ£o foi possÃ­vel processar a requisiÃ§Ã£o." });
  }
});

server.listen(port, () => console.log(`Mentor AI MVP rodando em http://localhost:${port}`));

