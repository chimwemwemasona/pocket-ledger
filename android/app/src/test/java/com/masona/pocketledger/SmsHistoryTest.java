package com.masona.pocketledger;
import org.junit.Test;
import static org.junit.Assert.*;

public class SmsHistoryTest {
 @Test public void importsOnlyFinancialMatchesFromAllowedKeywords(){
  assertTrue(SmsHistory.matches("You have sent ZMW 150.00 to TEST SHOP. Balance ZMW 800.00.","MTN","MTN,Airtel,FNB"));
  assertTrue(SmsHistory.matches("Received K100.00 from TEST PERSON.","Airtel","MTN,Airtel,FNB"));
  assertFalse(SmsHistory.matches("OTP 123456 for payment ZMW 150.00","FNB","FNB"));
  assertFalse(SmsHistory.matches("Your verification code is 123456 for payment K100.00","FNB","FNB"));
  assertFalse(SmsHistory.matches("Your balance is K800.00","MTN","MTN"));
  assertFalse(SmsHistory.matches("I sent K150.00 to a friend","PERSON","MTN,Airtel,FNB"));
  assertFalse(SmsHistory.matches(null,"MTN","MTN"));
 }
 @Test public void repeatImportsHaveStableIdsWithoutCollapsingDifferentTransactions()throws Exception{
  String id=SmsHistory.id("MTN",1700000000000L,"Sent K150.00");
  assertEquals(id,SmsHistory.id("MTN",1700000000000L,"Sent K150.00"));
  assertNotEquals(id,SmsHistory.id("MTN",1700000001000L,"Sent K150.00"));
  assertNotEquals(id,SmsHistory.id("Airtel",1700000000000L,"Sent K150.00"));
  assertNotEquals(id,SmsHistory.id("MTN",1700000000000L,"Sent K250.00"));
 }
}
