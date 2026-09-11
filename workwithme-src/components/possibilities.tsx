import { useState } from 'react';
import { ArrowRight, Plus, ArrowUpRight } from 'lucide-react';
import { GlassDock, SpoofIcon, dockApps } from '@/components/ui/liquid-glass';
import copy from '@/content.json';

const summaries=[
  {title:'The job is done.\nLet’s finish the paperwork.',steps:['Approved notes','Invoice draft','Your review']},
  {title:'Orders come in.\nThe retyping goes away.',steps:['Customer order','Matched records','Your review']},
  {title:'Find the mismatch.\nKeep the decision.',steps:['Invoice + work order','Flagged differences','Your decision']},
  {title:'One change.\nEveryone on the same page.',steps:['Approved change','Aligned documents','Your sign-off']},
];
export default function Possibilities(){
  const [selected,setSelected]=useState(0);
  return <section id="possibilities" className="possibilities section-shell dock-section" aria-labelledby="possibilities-title">
    <div className="dock-section-heading"><p className="eyebrow">WHAT WE COULD MAKE EASIER</p><h2 id="possibilities-title">Same business.<br/><span>Less busywork.</span></h2><p>Pick a familiar part of your day.</p></div>
    <div className="desktop-playground">
      <div className="desktop-halo" aria-hidden="true"/>
      <GlassDock selected={selected} onSelect={setSelected}/>
      {copy.problems.examples.map((example,i)=><div key={i} role="tabpanel" id={`workflow-panel-${i}`} aria-labelledby={`workflow-tab-${i}`} tabIndex={0} hidden={selected!==i} className="app-window">
        <div className="window-chrome"><span className="window-dots" aria-hidden="true"><i/><i/><i/></span><span>{dockApps[i].name}</span><span className="window-category">POSSIBILITIES</span></div>
        <div className="app-window-body"><div className="app-window-icon"><SpoofIcon index={i}/></div><div className="app-window-copy"><p className="app-audience">{example.audience}</p><h3>{summaries[i].title.split('\n').map((line,j)=><span key={line}>{line}{j===0&&<br/>}</span>)}</h3><p className="app-outcome">{example.outcome.replace('The aim: ','')}</p><div className="app-process">{summaries[i].steps.map((step,j)=><span key={step}>{j>0&&<ArrowRight size={13}/>}<span>{step}</span></span>)}</div><details className="read-more" key={`detail-${selected}-${i}`}><summary>See how it could work<Plus size={16}/></summary><div className="disclosure-copy"><p>{example.title}</p>{example.body.map(p=><p key={p}>{p}</p>)}</div></details></div></div>
      </div>)}
    </div>
    <div className="dock-foot"><span>Illustrative examples. Your people make the decisions.</span><a href="#contact">Something else in mind?<ArrowUpRight size={15}/></a></div>
    <details className="read-more possibilities-context"><summary>Where would we start?<Plus size={16}/></summary><div className="disclosure-copy"><p>{copy.problems.heading}</p>{copy.problems.body.map(p=><p key={p}>{p}</p>)}<p>{copy.problems.note}</p><p>{copy.problems.closing}</p></div></details>
  </section>;
}
