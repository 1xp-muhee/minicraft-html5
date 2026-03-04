import * as THREE from 'https://esm.sh/three@0.160.0';
import Peer from 'https://esm.sh/peerjs@1.5.4';
import { weaponCatalog, resolveWeaponSelection } from './weapons.js';
import { createAmbientBgmStarter } from './audio.js';

    const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    const roomId = new URLSearchParams(location.search).get('room') || 'office-1';
    const urlNick = new URLSearchParams(location.search).get('nick');
    const savedNick = localStorage.getItem('officecraft_nick');
    let nick = urlNick || savedNick || '';
    if(!nick){
      alert('닉네임을 입력해 주세요.');
      nick = prompt('사용할 닉네임을 입력하세요', `user-${Math.floor(Math.random()*999)}`) || '';
      nick = nick.trim() || `user-${Math.floor(Math.random()*999)}`;
      localStorage.setItem('officecraft_nick', nick);
    }

    const localWeapon = resolveWeaponSelection();
    const localWeaponRange = +(localWeapon.len * 5).toFixed(1);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xcdd7e1);
    scene.fog = new THREE.Fog(0xcdd7e1, 20, 120);

    const camera = new THREE.PerspectiveCamera(75, innerWidth/innerHeight, 0.1, 250);
    const player = new THREE.Object3D();
    player.position.set(0, 1.6, 8);
    player.add(camera);
    scene.add(player);

    const renderer = new THREE.WebGLRenderer({antialias:true});
    renderer.setSize(innerWidth, innerHeight);
    renderer.setPixelRatio(devicePixelRatio);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x8ea0b2, 0.75));
    const sun = new THREE.DirectionalLight(0xffffff, 0.9);
    sun.position.set(20,40,10); sun.castShadow = true; sun.shadow.mapSize.set(2048,2048); scene.add(sun);

    const start = document.getElementById('start');
    const mobileHud = document.getElementById('mobileHud');

    const startAmbientBgm = createAmbientBgmStarter();

    let controlEnabled = false;
    document.getElementById('startBtn').onclick = async () => {
      controlEnabled = true;
      startAmbientBgm();
      start.style.display = 'none';
      if (isTouch) mobileHud.style.display = 'block';
      else await document.body.requestPointerLock?.();
    };

    document.addEventListener('pointerlockchange', ()=>{
      if (!isTouch && document.pointerLockElement !== document.body && controlEnabled && document.activeElement !== chatInput) {
        start.style.display = 'flex'; controlEnabled = false;
      }
    });

    if (isTouch) {
      document.getElementById('controlsText').textContent = '왼쪽 조이스틱 이동 / 점프 버튼';
      document.getElementById('lookText').innerHTML = '오른쪽 화면 드래그 시점 / 공격 버튼 <span class="danger">직원 때리기</span>';
    }

    const floor = new THREE.Mesh(new THREE.BoxGeometry(80,1,80), new THREE.MeshStandardMaterial({color:0xbfc7d1}));
    floor.position.y = -0.5; floor.receiveShadow = true; scene.add(floor);
    function wall(x,y,z,w,h,d,col=0xe8edf2){ const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), new THREE.MeshStandardMaterial({color:col})); m.position.set(x,y,z); m.castShadow=true; m.receiveShadow=true; scene.add(m); }
    wall(0,2,-40,80,5,1); wall(0,2,40,80,5,1); wall(-40,2,0,1,5,80); wall(40,2,0,1,5,80);

    const deskSeats = [];
    function desk(x,z){
      const top = new THREE.Mesh(new THREE.BoxGeometry(3,0.25,2), new THREE.MeshStandardMaterial({color:0x8d6e63}));
      top.position.set(x,1.2,z); top.castShadow=true; top.receiveShadow=true; scene.add(top);
      const legGeo = new THREE.BoxGeometry(0.2,1.1,0.2), legMat = new THREE.MeshStandardMaterial({color:0x555});
      [[1.3,0.6,0.8],[-1.3,0.6,0.8],[1.3,0.6,-0.8],[-1.3,0.6,-0.8]].forEach(([lx,ly,lz])=>{ const leg = new THREE.Mesh(legGeo, legMat); leg.position.set(x+lx,ly,z+lz); leg.castShadow=true; leg.receiveShadow=true; scene.add(leg); });
      const pc = new THREE.Mesh(new THREE.BoxGeometry(0.9,0.6,0.08), new THREE.MeshStandardMaterial({color:0x202225}));
      pc.position.set(x,1.65,z-0.45); scene.add(pc);

      const tasks = ['매출 리포트 작성','고객 문의 처리','주간 KPI 정리','QA 버그 검토','재고 발주 확인','회의록 작성'];
      const txt = tasks[Math.floor(Math.random()*tasks.length)];
      const c = document.createElement('canvas'); c.width=256; c.height=128;
      const ctx = c.getContext('2d');
      ctx.fillStyle='#0f1720'; ctx.fillRect(0,0,256,128);
      ctx.fillStyle='#7cf3ff'; ctx.font='bold 18px system-ui'; ctx.fillText('업무중...', 16, 32);
      ctx.fillStyle='#d9f1ff'; ctx.font='16px system-ui'; ctx.fillText(txt, 16, 66);
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.76,0.36), new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c)}));
      scr.position.set(x,1.66,z-0.5); scene.add(scr);

      deskSeats.push({x, z: z+0.9});
    }
    for(let gx=-24; gx<=24; gx+=8) for(let gz=-24; gz<=24; gz+=8) if(Math.random()>0.18) desk(gx,gz);

    // 4-side doors
    function door(x,y,z,w,h,d){
      const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), new THREE.MeshStandardMaterial({color:0x5f6b76}));
      m.position.set(x,y,z); m.castShadow=true; m.receiveShadow=true; scene.add(m);
    }
    door(0,1.5,-39.45,6,3,0.5);
    door(0,1.5,39.45,6,3,0.5);
    door(-39.45,1.5,0,0.5,3,6);
    door(39.45,1.5,0,0.5,3,6);
    const doorSpawns = [
      {x:0,z:-37.8},{x:0,z:37.8},{x:-37.8,z:0},{x:37.8,z:0}
    ];

    // first-person hand + swing
    const handRoot = new THREE.Group();
    handRoot.position.set(0.2,-0.34,-0.58);
    camera.add(handRoot);
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.13,0.25,0.13), new THREE.MeshStandardMaterial({color:0xe6b892}));
    hand.rotation.z = -0.25;
    handRoot.add(hand);
    handRoot.rotation.set(-0.08, 0, -0.18);

    const weaponRoot = new THREE.Group();
    weaponRoot.position.set(0.03, -0.03, -0.2);
    handRoot.add(weaponRoot);

    function buildWeaponModel(){
      const mat = new THREE.MeshStandardMaterial({color: localWeapon.color});
      if(localWeapon.key==='slingshot'){
        const armGeo = new THREE.CylinderGeometry(0.012,0.012,0.2,8);
        const l = new THREE.Mesh(armGeo, mat); l.position.set(-0.05,0.03,-0.02); l.rotation.z = 0.4;
        const r = new THREE.Mesh(armGeo, mat); r.position.set(0.05,0.03,-0.02); r.rotation.z = -0.4;
        const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.016,0.016,0.14,8), mat); grip.rotation.x = Math.PI/2; grip.position.set(0,-0.05,0.03);
        weaponRoot.add(l,r,grip);
      } else if(localWeapon.key==='wand'){
        const wand = new THREE.Mesh(new THREE.CylinderGeometry(0.012,0.018,0.45,10), mat); wand.rotation.x=Math.PI/2; wand.position.z=-0.14;
        const tip = new THREE.Mesh(new THREE.SphereGeometry(0.018,10,10), new THREE.MeshStandardMaterial({color:0x9fd3ff, emissive:0x2f6fff, emissiveIntensity:0.8})); tip.position.z=-0.36;
        weaponRoot.add(wand, tip);
      } else if(localWeapon.key==='k2'){
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.08,0.08,0.5), mat); body.position.z=-0.18;
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.01,0.01,0.26,8), mat); barrel.rotation.x=Math.PI/2; barrel.position.z=-0.45;
        const stock = new THREE.Mesh(new THREE.BoxGeometry(0.07,0.09,0.2), mat); stock.position.set(0,-0.03,0.04);
        weaponRoot.add(body, barrel, stock);
      } else {
        const bow = new THREE.Mesh(new THREE.TorusGeometry(0.12,0.01,6,18,Math.PI), mat); bow.rotation.y=Math.PI/2; bow.position.z=-0.12;
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.04,0.05,0.35), mat); body.position.z=-0.18;
        weaponRoot.add(bow, body);
      }
    }
    buildWeaponModel();

    const spells = [];
    let punchT = 0;

    // hit effect
    const hitFx = [];
    function spawnHitFx(pos, mult=1){
      const geo = new THREE.CylinderGeometry(0.05, 0.05, 0.02, 10);
      for(let i=0;i<Math.round(12*mult);i++){
        const p = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({color: (i%2===0 ? 0xf6c64b : 0xffe08a)}));
        p.rotation.x = Math.PI/2;
        p.rotation.z = Math.random()*Math.PI;
        p.position.copy(pos);
        p.userData.v = new THREE.Vector3((Math.random()-0.5)*3.4, Math.random()*3.0, (Math.random()-0.5)*3.4);
        p.userData.spin = (Math.random()-0.5)*16;
        p.userData.life = 0.45;
        scene.add(p); hitFx.push(p);
      }
    }

    const npcs = [];
    const npcGroup = new THREE.Group(); scene.add(npcGroup);
    const raycaster = new THREE.Raycaster();

    function makeNPC(x,z,id,opts={}){
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.8,1.1,0.45), new THREE.MeshStandardMaterial({color:0x4f79d8})); body.position.y = 0.8;
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.55,0.55,0.55), new THREE.MeshStandardMaterial({color:0xf0c7a4})); head.position.y = 1.55;

      // random hair
      const hairMat = new THREE.MeshStandardMaterial({color:[0x111111,0x3c2a1e,0x7a5230,0xb08968][Math.floor(Math.random()*4)]});
      const hairType = Math.floor(Math.random()*3);
      let hair;
      if(hairType===0){
        hair = new THREE.Mesh(new THREE.BoxGeometry(0.58,0.18,0.58), hairMat);
        hair.position.y = 1.84;
      } else if(hairType===1){
        hair = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 10), hairMat);
        hair.position.y = 1.88;
        hair.scale.set(1.05,0.7,1.05);
      } else {
        hair = new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.28,0.22,9), hairMat);
        hair.position.y = 1.86;
      }

      const legMat = new THREE.MeshStandardMaterial({color:0x2f3740});
      const lLeg = new THREE.Mesh(new THREE.BoxGeometry(0.22,0.65,0.22), legMat); lLeg.position.set(-0.16,0.22,0);
      const rLeg = new THREE.Mesh(new THREE.BoxGeometry(0.22,0.65,0.22), legMat); rLeg.position.set(0.16,0.22,0);
      g.add(body, head, hair, lLeg, rLeg); g.position.set(x,0,z);
      const seat = opts.seat || deskSeats[Math.floor(Math.random()*deskSeats.length)] || {x, z};
      g.userData = {
        id, hp:3,
        lLeg, rLeg, gait: Math.random()*Math.PI*2,
        speed:0.9+Math.random()*0.8,
        dir:new THREE.Vector3(Math.random()*2-1,0,Math.random()*2-1).normalize(),
        turnTimer:0.8+Math.random()*2.2,
        dead:false,
        seatX: seat.x, seatZ: seat.z,
        seated: opts.seated ?? true,
        entering: opts.entering ?? false,
        stateTimer: 2.0 + Math.random()*2.0,
        moveTimer: 0
      };
      npcGroup.add(g); npcs.push(g);
    }

    const scoreEl = document.getElementById('score');
    const aliveEl = document.getElementById('alive');
    document.getElementById('weaponName').textContent = localWeapon.name;
    document.getElementById('weaponRange').textContent = `${localWeaponRange}m`;
    document.getElementById('roomId').textContent = roomId;
    let score = 0;
    const scores = new Map();
    scores.set(nick, 0);
    const lbList = document.getElementById('lbList');
    function renderLeaderboard(){
      const rows = [...scores.entries()].sort((a,b)=>b[1]-a[1]).slice(0,10);
      lbList.innerHTML = rows.map(([name,sc]) => `<li>${name}: ${sc}</li>`).join('');
    }
    function awardScore(playerName, points){
      const cur = scores.get(playerName) || 0;
      const next = cur + points;
      scores.set(playerName, next);
      if(playerName === nick){ score = next; scoreEl.textContent = score; }
      renderLeaderboard();
    }
    let chiHits = 0;
    let ultimateReady = false;
    let ultimateArmed = false;
    const chiStateEl = document.getElementById('chiState');
    const ultReadyEl = document.getElementById('ultReady');
    const npcById = new Map();
    function updateAlive(){ aliveEl.textContent = npcs.filter(n=>!n.userData.dead).length; }
    function updateChiUI(){
      chiStateEl.textContent = `${Math.min(chiHits,10)}/10`;
      ultReadyEl.style.display = ultimateReady ? 'inline' : 'none';
      ultReadyEl.textContent = ultimateArmed ? '⚡ 필살기 발동!' : '⚡ 필살기 준비!';
    }
    function addChi(n=1){
      if(ultimateReady) return;
      chiHits += n;
      if(chiHits >= 10){ chiHits = 10; ultimateReady = true; }
      updateChiUI();
    }
    function consumeUltimate(){
      if(!ultimateReady) return false;
      ultimateArmed = true;
      updateChiUI();
      return true;
    }
    let npcSeq = 0;
    const initialCount = 50;
    for(let i=0;i<initialCount;i++){
      const seat = deskSeats[i % Math.max(1, deskSeats.length)] || {x:(Math.random()*60)-30, z:(Math.random()*60)-30};
      const id=`n${npcSeq++}`;
      makeNPC(seat.x + (Math.random()-0.5)*0.4, seat.z + (Math.random()-0.5)*0.4, id, { seat, seated:true, entering:false });
      npcById.set(id,npcs[npcs.length-1]);
    }
    updateAlive();
    updateChiUI();
    renderLeaderboard();

    function spawnFromRandomDoor(){
      if(!deskSeats.length) return;
      const door = doorSpawns[Math.floor(Math.random()*doorSpawns.length)];
      const seat = deskSeats[Math.floor(Math.random()*deskSeats.length)];
      const id = `n${npcSeq++}`;
      makeNPC(door.x, door.z, id, { seat, seated:false, entering:true });
      npcById.set(id, npcs[npcs.length-1]);
      updateAlive();
    }

    let spawnTimer = 5;

    // net
    const netEl = document.getElementById('netState');
    const hostId = `officecraft-${roomId}`;
    const remotes = new Map();
    const conns = [];
    let peer=null, isHost=false;
    const chatLog = document.getElementById('chatLog');
    const chatInput = document.getElementById('chatInput');

    function netState(t){ netEl.textContent = t; }
    function logChat(t){ const d=document.createElement('div'); d.textContent=t; chatLog.appendChild(d); chatLog.scrollTop = chatLog.scrollHeight; }
    function sendAll(msg, except=null){ for(const c of conns){ if(c.open && c!==except) c.send(msg); } }
    function isTyping(){ return document.activeElement === chatInput; }
    function openChat(){
      if(document.pointerLockElement===document.body) document.exitPointerLock?.();
      chatInput.focus();
    }
    function closeChat(){
      chatInput.blur();
      if(controlEnabled && !isTouch) document.body.requestPointerLock?.();
    }

    function makeNameTag(name){
      const cvs = document.createElement('canvas');
      cvs.width = 256; cvs.height = 64;
      const ctx = cvs.getContext('2d');
      ctx.clearRect(0,0,cvs.width,cvs.height);
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(10,12,236,40);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 24px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(name, 128, 32);
      const tex = new THREE.CanvasTexture(cvs);
      const mat = new THREE.SpriteMaterial({map:tex, transparent:true, depthTest:false});
      const sp = new THREE.Sprite(mat);
      sp.scale.set(2.3,0.58,1);
      sp.position.set(0,2.55,0);
      return sp;
    }

    function colorFromId(id){
      let h=0; for(let i=0;i<id.length;i++) h = (h*31 + id.charCodeAt(i)) >>> 0;
      const hue = h % 360;
      return new THREE.Color(`hsl(${hue} 70% 52%)`);
    }

    function ensureRemote(id,name='guest'){
      if(remotes.has(id)){
        const ex = remotes.get(id);
        if(name && ex.userData.name !== name){
          ex.userData.name = name;
          if(ex.userData.tag) ex.remove(ex.userData.tag);
          const tag = makeNameTag(name);
          ex.add(tag);
          ex.userData.tag = tag;
        }
        if(name && !scores.has(name)){ scores.set(name, 0); renderLeaderboard(); }
        return ex;
      }
      const g = new THREE.Group();
      const bodyColor = colorFromId(id);
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.8,1.1,0.45), new THREE.MeshStandardMaterial({color:bodyColor})); body.position.y=0.95;
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.55,0.55,0.55), new THREE.MeshStandardMaterial({color:0xe7c29f})); head.position.y=1.8;
      const lLeg = new THREE.Mesh(new THREE.BoxGeometry(0.22,0.65,0.22), new THREE.MeshStandardMaterial({color:0x2f3740})); lLeg.position.set(-0.16,0.3,0);
      const rLeg = new THREE.Mesh(new THREE.BoxGeometry(0.22,0.65,0.22), new THREE.MeshStandardMaterial({color:0x2f3740})); rLeg.position.set(0.16,0.3,0);
      const remoteWeapon = weaponCatalog.slingshot;
      const wep = new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,remoteWeapon.len,8), new THREE.MeshStandardMaterial({color:remoteWeapon.color}));
      wep.position.set(0.45,1.1,0.08);
      wep.rotation.z = -0.9;
      g.add(body, head, lLeg, rLeg, wep); g.userData.name = name; g.userData.lLeg = lLeg; g.userData.rLeg = rLeg; g.userData.moveSpeed = 0; g.userData.gait = Math.random()*Math.PI*2;
      const tag = makeNameTag(name);
      g.add(tag);
      g.userData.tag = tag;
      if(name && !scores.has(name)){ scores.set(name, 0); renderLeaderboard(); }
      scene.add(g); remotes.set(id,g); return g;
    }

    function applyNpcHit(id, killer='', damage=1, fxMult=1){
      const npc = npcById.get(id); if(!npc || npc.userData.dead) return false;
      npc.userData.hp -= damage; npc.position.y = 0.12; setTimeout(()=>{ if(!npc.userData.dead) npc.position.y=0; }, 80);
      spawnHitFx(npc.position.clone().add(new THREE.Vector3(0,1.3,0)), fxMult);
      if(npc.userData.hp <= 0){
        npc.userData.dead = true; npc.visible = false; updateAlive();
        return true;
      }
      return false;
    }

    function wireConn(conn){
      conns.push(conn);
      conn.on('data', (msg)=>{
        const actorId = msg?.from || conn.peer;
        if(msg?.type==='join'){
          ensureRemote(actorId, msg.nick || 'guest');
          if(isHost) sendAll({type:'join', from: actorId, nick: msg.nick || 'guest'}, conn);
        }
        if(msg?.type==='state'){
          const actorNick = msg.nick || 'guest';
          const m = ensureRemote(actorId, actorNick);
          const prevX = m.position.x, prevZ = m.position.z;
          m.position.set(msg.s.x, msg.s.y-1.6, msg.s.z);
          m.rotation.y = msg.s.yaw;
          const d2 = Math.hypot(m.position.x-prevX, m.position.z-prevZ);
          m.userData.moveSpeed = d2;
          if(typeof msg.score === 'number'){ scores.set(actorNick, msg.score); renderLeaderboard(); }
          if(isHost) sendAll({type:'state', from: actorId, nick: actorNick, s: msg.s, score: msg.score}, conn);
        }
        if(msg?.type==='hitNpc'){
          const killed = applyNpcHit(msg.id, msg.by, msg.damage||1, msg.fxMult||1);
          if(killed && msg.by) awardScore(msg.by, 100);
          if(isHost) sendAll(msg, conn);
        }
        if(msg?.type==='cast'){
          const p = new THREE.Vector3(msg.p?.x||0, msg.p?.y||0, msg.p?.z||0);
          const d = new THREE.Vector3(msg.d?.x||0, msg.d?.y||0, msg.d?.z||-1).normalize();
          spawnProjectile(p, d, msg.weapon || 'slingshot', !!msg.ult, true);
          if(isHost) sendAll(msg, conn);
        }
        if(msg?.type==='chat'){ logChat(`${msg.nick}: ${msg.text}`); if(isHost) sendAll(msg, conn); }
      });
      conn.on('close', ()=>{ const m=remotes.get(conn.peer); if(m){scene.remove(m); remotes.delete(conn.peer);} });
    }

    function startClient(){
      isHost = false; peer = new Peer();
      peer.on('open', ()=>{
        const c = peer.connect(hostId, {reliable:false});
        c.on('open', ()=>{ netState('참가 완료'); wireConn(c); c.send({type:'join', nick}); });
      });
      peer.on('error', ()=> netState('연결 오류'));
    }

    function initNet(){
      isHost = true; peer = new Peer(hostId);
      peer.on('open', ()=> netState('호스트 온라인'));
      peer.on('connection', (c)=> wireConn(c));
      peer.on('error', (e)=>{ if(String(e?.type||'').includes('unavailable-id')){ try{peer.destroy();}catch{} netState('룸 참가 중...'); startClient(); } else netState('연결 오류'); });
    }
    initNet();

    chatInput.addEventListener('keydown', (e)=>{
      if(e.key==='Escape'){ closeChat(); return; }
      if(e.key!=='Enter') return;
      const text = chatInput.value.trim();
      if(!text){ closeChat(); return; }
      chatInput.value='';
      const msg = {type:'chat', nick, text};
      logChat(`${nick}: ${text}`);
      sendAll(msg);
      closeChat();
    });

    let yaw=0, pitch=0;
    function applyLook(){ player.rotation.y = yaw; camera.rotation.x = pitch; }
    document.addEventListener('mousemove', (e)=>{ if(!controlEnabled || document.pointerLockElement!==document.body) return; yaw -= e.movementX*0.0024; pitch -= e.movementY*0.0024; pitch=Math.max(-1.3,Math.min(1.3,pitch)); applyLook(); });

    const move = {f:false,b:false,l:false,r:false,run:false,jump:false};
    const vel = new THREE.Vector3(); let canJump=false;
    const onKey=(d,e)=>{
      if(e.type==='keydown' && e.code==='Enter' && !isTyping()){ e.preventDefault(); openChat(); return; }
      if(isTyping()) return;
      if(e.code==='KeyW')move.f=d;
      if(e.code==='KeyS')move.b=d;
      if(e.code==='KeyA')move.l=d;
      if(e.code==='KeyD')move.r=d;
      if(e.code==='ShiftLeft')move.run=d;
      if(e.code==='Space'&&d)move.jump=true;
      if(e.code==='KeyQ'&&d) consumeUltimate();
    };
    addEventListener('keydown',e=>onKey(true,e));
    addEventListener('keyup',e=>onKey(false,e));

    function clampPlayer(p){ p.x=Math.max(-38,Math.min(38,p.x)); p.z=Math.max(-38,Math.min(38,p.z)); }

    function makeProjectileMesh(weaponKey, ult){
      let mesh, speed = 28;
      if(weaponKey==='wand'){
        mesh = new THREE.Mesh(new THREE.SphereGeometry(ult?0.16:0.08, 12, 12), new THREE.MeshStandardMaterial({color:0xaee7ff, emissive:0x3a7bff, emissiveIntensity:ult?2.5:1.1}));
        speed = ult ? 44 : 30;
      } else if(weaponKey==='k2'){
        mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.012,0.012, ult?0.45:0.2, 8), new THREE.MeshStandardMaterial({color:0xd6b04d}));
        mesh.rotation.x = Math.PI/2;
        speed = ult ? 70 : 48;
      } else if(weaponKey==='crossbow'){
        mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.01,0.01, ult?0.8:0.45, 8), new THREE.MeshStandardMaterial({color:0x8b5a2b}));
        mesh.rotation.x = Math.PI/2;
        speed = ult ? 55 : 34;
      } else {
        mesh = new THREE.Mesh(new THREE.SphereGeometry(ult?0.14:0.06, 10, 10), new THREE.MeshStandardMaterial({color:0x7f8c8d}));
        speed = ult ? 42 : 28;
      }
      return {mesh, speed};
    }

    function spawnProjectile(p, d, weaponKey, ult, noHit=false){
      const {mesh, speed} = makeProjectileMesh(weaponKey, ult);
      mesh.position.copy(p).addScaledVector(d, 0.55);
      mesh.userData.v = d.clone().multiplyScalar(speed);
      mesh.userData.life = ult ? 6 : 3;
      mesh.userData.ult = ult;
      mesh.userData.damage = ult ? 999 : 1;
      mesh.userData.fxMult = ult ? 20 : 1;
      mesh.userData.gravity = ult ? 0 : 10;
      mesh.userData.noHit = noHit;
      scene.add(mesh);
      spells.push(mesh);
    }

    function castSpell(){
      punchT = 0.16;
      const ult = ultimateArmed;
      const d = new THREE.Vector3();
      const p = new THREE.Vector3();
      camera.getWorldDirection(d);
      camera.getWorldPosition(p);

      spawnProjectile(p, d, localWeapon.key, ult, false);
      sendAll({type:'cast', from: peer?.id || nick, p:{x:p.x,y:p.y,z:p.z}, d:{x:d.x,y:d.y,z:d.z}, weapon: localWeapon.key, ult});

      if(ult){ ultimateArmed = false; ultimateReady = false; chiHits = 0; updateChiUI(); }
    }

    addEventListener('mousedown', (e)=>{ if(!controlEnabled || document.pointerLockElement!==document.body) return; if(e.button===0) castSpell(); });
    document.getElementById('hitBtn').addEventListener('touchstart', (e)=>{ e.preventDefault(); if(controlEnabled) castSpell(); }, {passive:false});
    document.getElementById('jumpBtn').addEventListener('touchstart', (e)=>{ e.preventDefault(); if(controlEnabled) move.jump=true; }, {passive:false});
    document.getElementById('ultBtn').addEventListener('touchstart', (e)=>{ e.preventDefault(); if(controlEnabled) consumeUltimate(); }, {passive:false});

    // mobile touch
    const stickBase = document.getElementById('stickBase'); const stickKnob = document.getElementById('stickKnob');
    let stickId=null, lookId=null, joyX=0, joyY=0, prevLookX=0, prevLookY=0;
    function resetStick(){ joyX=0; joyY=0; stickKnob.style.left='40px'; stickKnob.style.top='40px'; }
    addEventListener('touchstart',(e)=>{ if(!controlEnabled) return; for(const t of e.changedTouches){ const x=t.clientX,y=t.clientY; if(stickId===null && x<innerWidth*0.45 && y>innerHeight*0.45){ stickId=t.identifier; const r=stickBase.getBoundingClientRect(); const cx=r.left+r.width/2, cy=r.top+r.height/2; joyX=(x-cx)/45; joyY=(y-cy)/45; } else if(lookId===null){ lookId=t.identifier; prevLookX=x; prevLookY=y; } } }, {passive:false});
    addEventListener('touchmove',(e)=>{ if(!controlEnabled) return; for(const t of e.changedTouches){ if(t.identifier===stickId){ const r=stickBase.getBoundingClientRect(); const cx=r.left+r.width/2, cy=r.top+r.height/2; let dx=t.clientX-cx, dy=t.clientY-cy; const len=Math.hypot(dx,dy), max=40; if(len>max){ dx=dx/len*max; dy=dy/len*max; } joyX=dx/max; joyY=dy/max; stickKnob.style.left=`${40+dx}px`; stickKnob.style.top=`${40+dy}px`; } else if(t.identifier===lookId){ const dx=t.clientX-prevLookX, dy=t.clientY-prevLookY; prevLookX=t.clientX; prevLookY=t.clientY; yaw-=dx*0.004; pitch-=dy*0.004; pitch=Math.max(-1.3,Math.min(1.3,pitch)); applyLook(); } } e.preventDefault(); }, {passive:false});
    addEventListener('touchend',(e)=>{ for(const t of e.changedTouches){ if(t.identifier===stickId){stickId=null; resetStick();} if(t.identifier===lookId) lookId=null; } });

    function avoidWallsOrTurn(n){ if(Math.abs(n.position.x)>36||Math.abs(n.position.z)>36) n.userData.dir.multiplyScalar(-1); if(Math.random()<0.008) n.userData.dir.set(Math.random()*2-1,0,Math.random()*2-1).normalize(); }

    let prev = performance.now(), netTick = 0;
    function animate(){
      requestAnimationFrame(animate);
      const now=performance.now(), dt=Math.min((now-prev)/1000,0.05); prev=now;

      if(controlEnabled){
        const speed = (move.run?9.3:6.1);
        let sx=(move.r?1:0)-(move.l?1:0), sz=(move.f?1:0)-(move.b?1:0);
        if(isTouch){ sx+=joyX; sz+=-joyY; }
        const mag=Math.hypot(sx,sz)||1; sx/=mag; sz/=mag;
        const forward = new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw));
        const right = new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw));
        player.position.addScaledVector(forward, sz*speed*dt);
        player.position.addScaledVector(right, sx*speed*dt);

        vel.y -= 18*dt;
        if(move.jump&&canJump){ vel.y=7.2; canJump=false; }
        move.jump=false;
        player.position.y += vel.y*dt;
        if(player.position.y<1.6){ player.position.y=1.6; vel.y=0; canJump=true; }
        clampPlayer(player.position);
      }

      // hand + slingshot animation (forward-facing)
      if(punchT>0){
        punchT -= dt;
        const k = Math.max(0, punchT/0.16);
        const swing = (1-k);
        handRoot.position.x = 0.2 + swing*0.06;
        handRoot.position.y = -0.34 - swing*0.04;
        handRoot.rotation.z = -0.18 - swing*0.45;
        handRoot.rotation.x = -0.08 - swing*0.22;
        weaponRoot.rotation.y = -swing*0.35;
        weaponRoot.rotation.x = swing*0.22;
      } else {
        handRoot.position.x += (0.2-handRoot.position.x)*0.2;
        handRoot.position.y += (-0.34-handRoot.position.y)*0.2;
        handRoot.rotation.z += (-0.18-handRoot.rotation.z)*0.2;
        handRoot.rotation.x += (-0.08-handRoot.rotation.x)*0.2;
        weaponRoot.rotation.y += (0-weaponRoot.rotation.y)*0.2;
        weaponRoot.rotation.x += (0-weaponRoot.rotation.x)*0.2;
      }

      for(const n of npcs){
        if(n.userData.dead) continue;

        if(n.userData.entering){
          const dx = n.userData.seatX - n.position.x;
          const dz = n.userData.seatZ - n.position.z;
          const dist = Math.hypot(dx, dz);
          if(dist < 0.45){
            n.userData.entering = false;
            n.userData.seated = true;
            n.userData.stateTimer = 2.0 + Math.random()*2.0;
          } else {
            n.position.x += (dx/dist) * n.userData.speed * dt;
            n.position.z += (dz/dist) * n.userData.speed * dt;
            n.rotation.y = Math.atan2(dx, dz);
          }
          n.userData.gait += dt*9;
          n.userData.lLeg.rotation.x = Math.sin(n.userData.gait)*0.8;
          n.userData.rLeg.rotation.x = -Math.sin(n.userData.gait)*0.8;
          continue;
        }

        n.userData.stateTimer -= dt;
        if(n.userData.seated){
          // 기본: 자리에서 근무
          n.position.x += (n.userData.seatX - n.position.x) * 0.08;
          n.position.z += (n.userData.seatZ - n.position.z) * 0.08;
          n.rotation.y += (0 - n.rotation.y) * 0.08;
          n.userData.lLeg.rotation.x *= 0.75;
          n.userData.rLeg.rotation.x *= 0.75;
          if(n.userData.stateTimer <= 0){
            n.userData.stateTimer = 2.0 + Math.random()*2.0;
            if(Math.random() < 0.30){
              n.userData.seated = false;
              n.userData.moveTimer = 3.0 + Math.random()*4.0;
              n.userData.dir.set(Math.random()*2-1,0,Math.random()*2-1).normalize();
            }
          }
        } else {
          // 자리 이탈 후 이동
          n.userData.moveTimer -= dt;
          n.userData.turnTimer -= dt;
          if(n.userData.turnTimer<=0){
            n.userData.turnTimer=0.6+Math.random()*2.5;
            n.userData.dir.set(Math.random()*2-1,0,Math.random()*2-1).normalize();
          }
          n.position.addScaledVector(n.userData.dir,n.userData.speed*dt);
          avoidWallsOrTurn(n);
          n.rotation.y=Math.atan2(n.userData.dir.x,n.userData.dir.z);
          n.userData.gait += dt*10;
          n.userData.lLeg.rotation.x = Math.sin(n.userData.gait)*0.85;
          n.userData.rLeg.rotation.x = -Math.sin(n.userData.gait)*0.85;

          if(n.userData.moveTimer <= 0){
            n.userData.seated = true;
            n.userData.stateTimer = 2.0 + Math.random()*2.0;
          }
        }
      }

      for(const m of remotes.values()){
        const sp = m.userData.moveSpeed || 0;
        m.userData.gait = (m.userData.gait || 0) + Math.min(0.25, sp*35);
        const amp = Math.min(0.9, sp*28);
        if(m.userData.lLeg && m.userData.rLeg){
          m.userData.lLeg.rotation.x = Math.sin(m.userData.gait)*amp;
          m.userData.rLeg.rotation.x = -Math.sin(m.userData.gait)*amp;
        }
      }

      for(let i=spells.length-1;i>=0;i--){
        const b = spells[i];
        b.userData.life -= dt;
        b.position.addScaledVector(b.userData.v, dt);
        b.userData.v.y -= (b.userData.gravity||0)*dt;

        let hit = false;
        if(!b.userData.noHit){
          for(const n of npcs){
            if(n.userData.dead) continue;
            const hitPos = n.position.clone().add(new THREE.Vector3(0,1.1,0));
            if(b.position.distanceTo(hitPos) < 0.65){
              if(n.userData.seated && !b.userData.ult){ awardScore(nick, -80); }
              else {
                const killed = applyNpcHit(n.userData.id, nick, b.userData.damage||1, b.userData.fxMult||1);
                if(killed) awardScore(nick, 100);
                if(!b.userData.ult) addChi(1);
                sendAll({type:'hitNpc', id:n.userData.id, by:nick, damage:b.userData.damage||1, fxMult:b.userData.fxMult||1});
              }
              hit = true;
              break;
            }
          }
        }

        if(hit || b.userData.life<=0 || b.position.y <= 0){ scene.remove(b); spells.splice(i,1); }
      }

      for(let i=hitFx.length-1;i>=0;i--){
        const p=hitFx[i];
        p.userData.life -= dt;
        p.position.addScaledVector(p.userData.v, dt);
        p.rotation.y += (p.userData.spin || 0) * dt;
        p.userData.v.y -= 7.5*dt;
        p.userData.v.multiplyScalar(0.985);
        p.scale.setScalar(Math.max(0.01,p.userData.life*2.2));
        if(p.userData.life<=0){ scene.remove(p); hitFx.splice(i,1);} }

      spawnTimer -= dt;
      if(spawnTimer <= 0){
        spawnTimer = 5;
        spawnFromRandomDoor();
      }

      netTick += dt;
      if(netTick>0.06){ netTick=0; sendAll({type:'state', s:{x:player.position.x,y:player.position.y,z:player.position.z,yaw}, nick, score}); }

      renderer.render(scene,camera);
    }
    animate();

    addEventListener('resize', ()=>{ camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
