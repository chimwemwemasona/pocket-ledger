package com.masona.pocketledger;
import android.content.*;
public class BootReceiver extends BroadcastReceiver{public void onReceive(Context c,Intent i){SyncJob.schedule(c);}}
