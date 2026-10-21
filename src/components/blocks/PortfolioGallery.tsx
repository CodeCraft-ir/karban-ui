"use client";
/* eslint-disable @next/next/no-img-element -- Normalized WordPress public media has deployment-dependent hosts. */
import {useEffect,useRef,useState} from 'react';
import {useGSAP} from '@gsap/react';
import gsap from 'gsap';
import {createPortfolioDialogSession} from '@/lib/portfolio-dialog';
import {Button} from '@/components/ui/Button';
import type {PublicPortfolioImage} from '@/lib/contracts/specialists';

export function PortfolioGallery({items}:{items:PublicPortfolioImage[]}) {
 const [selected,setSelected]=useState<number|null>(null);
 const dialog=useRef<HTMLDialogElement>(null);
 const art=useRef<HTMLElement>(null);
 const session=useRef(createPortfolioDialogSession());
 useEffect(()=>{const current=session.current;return ()=>current.close();},[]);
 useEffect(()=>{
  if(selected===null){session.current.close();return;}
  const element=dialog.current;
  const previous=document.activeElement;
  if(element)session.current.show(element,previous instanceof HTMLElement?previous:null);
 },[selected]);
 useGSAP(()=>{
  if(selected===null || window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  gsap.fromTo(art.current,{y:10,scale:0.98,autoAlpha:0.5},{y:0,scale:1,autoAlpha:1,duration:0.24,ease:'power2.out'});
 },{scope:dialog,dependencies:[selected]});
 const image=selected===null?null:items[selected];
 return <>
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map((item,index)=><figure key={item.id} className="min-w-0 overflow-hidden rounded-3xl border border-line bg-card"><button type="button" aria-label={`مشاهده ${item.caption||'نمونه کار'}`} onClick={()=>setSelected(index)} className="block w-full transition-opacity duration-200 hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent active:opacity-70"><img src={item.url} alt={item.caption||'نمونه کار منتشرشده'} loading="lazy" decoding="async" className="aspect-[4/3] w-full object-cover" /></button>{item.caption&&<figcaption className="break-words p-3 text-sm leading-7 text-fg-soft">{item.caption}</figcaption>}</figure>)}</div>
  {image&&<dialog ref={dialog} aria-label="تصویر نمونه کار" onClose={()=>setSelected(null)} onClick={event=>{if(event.target===event.currentTarget)setSelected(null);}} className="m-auto max-h-[90dvh] w-[min(92vw,56rem)] overflow-auto rounded-3xl border border-line bg-card p-4 text-fg backdrop:bg-black/75">
   <div className="mb-3 flex flex-wrap gap-2"><Button autoFocus variant="secondary" onClick={()=>setSelected(null)}>بستن گالری</Button>{items.length>1&&<><Button variant="outline" onClick={()=>setSelected(current=>current===null?null:(current+items.length-1)%items.length)}>قبلی</Button><Button variant="outline" onClick={()=>setSelected(current=>current===null?null:(current+1)%items.length)}>بعدی</Button></>}</div>
   <figure ref={art}><img src={image.url} alt={image.caption||'نمونه کار منتشرشده'} className="max-h-[65dvh] w-full object-contain" />{image.caption&&<figcaption className="mt-3 break-words text-sm leading-7">{image.caption}</figcaption>}</figure>
  </dialog>}
 </>;
}
