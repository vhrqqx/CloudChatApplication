import { sendMessage } from './ws.js';
import { useChat } from '../store/chat.js';
import { useUi } from '../store/ui.js';
import { useAuth } from '../store/auth.js';
import { useNebula,roomName } from '../store/nebula.js';
import { nebulaMessage } from './nebula.js';
export const FORWARD_TYPE='application/x-cloudchat-message';
let dragged=null;
export function isForwardDrag(e){return Array.from(e.dataTransfer?.types??[]).includes(FORWARD_TYPE);}
export function beginForward(e,msg,conv){if(msg.deletedInfo){e.preventDefault();return;}dragged={id:msg.id,conversationId:conv.id};e.dataTransfer.setData(FORWARD_TYPE,JSON.stringify(dragged));e.dataTransfer.effectAllowed='copy';const ghost=document.createElement('div');ghost.className='m9-drag-preview';ghost.textContent='↪ Chuyển tiếp';document.body.appendChild(ghost);e.dataTransfer.setDragImage(ghost,12,12);setTimeout(()=>ghost.remove(),0);}
export function endForward(){dragged=null;}
export async function forwardTo(msg,conv,targetId){
 if(msg.deletedInfo||String(conv.id)===String(targetId))throw new Error('Chọn cuộc trò chuyện khác để chuyển tiếp.');
 const state=useChat.getState(),target=state.items.find(c=>String(c.id)===String(targetId));if(!target)throw new Error('Hội thoại không khả dụng.');
 const parsed=nebulaMessage(msg.content);let content;
 if(parsed&&['TASK_V1','TASK_FORWARD_V1'].includes(parsed.tag)){
  await useNebula.getState().update(parsed.id,{action:'forward',targetId});
  useUi.getState().flashSuccess(`Đã chuyển tiếp công việc tới ${roomName(target)}`);
  return;
 }else {const name=state.members[String(conv.id)]?.find(m=>String(m.id)===String(msg.senderId))?.username??'Người dùng';content=`↪ Chuyển tiếp từ ${name}:\n${msg.content}`;}
 if(content.length>2000)throw new Error('Nội dung chuyển tiếp vượt quá 2000 ký tự.');
 return new Promise((resolve,reject)=>{let timer;const known=new Set(state.messages[String(targetId)]?.list.map(m=>m.id)??[]);const stop=useChat.subscribe(s=>{if(s.messages[String(targetId)]?.list.some(m=>!known.has(m.id)&&m.senderId===useAuth.getState().user?.id&&m.content===content)){stop();clearTimeout(timer);useUi.getState().flashSuccess(`Đã chuyển tiếp tới ${roomName(target)}`);resolve();}});try{sendMessage(targetId,content);}catch(e){stop();reject(e);return;}timer=setTimeout(()=>{stop();reject(new Error('Chưa nhận xác nhận chuyển tiếp. Kiểm tra hội thoại đích trước khi gửi lại.'));},10000);});
}
export async function dropForward(e,target){if(!isForwardDrag(e))return;e.preventDefault();e.stopPropagation();try{const payload=JSON.parse(e.dataTransfer.getData(FORWARD_TYPE));if(!dragged||dragged.id!==payload.id||dragged.conversationId!==payload.conversationId)throw new Error('Dữ liệu kéo không hợp lệ.');const state=useChat.getState(),msg=state.messages[String(payload.conversationId)]?.list.find(m=>m.id===payload.id),conv=state.items.find(c=>c.id===payload.conversationId);if(!msg||!conv)throw new Error('Tin nhắn không còn khả dụng.');await forwardTo(msg,conv,target.id);}catch(e){useUi.getState().flashError(e.message);}finally{dragged=null;}}
