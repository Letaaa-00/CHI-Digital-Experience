import test from 'node:test';
import assert from 'node:assert/strict';
import {zoomAtPoint,pinchView,focusPoint} from '../map-math.js';
import {crowdGroups,demoPeople,filterMapPeople} from '../map-data.js';
test('zoom keeps the touched world point under the same finger',()=>{const start={zoom:1.5,panX:10,panY:-15},anchor={x:230,y:390};const next=zoomAtPoint(start,2.5,anchor,400,800);assert.ok(Math.abs((anchor.x-200-start.panX)/start.zoom-(anchor.x-200-next.panX)/next.zoom)<1e-9);assert.ok(Math.abs((anchor.y-400-start.panY)/start.zoom-(anchor.y-400-next.panY)/next.zoom)<1e-9);});
test('pinch changes scale and follows the moving midpoint',()=>{const next=pinchView({zoom:1,panX:0,panY:0},{x:200,y:400},{x:220,y:430},2,400,800);assert.deepEqual(next,{zoom:2,panX:20,panY:30});});
test('map cannot shrink below overview or pan beyond its edges',()=>{assert.deepEqual(zoomAtPoint({zoom:2,panX:0,panY:0},.1,{x:0,y:0},400,800),{zoom:1,panX:0,panY:0});const view=focusPoint(0,0,100,400,800);assert.equal(view.zoom,4.5);assert.ok(Math.abs(view.panX)<=700);assert.ok(Math.abs(view.panY)<=1400);});
test('group counts equal their actual demo participants and filters are truthful',()=>{for(const group of crowdGroups)assert.equal(demoPeople.filter(p=>p.group===group.id).length,group.count);const selected=filterMapPeople(demoPeople,{people:true,domain:'ai',shared:false},{});assert.equal(selected.length,13);assert.ok(selected.every(p=>p.topic==='ai'));assert.equal(filterMapPeople(demoPeople,{people:false,domain:'all'},{}).length,0);});
