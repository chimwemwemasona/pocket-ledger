// Conservative, local-only interpretation: unknown formats always remain reviewable.
export const categories=['Uncategorized','Food & groceries','Transport','Shopping','Bills & utilities','Housing','Health','Entertainment','Family & giving','Income','Transfers','Fees'];
export function candidate(text){return typeof text==='string'&&text.length<=12000&&!/\b(?:otp|one.time (?:pin|password|code)|verification code|login code)\b/i.test(text)&&/\b(?:ZMW|ZMK|K|USD|ZAR)\s*\d|\d[\d,.]*\s*(?:ZMW|ZMK|kwacha)\b/i.test(text)&&/\b(?:sent|received|paid|payment|purchase|withdrawn|withdrawal|deposit|credited|debited|transferred|transfer|cash.?out|cash.?in|reversal|refund)\b/i.test(text);}
const toMinor=s=>{const clean=s.replace(/,/g,'');if(!/^\d+(?:\.\d{1,2})?$/.test(clean))return null;const [a,b='']=clean.split('.');const n=Number(a)*100+Number(b.padEnd(2,'0'));return Number.isSafeInteger(n)&&n>0&&n<1e12?n:null;};
export function parseNotification(text,sender=''){
 const provider=/airtel/i.test(sender+' '+text)?'Airtel Money':/\b(?:mtn|momo)\b/i.test(sender+' '+text)?'MTN MoMo':/\bfnb\b|first national bank/i.test(sender+' '+text)?'FNB':'Other';
 const matches=[...text.matchAll(/\b(ZMW|ZMK|USD|ZAR|K)\s*([\d,]+(?:\.\d{1,2})?)\b|\b([\d,]+(?:\.\d{1,2})?)\s*(ZMW|ZMK|kwacha)\b/gi)].map(m=>({amount:toMinor(m[2]||m[3]),currency:/USD/i.test(m[1]||m[4])?'USD':/ZAR/i.test(m[1]||m[4])?'ZAR':'ZMW',index:m.index,end:m.index+m[0].length})).filter(m=>m.amount!==null);
 const scored=matches.map(m=>{const before=text.slice(Math.max(0,m.index-65),m.index).toLowerCase();const local=before.split(/[.;\n]/).pop();const last=(re)=>{const a=[...local.matchAll(re)];return a.length?a.at(-1).index:-1;};const bad=last(/balance|available|fee|charge|limit|cost/g),good=last(/sent|received|paid|payment|purchase|withdrawn|withdrawal|deposit|credited|debited|transferred|amount|cash.?out|cash.?in|refund|reversal/g);return {...m,score:bad>good?-10:good>=0?5:0};});
 const usable=scored.filter(m=>m.score>=0).sort((a,b)=>b.score-a.score);const chosen=usable[0];
 const incoming=/\b(?:received|credited|deposit(?:ed)?|cash.?in|refund(?:ed)?|reversal)\b/i.test(text),outgoing=/\b(?:sent|paid|payment|purchase|withdrawn|withdrawal|debited|cash.?out)\b/i.test(text);
 const strongOut=/\b(?:sent|paid|purchase|withdrawn|withdrawal|debited|cash.?out)\b/i.test(text);
 const direction=incoming&&!strongOut?'income':outgoing&&!incoming?'expense':/\btransfer(?:red)?\b.{0,60}\bto\b/i.test(text)&&!incoming?'expense':'unknown';
 const reference=text.match(/(?:transaction\s*(?:id|ref(?:erence)?)|txn\s*(?:id|ref)?|reference|ref)\s*[:#=]?\s*([A-Z0-9][A-Z0-9-]{4,60})/i)?.[1]??null;
 let merchant=text.match(/\b(?:to|from|at)\s+(.{2,90}?)(?=\s+(?:on|with|ref|transaction|txn|balance|your|fee|available)\b|[.;\n]|$)/i)?.[1]?.trim()||'';
 if(/^(?:your|account|wallet)\b/i.test(merchant))merchant='';
 const sameRank=chosen&&usable.length>1;
 const confidence=chosen&&chosen.score>0&&direction!=='unknown'&&!sameRank?'likely':'unclear';
 const fee=scored.find(m=>/\b(?:fee|charge|cost)\s*[:=]?\s*$/i.test(text.slice(Math.max(0,m.index-30),m.index)))?.amount??0;
 return {provider,amountMinor:chosen?.amount??null,currency:chosen?.currency??'ZMW',direction,merchant,reference,feeMinor:fee,confidence,status:'review',category:direction==='income'?'Income':'Uncategorized',reason:!chosen?'No unambiguous transaction amount':direction==='unknown'?'Confirm whether money came in or went out':sameRank?'Several possible transaction amounts':'Confirm the captured details'};
}
