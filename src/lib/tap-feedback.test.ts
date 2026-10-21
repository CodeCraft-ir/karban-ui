import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as motion from './tap-feedback.ts';
test('shared primitive tap feedback preserves its spring but honors reduced motion',()=>{
 assert.equal(typeof motion.tapFeedback,'function');
 assert.deepEqual(motion.tapFeedback(true,true),{scale:1,duration:0});
 assert.deepEqual(motion.tapFeedback(true,false),{scale:1,duration:0});
 assert.deepEqual(motion.tapFeedback(false,true),{scale:0.95,duration:0.12,ease:'power2.out'});
 assert.deepEqual(motion.tapFeedback(false,false),{scale:1,duration:0.55,ease:'elastic.out(1.1, 0.45)'});
});
