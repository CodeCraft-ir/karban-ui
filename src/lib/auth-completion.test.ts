import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as auth from './auth-ui.ts';

test('verify reload reads actual challenge even with no transient phone; resend requires reentry',async()=>{
  assert.equal(typeof auth.readVerificationChallenge,'function');let calls=0;
  const challenge=await auth.readVerificationChallenge(async(path)=>{assert.equal(path,'/api/auth/challenge');calls++;return Response.json({challenge:{expiresAt:1900000000000,codeLength:5,isSimulated:false}});});
  assert.equal(challenge.codeLength,5);assert.equal(calls,1);
  assert.equal(auth.canResendCode('',false,0),false);assert.equal(auth.canResendCode('09121234567',false,0),true);
});
test('minimal onboarding is bounded by server account role; wrong-code/expiry/rate/config semantics differ',()=>{
  const a=auth.parseAuthResult({account:{id:1,displayName:'نام',role:'specialist'},redirectTo:'/pro',onboardingTo:'/pro/profile'});
  assert.equal(a.onboardingTo,'/pro/profile');
  assert.throws(()=>auth.parseAuthResult({account:{id:1,displayName:'نام',role:'client'},redirectTo:'/dashboard',onboardingTo:'/pro/profile'}));
  assert.match(auth.mapAuthError(429,'rate_limited'),/صبر/);
  assert.notEqual(auth.mapAuthError(422,'invalid_request'),auth.mapAuthError(401,'unauthenticated'));
});
