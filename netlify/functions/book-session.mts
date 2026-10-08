import type { Config, Context } from '@netlify/functions';
import { createHash } from 'node:crypto';
import { sessionInput, validateContact } from './_shared/session-input.mjs';
import { quoteSession, sessionAvailability, sessionPlan } from './_shared/session-rules.mjs';
import { readCalendar } from './_shared/calendar-service.mjs';
import { isValidDate, shiftDate, minutes } from './_shared/booking-rules.mjs';
import { openingWindows } from '../../src/opening-hours.js';
import { sessionRow, notificationFields } from './_shared/session-register.mjs';
import { findSessionRequest, appendSessionRow, sessionNotificationState, markSessionNotified } from './_shared/google.mjs';
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export default async (request:Request,context:Context)=>{
  if (request.method!=='POST') return json({error:'Méthode non autorisée.'},405);
  const origin=request.headers.get('origin');
  if (origin && origin!==new URL(request.url).origin) return json({error:'Origine de la demande invalide.'},403);
  if (!request.headers.get('content-type')?.includes('application/json')) return json({error:'Format invalide.'},415);
  const preview=context.deploy?.context!=='production';
  if (!preview && Netlify.env.get('SESSION_REQUESTS_ENABLED')!=='true') return json({error:'Les demandes sont suspendues. Appelez le 07 44 22 78 63.'},503);
  let raw;
  try {const body=await request.text();if(body.length>8000)return json({error:'Demande trop volumineuse.'},413);raw=JSON.parse(body);if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error();}catch{return json({error:'Demande invalide.'},400);}
  if (raw.website) return json({error:'Demande invalide.'},400);
  const data=sessionInput(raw),errors=validateContact(data);
  const today=new Date().toLocaleDateString('en-CA',{timeZone:'Europe/Paris'});
  if (!isValidDate(data.date) || data.date<=today || data.date>shiftDate(today,120)) errors.push('Choisissez une date entre demain et les quatre prochains mois.');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(data.startTime) || !openingWindows(data.date).some(([from,to]:string[])=>minutes(data.startTime)>=minutes(from) && minutes(data.startTime)+30<=minutes(to))) errors.push('Choisissez une heure pendant les horaires d’ouverture.');
  if (data.mode==='slot' && ![30,60].includes(data.spacing)) errors.push('Organisation des parties invalide.');
  if (errors.length) return json({error:errors[0]},400);
  const quote=quoteSession(data);
  // Include canonical content so altered retries are distinct requests.
  const bookingId=`${preview?'TEST':'SES'}-${createHash('sha256').update(JSON.stringify(data)).digest('hex').slice(0,16).toUpperCase()}`;
  let row:number|null=null;
  try {
    if (!preview) row=await findSessionRequest(bookingId);
    let plan=data.mode==='slot'?sessionPlan(data.startTime,data.games,data.spacing):null;
    if (!row) {
      const {events}=await readCalendar(data.date,data.date,context);
      if (data.mode==='slot') {
        const slot=sessionAvailability({date:data.date,group:data,events}).find(slot=>slot.startTime===data.startTime&&slot.spacing===data.spacing);
        if (!slot) return json({error:'Ce créneau a changé ou ne convient plus au groupe. Actualisez le planning ou envoyez une demande sur mesure.'},409);
        plan=slot;
      }
      if (!preview) row=await appendSessionRow(sessionRow({bookingId,data,quote,plan,receivedAt:new Date().toISOString()}));
    }
    if (!preview && row && await sessionNotificationState(row)!=='Transmise') {
      // The request is already durably recorded if transmission fails. A retry
      // finds the same reference and retries notification without a new row.
      const sent=await fetch('https://lasergamestignieu.com/demande-session-recue.html',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:notificationFields({bookingId,data,quote,plan}).toString(),signal:AbortSignal.timeout(12000)});
      const receipt=await sent.text();
      if (!sent.ok || !receipt.includes('lgt-session-receipt-v1')) throw new Error('Notification non vérifiée.');
      await markSessionNotified(row);
    }
    return json({ok:true,preview,bookingId,bookingMode:'request_only',date:data.date,startTime:data.startTime,...quote,endTime:plan?.endTime||null});
  } catch {
    console.error('Session request processing failed', {stage:row?'notification':'register_or_calendar',reference:bookingId});
    return json({error:row?'Votre demande est enregistrée, mais sa transmission doit être vérifiée. Réessayez sans modifier les informations, ou appelez-nous avec la référence.':'La demande n’a pas pu être vérifiée. Réessayez ou appelez le 07 44 22 78 63.',...(row?{bookingId}:{})},503);
  }
};
export const config:Config={path:'/api/book-session',method:['POST'],rateLimit:{action:'rate_limit',aggregateBy:['ip','domain'],windowSize:60,windowLimit:5}};
