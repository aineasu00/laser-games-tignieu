import { CAPACITY, minutes, timeFromMinutes, normalizeCalendarEvent, groupsAreCompatible, isValidDate } from './booking-rules.mjs';
import { openingWindows, holidayFor } from '../../../src/opening-hours.js';

export const GROUPS = {famille:'Famille', amis:'Amis', enfants:'Groupe d’enfants', entreprise:'Entreprise', association:'Association / club', evg_evjf:'EVG / EVJF', autre:'Autre'};
export const PRICES = {standard:[9,17,22], under12:[7,13,18]};
export function validateGroup(group) {
  const errors=[];
  if (!Object.hasOwn(GROUPS,group.groupType)) errors.push('Choisissez le type de groupe.');
  for (const key of ['under12','teens','adults']) if (!Number.isInteger(group[key]) || group[key]<0 || group[key]>120) errors.push('Indiquez un nombre entier de joueurs.');
  const total=group.under12+group.teens+group.adults;
  if (total<1 || total>120) errors.push('Indiquez entre 1 et 120 joueurs.');
  if (![1,2,3].includes(group.games)) errors.push('Choisissez 1, 2 ou 3 parties.');
  if (group.under12+group.teens>0) {
    if (!Number.isInteger(group.ageMin) || !Number.isInteger(group.ageMax) || group.ageMin<6 || group.ageMax>17 || group.ageMax<group.ageMin) errors.push('Indiquez les âges des enfants, de 6 à 17 ans.');
    if (group.under12>0 && group.ageMin>=12 || group.under12===0 && group.ageMin<12 || group.teens>0 && group.ageMax<12 || group.teens===0 && group.ageMax>=12) errors.push('Les âges doivent correspondre aux effectifs de moins de 12 ans et de 12–17 ans.');
    if (group.ageMin<14 && group.adults<1) errors.push('Un adulte doit entrer dans l’arène avec les moins de 14 ans. Comptez-le parmi les adultes joueurs.');
  }
  if (typeof group.shareConsent!=='boolean') errors.push('Précisez votre préférence de partage.');
  return errors;
}
export function quoteSession(group) {
  return {under12Price:PRICES.under12[group.games-1],standardPrice:PRICES.standard[group.games-1], totalEstimate:group.under12*PRICES.under12[group.games-1]+(group.teens+group.adults)*PRICES.standard[group.games-1], players:group.under12+group.teens+group.adults};
}
export function segmentFor(group) { return group.groupType; }
export function sessionPlan(startTime,games,spacing=30) {
  const rotations=Array.from({length:games},(_,n)=>timeFromMinutes(minutes(startTime)+n*spacing));
  return {startTime,spacing,rotations,endTime:timeFromMinutes(minutes(rotations.at(-1))+30)};
}
function compatible(group,event) {
  if (event.age===null) return false;
  if (group.under12+group.teens===0) return event.age>=14;
  return groupsAreCompatible(group.ageMin,event.age) && groupsAreCompatible(group.ageMax,event.age);
}
export function sessionAvailability({date,group,events}) {
  if (!isValidDate(date) || validateGroup(group).length || quoteSession(group).players>CAPACITY) return [];
  const normalized=events.map(normalizeCalendarEvent).filter(Boolean);
  const windows=openingWindows(date);
  const starts=new Set();
  for (const [from,to] of windows) for (let n=minutes(from);n<minutes(to);n+=30) starts.add(timeFromMinutes(n));
  // Include documented rotations that do not start on the usual half hour.
  for (const event of normalized) if (event.startDate===date && !event.uncertain) for (const time of event.rotations) starts.add(time);
  const slots=[];
  for (const startTime of [...starts].sort()) for (const spacing of group.games===1?[30]:[30,60]) {
    const plan=sessionPlan(startTime,group.games,spacing);
    if (!windows.some(([from,to])=>minutes(startTime)>=minutes(from) && minutes(plan.endTime)<=minutes(to))) continue;
    let shared=0,blocked=false;
    for (const rotation of plan.rotations) {
      const from=minutes(rotation),to=from+30;
      const overlapping=normalized.filter(event=>{
        if (event.allDay) return date>=event.startDate && date<event.endDate;
        if (event.uncertain) return date>=event.startDate && date<=event.endDate && from<(date===event.endDate?event.endMinute:1440) && to>(date===event.startDate?event.startMinute:0);
        return event.startDate===date && event.rotations.some(time=>from<minutes(time)+30 && to>minutes(time));
      });
      if (overlapping.length) shared++;
      if (overlapping.some(event=>event.allDay || event.uncertain || !event.shareAllowed || !group.shareConsent || !compatible(group,event)) || overlapping.reduce((sum,event)=>sum+event.equipment,0)+quoteSession(group).players>CAPACITY) {blocked=true;break;}
    }
    // An hour between games is suggested only to join existing rotations.
    if (!blocked && (spacing===30 || shared===group.games)) slots.push({...plan,status:shared?'shared':'available'});
  }
  return slots;
}
export function sessionDay(date,group,events) {
  const slots=sessionAvailability({date,group,events});
  return {date,holiday:holidayFor(date)?.[2]||null,windows:openingWindows(date),status:!openingWindows(date).length?'closed':slots.length?'available':'request',slots};
}
