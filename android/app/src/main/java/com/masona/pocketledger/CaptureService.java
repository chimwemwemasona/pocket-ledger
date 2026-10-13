package com.masona.pocketledger;
import android.app.Notification;import android.os.Bundle;import android.service.notification.*;import android.content.*;import java.util.*;import java.security.*;import org.json.*;import java.util.regex.Pattern;
public class CaptureService extends NotificationListenerService {
 static final Pattern MONEY=Pattern.compile("\\b(?:ZMW|ZMK|K|USD|ZAR)\\s*\\d|\\d[\\d,.]*\\s*(?:ZMW|ZMK|kwacha)\\b",Pattern.CASE_INSENSITIVE);
 static final Pattern ACTION=Pattern.compile("\\b(?:sent|received|paid|payment|purchase|withdrawn|withdrawal|deposit|credited|debited|transferred|transfer|cash.?out|cash.?in|reversal|refund)\\b",Pattern.CASE_INSENSITIVE);
 static final Pattern SECRET=Pattern.compile("\\b(?:otp|one.time (?:pin|password|code)|verification code|login code)\\b",Pattern.CASE_INSENSITIVE);
 public void onListenerConnected(){SyncJob.schedule(this);}
 public void onNotificationPosted(StatusBarNotification sbn){
  SharedPreferences prefs=getSharedPreferences("ledger",0);if(!prefs.getBoolean("capture",false)||!prefs.getStringSet("sources",Collections.emptySet()).contains(sbn.getPackageName()))return;
  Notification n=sbn.getNotification();if((n.flags&Notification.FLAG_GROUP_SUMMARY)!=0)return;
  Bundle e=n.extras;android.os.Parcelable[] bundles=e.getParcelableArray(Notification.EXTRA_MESSAGES);List<Notification.MessagingStyle.Message> messages=bundles==null||android.os.Build.VERSION.SDK_INT<30?Collections.emptyList():Notification.MessagingStyle.Message.getMessagesFromBundleArray(bundles);
  if(messages!=null&&!messages.isEmpty()){for(Notification.MessagingStyle.Message m:messages){String sender=android.os.Build.VERSION.SDK_INT>=28&&m.getSenderPerson()!=null?String.valueOf(m.getSenderPerson().getName()):String.valueOf(m.getSender());capture(sbn,String.valueOf(m.getText()),sender,m.getTimestamp()>0?m.getTimestamp():sbn.getPostTime(),prefs);}return;}
  CharSequence big=e.getCharSequence(Notification.EXTRA_BIG_TEXT),normal=e.getCharSequence(Notification.EXTRA_TEXT),title=e.getCharSequence(Notification.EXTRA_TITLE);String body=String.valueOf(big!=null?big:normal!=null?normal:"");
  capture(sbn,body,title==null?"":title.toString(),n.when>946684800000L?n.when:sbn.getPostTime(),prefs);
 }
 private void capture(StatusBarNotification sbn,String body,String sender,long time,SharedPreferences prefs){
  if(body.length()>12000||!MONEY.matcher(body).find()||!ACTION.matcher(body).find()||SECRET.matcher(body).find())return;
  String filters=prefs.getString("senders","MTN,Airtel,FNB,MoMo");boolean allowed=false;for(String f:filters.split(",")){String v=f.trim().toLowerCase(Locale.ROOT);if(!v.isEmpty()&&(sender+" "+body+" "+sbn.getPackageName()).toLowerCase(Locale.ROOT).contains(v))allowed=true;}if(!allowed)return;
  try{String seed=sbn.getPackageName()+"|"+sender+"|"+time+"|"+body;byte[] digest=MessageDigest.getInstance("SHA-256").digest(seed.getBytes(java.nio.charset.StandardCharsets.UTF_8));StringBuilder id=new StringBuilder();for(byte b:digest)id.append(String.format("%02x",b));JSONObject event=new JSONObject().put("id",id.toString()).put("text",body).put("sender",sender).put("source",sbn.getPackageName()).put("occurred",time);
   try(Vault vault=new Vault(this)){vault.add(event);}prefs.edit().putString("capture_status","Transaction message saved on phone").apply();SyncJob.schedule(this);SyncJob.kick(this);
  }catch(Exception ex){prefs.edit().putString("capture_status","Could not save a message. Open the app to check storage.").apply();}
 }
}
