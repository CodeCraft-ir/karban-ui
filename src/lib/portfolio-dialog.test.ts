import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as dialog from './portfolio-dialog.ts';
test('gallery selection changes do not close and reopen the native modal or replace original focus',()=>{
 assert.equal(typeof dialog.createPortfolioDialogSession,'function');
 let shows=0,closes=0,restores=0,innerFocus=0;
 const element={open:false,showModal(){this.open=true;shows++;},close(){this.open=false;closes++;}};
 const session=dialog.createPortfolioDialogSession();
 session.show(element,{focus(){restores++;}});
 session.show(element,{focus(){innerFocus++;}});
 assert.equal(shows,1);assert.equal(closes,0);
 session.close();session.close();
 assert.equal(closes,1);assert.equal(restores,1);assert.equal(innerFocus,0);
});
