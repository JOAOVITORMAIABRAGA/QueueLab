import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { API, compare } from "./api";
import type { ArrivalPattern, Config, Event, Result } from "./types";

const defaultSingle: Config = {
  mode: "Controlled", customerCount: 250, serverCount: 3, queueStrategy: "Single", arrivalPattern: "AllWaiting",
  serviceTime: { type: "Variable", base: 60, min: 30, max: 90 },
  adverseEvents: { enabled: true, probability: .1, additionalTimeMin: 10, additionalTimeMax: 60 }, seed: 18472931,
};
const defaultMulti: Config = { ...structuredClone(defaultSingle), queueStrategy: "ShortestQueue" };
const sec = (v:number) => `${v.toFixed(1)}s`;
const pct = (v:number) => `${(v * 100).toFixed(1)}%`;

function Field({label, hint, children}:{label:string; hint?:string; children:ReactNode}) {
  return <label className="field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}

function Editor({title, description, config, onChange}:{title:string;description:string;config:Config;onChange:(c:Config)=>void}) {
  const update=(p:Partial<Config>)=>onChange({...config,...p});
  const service=(p:Partial<Config["serviceTime"]>)=>update({serviceTime:{...config.serviceTime,...p}});
  const adverse=(p:Partial<Config["adverseEvents"]>)=>update({adverseEvents:{...config.adverseEvents,...p}});
  return <section className="panel editor">
    <div className="editor-title"><div><span className="kicker">{title}</span><h2>{config.queueStrategy === "Single" ? "Uma fila, todos os caixas" : "Uma fila para cada caixa"}</h2></div><span className="tag">{config.queueStrategy === "Single" ? "CENTRALIZADA" : "SEPARADAS"}</span></div>
    <p className="description">{description}</p>
    <div className="fields-2"><Field label="Clientes"><input type="number" min="1" max="10000" value={config.customerCount} onChange={e=>update({customerCount:+e.target.value})}/></Field><Field label="Caixas"><input type="number" min="1" max="20" value={config.serverCount} onChange={e=>update({serverCount:+e.target.value})}/></Field></div>
    {config.queueStrategy !== "Single" && config.arrivalPattern === "Continuous" && <Field label="Como o cliente escolhe a fila" hint="Representa a decisão de uma pessoa que acabou de chegar ao supermercado."><select value={config.queueStrategy} onChange={e=>update({queueStrategy:e.target.value as Config["queueStrategy"]})}><option value="ShortestQueue">Menor fila</option><option value="Random">Aleatória</option></select></Field>}
    {config.queueStrategy !== "Single" && config.arrivalPattern === "AllWaiting" && <div className="info-box">Todos já estão no supermercado. A multidão é dividida inicialmente de forma equilibrada entre as filas; não existe uma nova escolha de fila durante o experimento.</div>}
    <div className="divider"><span>ATENDIMENTO</span></div>
    <div className="fields-2"><Field label="Tipo"><select value={config.serviceTime.type} onChange={e=>service({type:e.target.value as Config["serviceTime"]["type"]})}><option value="Variable">Variável</option><option value="Fixed">Fixo</option></select></Field><Field label="Base (s)"><input type="number" min="1" value={config.serviceTime.base} onChange={e=>service({base:+e.target.value})}/></Field></div>
    {config.serviceTime.type === "Variable" && <div className="fields-2"><Field label="Mínimo"><input type="number" min="1" value={config.serviceTime.min} onChange={e=>service({min:+e.target.value})}/></Field><Field label="Máximo"><input type="number" min="1" value={config.serviceTime.max} onChange={e=>service({max:+e.target.value})}/></Field></div>}
    <div className="divider"><span>CONTRATEMPOS</span></div>
    <label className="check"><input type="checkbox" checked={config.adverseEvents.enabled} onChange={e=>adverse({enabled:e.target.checked})}/> Atendimento pode sofrer contratempo</label>
    {config.adverseEvents.enabled && <><Field label="Chance (%)"><input type="number" min="0" max="100" value={config.adverseEvents.probability*100} onChange={e=>adverse({probability:+e.target.value/100})}/></Field><div className="fields-2"><Field label="Extra mínimo"><input type="number" min="0" value={config.adverseEvents.additionalTimeMin} onChange={e=>adverse({additionalTimeMin:+e.target.value})}/></Field><Field label="Extra máximo"><input type="number" min="0" value={config.adverseEvents.additionalTimeMax} onChange={e=>adverse({additionalTimeMax:+e.target.value})}/></Field></div></>}
  </section>;
}

function Metric({label,a,b}:{label:string;a:string;b:string}) { return <div className="metric-row"><span>{label}</span><strong>{a}</strong><strong>{b}</strong></div>; }

function Scene({title,result,playing,time}:{title:string;result:Result;playing:boolean;time:number}) {
  const initialSnapshot = result.arrivalPattern === "AllWaiting" && time === 0;
  const visible = initialSnapshot ? [] : result.events.filter(e=>e.arrivalTime<=time && e.completionTime>time);
  const servers = Array.from({length:result.statistics.serverUtilization.length},(_,i)=>i);
  const single = result.events.every(e=>e.queueIndex===0) && new Set(result.events.map(e=>e.serverIndex)).size>1;
  const waitingByQueue = new Map<number,Event[]>();
  for(const e of result.events) {
    if(e.arrivalTime<=time && (initialSnapshot || e.serviceStartTime>time)) {
      const arr=waitingByQueue.get(e.queueIndex)||[];
      arr.push(e);
      waitingByQueue.set(e.queueIndex,arr);
    }
  }
  const waitingTotal=[...waitingByQueue.values()].reduce((sum,items)=>sum+items.length,0);
  const served=initialSnapshot ? 0 : result.events.filter(e=>e.completionTime<=time).length;
  const inService=initialSnapshot ? 0 : visible.filter(e=>e.serviceStartTime<=time).length;
  const notArrived=result.events.filter(e=>e.arrivalTime>time).length;
  const completed=time>=result.statistics.totalSimulationTime-0.001;

  return <div className="scene panel">
    <div className="scene-head"><div><span className="kicker">SIMULAÇÃO</span><h3>{title}</h3></div><span className={playing?"live":"done"}>{playing?"● AO VIVO":completed?"● CONCLUÍDA":"● PAUSADA"}</span></div>
    <div className="scene-status">
      <div><span>AGUARDANDO</span><strong>{waitingTotal}</strong></div>
      <div><span>EM ATENDIMENTO</span><strong>{inService}</strong></div>
      <div><span>ATENDIDOS</span><strong>{served}</strong></div>
      <div><span>AINDA NÃO CHEGARAM</span><strong>{notArrived}</strong></div>
    </div>
    <div className="scene-floor">
      <div className="entrance">🚪 <span>ENTRADA</span></div>
      <div className={single?"queue common":"queue-grid"}>
        {single ? <div className="line">
          <div className="line-head"><span className="line-label">FILA ÚNICA</span><strong>{waitingTotal} aguardando</strong></div>
          <div className="people">{(waitingByQueue.get(0)||[]).slice(0,10).map(e=><span key={e.customerId} className="person">🧑</span>)}{waitingTotal>10&&<b>+{waitingTotal-10}</b>}</div>
        </div> : servers.map(i=>{
          const count=waitingByQueue.get(i)?.length||0;
          return <div className="line" key={i}>
            <div className="line-head"><span className="line-label">FILA {i+1}</span><strong>{count} aguardando</strong></div>
            <div className="people">{(waitingByQueue.get(i)||[]).slice(0,7).map(e=><span key={e.customerId} className="person">🧑</span>)}{count>7&&<b>+{count-7}</b>}</div>
          </div>
        })}
      </div>
      <div className="cashiers">{servers.map(i=>{
        const active=visible.find(e=>e.serverIndex===i && e.serviceStartTime<=time);
        return <div className={active?"cashier busy":"cashier"} key={i}>
          <div className="cashier-top">CAIXA {i+1}</div><div className="counter">{active?"🧑‍💼":"🪑"}</div>
          <div className="customer-slot">{active?<>🧑 <small>#{active.customerId}</small></>:"Livre"}</div>
        </div>
      })}</div>
      <div className="scene-caption">{initialSnapshot?"Todos chegaram antes do relógio começar. Agora veja os primeiros clientes saírem da fila.":completed?"Todos os clientes terminaram. Veja o resumo final abaixo.":playing?`Tempo simulado: ${sec(time)}`:"Pausado. Continue a reprodução para avançar o supermercado."}</div>
    </div>
  </div>;
}

export default function App(){
  const [a,setA]=useState<Config>(defaultSingle),[b,setB]=useState<Config>(defaultMulti),[ra,setRa]=useState<Result|null>(null),[rb,setRb]=useState<Result|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(""),[playing,setPlaying]=useState(false),[time,setTime]=useState(0),[speed,setSpeed]=useState(8);
  const total=Math.max(ra?.statistics.totalSimulationTime??0,rb?.statistics.totalSimulationTime??0);
  useEffect(()=>{if(!playing)return;const id=window.setInterval(()=>setTime(t=>{const next=t+speed;if(next>=total){setPlaying(false);return total}return next}),100);return()=>clearInterval(id)},[playing,speed,total]);
  const waitData=useMemo(()=>{if(!ra||!rb)return[];const step=Math.max(1,Math.floor(Math.max(ra.events.length,rb.events.length)/100));return Array.from({length:Math.max(ra.events.length,rb.events.length)},(_,i)=>i).filter(i=>i%step===0).map(i=>({customer:i+1,single:ra.events[i]?.waitTime??0,multi:rb.events[i]?.waitTime??0}))},[ra,rb]);
  const utilData=useMemo(()=>{if(!ra||!rb)return[];const n=Math.max(ra.statistics.serverUtilization.length,rb.statistics.serverUtilization.length);return Array.from({length:n},(_,i)=>({server:`Caixa ${i+1}`,single:(ra.statistics.serverUtilization[i]??0)*100,multi:(rb.statistics.serverUtilization[i]??0)*100}))},[ra,rb]);
  async function run(){setBusy(true);setError("");try{const seed=a.seed;const ca={...a,mode:"Controlled" as const,queueStrategy:"Single" as const};const cb={...b,mode:"Controlled" as const,seed,queueStrategy:b.queueStrategy==="Single"?"ShortestQueue":b.queueStrategy};const r=await compare(ca,cb);setRa(r.scenarioA);setRb(r.scenarioB);setTime(0);setPlaying(false)}catch(e){setError(e instanceof Error?e.message:"Falha ao executar") }finally{setBusy(false)}}
  const reset=()=>{setA(defaultSingle);setB(defaultMulti);setRa(null);setRb(null);setError("")};
  return <main>
    <header className="hero"><div><span className="eyebrow">QUEUE / EXPERIMENTAL LAB</span><h1>QueueLab</h1><p>Um supermercado imaginário para descobrir o que acontece quando todo mundo escolhe a fila errada.</p></div><div className="api"><span/> API <strong>{API}</strong></div></header>
    <section className="experiment panel"><div className="experiment-copy"><span className="kicker">EXPERIMENTO CONTROLADO</span><h2>Uma fila <em>vs.</em> várias filas</h2><p>Mesmas pessoas, mesmos tempos de atendimento e mesma condição inicial. Só muda a organização física da fila.</p><div className="arrival-choice"><span className="choice-title">CONDIÇÃO DE CHEGADA</span><div className="choice-grid"><button className={a.arrivalPattern === "AllWaiting" ? "choice active" : "choice"} onClick={()=>{setA(x=>({...x,arrivalPattern:"AllWaiting"}));setB(x=>({...x,arrivalPattern:"AllWaiting"}))}}><strong>Todos já estão na fila</strong><small>Ex.: 250 clientes já esperando quando o experimento começa.</small></button><button className={a.arrivalPattern === "Continuous" ? "choice active" : "choice"} onClick={()=>{setA(x=>({...x,arrivalPattern:"Continuous"}));setB(x=>({...x,arrivalPattern:"Continuous"}))}}><strong>Clientes chegam aos poucos</strong><small>As pessoas entram ao longo do tempo, como em uma situação normal.</small></button></div></div></div><div className="seed"><label>Seed compartilhada<input type="number" value={a.seed} onChange={e=>{const s=+e.target.value;setA(x=>({...x,seed:s}));setB(x=>({...x,seed:s}))}}/></label><button className="secondary" onClick={()=>{const s=Math.floor(Math.random()*2147483647);setA(x=>({...x,seed:s}));setB(x=>({...x,seed:s}))}}>Nova seed</button></div></section>
    <section className="edit-grid"><Editor title="Cenário A" description="Uma fila comum. Quando qualquer caixa fica livre, a próxima pessoa da fila entra." config={a} onChange={setA}/><Editor title="Cenário B" description="Uma fila física por caixa. Cada pessoa escolhe uma fila e fica presa nela até ser atendida." config={b} onChange={setB}/></section>
    <div className="actions"><button className="secondary" onClick={reset}>Restaurar</button><button className="primary" onClick={run} disabled={busy}>{busy?"Rodando…":"▶ Rodar experimento"}</button></div>
    {error&&<div className="error-banner"><strong>Algo deu errado</strong><span>{error}</span><small>API: {API}</small></div>}
    {ra&&rb&&<>
      <section className="results-title"><div><span className="kicker">RESULTADOS</span><h2>Agora sim: o que a organização da fila mudou?</h2></div><span className="pill">● mesmos sorteios · {a.arrivalPattern === "AllWaiting" ? "todos já estavam na fila" : "chegadas ao longo do tempo"} · seed {ra.seed}</span></section>
      <section className="scene-grid"><Scene title="Fila única" result={ra} playing={playing} time={time}/><Scene title="Várias filas" result={rb} playing={playing} time={time}/></section>
      <section className="replay panel"><div><span className="kicker">REPLAY</span><h3>{playing?"O supermercado está funcionando…":time>=total&&total>0?"Experimento concluído":"Assista à fila trabalhar"}</h3><p>Os eventos foram calculados no backend; o React apenas os reproduz em velocidade acelerada.</p></div><div className="replay-controls"><button className="primary" onClick={()=>{setTime(0);setPlaying(true)}}>{playing?"Recomeçar":"▶ Reproduzir"}</button><button className="secondary" onClick={()=>setPlaying(false)}>Pausar</button><label>Velocidade<select value={speed} onChange={e=>setSpeed(+e.target.value)}><option value="3">3×</option><option value="8">8×</option><option value="20">20×</option><option value="50">50×</option></select></label><span className="timeline">{sec(time)} / {sec(total)}</span></div></section>
      {time>=total&&total>0&&<section className="final-summary"><div className="final-summary-title"><div><span className="kicker">RESULTADO FINAL</span><h2>O experimento terminou</h2></div><span className="pill">{ra.statistics.customersServed} pessoas atendidas</span></div><div className="final-summary-grid"><div className="final-summary-card panel"><span className="kicker">FILA ÚNICA</span><h3>Uma fila, todos os caixas</h3><div className="final-stats"><div><span>Espera média</span><strong>{sec(ra.statistics.averageWait)}</strong></div><div><span>Espera máxima</span><strong>{sec(ra.statistics.maxWait)}</strong></div><div><span>Pico da fila</span><strong>{ra.statistics.maxQueueLength} pessoas</strong></div><div><span>Distribuição inicial</span><strong>{ra.statistics.initialQueueLengthByQueue[0] ?? 0} na fila</strong></div><div><span>Utilização média</span><strong>{pct(ra.statistics.averageServerUtilization)}</strong></div><div><span>Tempo total</span><strong>{sec(ra.statistics.totalSimulationTime)}</strong></div><div><span>Throughput</span><strong>{ra.statistics.throughput.toFixed(3)} /s</strong></div></div></div><div className="final-summary-card panel"><span className="kicker">VÁRIAS FILAS</span><h3>Uma fila por caixa</h3><div className="final-stats"><div><span>Espera média</span><strong>{sec(rb.statistics.averageWait)}</strong></div><div><span>Espera máxima</span><strong>{sec(rb.statistics.maxWait)}</strong></div><div><span>Pico das filas</span><strong>{rb.statistics.initialQueueLengthByQueue.map((v,i)=>`${i+1}: ${v}`).join(" · ")} </strong></div><div><span>Utilização média</span><strong>{pct(rb.statistics.averageServerUtilization)}</strong></div><div><span>Tempo total</span><strong>{sec(rb.statistics.totalSimulationTime)}</strong></div><div><span>Throughput</span><strong>{rb.statistics.throughput.toFixed(3)} /s</strong></div></div></div></div></section>}
      <section className="result-grid"><div className="result-card panel"><span className="kicker">FILA ÚNICA</span><h3>Uma fila, todos os caixas</h3><div className="big-metric"><span>Espera média</span><strong>{sec(ra.statistics.averageWait)}</strong></div><div className="small-metrics"><span>Máxima <b>{sec(ra.statistics.maxWait)}</b></span><span>Mediana <b>{sec(ra.statistics.medianWait)}</b></span><span>P95 <b>{sec(ra.statistics.p95Wait)}</b></span><span>Utilização <b>{pct(ra.statistics.averageServerUtilization)}</b></span></div></div><div className="result-card panel"><span className="kicker">VÁRIAS FILAS</span><h3>Uma fila por caixa</h3><div className="big-metric"><span>Espera média</span><strong>{sec(rb.statistics.averageWait)}</strong></div><div className="small-metrics"><span>Máxima <b>{sec(rb.statistics.maxWait)}</b></span><span>Mediana <b>{sec(rb.statistics.medianWait)}</b></span><span>P95 <b>{sec(rb.statistics.p95Wait)}</b></span><span>Utilização <b>{pct(rb.statistics.averageServerUtilization)}</b></span></div></div></section>
      <section className="panel comparison"><div className="table-head"><span>Métrica</span><strong>Fila única</strong><strong>Várias filas</strong></div><Metric label="Espera média" a={sec(ra.statistics.averageWait)} b={sec(rb.statistics.averageWait)}/><Metric label="Espera máxima" a={sec(ra.statistics.maxWait)} b={sec(rb.statistics.maxWait)}/><Metric label="P95" a={sec(ra.statistics.p95Wait)} b={sec(rb.statistics.p95Wait)}/><Metric label="Tempo médio no sistema" a={sec(ra.statistics.averageTimeInSystem)} b={sec(rb.statistics.averageTimeInSystem)}/><Metric label="Utilização média" a={pct(ra.statistics.averageServerUtilization)} b={pct(rb.statistics.averageServerUtilization)}/></section>
      <section className="charts"><div className="panel"><div className="chart-title"><h3>Espera por pessoa</h3><span>mesma pessoa nos dois experimentos</span></div><ResponsiveContainer width="100%" height={300}><LineChart data={waitData}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="customer"/><YAxis/><Tooltip/><Line type="monotone" dataKey="single" name="Fila única" dot={false}/><Line type="monotone" dataKey="multi" name="Várias filas" dot={false}/></LineChart></ResponsiveContainer></div><div className="panel"><div className="chart-title"><h3>Utilização por caixa</h3><span>fila única tende a equilibrar naturalmente</span></div><ResponsiveContainer width="100%" height={300}><BarChart data={utilData}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="server"/><YAxis/><Tooltip formatter={(v: unknown)=>typeof v === "number" ? `${v.toFixed(1)}%` : String(v)}/><Bar dataKey="single" name="Fila única"/><Bar dataKey="multi" name="Várias filas"/></BarChart></ResponsiveContainer></div></section>
    </>}
    {!ra&&!rb&&<section className="empty panel"><div className="store-diagram"><div>🧑 🧑 🧑 🧑 🧑</div><div className="arrow">↓</div><div className="counter-row"><span>🧑‍💼<b>CAIXA 1</b></span><span>🧑‍💼<b>CAIXA 2</b></span><span>🧑‍💼<b>CAIXA 3</b></span></div><p>Configure os dois cenários e veja as pessoas literalmente indo para os caixas.</p></div></section>}
    <footer>QueueLab · filas de pessoas, não filas de processos · MVP</footer>
  </main>;
}
