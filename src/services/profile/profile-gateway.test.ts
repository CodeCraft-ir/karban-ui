import assert from "node:assert/strict";
import { test } from "node:test";
import { wordpressRest } from "../wordpress/rest-client.ts";
import * as transport from "./wordpress-profile-upload.ts";
import * as gateway from "./profile-gateway.ts";
const account = { id:47,display_name:"نام",role:"specialist",login_phone_masked:null,avatar:null,location:null,specialist:{id:51,slug:"specialist-47",status:"draft"} };
const uploaded = { id:31,url:"https://media.example/a.png",type:"image",mime:"image/png",purpose:"public-avatar" };
const file = () => ({file:new File(["local-fixture"],"a.png",{type:"image/png"}),purpose:"public-avatar" as const});
const envelope = (data:unknown) => Response.json({success:true,data});

test("fixed gateway uses exact private JSON paths, methods and bodies without arbitrary proxy options", async () => {
  assert.equal(typeof gateway.createProfileGateway,"function","fixed private gateway is missing");
  const calls: unknown[] = [];
  const g = gateway.createProfileGateway({ json: async (path, options) => { calls.push({path,options}); return account; }, upload: async () => uploaded });
  await g.account("private-access"); await g.updateAccount("private-access",{display_name:"تازه"});
  assert.deepEqual(calls,[{path:"account/me",options:{method:"GET",token:"private-access"}},{path:"account/me",options:{method:"POST",token:"private-access",body:{display_name:"تازه"}}}]);
  await assert.rejects(async () => g.updateAccount("private-access",{role:"administrator"}));
  assert.equal(calls.length,2);
});

test("production gateway through the real private JSON transport sends fixed profile/gallery paths with Bearer only in headers", async () => {
  const old=process.env.WORDPRESS_URL;const mode=process.env.WORDPRESS_PERMALINK_MODE;process.env.WORDPRESS_URL="https://wp.example/kar";process.env.WORDPRESS_PERMALINK_MODE="pretty";
  const profile={id:51,slug:"specialist-47",title:"عنوان",status:"pending",categories:[],cities:[],avatar:null,gallery:[],gallery_revision:1,gallery_available:true,bio:"متن",skills:"",address:"",availability:"",price_hint:"",experience_years:null};
  const calls:Array<{path:string;method:string;body:unknown}>=[];
  try {
    const g=gateway.createProfileGateway({json:(path,options)=>wordpressRest(path,{...options,fetch:async(input,init)=>{
      const url=new URL(String(input));assert.equal(url.origin,"https://wp.example");assert.ok(url.pathname.startsWith("/kar/wp-json/nahan/v1/"));
      assert.equal(new Headers(init!.headers).get("authorization"),"Bearer private-access");assert.equal(init!.cache,"no-store");
      const body=init!.body===undefined?undefined:JSON.parse(String(init!.body));assert.ok(!JSON.stringify(body??{}).includes("private-access"));calls.push({path,method:String(init!.method),body});
      return envelope(path.includes("gallery")?{gallery:[],gallery_revision:2,gallery_available:true,status:"pending"}:profile);
    }}),upload:async()=>uploaded});
    await g.profile("private-access");await g.updateProfile("private-access",{city_id:987,bio:"تازه"});await g.submit("private-access");await g.addGallery("private-access",{media_id:31,caption:"نمونه",expected_revision:1});await g.deleteGallery("private-access","31",{expected_revision:2});
    assert.deepEqual(calls,[{path:"profile/me",method:"GET",body:undefined},{path:"profile/me",method:"POST",body:{city_id:987,bio:"تازه"}},{path:"profile/me/submit",method:"POST",body:{}},{path:"profile/me/gallery",method:"POST",body:{media_id:31,caption:"نمونه",expected_revision:1}},{path:"profile/me/gallery/media/31",method:"DELETE",body:{expected_revision:2}}]);
  } finally {if(old===undefined)delete process.env.WORDPRESS_URL;else process.env.WORDPRESS_URL=old;if(mode===undefined)delete process.env.WORDPRESS_PERMALINK_MODE;else process.env.WORDPRESS_PERMALINK_MODE=mode;}
});

test("dedicated upload transport preserves multipart native boundary, private Bearer, no-store, omit and fixed installation path", async () => {
  assert.equal(typeof transport.createWordPressProfileUpload,"function","dedicated upload transport missing");
  const old = process.env.WORDPRESS_URL; const mode = process.env.WORDPRESS_PERMALINK_MODE;
  process.env.WORDPRESS_URL="https://wp.example/kar";
  try {
    for (const permalink of ["pretty","plain"]) {
      process.env.WORDPRESS_PERMALINK_MODE=permalink;
      let calls=0;
      const upload=transport.createWordPressProfileUpload({fetch:async (input,init) => {
        calls++; assert.equal(String(input),permalink==="pretty" ? "https://wp.example/kar/wp-json/nahan/v1/uploads" : "https://wp.example/kar/index.php?rest_route=%2Fnahan%2Fv1%2Fuploads");
        assert.equal(init!.method,"POST"); assert.equal(init!.cache,"no-store"); assert.equal(init!.credentials,"omit"); assert.equal(init!.redirect,"error");
        const headers=new Headers(init!.headers); assert.equal(headers.get("authorization"),"Bearer private-access"); assert.equal(headers.has("content-type"),false);
        assert.ok(init!.body instanceof FormData); assert.deepEqual([...init!.body.keys()],["file","purpose"]);
        return envelope(uploaded);
      }});
      assert.deepEqual(await upload("private-access",file()),uploaded); assert.equal(calls,1);
    }
  } finally { if(old===undefined) delete process.env.WORDPRESS_URL; else process.env.WORDPRESS_URL=old; if(mode===undefined) delete process.env.WORDPRESS_PERMALINK_MODE; else process.env.WORDPRESS_PERMALINK_MODE=mode; }
});

test("upload transport bounds response body and times out after headers; no retry and no raw errors", async () => {
  const old=process.env.WORDPRESS_URL; process.env.WORDPRESS_URL="https://wp.example";
  try {
    let calls=0; let cancelled=false;
    const upload=transport.createWordPressProfileUpload({timeoutMs:15,fetch:async () => {calls++; return new Response(new ReadableStream({cancel(){cancelled=true;}}),{headers:{"content-type":"application/json"}});}});
    await assert.rejects(upload("private-access",file()), {code:"operation_uncertain",status:503}); assert.equal(calls,1); assert.equal(cancelled,true);
    const oversized=transport.createWordPressProfileUpload({fetch:async()=>new Response("x".repeat(256*1024+1))});
    await assert.rejects(oversized("private-access",file()),{code:"operation_uncertain",status:503});
    const error=transport.createWordPressProfileUpload({fetch:async () => Response.json({success:false,error:{code:"gallery_revision_conflict",message:"private-access 09123456789 /server/path"}},{status:409})});
    await assert.rejects(error("private-access",file()), e => { assert.ok(!JSON.stringify(e).includes("09123456789")); assert.ok(!String(e).includes("private-access")); return true; });
  } finally { if(old===undefined) delete process.env.WORDPRESS_URL; else process.env.WORDPRESS_URL=old; }
});
