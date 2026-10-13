import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {randomBytes,randomUUID,createHash,scrypt as scryptAsync,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import {categories,candidate,parseNotification} from './parser.mjs';
const scrypt=promisify(scryptAsync),hash=v=>createHash('sha256').update(v).digest('hex'),token=()=>randomBytes(32).toString('hex');
export async function passwordHash(p){const salt=token();return `${salt}:${(await scrypt(p,salt,64,{N:32768,r:8,p:3,maxmem:67108864})).toString('hex')}`;}
async function verify(p,stored){const [salt,expected]=(stored||'dummy:').split(':');const actual=await scrypt(p,salt,64,{N:32768,r:8,p:3,maxmem:67108864});return !!expected&&expected.length===128&&timingSafeEqual(actual,Buffer.from(expected,'hex'));}
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
const text=(v,max=1000)=>{if(typeof v!=='string'||v.length>max)fail('Invalid text.');return v.trim();};
export function createApplication(options={}){
 const dir=path.resolve(options.dataDir||process.env.DATA_DIR||'.data');fs.mkdirSync(dir,{recursive:true,mode:0o700});
 const db=new DatabaseSync(path.join(dir,'ledger.sqlite'));db.exec(`PRAGMA journal_mode=WAL;PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE,name TEXT,password TEXT);
 CREATE TABLE IF NOT EXISTS invites(token TEXT PRIMARY KEY,user TEXT,expires INTEGER);
 CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user TEXT,csrf TEXT,expires INTEGER);
 CREATE TABLE IF NOT EXISTS pairs(token TEXT PRIMARY KEY,user TEXT,expires INTEGER);
 CREATE TABLE IF NOT EXISTS devices(id TEXT PRIMARY KEY,user TEXT,name TEXT,token TEXT UNIQUE,created INTEGER,last_sync INTEGER,revoked INTEGER DEFAULT 0);
 CREATE TABLE IF NOT EXISTS transactions(id TEXT PRIMARY KEY,user TEXT,device TEXT,event_id TEXT,source TEXT,provider TEXT,occurred INTEGER,received INTEGER,raw TEXT,amount INTEGER,currency TEXT,direction TEXT,merchant TEXT,reference TEXT,fee INTEGER,confidence TEXT,status TEXT,category TEXT,note TEXT DEFAULT '',reason TEXT,duplicate_of TEXT,version INTEGER DEFAULT 1,UNIQUE(device,event_id));
 CREATE TABLE IF NOT EXISTS budgets(user TEXT,month TEXT,category TEXT,amount INTEGER,PRIMARY KEY(user,month,category));
 CREATE TABLE IF NOT EXISTS rules(user TEXT,merchant TEXT,category TEXT,PRIMARY KEY(user,merchant));`);
 const email=(options.email||process.env.OWNER_EMAIL||'owner@example.com').toLowerCase(),origin=options.origin||process.env.PUBLIC_ORIGIN||'http://127.0.0.1:4192',secure=options.secure??process.env.SECURE_COOKIES==='true';
 db.prepare('INSERT OR IGNORE INTO users VALUES(?,?,?,NULL)').run(randomUUID(),email,'Chimwemwe');
 const send=(res,status,obj,headers={})=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store',...headers});res.end(JSON.stringify(obj));};
 async function body(req){let b='';for await(const chunk of req){b+=chunk;if(Buffer.byteLength(b)>512000)fail('Request too large.',413);}try{return JSON.parse(b||'{}');}catch{fail('Invalid JSON.');}}
 const attempts=new Map();function rate(req){const ip=process.env.TRUST_PROXY==='true'?req.headers['x-real-ip']:req.socket.remoteAddress;const now=Date.now();for(const [k,v]of attempts)if(v.until<now)attempts.delete(k);const v=attempts.get(ip)||{n:0,until:now+900000};v.n++;attempts.set(ip,v);if(v.n>15)fail('Too many attempts. Try again in 15 minutes.',429);}
 function principal(req){const bearer=req.headers.authorization?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];if(bearer){const d=db.prepare('SELECT * FROM devices WHERE token=? AND revoked=0').get(hash(bearer));return d?{user:d.user,device:d}:null;}const cookie=req.headers.cookie?.match(/(?:^|;\s*)pl_session=([a-f0-9]{64})(?:;|$)/)?.[1];return cookie?db.prepare('SELECT * FROM sessions WHERE token=? AND expires>?').get(hash(cookie),Date.now()):null;}
 function session(res,user){const t=token(),csrf=token();db.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(hash(t),user,csrf,Date.now()+14*86400000);send(res,200,{ok:true,csrf},{'Set-Cookie':`pl_session=${t}; Path=/; HttpOnly; SameSite=Strict; Max-Age=1209600${secure?'; Secure':''}`});}
 const minor=v=>{if(!Number.isSafeInteger(v)||v<0||v>1e12)fail('Enter a valid amount.');return v;};
 function insert(user,device,e){
  const eventId=text(e.id,128);if(!/^[a-zA-Z0-9_-]{8,128}$/.test(eventId))fail('Invalid event ID.');
  const old=db.prepare('SELECT id FROM transactions WHERE device=? AND event_id=?').get(device,eventId);if(old)return old.id;
  const raw=text(e.text,12000),source=text(e.source,200),sender=text(e.sender||'',200),when=e.occurred;
  if(!Number.isSafeInteger(when)||when<946684800000||when>Date.now()+300000)fail('Invalid transaction time.');
  if(!candidate(raw))fail('This message does not look like a transaction.');
  const p=parseNotification(raw,sender+' '+source),id=randomUUID();
  // Similar captures are flagged, never silently merged: identical transfers can be real.
  const duplicate=db.prepare('SELECT id FROM transactions WHERE user=? AND status<>? AND ((reference IS NOT NULL AND reference=? AND provider=?) OR (raw=? AND ABS(occurred-?)<120000)) LIMIT 1').get(user,'excluded',p.reference,p.provider,raw,when);
  const rule=p.merchant?db.prepare('SELECT category FROM rules WHERE user=? AND merchant=?').get(user,p.merchant.toLowerCase()):null;
  db.prepare('INSERT INTO transactions(id,user,device,event_id,source,provider,occurred,received,raw,amount,currency,direction,merchant,reference,fee,confidence,status,category,reason,duplicate_of) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id,user,device,eventId,source,p.provider,when,Date.now(),raw,p.amountMinor,p.currency,p.direction,p.merchant,p.reference,p.feeMinor,p.confidence,'review',rule?.category||p.category,duplicate?'Possible duplicate — compare before confirming':p.reason,duplicate?.id||null);return id;
 }
 const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');
  try{
   const url=new URL(req.url,origin),route=url.pathname,auth=principal(req);
   if(route==='/healthz')return send(res,200,{ok:true});
   if(route==='/api/me'&&req.method==='GET'){const u=auth&&!auth.device?db.prepare('SELECT name,email FROM users WHERE id=?').get(auth.user):null;return send(res,200,{user:u,csrf:u?auth.csrf:null});}
   if(route==='/device/pair'&&req.method==='POST'){rate(req);const b=await body(req),pair=db.prepare('SELECT * FROM pairs WHERE token=? AND expires>?').get(hash(text(b.code,128)),Date.now());if(!pair)fail('Pairing code expired or already used.',401);const t=token(),id=randomUUID();db.exec('BEGIN IMMEDIATE');try{if(!db.prepare('DELETE FROM pairs WHERE token=?').run(pair.token).changes)fail('Code used.',401);db.prepare('INSERT INTO devices(id,user,name,token,created) VALUES(?,?,?,?,?)').run(id,pair.user,text(b.name||'Android phone',100),hash(t),Date.now());db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}return send(res,200,{token:t,deviceId:id});}
   if(route==='/device/sync'&&req.method==='POST'){if(!auth?.device)fail('Device access expired. Pair again.',401);const b=await body(req);if(!Array.isArray(b.events)||b.events.length>100)fail('Send at most 100 events.');const acknowledged=[],rejected=[];db.exec('BEGIN IMMEDIATE');try{for(const e of b.events){try{const id=insert(auth.user,auth.device.id,e);acknowledged.push({eventId:e.id,id});}catch(err){if(err.status===400)rejected.push({eventId:e.id,error:err.message});else throw err;}}db.prepare('UPDATE devices SET last_sync=? WHERE id=?').run(Date.now(),auth.device.id);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}return send(res,200,{acknowledged,rejected});}
   if(req.method!=='GET'&&req.headers.origin!==origin)fail('Origin rejected.',403);
   if(route==='/auth/setup'&&req.method==='POST'){rate(req);const b=await body(req);if(typeof b.password!=='string'||b.password.length<12||b.password.length>128)fail('Choose a password of 12–128 characters.');const i=db.prepare('SELECT * FROM invites WHERE token=? AND expires>?').get(hash(text(b.token,128)),Date.now());if(!i)fail('Setup link expired or already used.');const p=await passwordHash(b.password);db.exec('BEGIN IMMEDIATE');try{if(!db.prepare('DELETE FROM invites WHERE token=?').run(i.token).changes)fail('Link used.');db.prepare('UPDATE users SET password=? WHERE id=?').run(p,i.user);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}return session(res,i.user);}
   if(route==='/auth/login'&&req.method==='POST'){rate(req);const b=await body(req);if(typeof b.password!=='string'||b.password.length>128)fail('Sign-in failed.',401);const u=db.prepare('SELECT * FROM users WHERE email=?').get(text(b.email,200).toLowerCase());if(!await verify(b.password,u?.password)||!u)fail('Email or password is incorrect.',401);return session(res,u.id);}
   if(route.startsWith('/api/')||route==='/auth/logout'){
    if(!auth||auth.device)fail('Sign in to continue.',401);
    if(req.method!=='GET'&&req.headers['x-csrf-token']!==auth.csrf)fail('Refresh and try again.',403);
    if(route==='/auth/logout'&&req.method==='POST'){db.prepare('DELETE FROM sessions WHERE token=?').run(auth.token);return send(res,200,{ok:true},{'Set-Cookie':`pl_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure?'; Secure':''}`});}
    if(route==='/api/data'&&req.method==='GET')return send(res,200,{transactions:db.prepare('SELECT * FROM transactions WHERE user=? ORDER BY occurred DESC LIMIT 10000').all(auth.user),budgets:db.prepare('SELECT month,category,amount FROM budgets WHERE user=?').all(auth.user),devices:db.prepare('SELECT id,name,created,last_sync,revoked FROM devices WHERE user=?').all(auth.user),categories});
    if(route==='/api/pair'&&req.method==='POST'){const t=token();db.prepare('INSERT INTO pairs VALUES(?,?,?)').run(hash(t),auth.user,Date.now()+600000);return send(res,200,{code:t,expiresIn:600,origin});}
    if(route==='/api/revoke'&&req.method==='POST'){const b=await body(req);db.prepare('UPDATE devices SET revoked=1 WHERE id=? AND user=?').run(text(b.id,100),auth.user);return send(res,200,{ok:true});}
    if(route==='/api/capture'&&req.method==='POST'){const b=await body(req);return send(res,200,{id:insert(auth.user,'web-'+auth.user,{id:b.id,text:b.text,source:'Pasted message',sender:b.sender||'',occurred:b.occurred||Date.now()})});}
    if(route==='/api/manual'&&req.method==='POST'){const b=await body(req),id=randomUUID();const amount=minor(b.amount);if(!amount)fail('Amount must be greater than zero.');if(!['expense','income','transfer'].includes(b.direction)||!['ZMW','USD','ZAR'].includes(b.currency)||!categories.includes(b.category))fail('Invalid transaction details.');const when=Number(b.occurred);if(!Number.isSafeInteger(when)||when<946684800000||when>Date.now()+300000)fail('Invalid date.');db.prepare('INSERT INTO transactions(id,user,device,event_id,source,provider,occurred,received,raw,amount,currency,direction,merchant,fee,confidence,status,category,note,reason) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id,auth.user,'web-'+auth.user,id,'Manual','Manual',when,Date.now(),'',amount,b.currency,b.direction,text(b.merchant,120),0,'confirmed','confirmed',b.category,text(b.note||'',2000),'');return send(res,200,{id});}
    if(route==='/api/transaction'&&req.method==='POST'){const b=await body(req),old=db.prepare('SELECT * FROM transactions WHERE id=? AND user=?').get(text(b.id,100),auth.user);if(!old)fail('Transaction not found.',404);if(b.version!==old.version)fail('This transaction changed. Reload before saving.',409);if(!['expense','income','transfer','unknown'].includes(b.direction)||!['review','confirmed','excluded'].includes(b.status)||!categories.includes(b.category)||!['ZMW','USD','ZAR'].includes(b.currency))fail('Invalid transaction details.');const amount=b.amount===null?null:minor(b.amount);if(b.status==='confirmed'&&(!amount||b.direction==='unknown'))fail('Confirm a positive amount and direction first.');const merchant=text(b.merchant,120);db.prepare('UPDATE transactions SET amount=?,currency=?,direction=?,merchant=?,category=?,note=?,status=?,version=version+1 WHERE id=? AND user=?').run(amount,b.currency,b.direction,merchant,b.category,text(b.note,2000),b.status,b.id,auth.user);if(b.remember&&merchant&&b.category!=='Uncategorized')db.prepare('INSERT INTO rules VALUES(?,?,?) ON CONFLICT(user,merchant) DO UPDATE SET category=excluded.category').run(auth.user,merchant.toLowerCase(),b.category);return send(res,200,{ok:true});}
    if(route==='/api/budget'&&req.method==='POST'){const b=await body(req);if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(b.month)||!categories.includes(b.category))fail('Invalid budget.');db.prepare('INSERT INTO budgets VALUES(?,?,?,?) ON CONFLICT(user,month,category) DO UPDATE SET amount=excluded.amount').run(auth.user,b.month,b.category,minor(b.amount));return send(res,200,{ok:true});}
    fail('Not found.',404);
   }
   if(req.method!=='GET')fail('Not found.',404);
   const files={'/':'index.html','/app.js':'app.js','/styles.css':'styles.css','/pocket-ledger.apk':'pocket-ledger.apk'};const f=files[route];if(!f)fail('Not found.',404);const file=path.join(options.webDir||path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../web'),f);if(!fs.existsSync(file))fail('Not found.',404);res.writeHead(200,{'Content-Type':f.endsWith('.html')?'text/html; charset=utf-8':f.endsWith('.css')?'text/css; charset=utf-8':f.endsWith('.js')?'text/javascript; charset=utf-8':'application/vnd.android.package-archive','Cache-Control':f.endsWith('.html')?'no-cache':'public, max-age=300'});fs.createReadStream(file).pipe(res);
  }catch(e){send(res,e.status||500,{error:e.status?e.message:'Something went wrong. Please try again.'});}
 });
 function invitation(){const u=db.prepare('SELECT * FROM users WHERE email=?').get(email);if(u.password)return null;const t=token();db.prepare('DELETE FROM invites WHERE user=?').run(u.id);db.prepare('INSERT INTO invites VALUES(?,?,?)').run(hash(t),u.id,Date.now()+7*86400000);return `${origin}/#invite=${t}`;}
 return {server,db,invitation};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){const app=createApplication();app.server.listen(Number(process.env.PORT||4192),'0.0.0.0',()=>console.log('Pocket Ledger ready.'));}
