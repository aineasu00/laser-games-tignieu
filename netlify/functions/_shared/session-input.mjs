import { validateGroup } from './session-rules.mjs';
const clean=(value,max)=>String(value??'').trim().replace(/[\r\n\t]+/g,' ').slice(0,max);
const integer=value=>typeof value==='number'?value:Number(value);
export function groupInput(raw) {
  return {groupType:clean(raw.groupType,20),under12:integer(raw.under12),teens:integer(raw.teens),adults:integer(raw.adults),ageMin:integer(raw.ageMin),ageMax:integer(raw.ageMax),games:integer(raw.games),shareConsent:raw.shareConsent};
}
export function sessionInput(raw) {
  return {...groupInput(raw),contactName:clean(raw.contactName,100),email:clean(raw.email,160).toLowerCase(),phone:clean(raw.phone,30),date:clean(raw.date,10),startTime:clean(raw.startTime,5),spacing:integer(raw.spacing),mode:clean(raw.mode,20),notes:clean(raw.notes,1000),marketingConsent:raw.marketingConsent===true,privacyAccepted:raw.privacyAccepted===true,idempotencyKey:clean(raw.idempotencyKey,80)};
}
export function validateContact(data) {
  const errors=validateGroup(data);
  if (!data.contactName) errors.push('Votre nom est requis.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.push('Votre adresse e-mail est requise et doit être valide.');
  if (!/^\+?\d{10,15}$/.test(data.phone.replace(/[\s().-]/g,''))) errors.push('Indiquez un numéro de téléphone valide.');
  if (!data.privacyAccepted) errors.push('Prenez connaissance du traitement des informations de réservation.');
  if (!['slot','personalized'].includes(data.mode)) errors.push('Type de demande invalide.');
  if (!/^[a-zA-Z0-9_-]{20,80}$/.test(data.idempotencyKey)) errors.push('Identifiant de demande invalide.');
  return errors;
}
