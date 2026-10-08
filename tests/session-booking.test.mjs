import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import {openingWindows} from '../src/opening-hours.js';
import {candidateStarts,shiftDate} from '../netlify/functions/_shared/booking-rules.mjs';
import {validateGroup,quoteSession,sessionAvailability} from '../netlify/functions/_shared/session-rules.mjs';
import {SESSION_HEADERS,sessionRow} from '../netlify/functions/_shared/session-register.mjs';
import booking from '../netlify/functions/book-session.mts';
import availability from '../netlify/functions/session-availability.mts';
const group={groupType:'famille',under12:3,teens:0,adults:1,ageMin:8,ageMax:10,games:2,shareConsent:true};
const env=new Map();globalThis.Netlify={env:{get:key=>env.get(key)}};
const today=new Date().toLocaleDateString('en-CA',{timeZone:'Europe/Paris'});
const date=Array.from({length:7},(_,n)=>shiftDate(today,n+1)).find(d=>new Date(`${d}T12:00:00Z`).getUTCDay()===5);
const valid={...group,contactName:'Contact interne',email:'test@example.com',phone:'0600000000',date,startTime:'17:00',spacing:30,mode:'slot',notes:'',privacyAccepted:true,marketingConsent:false,idempotencyKey:'session-internal-test-123456789'};
const request=data=>new Request('https://lasergamestignieu.com/api/book-session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
const birthday=(description='Partage : autorisé')=>({summary:'Commandant 9 ans 6 enfants',description:`Rotations : 14:00, 15:00 | Équipements prévus : 7/17 | ${description}`,start:{dateTime:'2026-10-18T14:00:00+02:00'},end:{dateTime:'2026-10-18T16:00:00+02:00'}});
test('vacances : journée continue mardi–dimanche, anniversaires toujours exclus mardi/jeudi',()=>{
 assert.deepEqual(openingWindows('2026-10-20'),[['10:30','20:00']]);assert.deepEqual(openingWindows('2026-10-19'),[]);
 assert.deepEqual(openingWindows('2026-10-22'),[['10:30','20:00']]);assert.deepEqual(openingWindows('2026-11-05'),[['17:00','22:00']]);
 assert.equal(candidateStarts('2026-10-17','commandant')[0],'10:30');assert.equal(candidateStarts('2026-10-17','commandant').at(-1),'18:00');
 assert.deepEqual(candidateStarts('2026-10-20','commandant'),[]);assert.deepEqual(candidateStarts('2026-10-22','commandant'),[]);
 assert.equal(sessionAvailability({date:'2026-10-20',group,events:[]}).at(-1).endTime,'20:00');
});
test('tarifs selon effectifs, âge cohérent et adulte dans l’arène',()=>{
 assert.equal(quoteSession(group).totalEstimate,56);assert.equal(quoteSession({...group,games:3}).totalEstimate,76);
 assert.ok(validateGroup({...group,adults:0}).length);assert.ok(validateGroup({...group,ageMax:14}).length);assert.deepEqual(validateGroup(group),[]);
});
test('partage compatible et deux passages anniversaire espacés d’une heure',()=>{
 const slots=sessionAvailability({date:'2026-10-18',group,events:[birthday()]});
 assert.ok(slots.some(slot=>slot.startTime==='14:00'&&slot.spacing===60&&slot.endTime==='15:30'&&slot.status==='shared'));
 for(const events of [[birthday('Partage : refusé')],[{...birthday(),summary:'Commandant 16 ans 6 enfants'}]]) assert.ok(!sessionAvailability({date:'2026-10-18',group,events}).some(slot=>slot.startTime==='14:00'));
 assert.ok(!sessionAvailability({date:'2026-10-18',group:{...group,shareConsent:false},events:[birthday()]}).some(slot=>slot.startTime==='14:00'));
});
test('matériel, événements inconnus et jours fermés ne deviennent jamais libres',()=>{
 const events=[{...birthday(),description:'Rotations : 14:00, 15:00 | Équipements prévus : 15/17 | Partage : autorisé'}];
 assert.ok(!sessionAvailability({date:'2026-10-18',group,events}).some(slot=>slot.startTime==='14:00'));
 assert.deepEqual(sessionAvailability({date:'2026-10-19',group,events:[]}),[]);
 assert.deepEqual(sessionAvailability({date:'2026-10-18',group:{...group,adults:15},events:[]}),[]);
 const unknown={summary:'Réservation non documentée',start:{dateTime:'2026-10-18T14:00:00+02:00'},end:{dateTime:'2026-10-18T16:00:00+02:00'}};
 assert.ok(!sessionAvailability({date:'2026-10-18',group,events:[unknown]}).some(slot=>slot.startTime==='15:30'));
});
test('email obligatoire, préversion sans stockage et sans e-mail',async()=>{
 const original=globalThis.fetch;globalThis.fetch=()=>{throw new Error('Écriture non autorisée en préversion');};
 try {
  assert.equal((await booking(request({...valid,email:''}),{deploy:{context:'deploy-preview'}})).status,400);
  const response=await booking(request(valid),{deploy:{context:'deploy-preview'}});assert.equal(response.status,200);const payload=await response.json();assert.equal(payload.preview,true);assert.equal(payload.totalEstimate,56);
 }finally{globalThis.fetch=original;}
});
test('registre RAW, consentement daté et colonnes distinctes des recettes réelles',()=>{
 const row=sessionRow({bookingId:'SES-TEST',data:{...valid,contactName:'=IMPORTXML("x")',marketingConsent:true},quote:quoteSession(group),plan:null,receivedAt:'2026-10-08T10:00:00.000Z'});
 assert.equal(row.length,SESSION_HEADERS.length);assert.equal(row[28],'Oui');assert.equal(row[29],'2026-10-08T10:00:00.000Z');assert.equal(row[32],'2029-10-08');assert.equal(row[33],'');assert.equal(row[34],'');
});
test('production : persistance, reprise après notification échouée, doublon évité et aucun événement créé',async()=>{
 const {privateKey}=generateKeyPairSync('rsa',{modulusLength:2048});
 for(const [k,v] of Object.entries({SESSION_REQUESTS_ENABLED:'true',GOOGLE_SERVICE_ACCOUNT_EMAIL:'server@example.com',GOOGLE_PRIVATE_KEY:privateKey.export({type:'pkcs8',format:'pem'}),GOOGLE_SESSION_SHEET_ID:'sheet-test'}))env.set(k,v);
 const original=globalThis.fetch;let row=null,notified=false,fail=true;const writes=[];
 globalThis.fetch=async(url,options={})=>{
  const u=String(url);
  if(u.includes('oauth2.googleapis.com'))return Response.json({access_token:'test-token'});
  if(u.includes('calendar/v3')){assert.equal(options.method,undefined);return Response.json({items:[]});}
  if(u.includes('values/Demandes!A2%3AA10000'))return Response.json({values:row?[[row[0]]]:[]});
  if(u.includes(':append')){writes.push(options);assert.ok(u.includes('valueInputOption=RAW'));row=JSON.parse(options.body).values[0];return Response.json({updates:{updatedRange:'Demandes!A2:AI2'}});}
  if(u.includes('values/Demandes!AF2')&&options.method==='PUT'){notified=true;return Response.json({});}
  if(u.includes('values/Demandes!AF2'))return Response.json({values:[[notified?'Transmise':'À transmettre']]});
  if(u==='https://lasergamestignieu.com/demande-session-recue'){if(fail)return new Response('indisponible',{status:503});assert.match(options.body,/form-name=reservation-classique/);return new Response('lgt-session-receipt-v1');}
  throw new Error('Unexpected request '+u);
 };
 try{
  assert.equal((await booking(request(valid),{deploy:{context:'production'}})).status,503);assert.equal(writes.length,1);
  fail=false;const receipt=await booking(request(valid),{deploy:{context:'production'}});assert.equal(receipt.status,200);assert.equal(writes.length,1);assert.equal(notified,true);
  assert.equal((await booking(request(valid),{deploy:{context:'production'}})).status,200);assert.equal(writes.length,1);
 }finally{globalThis.fetch=original;env.clear();}
});
test('API mensuelle : aucun contenu privé, production Google en panne ferme les propositions',async()=>{
 const params=new URLSearchParams({...group,month:date.slice(0,7)});
 const response=await availability(new Request(`https://preview.example/api/session-availability?${params}`),{deploy:{context:'deploy-preview'}});assert.equal(response.status,200);const body=await response.json();assert.doesNotMatch(JSON.stringify(body),/summary|description|@gmail|Exemple fictif/);
 assert.equal((await availability(new Request(`https://preview.example/api/session-availability?${params}`),{deploy:{context:'production'}})).status,503);
});
