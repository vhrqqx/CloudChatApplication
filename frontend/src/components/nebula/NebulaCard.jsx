import { useEffect,useState } from 'react';
import { ShareFat,CheckSquareOffset,CrownSimple } from '@phosphor-icons/react';
import { useNebula,taskProgress,hierarchy,roomName,memberName } from '../../store/nebula.js';
import { useAuth } from '../../store/auth.js';
import { useChat } from '../../store/chat.js';
import { api } from '../../lib/api.js';
import { forwardTo } from '../../lib/forward.js';
import { sendMessage } from '../../lib/ws.js';
import Dialog from '../Dialog.jsx';
import Avatar from '../Avatar.jsx';
import ConversationPicker from '../chat/ConversationPicker.jsx';

export function ForwardPicker({msg,conv,onClose}){const [error,setError]=useState(null);async function choose(id){try{await forwardTo(msg,conv,id);onClose();}catch(e){setError(e.message);}}return <Dialog onClose={onClose} labelledById="forward-title" width="min(400px,calc(100vw - 24px))" elevated={false}><div style={{height:440}}><strong id="forward-title" className="block px-3 pt-3">Chuyển tiếp tới hội thoại / bạn bè</strong>{error&&<p className="px-3" role="alert">{error}</p>}<ConversationPicker excludeId={conv.id} onChoose={choose} onCancel={onClose}/></div></Dialog>;}
function Person({id,room}){const m=Object.values(useChat(s=>s.members)).flat().find(m=>String(m.id)===String(id));return memberName(room,id,m?.username??`#${id}`);}
export default function NebulaCard({message,conv,parsed}){
 const records=useNebula(s=>s.records);const r=records.find(r=>r.id===parsed.id);const user=useAuth(s=>s.user);const members=useChat(s=>s.members);const items=useChat(s=>s.items);
 const [now,setNow]=useState(Date.now()),[busy,setBusy]=useState(false),[error,setError]=useState(null),[adding,setAdding]=useState(false),[title,setTitle]=useState(''),[assignee,setAssignee]=useState(''),[deadline,setDeadline]=useState(''),[option,setOption]=useState(''),[subgroup,setSubgroup]=useState(''),[tab,setTab]=useState('present'),[forward,setForward]=useState(false);
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
 useEffect(()=>{if(!r)useNebula.getState().load().catch(e=>setError(e.message));},[parsed.id]);
 async function act(body){setBusy(true);setError(null);try{await useNebula.getState().update(parsed.id,body);return true;}catch(e){setError(e.message);return false;}finally{setBusy(false);}}
 if(!r)return <div className="neb-card" role="status">{error??'Đang tải thẻ…'}<button onClick={()=>useNebula.getState().load().catch(e=>setError(e.message))}>Tải lại</button></div>;
 const manage=r.ownerId===user.id||(members[String(r.roomId)]??[]).some(m=>m.id===user.id&&m.role==='ADMIN');
 const children=hierarchy(r.roomId).children;const roleGroups=children.filter(c=>c.leaderId===user.id||(members[String(c.roomId)]??[]).some(m=>m.id===user.id&&m.role==='ADMIN'));
 const percent=taskProgress(r),closed=r.type==='checkin'&&now>=Date.parse(r.deadline);
 const groupName=(id)=>roomName(items.find(c=>String(c.id)===String(id))??{})||`Nhóm #${id}`;
 const steps=r.steps??[];const participants=members[String(r.subgroupId??r.roomId)]??[];
 return <article className="neb-card">
 {parsed.source&&<div className="neb-forward">↪ Công việc chuyển tiếp từ {parsed.source}</div>}
 <header><strong>{r.title}</strong>{r.type==='task'&&<button type="button" title="Chuyển tiếp công việc" aria-label="Chuyển tiếp công việc" onClick={()=>setForward(true)}><ShareFat size={16}/></button>}</header>
 {r.type==='task'&&<>
 <div className="neb-task-meta"><span style={{color:r.priority==='high'?'var(--destructive)':r.priority==='medium'?'#F59E0B':'#10B981'}}>{({high:'Cao',medium:'Trung bình',low:'Thấp'})[r.priority]}</span>{r.deadline&&<time className="tnum" style={{color:Date.parse(r.deadline)<now&&percent<100?'var(--destructive)':undefined}}>{new Date(r.deadline).toLocaleString('vi-VN')}</time>}</div>
 {r.description&&<p>{r.description}</p>}{r.subgroupId&&<p>Nhóm phụ trách: {groupName(r.subgroupId)}</p>}{r.assigneeId&&<p>Phụ trách: <Person id={r.assigneeId} room={r.roomId}/></p>}
 <div className="neb-progress"><span style={{width:`${percent}%`}}/></div><small className="tnum">{percent}% · {steps.filter(s=>s.done).length}/{steps.length} đầu việc</small>
 {steps.map(s=><label className="neb-step" key={s.id}><input type="checkbox" checked={!!s.done} disabled={busy||!(s.assigneeId===user.id||manage)} onChange={e=>act({action:'toggleStep',stepId:s.id,done:e.target.checked})}/><span><span style={{textDecoration:s.done?'line-through':undefined}}>{s.title}</span><small className="block"><Person id={s.assigneeId} room={r.subgroupId??r.roomId}/>{s.deadline?` · ${new Date(s.deadline).toLocaleString('vi-VN')}`:''}</small></span></label>)}
 {!steps.length&&(manage||r.assigneeId===user.id)&&<button className="neb-button" disabled={busy} onClick={()=>act({action:'complete',done:!r.done})}>{r.done?'Mở lại công việc':'Đánh dấu hoàn thành'}</button>}
 {(manage||(r.subgroupId&&roleGroups.some(g=>g.roomId===r.subgroupId)))&&<button className="neb-button" onClick={()=>setAdding(v=>!v)}>+ Chia đầu việc con (Tầng 2)</button>}
 {adding&&<form className="neb-inline-form" onSubmit={async e=>{e.preventDefault();if(await act({action:'addStep',title,assigneeId:Number(assignee),deadline:deadline?new Date(deadline).toISOString():null})){setAdding(false);setTitle('');}}}><input required maxLength={160} placeholder="Tên bước thực hiện" value={title} onChange={e=>setTitle(e.target.value)}/><select required value={assignee} onChange={e=>setAssignee(e.target.value)}><option value="">Chọn @thành viên</option>{participants.map(m=><option key={m.id} value={m.id}>{memberName(r.subgroupId??r.roomId,m.id,m.username)}</option>)}</select><input aria-label="Hạn việc con" type="datetime-local" value={deadline} onChange={e=>setDeadline(e.target.value)}/><button disabled={busy} className="neb-primary">Thêm đầu việc</button></form>}
 </>}
 {r.type==='poll'&&(()=>{const votes=r.votes??{};const collective=r.mode==='collective';const key=collective?`group-${subgroup}`:String(user.id);const mine=r.anonymous?(r.myVotes??[]):votes[key]??[];const total=r.anonymous?r.voterCount:Object.keys(votes).filter(k=>(votes[k]??[]).length).length;return <>
 {collective&&<><small>Mỗi nhóm con có 1 phiếu đại diện do trưởng nhóm chốt.</small><select aria-label="Nhóm đại diện" value={subgroup} onChange={e=>setSubgroup(e.target.value)}><option value="">Chọn nhóm đại diện</option>{roleGroups.map(g=><option key={g.id} value={g.roomId}>{groupName(g.roomId)}</option>)}</select></>}
 {(r.options??[]).map(o=>{const voters=Object.entries(votes).filter(([,v])=>v.includes(o.id)).map(([k])=>k);const count=r.anonymous?r.counts?.[o.id]??0:voters.length;const percentage=total?Math.round(count/total*100):0;return <button className="neb-poll-option" type="button" key={o.id} aria-pressed={mine.includes(o.id)} disabled={busy||(collective&&!subgroup)} onClick={()=>act({action:'vote',subgroupId:subgroup?Number(subgroup):null,choices:r.multiple?(mine.includes(o.id)?mine.filter(id=>id!==o.id):[...mine,o.id]):mine.includes(o.id)?[]:[o.id]})}><span className="neb-poll-bar" style={{width:`${percentage}%`}}/><span className="neb-poll-text"><span>{mine.includes(o.id)?'✓ ':''}{o.text}</span><span className="tnum">{count} · {percentage}%</span></span>{!r.anonymous&&<span className="neb-voters">{voters.map(id=>id.startsWith('group-')?<span className="neb-tag" key={id} style={{'--neb-color':children.find(c=>String(c.roomId)===id.slice(6))?.color??'var(--accent)'}}>{groupName(id.slice(6))}</span>:<span key={id} title={(members[String(r.roomId)]??[]).find(m=>String(m.id)===id)?.username}><Avatar name={(members[String(r.roomId)]??[]).find(m=>String(m.id)===id)?.username??'?'} size={18}/></span>)}</span>}</button>;})}
 <small className="tnum">{total} {collective?'nhóm đã chốt phiếu':'người đã bầu'}{r.anonymous?' · Ẩn danh':''}</small>
 {r.allowOptions&&<form className="flex gap-1" onSubmit={async e=>{e.preventDefault();if(await act({action:'addOption',text:option}))setOption('');}}><input aria-label="Phương án mới" maxLength={100} required value={option} placeholder="Thêm phương án…" onChange={e=>setOption(e.target.value)}/><button disabled={busy}>Thêm</button></form>}
 </>;})()}
 {r.type==='checkin'&&(()=>{const remaining=Math.max(0,Math.ceil((Date.parse(r.deadline)-now)/1000)),present=Object.keys(r.attendance??{}),absent=(r.expected??[]).filter(id=>!present.includes(String(id)));return <>
 <div className="neb-countdown tnum">{closed?'Đã đóng điểm danh':`${String(Math.floor(remaining/60)).padStart(2,'0')}:${String(remaining%60).padStart(2,'0')}`}</div>
 <button className="neb-primary" disabled={busy||closed||!!r.attendance?.[user.id]||!r.expected?.includes(user.id)} onClick={()=>act({action:'checkin'})}>{r.attendance?.[user.id]?'Đã điểm danh đúng giờ':closed?'Đã đóng điểm danh':'Điểm danh có mặt'}</button>
 <div className="flex gap-2"><button className="neb-button tnum" aria-pressed={tab==='present'} onClick={()=>setTab('present')}>Có mặt ({present.length})</button><button className="neb-button tnum" aria-pressed={tab==='absent'} onClick={()=>setTab('absent')}>{closed?'Vắng mặt':'Chưa điểm danh'} ({absent.length})</button></div>
 {(tab==='present'?present:absent).map(id=><div key={id} className="neb-attendee"><Person id={id} room={r.roomId}/>{r.attendance?.[id]&&<time className="tnum">{new Date(r.attendance[id]).toLocaleTimeString('vi-VN')}</time>}</div>)}
 </>;})()}
 {r.type==='recruit'&&<><span className="neb-tag" style={{'--neb-color':r.color}}>Nhóm con</span><p className="tnum">Đã duyệt: {r.approved?.length??0} / {r.maxMembers}</p><button className="neb-primary" disabled={busy||r.status==='active'||r.applicants?.includes(user.id)} onClick={()=>act({action:'join'})}>{r.status==='active'?'Đã đủ số lượng':r.applicants?.includes(user.id)?'Đã đăng ký':'Đăng ký tham gia'}</button>{(r.applicants??[]).map(id=><div className="neb-attendee" key={id}><Person id={id} room={r.roomId}/>{r.approved?.includes(id)?<small>Đã duyệt</small>:manage&&<button disabled={busy||r.status==='active'} onClick={()=>act({action:'approve',userId:id})}>Duyệt</button>}</div>)}{r.childId&&<button className="neb-button" onClick={()=>useChat.getState().select(r.childId)}>Mở nhóm con</button>}</>}
 {r.type==='merge'&&<><p>Nhóm: {groupName(r.childId)}</p><p>{r.status==='active'?'Đã sáp nhập':'Chờ Trưởng cộng đồng phê duyệt'}</p>{String(hierarchy(r.roomId).leaderId??(members[String(r.roomId)]??[]).find(m=>m.role==='ADMIN')?.id)===String(user.id)&&<button className="neb-primary" disabled={busy||r.status==='active'} onClick={()=>act({action:'approve'})}>Cho phép / Phê duyệt</button>}</>}
 {error&&<p role="alert" style={{color:'var(--destructive)'}}>{error}</p>}{forward&&<ForwardPicker msg={message} conv={conv} onClose={()=>setForward(false)}/>}
 </article>;
}
