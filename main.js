import * as THREE from 'https://esm.sh/three@0.160.0';
import Peer from 'https://esm.sh/peerjs@1.5.4';
import { weaponCatalog, resolveWeaponSelection } from './weapons.js';
import { createAmbientBgmStarter } from './audio.js';
import { resolveNickname } from './identity.js';
import { createProjectileMesh } from './projectiles.js';

    const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    const roomId = new URLSearchParams(location.search).get('room') || 'office-1';
    const nick = resolveNickname();

    async function resolveTeamSelection(){
      return new Promise((resolve)=>{
        const saved = (localStorage.getItem('officecraft_team') || 'blue').toLowerCase();
        const wrap = document.createElement('div');
        wrap.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.62);display:flex;align-items:center;justify-content:center;';
        const card = document.createElement('div');
        card.style.cssText = 'width:min(560px,90vw);background:#111827;color:#fff;border-radius:14px;padding:18px;box-shadow:0 20px 40px rgba(0,0,0,.4);';
        card.innerHTML = '<div style="font-weight:700;font-size:18px;margin-bottom:12px">팀 선택</div><div style="opacity:.85;margin-bottom:14px">블루/레드 중 하나를 클릭하세요.</div>';
        const row = document.createElement('div');
        row.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:10px;';

        const mk = (key, label, color)=>{
          const btn = document.createElement('button');
          const active = key===saved;
          btn.style.cssText = `border:1px solid ${active ? '#fff' : '#374151'};background:${color};color:#fff;border-radius:12px;padding:16px;cursor:pointer;font-weight:700;`;
          btn.textContent = label;
          btn.onclick = ()=>{ localStorage.setItem('officecraft_team', key); wrap.remove(); resolve(key); };
          return btn;
        };

        row.appendChild(mk('blue','블루팀','#1d4ed8'));
        row.appendChild(mk('red','레드팀','#b91c1c'));
        card.appendChild(row);
        wrap.appendChild(card);
        document.body.appendChild(wrap);
      });
    }

    const team = await resolveTeamSelection();
    const localWeapon = await resolveWeaponSelection();
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
      if (!isTouch && document.pointerLockElement !== document.body && controlEnabled) {
        start.style.display = 'flex'; controlEnabled = false;
      }
    });

    if (isTouch) {
      document.getElementById('controlsText').textContent = '왼쪽 조이스틱 이동 / 점프·필살기·고용 버튼';
      document.getElementById('lookText').innerHTML = '오른쪽 화면 드래그 시점 / 공격 버튼 <span class="danger">직원 때리기</span>';
      const leaderboard = document.getElementById('leaderboard');
      if (leaderboard) leaderboard.style.pointerEvents = 'none';
    }

    const floor = new THREE.Mesh(new THREE.BoxGeometry(80,1,80), new THREE.MeshStandardMaterial({color:0xbfc7d1}));
    floor.position.y = -0.5; floor.receiveShadow = true; scene.add(floor);
    function wall(x,y,z,w,h,d,col=0xe8edf2){ const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), new THREE.MeshStandardMaterial({color:col})); m.position.set(x,y,z); m.castShadow=true; m.receiveShadow=true; scene.add(m); }
    wall(0,2,-40,80,5,1); wall(0,2,40,80,5,1); wall(-40,2,0,1,5,80); wall(40,2,0,1,5,80);

    const deskSeats = [];
    const deskSurfaces = [];
    const seatOwner = new Map(); // seatIndex -> npcId
    const towerSurfaces = [];
    function desk(x,z){
      const top = new THREE.Mesh(new THREE.BoxGeometry(3,0.25,2), new THREE.MeshStandardMaterial({color:0x8d6e63}));
      top.position.set(x,1.2,z); top.castShadow=true; top.receiveShadow=true; scene.add(top);
      const legGeo = new THREE.BoxGeometry(0.2,1.1,0.2), legMat = new THREE.MeshStandardMaterial({color:0x555});
      [[1.3,0.6,0.8],[-1.3,0.6,0.8],[1.3,0.6,-0.8],[-1.3,0.6,-0.8]].forEach(([lx,ly,lz])=>{ const leg = new THREE.Mesh(legGeo, legMat); leg.position.set(x+lx,ly,z+lz); leg.castShadow=true; leg.receiveShadow=true; scene.add(leg); });
      const pc = new THREE.Mesh(new THREE.BoxGeometry(0.9,0.6,0.08), new THREE.MeshStandardMaterial({color:0x202225}));
      pc.position.set(x,1.65,z-0.45); scene.add(pc);

      deskSurfaces.push({
        minX: x - 1.5, maxX: x + 1.5,
        minZ: z - 1.0, maxZ: z + 1.0,
        topY: 1.325 // desk top world y
      });

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

    // Central watch tower
    const towerBase = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3.2, 6.0, 10), new THREE.MeshStandardMaterial({color:0x7d8792}));
    towerBase.position.set(0, 3.0, 0); towerBase.castShadow = true; towerBase.receiveShadow = true; scene.add(towerBase);
    const towerTop = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.2, 0.6, 12), new THREE.MeshStandardMaterial({color:0xa9b4bf}));
    towerTop.position.set(0, 6.15, 0); towerTop.castShadow = true; towerTop.receiveShadow = true; scene.add(towerTop);
    towerSurfaces.push({ minX:-4.1, maxX:4.1, minZ:-4.1, maxZ:4.1, topY:6.45 });

    // Stairs to climb tower
    const stairMat = new THREE.MeshStandardMaterial({color:0x8f99a4});
    for(let i=0;i<12;i++){
      const y = 0.2 + i*0.45;
      const x = -5.2 + i*0.85;
      const z = 3.6;
      const step = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.4, 2.2), stairMat);
      step.position.set(x, y, z);
      step.castShadow = true; step.receiveShadow = true;
      scene.add(step);
      towerSurfaces.push({ minX:x-0.39, maxX:x+0.39, minZ:z-1.1, maxZ:z+1.1, topY:y+0.2 });
    }

    // Team towers (office tower defense)
    const teamBases = { blue: new THREE.Vector3(-30,0,0), red: new THREE.Vector3(30,0,0) };
    function buildTeamTower(base, color){
      const core = new THREE.Mesh(new THREE.CylinderGeometry(2.8,3.3,7,12), new THREE.MeshStandardMaterial({color}));
      core.position.set(base.x,3.5,base.z); core.castShadow=true; core.receiveShadow=true; scene.add(core);
      const top = new THREE.Mesh(new THREE.CylinderGeometry(4,4,0.6,12), new THREE.MeshStandardMaterial({color:0xd1d5db}));
      top.position.set(base.x,7.1,base.z); scene.add(top);
      towerSurfaces.push({minX:base.x-3.9,maxX:base.x+3.9,minZ:base.z-3.9,maxZ:base.z+3.9,topY:7.4});
    }
    buildTeamTower(teamBases.blue, 0x2563eb);
    buildTeamTower(teamBases.red, 0xb91c1c);

    function addTeamTowerStairs(base, dir){
      // dir: +1 blue side, -1 red side
      const stairMat2 = new THREE.MeshStandardMaterial({color:0x9aa5b1});
      for(let i=0;i<14;i++){
        const y = 0.2 + i*0.52;
        // high steps get closer to tower center (climb toward tower)
        const x = base.x + dir*(11.8 - i*0.58);
        const z = base.z;
        const step = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.42, 2.9), stairMat2);
        step.position.set(x, y, z);
        step.castShadow = true; step.receiveShadow = true;
        scene.add(step);
        // overlap collision boxes to avoid falling between steps
        towerSurfaces.push({ minX:x-0.57, maxX:x+0.57, minZ:z-1.45, maxZ:z+1.45, topY:y+0.21 });
      }
    }
    addTeamTowerStairs(teamBases.blue, +1);
    addTeamTowerStairs(teamBases.red, -1);

    const flags = {
      blue: { base: teamBases.blue.clone(), takenBy:null, mesh:null },
      red: { base: teamBases.red.clone(), takenBy:null, mesh:null }
    };
    function makeFlag(teamKey){
      const g = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,1.8,8), new THREE.MeshStandardMaterial({color:0xe5e7eb}));
      pole.position.y = 0.9;
      const cloth = new THREE.Mesh(new THREE.BoxGeometry(0.9,0.45,0.05), new THREE.MeshStandardMaterial({color:teamKey==='blue'?0x2563eb:0xb91c1c}));
      cloth.position.set(0.45,1.35,0);
      g.add(pole, cloth);
      return g;
    }
    flags.blue.mesh = makeFlag('blue'); flags.red.mesh = makeFlag('red');
    flags.blue.mesh.position.copy(flags.blue.base).add(new THREE.Vector3(0,7.4,0));
    flags.red.mesh.position.copy(flags.red.base).add(new THREE.Vector3(0,7.4,0));
    scene.add(flags.blue.mesh, flags.red.mesh);

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
      } else if(localWeapon.key==='galaxy26'){
        const phone = new THREE.Mesh(new THREE.BoxGeometry(0.12,0.22,0.02), mat); phone.position.set(0.03,0.01,-0.22); phone.rotation.y = -0.2;
        const cameraRing1 = new THREE.Mesh(new THREE.CylinderGeometry(0.018,0.018,0.01,14), new THREE.MeshStandardMaterial({color:0x111827}));
        const cameraRing2 = new THREE.Mesh(new THREE.CylinderGeometry(0.018,0.018,0.01,14), new THREE.MeshStandardMaterial({color:0x111827}));
        const cameraRing3 = new THREE.Mesh(new THREE.CylinderGeometry(0.018,0.018,0.01,14), new THREE.MeshStandardMaterial({color:0x111827}));
        cameraRing1.position.set(0.06,0.07,-0.205);
        cameraRing2.position.set(0.02,0.03,-0.205);
        cameraRing3.position.set(0.06,-0.01,-0.205);
        cameraRing1.rotation.x = cameraRing2.rotation.x = cameraRing3.rotation.x = Math.PI/2;
        const flash = new THREE.Mesh(new THREE.SphereGeometry(0.01,10,10), new THREE.MeshStandardMaterial({color:0xfef08a, emissive:0xfde047, emissiveIntensity:0.8}));
        flash.position.set(0.02,-0.03,-0.205);
        weaponRoot.add(phone, cameraRing1, cameraRing2, cameraRing3, flash);
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

    function makeAlertTag(){
      const cvs = document.createElement('canvas');
      cvs.width = 320; cvs.height = 120;
      const tex = new THREE.CanvasTexture(cvs);
      const mat = new THREE.SpriteMaterial({map:tex, transparent:true, depthTest:false});
      const sp = new THREE.Sprite(mat);
      sp.scale.set(2.8,1.05,1);
      sp.position.set(0,2.55,0);
      sp.visible = false;
      sp.userData.canvas = cvs;
      sp.userData.ctx = cvs.getContext('2d');
      sp.userData.texture = tex;
      return sp;
    }

    function setAlertText(tag, text){
      const ctx = tag.userData.ctx;
      const cvs = tag.userData.canvas;
      ctx.clearRect(0,0,cvs.width,cvs.height);
      ctx.fillStyle = 'rgba(0,0,0,0.62)';
      ctx.fillRect(8,16,cvs.width-16,84);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 26px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, cvs.width/2, 58);
      tag.userData.texture.needsUpdate = true;
    }

    function makeNPC(x,z,id,opts={}){
      const g = new THREE.Group();
      const isBerserk = opts.isBerserk ?? (Math.random() < 0.20);
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.8,1.1,0.45), new THREE.MeshStandardMaterial({color:0xfacc15})); body.position.y = 0.8;
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.55,0.55,0.55), new THREE.MeshStandardMaterial({color:0xf0c7a4})); head.position.y = 1.55;
      if(isBerserk) head.scale.setScalar(1.2);

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

      const eyeWhiteMat = new THREE.MeshStandardMaterial({color:0xffffff});
      const pupilMat = new THREE.MeshStandardMaterial({color:0x111111});
      const eWL = new THREE.Mesh(new THREE.SphereGeometry(0.05,8,8), eyeWhiteMat); eWL.position.set(-0.11,1.58,-0.26);
      const eWR = new THREE.Mesh(new THREE.SphereGeometry(0.05,8,8), eyeWhiteMat); eWR.position.set(0.11,1.58,-0.26);
      const ePL = new THREE.Mesh(new THREE.SphereGeometry(0.022,8,8), pupilMat); ePL.position.set(-0.11,1.58,-0.305);
      const ePR = new THREE.Mesh(new THREE.SphereGeometry(0.022,8,8), pupilMat); ePR.position.set(0.11,1.58,-0.305);

      const legMat = new THREE.MeshStandardMaterial({color:0x2f3740});
      const lLeg = new THREE.Mesh(new THREE.BoxGeometry(0.16,0.66,0.16), legMat); lLeg.position.set(-0.11,0.22,0);
      const rLeg = new THREE.Mesh(new THREE.BoxGeometry(0.16,0.66,0.16), legMat); rLeg.position.set(0.11,0.22,0);
      let keyboard = null;
      if(isBerserk){
        keyboard = new THREE.Mesh(new THREE.BoxGeometry(0.34,0.06,0.14), new THREE.MeshStandardMaterial({color:0x4b5563}));
        keyboard.position.set(0.36,0.9,-0.05);
        keyboard.rotation.z = -0.6;
      }
      const alertTag = makeAlertTag();
      g.add(body, head, hair, eWL, eWR, ePL, ePR, lLeg, rLeg, alertTag);
      if(keyboard) g.add(keyboard);
      g.position.set(x,0,z);
      const seatIndex = Number.isInteger(opts.seatIndex) ? opts.seatIndex : -1;
      const seat = opts.seat || (seatIndex>=0 ? deskSeats[seatIndex] : null) || deskSeats[Math.floor(Math.random()*deskSeats.length)] || {x, z};
      if(seatIndex >= 0) seatOwner.set(seatIndex, id);
      const baseSpeed = 0.9+Math.random()*0.8;
      g.userData = {
        id, hp:(isBerserk?4.5:3),
        team:'neutral',
        isBerserk,
        enraged:false,
        keyboard,
        body,
        atkCd:0,
        lLeg, rLeg, eyeL:ePL, eyeR:ePR, alertTag, gait: Math.random()*Math.PI*2,
        speed:baseSpeed, baseSpeed,
        dir:new THREE.Vector3(Math.random()*2-1,0,Math.random()*2-1).normalize(),
        turnTimer:0.8+Math.random()*2.2,
        dead:false,
        seatX: seat.x, seatZ: seat.z, seatIndex,
        seated: opts.seated ?? true,
        entering: opts.entering ?? false,
        willLeave: Math.random() < 0.30,
        stunned: 0,
        panicReturn: false,
        seatHitCount: 0,
        stateTimer: 2.0 + Math.random()*2.0,
        moveTimer: 0
      };
      npcGroup.add(g); npcs.push(g);
    }

    const scoreEl = document.getElementById('score');
    const aliveEl = document.getElementById('alive');
    const teamEl = document.getElementById('teamName');
    const hpEl = document.getElementById('hpVal');
    const blueCapEl = document.getElementById('blueCap');
    const redCapEl = document.getElementById('redCap');
    document.getElementById('weaponName').textContent = localWeapon.name;
    document.getElementById('weaponRange').textContent = `${localWeaponRange}m`;
    document.getElementById('roomId').textContent = roomId;
    teamEl.textContent = team === 'blue' ? '블루팀' : '레드팀';
    let playerHp = 100;
    let score = 3000;
    scoreEl.textContent = score;
    const captures = { blue:0, red:0 };
    function updateCaptureUI(){ blueCapEl.textContent = captures.blue; redCapEl.textContent = captures.red; }
    const scores = new Map();
    scores.set(nick, 3000);
    const lbList = document.getElementById('lbList');
    function rankTitle(i){
      if(i===0) return 'CEO';
      if(i===1) return '임원';
      if(i===2) return '팀장';
      if(i<=5) return '선임';
      return '사원';
    }

    function renderLeaderboard(){
      const rows = [...scores.entries()].sort((a,b)=>b[1]-a[1]).slice(0,10);
      lbList.innerHTML = rows.map(([name,sc], i) => `<li><strong>${rankTitle(i)}</strong> · ${name}: ${sc}</li>`).join('');
    }
    function awardScore(playerName, points){
      const cur = scores.get(playerName) || 0;
      const next = cur + points;
      scores.set(playerName, next);
      if(playerName === nick){ score = next; scoreEl.textContent = score; }
      renderLeaderboard();
    }
    function myRankTitle(){
      const rows = [...scores.entries()].sort((a,b)=>b[1]-a[1]).slice(0,10);
      const idx = rows.findIndex(([name])=>name===nick);
      return rankTitle(idx>=0?idx:9);
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
    function findFreeSeatIndex(){
      if(!deskSeats.length) return -1;
      const free = [];
      for(let i=0;i<deskSeats.length;i++) if(!seatOwner.has(i)) free.push(i);
      if(free.length===0) return -1;
      return free[Math.floor(Math.random()*free.length)];
    }

    let npcSeq = 0;
    const initialCount = 50;
    for(let i=0;i<initialCount;i++){
      const si = findFreeSeatIndex();
      const seat = (si>=0 ? deskSeats[si] : null) || {x:(Math.random()*60)-30, z:(Math.random()*60)-30};
      const id=`n${npcSeq++}`;
      makeNPC(seat.x + (Math.random()-0.5)*0.4, seat.z + (Math.random()-0.5)*0.4, id, { seat, seatIndex:si, seated:true, entering:false });
      npcById.set(id,npcs[npcs.length-1]);
    }
    updateAlive();
    updateChiUI();
    updateCaptureUI();
    renderLeaderboard();

    function spawnFromRandomDoor(){
      if(!deskSeats.length) return;
      const si = findFreeSeatIndex();
      if(si < 0) return; // no empty seat
      const door = doorSpawns[Math.floor(Math.random()*doorSpawns.length)];
      const seat = deskSeats[si];
      const id = `n${npcSeq++}`;
      makeNPC(door.x, door.z, id, { seat, seatIndex:si, seated:false, entering:true });
      npcById.set(id, npcs[npcs.length-1]);
      updateAlive();
    }

    let spawnTimer = 5;

    // net
    const netEl = document.getElementById('netState');
    const hostId = `officecraft-${roomId}`;
    const remotes = new Map();
    const hiredNpcs = [];
    const remoteGuards = new Map(); // guardId -> mesh
    const conns = [];
    let peer=null, isHost=false;
    function netState(t){ netEl.textContent = t; }
    function showStatus(text){
      netEl.textContent = text;
      setTimeout(()=>{ if(netEl.textContent===text) netEl.textContent = isHost ? '호스트 온라인' : '참가 완료'; }, 1400);
    }
    function sendAll(msg, except=null){ for(const c of conns){ if(c.open && c!==except) c.send(msg); } }
    function upsertRemoteGuard(msg){
      const g = ensureRemoteGuard(msg.guardId, msg.team || 'blue');
      g.userData.team = msg.team || g.userData.team;
      g.position.set(msg.x||0, 0, msg.z||0);
      g.rotation.y = msg.ry || 0;
      return g;
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

    function ensureRemoteGuard(guardId, teamKey='blue'){
      if(remoteGuards.has(guardId)) return remoteGuards.get(guardId);
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.8,1.1,0.45), new THREE.MeshStandardMaterial({color: teamKey==='blue'?0x2563eb:0xdc2626}));
      body.position.y = 0.8;
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.55,0.55,0.55), new THREE.MeshStandardMaterial({color:0xf0c7a4}));
      head.position.y = 1.55;
      g.add(body, head);
      g.userData.team = teamKey;
      scene.add(g);
      remoteGuards.set(guardId, g);
      return g;
    }

    function removeRemoteGuard(guardId){
      const g = remoteGuards.get(guardId);
      if(!g) return;
      scene.remove(g);
      remoteGuards.delete(guardId);
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
      const lLeg = new THREE.Mesh(new THREE.BoxGeometry(0.16,0.66,0.16), new THREE.MeshStandardMaterial({color:0x2f3740})); lLeg.position.set(-0.11,0.3,0);
      const rLeg = new THREE.Mesh(new THREE.BoxGeometry(0.16,0.66,0.16), new THREE.MeshStandardMaterial({color:0x2f3740})); rLeg.position.set(0.11,0.3,0);
      const remoteWeapon = weaponCatalog.slingshot;
      const wep = new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,remoteWeapon.len,8), new THREE.MeshStandardMaterial({color:remoteWeapon.color}));
      wep.position.set(0.45,1.1,0.08);
      wep.rotation.z = -0.9;
      g.add(body, head, lLeg, rLeg, wep); g.userData.name = name; g.userData.team = 'unknown'; g.userData.lLeg = lLeg; g.userData.rLeg = rLeg; g.userData.moveSpeed = 0; g.userData.gait = Math.random()*Math.PI*2;
      const tag = makeNameTag(name);
      g.add(tag);
      g.userData.tag = tag;
      if(name && !scores.has(name)){ scores.set(name, 0); renderLeaderboard(); }
      scene.add(g); remotes.set(id,g); return g;
    }

    const hitVoices = ['아악!','왜 때려요?!','헉, 아파요!','업무중입니다!','저기요?!','도와주세요!','앗, 잠깐만요!'];

    function applyNpcHit(id, killer='', damage=1, fxMult=1){
      const npc = npcById.get(id); if(!npc || npc.userData.dead) return false;
      npc.userData.hp -= damage; npc.position.y = 0.12; setTimeout(()=>{ if(!npc.userData.dead) npc.position.y=0; }, 80);
      spawnHitFx(npc.position.clone().add(new THREE.Vector3(0,1.3,0)), fxMult);

      if(!npc.userData.seated || npc.userData.entering){
        npc.userData.stunned = 1.0;
        npc.userData.panicReturn = true;
        const line = hitVoices[Math.floor(Math.random()*hitVoices.length)];
        setAlertText(npc.userData.alertTag, line);
        npc.userData.alertTag.visible = true;
      }

      if(npc.userData.isBerserk){
        npc.userData.enraged = true;
        npc.userData.eyeL.material.color.setHex(0xff2d2d);
        npc.userData.eyeR.material.color.setHex(0xff2d2d);
        npc.children.forEach(ch=>{ if(ch.geometry?.type==='BoxGeometry' && ch.position.y>1.3) ch.material?.color?.setHex?.(0xf2b2a0); });
        const angry = [
          `${myRankTitle()}님! 왜 때립니까?!`,
          `${myRankTitle()}님, 지금 화납니다!`,
          `${myRankTitle()}님, 선 넘으셨어요!`,
          `${myRankTitle()}님, 바로 항의합니다!`
        ];
        setAlertText(npc.userData.alertTag, angry[Math.floor(Math.random()*angry.length)]);
        npc.userData.alertTag.visible = true;
      }

      if(npc.userData.hp <= 0){
        npc.userData.dead = true; npc.visible = false;
        if(npc.userData.seatIndex >= 0) seatOwner.delete(npc.userData.seatIndex);
        updateAlive();
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
          m.userData.team = msg.team || m.userData.team || 'unknown';
          const d2 = Math.hypot(m.position.x-prevX, m.position.z-prevZ);
          m.userData.moveSpeed = d2;
          if(typeof msg.score === 'number'){ scores.set(actorNick, msg.score); renderLeaderboard(); }
          if(isHost) sendAll({type:'state', from: actorId, nick: actorNick, s: msg.s, score: msg.score, team: msg.team, hp: msg.hp}, conn);
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
        if(msg?.type==='playerHit'){
          if(msg.targetNick === nick){
            playerHp = Math.max(0, playerHp - (msg.damage || 10));
            hpEl.textContent = playerHp;

            // knockback
            let kx = 0, kz = 0;
            if(typeof msg.fromX === 'number' && typeof msg.fromZ === 'number'){
              const dx = player.position.x - msg.fromX;
              const dz = player.position.z - msg.fromZ;
              const len = Math.hypot(dx, dz) || 1;
              kx = dx / len;
              kz = dz / len;
            } else {
              kx = Math.sin(yaw);
              kz = Math.cos(yaw);
            }
            player.position.x += kx * 0.85;
            player.position.z += kz * 0.85;
            clampPlayer(player.position);
          }
          if(isHost) sendAll(msg, conn);
        }
        if(msg?.type==='guardSpawn'){
          upsertRemoteGuard(msg);
          if(isHost) sendAll(msg, conn);
        }
        if(msg?.type==='guardState'){
          upsertRemoteGuard(msg);
          if(isHost) sendAll(msg, conn);
        }
        if(msg?.type==='guardHit'){
          const guard = hiredNpcs.find(h=>h.userData?.guardId===msg.guardId);
          if(guard){
            guard.userData.guardHp = (guard.userData.guardHp || 10) - (msg.damage || 1);
            if(guard.userData.guardHp <= 0){
              guard.userData.dead = true;
              guard.visible = false;
              const idx = hiredNpcs.indexOf(guard); if(idx>=0) hiredNpcs.splice(idx,1);
              sendAll({type:'guardDead', guardId: msg.guardId});
            }
          }
          if(isHost) sendAll(msg, conn);
        }
        if(msg?.type==='guardDead'){
          removeRemoteGuard(msg.guardId);
          if(isHost) sendAll(msg, conn);
        }
        if(msg?.type==='guardsSnapshot'){
          const list = Array.isArray(msg.guards) ? msg.guards : [];
          for(const g of list){ upsertRemoteGuard(g); }
          if(isHost) sendAll(msg, conn);
        }
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
    let yaw=0, pitch=0;
    function applyLook(){ player.rotation.y = yaw; camera.rotation.x = pitch; }
    document.addEventListener('mousemove', (e)=>{ if(!controlEnabled || document.pointerLockElement!==document.body) return; yaw -= e.movementX*0.0024; pitch -= e.movementY*0.0024; pitch=Math.max(-1.3,Math.min(1.3,pitch)); applyLook(); });

    const move = {f:false,b:false,l:false,r:false,run:false,jump:false};
    const vel = new THREE.Vector3(); let canJump=false;
    const onKey=(d,e)=>{
      if(e.code==='KeyW')move.f=d;
      if(e.code==='KeyS')move.b=d;
      if(e.code==='KeyA')move.l=d;
      if(e.code==='KeyD')move.r=d;
      if(e.code==='ShiftLeft')move.run=d;
      if(e.code==='Space'&&d)move.jump=true;
      if(e.code==='KeyQ'&&d) consumeUltimate();
      if(e.code==='KeyE'&&d) hireNpcGuard();
    };
    addEventListener('keydown',e=>onKey(true,e));
    addEventListener('keyup',e=>onKey(false,e));

    function clampPlayer(p){ p.x=Math.max(-38,Math.min(38,p.x)); p.z=Math.max(-38,Math.min(38,p.z)); }
    function hireNpcGuard(){
      if(score < 300){ showStatus('고용 실패: 점수 부족'); return false; }
      // recruit nearest neutral(yellow) worker (global nearest)
      let best = null; let bestD = 9999;
      for(const n of npcs){
        if(n.userData.dead) continue;
        if(n.userData.team && n.userData.team !== 'neutral') continue;
        const d = n.position.distanceTo(player.position);
        if(d < bestD){ bestD = d; best = n; }
      }
      if(!best){ showStatus('고용 실패: 직원 없음'); return false; }

      awardScore(nick, -300);

      // keep original look/traits, only convert uniform(team color) + role
      best.userData.team = team;
      best.userData.dead = true; // exclude from worker loops/collisions
      best.userData.recruited = true;
      best.userData.guardId = `${peer?.id || nick}-g-${Date.now()}-${Math.floor(Math.random()*9999)}`;
      best.userData.guardHp = Math.round((best.userData.hp || 3) * 1.4);
      best.userData.lastAtk = 0;
      best.userData.carrying = null;
      best.userData.guardDamage = best.userData.isBerserk ? 14 : 10;
      best.userData.guardSpeed = best.userData.baseSpeed * (best.userData.isBerserk ? 1.2 : 1.0);
      best.userData.body?.material?.color?.setHex(team==='blue' ? 0x2563eb : 0xdc2626);
      best.userData.alertTag.visible = false;
      best.rotation.z = 0;
      if(best.userData.seatIndex >= 0) seatOwner.delete(best.userData.seatIndex);

      hiredNpcs.push(best);
      sendAll({type:'guardSpawn', guardId: best.userData.guardId, team, x: best.position.x, z: best.position.z});
      updateAlive();
      showStatus('고용 성공: 아군 가드 합류');
      return true;
    }
    function supportHeightAt(x, z, currentY){
      let h = 1.6; // floor eye height
      const allSurfaces = [...deskSurfaces, ...towerSurfaces];
      for(const s of allSurfaces){
        if(x>=s.minX && x<=s.maxX && z>=s.minZ && z<=s.maxZ){
          const eyeY = s.topY + 1.6;
          // relaxed snap threshold for stairs to reduce slipping
          if(currentY >= eyeY - 1.2) h = Math.max(h, eyeY);
        }
      }
      return h;
    }

    function moveActorWithPhysics(actor, dir, speed, dt){
      if(!actor || !dir) return;
      const d = dir.clone();
      d.y = 0;
      const len = d.length();
      if(len <= 0.0001) return;
      d.normalize();
      actor.position.addScaledVector(d, speed * dt);
      clampPlayer(actor.position);
      const supportY = supportHeightAt(actor.position.x, actor.position.z, (actor.position.y || 0) + 1.6);
      actor.position.y = Math.max(0, supportY - 1.6);
      actor.rotation.y = Math.atan2(d.x, d.z);
    }
    function spawnProjectile(p, d, weaponKey, ult, noHit=false){
      const {mesh, speed} = createProjectileMesh(THREE, weaponKey, ult);
      mesh.position.copy(p).addScaledVector(d, 0.55);
      mesh.userData.v = d.clone().multiplyScalar(speed);
      mesh.userData.life = ult ? 6 : 3;
      mesh.userData.ult = ult;
      mesh.userData.damage = ult ? 999 : 1;
      mesh.userData.fxMult = ult ? 50 : 1;
      mesh.userData.gravity = ult ? 0 : 10;
      mesh.userData.noHit = noHit;
      scene.add(mesh);
      spells.push(mesh);
    }

    function castSpell(overrideDir = null){
      punchT = 0.16;
      const ult = ultimateArmed;
      const d = overrideDir ? overrideDir.clone().normalize() : new THREE.Vector3();
      const p = new THREE.Vector3();
      if(!overrideDir) camera.getWorldDirection(d);
      camera.getWorldPosition(p);

      spawnProjectile(p, d, localWeapon.key, ult, false);
      sendAll({type:'cast', from: peer?.id || nick, p:{x:p.x,y:p.y,z:p.z}, d:{x:d.x,y:d.y,z:d.z}, weapon: localWeapon.key, ult});

      if(ult){ ultimateArmed = false; ultimateReady = false; chiHits = 0; updateChiUI(); }
    }

    function getGalaxyAutoAimDir(){
      const from = new THREE.Vector3();
      camera.getWorldPosition(from);
      const forward = new THREE.Vector3();
      camera.getWorldDirection(forward);
      let best = null;
      let bestDist = 9999;

      for(const n of npcs){
        if(!n || n.userData?.dead) continue;
        const target = n.position.clone().add(new THREE.Vector3(0,1.2,0));
        const dir = target.clone().sub(from);
        const dist = dir.length();
        if(dist > 38) continue;
        const dot = dir.clone().normalize().dot(forward);
        if(dot < 0.72) continue;
        if(dist < bestDist){ bestDist = dist; best = dir; }
      }

      return best ? best.normalize() : forward;
    }

    addEventListener('mousedown', (e)=>{ if(!controlEnabled || document.pointerLockElement!==document.body) return; if(e.button===0) castSpell(); });
    document.getElementById('hitBtn').addEventListener('touchstart', (e)=>{ e.preventDefault(); if(controlEnabled) castSpell(); }, {passive:false});
    document.getElementById('jumpBtn').addEventListener('touchstart', (e)=>{ e.preventDefault(); if(controlEnabled) move.jump=true; }, {passive:false});
    document.getElementById('ultBtn').addEventListener('touchstart', (e)=>{ e.preventDefault(); if(controlEnabled) consumeUltimate(); }, {passive:false});
    const hireBtn = document.getElementById('hireBtn');
    let lastHirePress = 0;
    const onHirePress = (e)=>{
      e.preventDefault(); e.stopPropagation();
      const now = Date.now();
      if(now - lastHirePress < 250) return; // prevent duplicated touch/click firing
      lastHirePress = now;
      if(controlEnabled) hireNpcGuard();
    };
    hireBtn.addEventListener('touchstart', onHirePress, {passive:false});
    hireBtn.addEventListener('pointerdown', onHirePress, {passive:false});
    hireBtn.addEventListener('click', onHirePress, {passive:false});

    // mobile touch
    const stickBase = document.getElementById('stickBase'); const stickKnob = document.getElementById('stickKnob');
    let stickId=null, lookId=null, joyX=0, joyY=0, prevLookX=0, prevLookY=0;
    function resetStick(){ joyX=0; joyY=0; stickKnob.style.left='40px'; stickKnob.style.top='40px'; }
    addEventListener('touchstart',(e)=>{ if(!controlEnabled) return; for(const t of e.changedTouches){ const x=t.clientX,y=t.clientY; if(stickId===null && x<innerWidth*0.45 && y>innerHeight*0.45){ stickId=t.identifier; const r=stickBase.getBoundingClientRect(); const cx=r.left+r.width/2, cy=r.top+r.height/2; joyX=(x-cx)/45; joyY=(y-cy)/45; } else if(lookId===null){ lookId=t.identifier; prevLookX=x; prevLookY=y; } } }, {passive:false});
    addEventListener('touchmove',(e)=>{ if(!controlEnabled) return; for(const t of e.changedTouches){ if(t.identifier===stickId){ const r=stickBase.getBoundingClientRect(); const cx=r.left+r.width/2, cy=r.top+r.height/2; let dx=t.clientX-cx, dy=t.clientY-cy; const len=Math.hypot(dx,dy), max=40; if(len>max){ dx=dx/len*max; dy=dy/len*max; } joyX=dx/max; joyY=dy/max; stickKnob.style.left=`${40+dx}px`; stickKnob.style.top=`${40+dy}px`; } else if(t.identifier===lookId){ const dx=t.clientX-prevLookX, dy=t.clientY-prevLookY; prevLookX=t.clientX; prevLookY=t.clientY; yaw-=dx*0.004; pitch-=dy*0.004; pitch=Math.max(-1.3,Math.min(1.3,pitch)); applyLook(); } } e.preventDefault(); }, {passive:false});
    addEventListener('touchend',(e)=>{ for(const t of e.changedTouches){ if(t.identifier===stickId){stickId=null; resetStick();} if(t.identifier===lookId) lookId=null; } });

    function avoidWallsOrTurn(n){ if(Math.abs(n.position.x)>36||Math.abs(n.position.z)>36) n.userData.dir.multiplyScalar(-1); if(Math.random()<0.008) n.userData.dir.set(Math.random()*2-1,0,Math.random()*2-1).normalize(); }

    let prev = performance.now(), netTick = 0;
    let galaxyAutoFireCd = 0;
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
        const supportY = supportHeightAt(player.position.x, player.position.z, player.position.y);
        if(player.position.y < supportY){ player.position.y = supportY; vel.y = 0; canJump = true; }
        clampPlayer(player.position);

        if(localWeapon.key === 'galaxy26'){
          galaxyAutoFireCd -= dt;
          if(galaxyAutoFireCd <= 0){
            castSpell(getGalaxyAutoAimDir());
            galaxyAutoFireCd = 0.22;
          }
        }
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

        if(n.userData.enraged){
          // berserk worker: chase and keyboard attack players (walk only, no flying)
          let targetPos = player.position.clone();
          targetPos.y = 0;
          let targetNick = nick;
          let best = n.position.clone().setY(0).distanceTo(targetPos);
          for(const m of remotes.values()){
            if(!m?.userData?.name) continue;
            const rp = m.position.clone(); rp.y = 0;
            const d = n.position.clone().setY(0).distanceTo(rp);
            if(d < best){ best = d; targetPos = rp; targetNick = m.userData.name; }
          }

          n.position.y = 0;
          const dir = targetPos.clone().sub(n.position.clone().setY(0));
          dir.y = 0;
          const dist = dir.length();
          if(dist > 0.01){
            moveActorWithPhysics(n, dir, Math.min(n.userData.baseSpeed*1.5, dist/Math.max(dt,0.001)), dt);
          }
          n.userData.gait += dt*11;
          n.userData.lLeg.rotation.x = Math.sin(n.userData.gait)*0.9;
          n.userData.rLeg.rotation.x = -Math.sin(n.userData.gait)*0.9;

          if(n.userData.keyboard){
            n.userData.atkCd -= dt;
            const swing = Math.max(0, (0.25 - Math.max(0,n.userData.atkCd))/0.25);
            n.userData.keyboard.rotation.z = -0.6 - Math.sin(swing*Math.PI)*0.9;
            if(dist < 1.9 && n.userData.atkCd <= 0){
              n.userData.atkCd = 1.1;
              const dmg = 6 + Math.floor(Math.random()*7); // 6~12
              if(targetNick===nick){
                playerHp = Math.max(0, playerHp - dmg);
                hpEl.textContent = playerHp;
              } else {
                sendAll({type:'playerHit', targetNick, damage:dmg, by:'berserk', fromX:n.position.x, fromZ:n.position.z});
              }
            }
          }
          continue;
        }

        if(n.userData.stunned > 0){
          n.userData.stunned -= dt;
          n.userData.alertTag.visible = true;
          n.rotation.z = 0.45;
          n.userData.lLeg.rotation.x *= 0.6;
          n.userData.rLeg.rotation.x *= 0.6;
          if(n.userData.stunned <= 0){
            n.rotation.z = 0;
            n.userData.alertTag.visible = false;
            if(n.userData.panicReturn){
              n.userData.seated = false;
              n.userData.entering = false;
              n.userData.moveTimer = 999;
            }
          }
          continue;
        }

        if(n.userData.entering){
          const dx = n.userData.seatX - n.position.x;
          const dz = n.userData.seatZ - n.position.z;
          const dist = Math.hypot(dx, dz);
          if(dist < 0.45){
            n.userData.entering = false;
            n.userData.seated = true;
            n.userData.stateTimer = 2.0 + Math.random()*2.0;
          } else {
            moveActorWithPhysics(n, new THREE.Vector3(dx,0,dz), n.userData.speed, dt);
          }
          n.userData.gait += dt*9;
          n.userData.lLeg.rotation.x = Math.sin(n.userData.gait)*0.8;
          n.userData.rLeg.rotation.x = -Math.sin(n.userData.gait)*0.8;
          n.userData.eyeL.position.x += (-0.11 - n.userData.eyeL.position.x) * 0.2;
          n.userData.eyeR.position.x += (0.11 - n.userData.eyeR.position.x) * 0.2;
          continue;
        }

        n.userData.stateTimer -= dt;
        if(n.userData.seated){
          // 기본: 자리에서 근무
          n.userData.speed = n.userData.baseSpeed;
          n.position.x += (n.userData.seatX - n.position.x) * 0.08;
          n.position.z += (n.userData.seatZ - n.position.z) * 0.08;
          n.rotation.y += (0 - n.rotation.y) * 0.08;
          n.userData.lLeg.rotation.x *= 0.75;
          n.userData.rLeg.rotation.x *= 0.75;

          // 눈: 집중 시 정면, 자리 이탈 1초 전 측면 시선
          const lookSide = n.userData.willLeave && n.userData.stateTimer < 1.0;
          const eyeTargetX = lookSide ? 0.04 : 0;
          n.userData.eyeL.position.x += ((-0.11 + eyeTargetX) - n.userData.eyeL.position.x) * 0.2;
          n.userData.eyeR.position.x += ((0.11 + eyeTargetX) - n.userData.eyeR.position.x) * 0.2;

          if(n.userData.stateTimer <= 0){
            n.userData.stateTimer = 2.0 + Math.random()*2.0;
            if(n.userData.willLeave){
              n.userData.seated = false;
              n.userData.moveTimer = 3.0 + Math.random()*4.0;
              n.userData.dir.set(Math.random()*2-1,0,Math.random()*2-1).normalize();
            }
            n.userData.willLeave = Math.random() < 0.30;
          }
        } else {
          // 자리 이탈 후 이동
          if(n.userData.panicReturn){
            const dx = n.userData.seatX - n.position.x;
            const dz = n.userData.seatZ - n.position.z;
            const dist = Math.hypot(dx, dz);
            if(dist < 0.45){
              n.userData.panicReturn = false;
              n.userData.seated = true;
              n.userData.stateTimer = 2.0 + Math.random()*2.0;
              n.userData.speed = n.userData.baseSpeed;
            } else {
              const spd = n.userData.baseSpeed * 1.5;
              n.userData.speed = spd;
              moveActorWithPhysics(n, new THREE.Vector3(dx,0,dz), spd, dt);
            }
          } else {
            n.userData.moveTimer -= dt;
            n.userData.turnTimer -= dt;
            if(n.userData.turnTimer<=0){
              n.userData.turnTimer=0.6+Math.random()*2.5;
              n.userData.dir.set(Math.random()*2-1,0,Math.random()*2-1).normalize();
            }
            moveActorWithPhysics(n, n.userData.dir, n.userData.speed, dt);
            avoidWallsOrTurn(n);

            if(n.userData.moveTimer <= 0){
              n.userData.seated = true;
              n.userData.stateTimer = 2.0 + Math.random()*2.0;
            }
          }

          n.userData.eyeL.position.x += (-0.11 - n.userData.eyeL.position.x) * 0.2;
          n.userData.eyeR.position.x += (0.11 - n.userData.eyeR.position.x) * 0.2;
          n.userData.gait += dt*10;
          n.userData.lLeg.rotation.x = Math.sin(n.userData.gait)*0.85;
          n.userData.rLeg.rotation.x = -Math.sin(n.userData.gait)*0.85;
        }
      }

      // hired NPC guards: enemy chase + flag capture
      for(const h of hiredNpcs){
        const enemyTeam = h.userData.team === 'blue' ? 'red' : 'blue';
        const homeBase = h.userData.team === 'blue' ? teamBases.blue : teamBases.red;
        const enemyBase = enemyTeam === 'blue' ? teamBases.blue : teamBases.red;

        // capture logic
        if(!h.userData.carrying){
          const enemyFlag = flags[enemyTeam];
          if(!enemyFlag.takenBy && h.position.distanceTo(enemyBase) < 2.6){
            enemyFlag.takenBy = h;
            h.userData.carrying = enemyTeam;
          }
        } else {
          const myFlag = flags[h.userData.team];
          if(h.position.distanceTo(homeBase) < 2.6 && !myFlag.takenBy){
            captures[h.userData.team] += 1;
            updateCaptureUI();
            h.userData.carrying = null;
            const returnedFlag = flags[h.userData.team === 'blue' ? 'red' : 'blue'];
            returnedFlag.takenBy = null;
            awardScore(nick, 500);
          }
        }

        let targetPos = null;
        // prioritize enemy players
        let target = null;
        let best = 9999;
        for(const m of remotes.values()){
          if(!m.userData || m.userData.team===h.userData.team || m.userData.team==='unknown') continue;
          const d = h.position.distanceTo(m.position);
          if(d < best){ best = d; target = m; }
        }

        if(target){
          targetPos = target.position;
        } else {
          targetPos = h.userData.carrying ? homeBase : enemyBase;
        }

        const hp2 = h.position.clone(); hp2.y = 0;
        const tp2 = targetPos.clone(); tp2.y = 0;
        const dir = tp2.sub(hp2);
        const dist = dir.length();
        if(dist > 0.01){
          const spd = h.userData.carrying ? (h.userData.guardSpeed||3.0)*1.25 : (h.userData.guardSpeed||3.0);
          moveActorWithPhysics(h, dir, Math.min(spd, dist/Math.max(dt,0.001)), dt);
        }

        h.userData.lastAtk += dt;
        const vGap = target ? Math.abs((target.position.y||0) - (h.position.y||0)) : 999;
        if(target && dist < 2.1 && vGap < 1.4 && h.userData.lastAtk > 1.0){
          h.userData.lastAtk = 0;
          const enemyNick = target.userData?.name;
          if(enemyNick) sendAll({type:'playerHit', targetNick: enemyNick, damage: (h.userData.guardDamage||10), by: nick, fromX: h.position.x, fromZ: h.position.z});
        }
      }

      // update flag mesh positions
      for(const key of ['blue','red']){
        const f = flags[key];
        if(f.takenBy){
          f.mesh.position.copy(f.takenBy.position).add(new THREE.Vector3(0,2.2,0));
        } else {
          f.mesh.position.copy(f.base).add(new THREE.Vector3(0,7.4,0));
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
          // NPC hit
          for(const n of npcs){
            if(n.userData.dead) continue;
            const hitPos = n.position.clone().add(new THREE.Vector3(0,1.1,0));
            if(b.position.distanceTo(hitPos) < 0.65){
              if(n.userData.seated && !b.userData.ult){
                awardScore(nick, -80);
                n.userData.seatHitCount = (n.userData.seatHitCount || 0) + 1;
                const c = n.userData.seatHitCount;
                let linePool;
                if(c <= 1) linePool = ['일하는 중입니다.', '업무 중입니다.'];
                else if(c <= 3) linePool = ['사장님 왜 이러세요…', '사장님, 제발 그만요.', '진짜 아파요…'];
                else linePool = ['노동청에 신고할게요…', '사장님 나빠요…', '이건 너무합니다…'];
                setAlertText(n.userData.alertTag, linePool[Math.floor(Math.random()*linePool.length)]);
                n.userData.alertTag.visible = true;
                n.userData.stunned = Math.max(n.userData.stunned || 0, 0.45);
              } else {
                const killed = applyNpcHit(n.userData.id, nick, b.userData.damage||1, b.userData.fxMult||1);
                if(killed) awardScore(nick, 100);
                if(!b.userData.ult) addChi(1);
                sendAll({type:'hitNpc', id:n.userData.id, by:nick, damage:b.userData.damage||1, fxMult:b.userData.fxMult||1});
              }
              hit = true;
              break;
            }
          }

          // Player hit (remote users)
          if(!hit){
            for(const m of remotes.values()){
              if(!m?.userData?.name) continue;
              if(m.userData.team === team || m.userData.team === 'unknown') continue;
              const hitPos = m.position.clone().add(new THREE.Vector3(0,1.0,0));
              if(b.position.distanceTo(hitPos) < 0.75){
                sendAll({type:'playerHit', targetNick: m.userData.name, damage: (b.userData.ult ? 18 : 10), by: nick, fromX: b.position.x, fromZ: b.position.z});
                hit = true;
                break;
              }
            }
          }

          // Enemy hired guard hit
          if(!hit){
            for(const [gid, g] of remoteGuards.entries()){
              if(!g?.visible) continue;
              if(g.userData?.team === team) continue;
              const hitPos = g.position.clone().add(new THREE.Vector3(0,0.9,0));
              if(b.position.distanceTo(hitPos) < 0.78){
                sendAll({type:'guardHit', guardId: gid, damage: b.userData.ult ? 6 : 3, by:nick});
                hit = true;
                break;
              }
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
      if(netTick>0.06){
        netTick=0;
        sendAll({type:'state', s:{x:player.position.x,y:player.position.y,z:player.position.z,yaw}, nick, score, team, hp: playerHp});
        const guards = [];
        for(const h of hiredNpcs){
          if(!h.userData?.guardId) continue;
          const gmsg = {guardId:h.userData.guardId, team:h.userData.team, x:h.position.x, z:h.position.z, ry:h.rotation.y};
          guards.push(gmsg);
          sendAll({type:'guardState', ...gmsg});
        }
        if(guards.length) sendAll({type:'guardsSnapshot', guards});
      }

      renderer.render(scene,camera);
    }
    animate();

    addEventListener('resize', ()=>{ camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
