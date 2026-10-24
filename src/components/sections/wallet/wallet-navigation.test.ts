import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createElement as h} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {ClientDashboard} from '../ClientDashboard.tsx';
import {ProDashboard} from '../ProDashboard.tsx';
test('both actual dashboards link fixed wallet workspace without fabricating balance or connecting leads/projects',()=>{
 for(const Component of [ClientDashboard,ProDashboard]){
  const html=renderToStaticMarkup(h(Component,{displayName:'Offline'}));
  assert.match(html,/href="\/wallet"/);assert.match(html,/متصل نیست/);assert.doesNotMatch(html,/تومان|data-balance/);
 }
});
