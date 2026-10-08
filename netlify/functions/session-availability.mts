import type { Config, Context } from '@netlify/functions';
import { groupInput } from './_shared/session-input.mjs';
import { validateGroup, quoteSession, sessionDay } from './_shared/session-rules.mjs';
import { readCalendar } from './_shared/calendar-service.mjs';
import { isValidDate, shiftDate } from './_shared/booking-rules.mjs';
import { sessionSheetRequest } from './_shared/google.mjs';
import { SESSION_HEADERS } from './_shared/session-register.mjs';
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export default async (request:Request,context:Context)=>{
  const params=new URL(request.url).searchParams;
  const group=groupInput({...Object.fromEntries(params),shareConsent:params.get('shareConsent')==='true'});
  const errors=validateGroup(group);
  if (errors.length) return json({error:errors[0]},400);
  const month=params.get('month')||'';
  const today=new Date().toLocaleDateString('en-CA',{timeZone:'Europe/Paris'}),latest=shiftDate(today,120);
  if (!/^\d{4}-\d{2}$/.test(month) || !isValidDate(`${month}-01`) || month<today.slice(0,7) || month>latest.slice(0,7)) return json({error:'Choisissez un mois dans les quatre prochains mois.'},400);
  const first=`${month}-01`,next=new Date(`${first}T12:00:00Z`);next.setUTCMonth(next.getUTCMonth()+1);
  const last=shiftDate(next.toISOString().slice(0,10),-1);
  try {
    const {events,preview,source}=await readCalendar(first,last,context);
    if (!preview) {
      if (Netlify.env.get('SESSION_REQUESTS_ENABLED')!=='true') return json({error:'Les demandes sont momentanément suspendues. Appelez le 07 44 22 78 63.'},503);
      const sheet=await sessionSheetRequest(`/values/${encodeURIComponent('Demandes!A1:AI1')}`);
      if (JSON.stringify(sheet.values?.[0])!==JSON.stringify(SESSION_HEADERS)) throw new Error('Registre indisponible ou colonnes modifiées.');
    }
    const days=[];
    for (let date=first;date<=last;date=shiftDate(date,1)) days.push(date<=today||date>latest?{date,status:'outside_range',slots:[],windows:[]}:sessionDay(date,group,events));
    return json({days,quote:quoteSession(group),preview,source,checkedAt:new Date().toISOString(),bookingMode:'request_only'});
  } catch {return json({error:'Le planning est indisponible. Réessayez ou appelez le 07 44 22 78 63.',source:'unavailable'},503);}
};
export const config:Config={path:'/api/session-availability',method:['GET']};
