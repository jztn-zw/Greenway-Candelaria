const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { pool } = require('../../config/db');
const authPath = require.resolve('../../middleware/auth');
require(authPath);
require.cache[authPath].exports = (req, res, next) => {
  const role = req.headers['x-test-role'];
  if (!role) return res.status(401).json({ message: 'Unauthenticated' });
  req.user = { id: 'signed-in-driver', role }; req.token = 'fixture-session'; next();
};
const push = require('./push.service'), calls=[];
push.register = async (...args) => { calls.push(args); return { registered:true }; };
push.unregister = async (...args) => { calls.push(args); return { registered:false }; };
const app=express();app.use(express.json());app.use('/notifications',require('./notifications.routes'));
let server,base;
const ready=new Promise(resolve=>{server=app.listen(0,'127.0.0.1',()=>{base=`http://127.0.0.1:${server.address().port}`;resolve();});});
after(async()=>{await new Promise(resolve=>server.close(resolve));await pool.end();});
const request=async(method,role)=>{await ready;return fetch(base+'/notifications/push-device',{method,headers:{'Content-Type':'application/json',...(role?{'x-test-role':role}:{})},body:JSON.stringify({token:'ExpoPushToken[device]',platform:'android',enabled:true,user_id:'someone-else'})});};
test('phone registration and removal refuse anonymous, resident and admin requests',async()=>{
  for(const method of ['PUT','DELETE'])for(const role of [undefined,'RESIDENT','ADMIN'])assert.equal((await request(method,role)).status,role?403:401);
  assert.equal(calls.length,0);
});
test('phone registration/removal use the authenticated driver and credential',async()=>{
  for(const method of ['PUT','DELETE'])assert.equal((await request(method,'DRIVER')).status,200);
  assert.equal(calls.length,2);for(const args of calls){assert.equal(args[0].id,'signed-in-driver');assert.equal(args[1],'fixture-session');}
});
