package com.masona.pocketledger;
import android.content.*;import android.database.*;import android.database.sqlite.*;import android.security.keystore.*;import android.util.Base64;
import java.security.*;import javax.crypto.*;import javax.crypto.spec.GCMParameterSpec;import org.json.*;
final class Vault extends SQLiteOpenHelper {
 private final Context context;
 Vault(Context c){super(c,"pocket-ledger.db",null,1);context=c.getApplicationContext();}
 public void onCreate(SQLiteDatabase db){db.execSQL("CREATE TABLE events(id TEXT PRIMARY KEY,payload TEXT,state TEXT DEFAULT 'pending',created INTEGER)");}
 public void onUpgrade(SQLiteDatabase db,int a,int b){}
 private SecretKey key()throws Exception{KeyStore k=KeyStore.getInstance("AndroidKeyStore");k.load(null);if(!k.containsAlias("pocket-ledger-v1")){KeyGenerator g=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");g.init(new KeyGenParameterSpec.Builder("pocket-ledger-v1",KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());g.generateKey();}return(SecretKey)k.getKey("pocket-ledger-v1",null);}
 String encrypt(String v)throws Exception{Cipher c=Cipher.getInstance("AES/GCM/NoPadding");c.init(Cipher.ENCRYPT_MODE,key());return Base64.encodeToString(c.getIV(),Base64.NO_WRAP)+":"+Base64.encodeToString(c.doFinal(v.getBytes(java.nio.charset.StandardCharsets.UTF_8)),Base64.NO_WRAP);}
 String decrypt(String v)throws Exception{String[] p=v.split(":");Cipher c=Cipher.getInstance("AES/GCM/NoPadding");c.init(Cipher.DECRYPT_MODE,key(),new GCMParameterSpec(128,Base64.decode(p[0],Base64.NO_WRAP)));return new String(c.doFinal(Base64.decode(p[1],Base64.NO_WRAP)),java.nio.charset.StandardCharsets.UTF_8);}
 synchronized void add(JSONObject event)throws Exception{ContentValues v=new ContentValues();v.put("id",event.getString("id"));v.put("payload",encrypt(event.toString()));v.put("created",System.currentTimeMillis());getWritableDatabase().insertWithOnConflict("events",null,v,SQLiteDatabase.CONFLICT_IGNORE);getWritableDatabase().delete("events","state='synced' AND created<?",new String[]{String.valueOf(System.currentTimeMillis()-90L*86400000)});}
 synchronized JSONArray pending()throws Exception{JSONArray a=new JSONArray();try(Cursor c=getReadableDatabase().rawQuery("SELECT payload FROM events WHERE state='pending' ORDER BY created LIMIT 100",null)){while(c.moveToNext())a.put(new JSONObject(decrypt(c.getString(0))));}return a;}
 synchronized void acknowledge(String id){ContentValues v=new ContentValues();v.put("state","synced");v.putNull("payload");getWritableDatabase().update("events",v,"id=?",new String[]{id});}
 synchronized void rejected(String id){ContentValues v=new ContentValues();v.put("state","rejected");getWritableDatabase().update("events",v,"id=?",new String[]{id});}
 int count(String state){try(Cursor c=getReadableDatabase().rawQuery("SELECT count(*) FROM events WHERE state=?",new String[]{state})){c.moveToFirst();return c.getInt(0);}}
 void storeToken(String t)throws Exception{context.getSharedPreferences("ledger",0).edit().putString("credential",encrypt(t)).apply();}
 String token()throws Exception{String t=context.getSharedPreferences("ledger",0).getString("credential",null);return t==null?null:decrypt(t);}
 void forget(){context.getSharedPreferences("ledger",0).edit().remove("credential").putBoolean("capture",false).apply();}
}
