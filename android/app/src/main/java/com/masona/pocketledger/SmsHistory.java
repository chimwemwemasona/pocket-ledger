package com.masona.pocketledger;

import android.content.Context;
import android.database.Cursor;
import android.provider.Telephony;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.json.JSONObject;

/** Manual inbox scan. Unmatched messages never leave memory or enter the queue. */
final class SmsHistory {
 static final int MAX_CANDIDATES=500,MAX_SCANNED=50000;
 static final class Result {final List<JSONObject> events=new ArrayList<>();int scanned=0,alreadySaved=0;boolean limited=false;}
 static boolean matches(String body,String sender,String keywords){
  if(body==null||sender==null||body.length()>12000||!CaptureService.MONEY.matcher(body).find()||!CaptureService.ACTION.matcher(body).find()||CaptureService.SECRET.matcher(body).find())return false;
  String haystack=(sender+" "+body).toLowerCase(Locale.ROOT);
  for(String keyword:keywords.split(",")){String k=keyword.trim().toLowerCase(Locale.ROOT);if(!k.isEmpty()&&haystack.contains(k))return true;}
  return false;
 }
 static String id(String sender,long time,String body)throws Exception{
  byte[] digest=MessageDigest.getInstance("SHA-256").digest(("sms-history|"+sender+"|"+time+"|"+body).getBytes(StandardCharsets.UTF_8));
  StringBuilder result=new StringBuilder();for(byte b:digest)result.append(String.format(Locale.ROOT,"%02x",b));return result.toString();
 }
 static Result scan(Context context,int days,String keywords)throws Exception{
  Result result=new Result();long now=System.currentTimeMillis(),cutoff=days==0?946684800000L:now-days*86400000L;
  String[] projection={Telephony.Sms.ADDRESS,Telephony.Sms.BODY,Telephony.Sms.DATE};
  try(Vault vault=new Vault(context);Cursor cursor=context.getContentResolver().query(Telephony.Sms.Inbox.CONTENT_URI,projection,Telephony.Sms.DATE+">=? AND "+Telephony.Sms.DATE+"<=?",new String[]{String.valueOf(cutoff),String.valueOf(now)},Telephony.Sms.DATE+" DESC")){
   if(cursor==null)throw new IllegalStateException("The phone's SMS inbox is unavailable.");
   while(cursor.moveToNext()){
    if(result.scanned>=MAX_SCANNED||result.events.size()>=MAX_CANDIDATES){result.limited=true;break;}
    result.scanned++;String sender=cursor.getString(0),body=cursor.getString(1);long date=cursor.getLong(2);
    if(!matches(body,sender,keywords))continue;
    String eventId=id(sender,date,body);if(vault.contains(eventId)){result.alreadySaved++;continue;}
    result.events.add(new JSONObject().put("id",eventId).put("text",body).put("sender",sender).put("source","SMS history").put("occurred",date));
   }
  }
  return result;
 }
}
