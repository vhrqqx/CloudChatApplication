import { create } from 'zustand';
import { api } from '../lib/api.js';
import { useAuth } from './auth.js';
let requestSequence=0;
export const PALETTE=['#3B82F6','#10B981','#F59E0B','#8B5CF6','#EC4899','#06B6D4'];
export const useNebula=create((set,get)=>({
 records:[], pins:{}, error:null,
 async load(){const sequence=++requestSequence;try{const records=await api('/nebula');if(sequence!==requestSequence)return;set({records:records??[],error:null});try{localStorage.setItem(`nebula:${useAuth.getState().user?.id}`,JSON.stringify(records));}catch{}}catch(e){set({error:e.message});throw e;}},
 reset(){requestSequence++;set({records:[],pins:{},error:null});},
 loadPins(){try{set({pins:JSON.parse(localStorage.getItem(`nebula-pins:${useAuth.getState().user?.id}`)||'{}')});}catch{set({pins:{}});}},
 pin(id){set(s=>{const pins={...s.pins,[id]:!s.pins[id]};localStorage.setItem(`nebula-pins:${useAuth.getState().user?.id}`,JSON.stringify(pins));return{pins};});},
 async create(body){const result=await api('/nebula',{method:'POST',body});await get().load();return result;},
 async update(id,body){const result=await api(`/nebula/${id}`,{method:'PATCH',body});await get().load();return result;},
 async announce(body){return get().create(body);}

}));
export function metaFor(room){return useNebula.getState().records.find(r=>r.id===`meta-${room}`)??{};}
export function roomName(conv){const nick=conv.type==='DIRECT'?metaFor(conv.id).nicknames?.[conv.others?.[0]?.id]:null;return nick||metaFor(conv.id).title||conv.displayName;}
export function memberName(room,user,fallback){return metaFor(room).nicknames?.[user]||fallback;}
export function hierarchy(room){const own=metaFor(room),parent=own.parentId?metaFor(own.parentId):own;return{own,parent,community:!!parent.community,leaderId:parent.leaderId,children:useNebula.getState().records.filter(r=>r.type==='meta'&&String(r.parentId)===String(parent.roomId??room))};}
export function taskProgress(task){const steps=task.steps??[];return steps.length?Math.round(steps.filter(s=>s.done).length/steps.length*100):task.done?100:0;}
