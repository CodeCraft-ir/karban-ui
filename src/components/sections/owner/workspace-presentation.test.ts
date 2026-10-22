import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import * as workspace from './AccountWorkspace.tsx';
import type {ProfileDto} from '@/services/profile/profile-contracts';
const profile:ProfileDto={id:8,slug:'worker',title:'نقاش واقعی',status:'pending',categories:[{id:17,name:'نقاشی',slug:'paint'}],cities:[],avatar:null,bio:'متن',skills:'مهارت',address:'نشانی خصوصی',availability:'',priceHint:'',experienceYears:0,gallery:[],galleryRevision:3,galleryAvailable:true};
test('saved checklist projects only persisted title category city, with optional media separate',()=>{
 assert.deepEqual(workspace.savedProfileChecklist(profile),[{label:'عنوان حرفه‌ای',complete:true},{label:'دسته خدمت',complete:true},{label:'شهر خدمت',complete:false}]);
 assert.deepEqual(workspace.savedProfileChecklist({...profile,title:'  ',categories:[],cities:[{id:42,name:'کاشان',slug:'kashan'}]}).map(item=>item.complete),[false,false,true]);
});
test('review presentation never enables pending or recovery-locked submission',()=>{
 for(const status of ['draft','pending','publish'] as const){
  assert.equal(workspace.reviewPresentation(status,true).disabled,true);
  assert.equal(workspace.reviewPresentation(status,false).disabled,status==='pending');
 }
 assert.match(workspace.reviewPresentation('pending',false).label,/در انتظار بررسی/);
});
test('media projection distinguishes selection upload and attachment, without claiming saved success',()=>{
 assert.equal(workspace.uploadPresentation({selected:false,uploaded:false,pending:false,uncertain:false}),'هنوز تصویری انتخاب نشده است.');
 assert.match(workspace.uploadPresentation({selected:true,uploaded:false,pending:false,uncertain:false}),/انتخاب شده.*هنوز بارگذاری نشده/);
 assert.match(workspace.uploadPresentation({selected:false,uploaded:true,pending:false,uncertain:false}),/بارگذاری شده.*هنوز متصل نشده/);
 assert.match(workspace.uploadPresentation({selected:false,uploaded:true,pending:true,uncertain:false}),/در حال انجام/);
 assert.match(workspace.uploadPresentation({selected:true,uploaded:false,pending:false,uncertain:true}),/قطعی نیست/);
});
test('saved summary renders server title, pending status and unknown verification distinctly without private content',()=>{
 const html=renderToStaticMarkup(createElement(workspace.SavedProfileSummary,{profile}));
 assert.match(html,/نقاش واقعی/);assert.match(html,/در انتظار بررسی/);assert.match(html,/تایید هویت: اطلاعات قابل نمایش نیست/);
 assert.match(html,/اطلاعات ذخیره‌شده/);assert.match(html,/شهر خدمت[\s\S]*ثبت نشده/);
 assert.match(html,/اختیاری/);assert.match(html,/تا زمان انتشار/);
 assert.doesNotMatch(html,/نشانی خصوصی|درصد|%|تاییدشده/);
});
test('all actual publication and verification values stay independent in the summary',()=>{
 for(const status of ['draft','pending','publish'] as const)for(const verified of [false,true,undefined]){
  const html=renderToStaticMarkup(createElement(workspace.SavedProfileSummary,{profile:{...profile,status,verified}}));
  assert.match(html,new RegExp({draft:'پیش‌نویس',pending:'در انتظار بررسی',publish:'منتشرشده'}[status]));
  assert.match(html,new RegExp(verified===undefined?'اطلاعات قابل نمایش نیست':verified?'تاییدشده؛ فقط خواندنی':'تایید نشده؛ فقط خواندنی'));
 }
});
test('review panel exposes a single distinct action on saved data and pending text with disabled control',()=>{
 const html=renderToStaticMarkup(createElement(workspace.ProfileReviewPanel,{status:'pending',disabled:false,onSubmit:()=>{}}));
 assert.match(html,/نسخه ذخیره‌شده/);assert.match(html,/در انتظار بررسی/);assert.match(html,/<button[^>]*disabled=""/);
 assert.equal((html.match(/<button/g)||[]).length,1);assert.doesNotMatch(html,/type="submit"/);
});
