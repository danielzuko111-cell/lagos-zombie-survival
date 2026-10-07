document.addEventListener("DOMContentLoaded", () => {
  let gender = "male";
  const selScreen = document.getElementById("char-select-screen");
  const btnM = document.getElementById("btn-male");
  const btnF = document.getElementById("btn-female");
  const btnStart = document.getElementById("btn-start-game");

  if (btnM && btnF && btnStart) {
    btnM.onclick = (e) => { e.preventDefault(); gender = "male"; btnM.classList.add("active"); btnF.classList.remove("active"); };
    btnF.onclick = (e) => { e.preventDefault(); gender = "female"; btnF.classList.add("active"); btnM.classList.remove("active"); };
    btnStart.onclick = (e) => { e.preventDefault(); if (selScreen) selScreen.style.display = "none"; init3D(); };
  }

  function init3D() {
    if (typeof THREE === "undefined") {
      alert("Three.js library not loaded yet. Please refresh.");
      return;
    }

    const socket = typeof io !== "undefined" ? io() : null;
    const state = { cash: 10000, hp: 100, ammo: 60, wepIdx: 0, sprint: false };
    const weapons = [
      { name: "Pistol", icon: "🔫", label: "FIRE", type: "ranged", damage: 35 },
      { name: "Cutlass", icon: "🗡️", label: "SWING", type: "melee", damage: 60 }
    ];

    // HUD & UI
    document.body.insertAdjacentHTML("beforeend", `
      <div style="position:fixed;top:12px;left:50%;transform:translateX(-50%);width:92%;max-width:440px;z-index:10;pointer-events:none;">
        <div style="display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.95);padding:8px 16px;border-radius:30px;box-shadow:0 4px 15px rgba(0,0,0,0.18);pointer-events:auto;">
          <div style="font-weight:700;font-size:13px;color:#333;">☀️ 10:08 AM | 🔊</div>
          <div style="background:#27ae60;color:#fff;padding:6px 14px;border-radius:20px;font-weight:800;font-size:14px;">
            ₦<span id="hud-cash">${state.cash.toLocaleString()}</span>
          </div>
        </div>
        <div style="display:flex;gap:8px;justify-content:center;margin-top:6px;">
          <span style="background:rgba(255,255,255,0.88);padding:4px 12px;border-radius:14px;font-size:11px;font-weight:600;color:#555;">👀 18.9m visits</span>
          <span style="background:rgba(255,255,255,0.88);padding:4px 12px;border-radius:14px;font-size:11px;font-weight:700;color:#27ae60;">● <span id="online-count">1</span> online</span>
        </div>
      </div>

      <div style="position:fixed;bottom:16px;left:50%;transform:translateX(-50%);width:92%;max-width:440px;z-index:10;pointer-events:auto;">
        <div style="background:#fff;padding:12px 16px;border-radius:20px;box-shadow:0 8px 24px rgba(0,0,0,0.2);">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-size:20px;">${gender === "male" ? "👨" : "👩"}</span>
              <div>
                <h4 style="font-size:13px;font-weight:800;margin:0;">Eko Hotels & Suites</h4>
                <p id="chat-status" style="font-size:11px;color:#777;margin:0;">Pool Lounge Safehouse</p>
              </div>
            </div>
            <span style="font-size:11px;background:#f0f0f0;padding:4px 10px;border-radius:10px;font-weight:600;">HP: <strong id="hud-hp" style="color:#27ae60;">100</strong></span>
          </div>
          <div style="display:flex;gap:8px;">
            <input id="chat-in" type="text" placeholder="Say something to players here..." style="flex:1;padding:8px 12px;border-radius:12px;border:1px solid #ddd;font-size:12px;outline:none;">
            <button id="btn-send" style="width:36px;height:36px;background:#27ae60;color:#fff;border:none;border-radius:50%;font-size:14px;">✈️</button>
          </div>
        </div>
      </div>

      <div id="joy-zone" style="position:fixed;bottom:125px;left:20px;width:90px;height:90px;background:rgba(255,255,255,0.25);border:2px solid rgba(255,255,255,0.6);border-radius:50%;z-index:10;touch-action:none;">
        <div id="joy-stick" style="width:36px;height:36px;background:#27ae60;border-radius:50%;position:absolute;top:25px;left:25px;pointer-events:none;"></div>
      </div>

      <div style="position:fixed;bottom:125px;right:20px;display:flex;gap:10px;align-items:center;z-index:10;">
        <button id="btn-sprint" style="width:46px;height:46px;background:#34495e;color:#fff;border:2px solid #7f8c8d;border-radius:50%;font-size:18px;">🏃</button>
        <button id="btn-swap" style="padding:10px 12px;background:#2c3e50;color:#fff;border:1px solid #7f8c8d;border-radius:12px;font-weight:bold;font-size:11px;">SWAP</button>
        <button id="btn-atk" style="width:68px;height:68px;background:#e74c3c;color:#fff;border:3px solid #c0392b;border-radius:50%;font-weight:bold;font-size:20px;display:flex;flex-direction:column;align-items:center;justify-content:center;">
          <span id="btn-icon">🔫</span>
          <span id="btn-label" style="font-size:8px;">FIRE</span>
        </button>
      </div>
    `);

    // Three.js Scene Setup
    const viewport = document.getElementById("game-viewport");
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x6b8e4e);

    const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(16, 18, 16);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    viewport.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.85));
    const sun = new THREE.DirectionalLight(0xffffff, 0.65);
    sun.position.set(15, 30, 15);
    scene.add(sun);

    // Environment
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.MeshLambertMaterial({ color: 0x6b8e4e }));
    grass.rotation.x = -Math.PI / 2;
    scene.add(grass);

    const road = new THREE.Mesh(new THREE.PlaneGeometry(100, 10), new THREE.MeshLambertMaterial({ color: 0x333333 }));
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0.01, -22);
    scene.add(road);

    const floor = new THREE.Mesh(new THREE.BoxGeometry(22, 0.3, 18), new THREE.MeshLambertMaterial({ color: 0xded5c5 }));
    floor.position.set(0, 0.15, 0);
    scene.add(floor);

    const pool = new THREE.Mesh(new THREE.BoxGeometry(7, 0.2, 4.5), new THREE.MeshLambertMaterial({ color: 0x2980b9 }));
    pool.position.set(5, 0.26, -3);
    scene.add(pool);

    // Avatar Builder
    function makeHuman(g, color) {
      const grp = new THREE.Group();
      const skin = new THREE.MeshLambertMaterial({ color: 0x8d5524 });

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 12), skin);
      head.position.y = 1.6;
      grp.add(head);

      const hair = new THREE.Mesh(new THREE.BoxGeometry(0.6, g === "female" ? 0.4 : 0.2, 0.6), new THREE.MeshLambertMaterial({ color: 0x111111 }));
      hair.position.y = g === "female" ? 1.75 : 1.85;
      grp.add(hair);

      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.35), new THREE.MeshLambertMaterial({ color: color }));
      torso.position.y = 1.0;
      grp.add(torso);

      const armG = new THREE.BoxGeometry(0.18, 0.65, 0.18);
      armG.translate(0, -0.25, 0);
      const armL = new THREE.Mesh(armG, skin); armL.position.set(-0.38, 1.3, 0); grp.add(armL);
      const armR = new THREE.Mesh(armG, skin); armR.position.set(0.38, 1.3, 0); grp.add(armR);

      const legG = new THREE.BoxGeometry(0.2, 0.7, 0.2);
      legG.translate(0, -0.3, 0);
      const legM = new THREE.MeshLambertMaterial({ color: 0x2c3e50 });
      const legL = new THREE.Mesh(legG, legM); legL.position.set(-0.16, 0.65, 0); grp.add(legL);
      const legR = new THREE.Mesh(legG, legM); legR.position.set(0.16, 0.65, 0); grp.add(legR);

      grp.userData = { armL, armR, legL, legR, cycle: 0 };
      return grp;
    }

    const player = makeHuman(gender, gender === "male" ? 0xe67e22 : 0x9b59b6);
    player.position.set(0, 0.3, 0);
    scene.add(player);

    const otherPlayers = {};

    // Socket.IO Events
    if (socket) {
      socket.emit("joinWorld", { gender, x: player.position.x, z: player.position.z });

      socket.on("onlineCount", (cnt) => {
        const el = document.getElementById("online-count");
        if (el) el.innerText = cnt;
      });

      socket.on("currentPlayers", (pList) => {
        Object.keys(pList).forEach((id) => {
          if (id !== socket.id && !otherPlayers[id]) {
            const pData = pList[id];
            const pMesh = makeHuman(pData.gender, pData.gender === "male" ? 0x2980b9 : 0xe74c3c);
            pMesh.position.set(pData.x, 0.3, pData.z);
            scene.add(pMesh);
            otherPlayers[id] = pMesh;
          }
        });
      });

      socket.on("newPlayer", (pData) => {
        if (!otherPlayers[pData.id]) {
          const pMesh = makeHuman(pData.gender, pData.gender === "male" ? 0x2980b9 : 0xe74c3c);
          pMesh.position.set(pData.x, 0.3, pData.z);
          scene.add(pMesh);
          otherPlayers[pData.id] = pMesh;
        }
      });

      socket.on("playerMoved", (pData) => {
        if (otherPlayers[pData.id]) {
          otherPlayers[pData.id].position.x = pData.x;
          otherPlayers[pData.id].position.z = pData.z;
          otherPlayers[pData.id].rotation.y = pData.rotation;
          animLimbs(otherPlayers[pData.id], true, 1.0);
        }
      });

      socket.on("playerDisconnected", (id) => {
        if (otherPlayers[id]) {
          scene.remove(otherPlayers[id]);
          delete otherPlayers[id];
        }
      });

      socket.on("chatMessage", (data) => {
        const status = document.getElementById("chat-status");
        if (status) {
          status.innerText = `💬 Chat: "${data.text}"`;
          status.style.color = "#27ae60";
          setTimeout(() => {
            status.innerText = "Pool Lounge Safehouse";
            status.style.color = "#777";
          }, 4000);
        }
      });
    }

    const zombies = [];
    for (let i = 0; i < 5; i++) {
      const z = makeHuman("male", 0x27ae60);
      z.position.set((Math.random() - 0.5) * 40, 0.3, -16 - Math.random() * 12);
      scene.add(z);
      zombies.push({ mesh: z, hp: 100 });
    }

    const laserMat = new THREE.LineDashedMaterial({ color: 0xe74c3c, dashSize: 0.4, gapSize: 0.2 });
    const laser = new THREE.Line(new THREE.BufferGeometry(), laserMat);
    scene.add(laser);

    const bullets = [];

    // Controls
    const joyZone = document.getElementById("joy-zone");
    const stick = document.getElementById("joy-stick");
    let joyActive = false;
    let vec = { x: 0, y: 0 };

    function handleTouch(e) {
      if (!joyActive) return;
      const rect = joyZone.getBoundingClientRect();
      const touch = e.touches[0];
      let dx = touch.clientX - (rect.left + rect.width / 2);
      let dy = touch.clientY - (rect.top + rect.height / 2);
      const dist = Math.hypot(dx, dy);
      if (dist > 30) { dx = (dx / dist) * 30; dy = (dy / dist) * 30; }
      stick.style.transform = `translate(${dx}px, ${dy}px)`;
      vec = { x: dx / 30, y: dy / 30 };
    }

    joyZone.ontouchstart = (e) => { joyActive = true; handleTouch(e); };
    joyZone.ontouchmove = handleTouch;
    joyZone.ontouchend = () => { joyActive = false; stick.style.transform = "translate(0,0)"; vec = { x: 0, y: 0 }; };

    document.getElementById("btn-send").onclick = () => {
      const input = document.getElementById("chat-in");
      if (input && input.value.trim() && socket) {
        socket.emit("sendChat", input.value.trim());
        input.value = "";
      }
    };

    document.getElementById("btn-sprint").onclick = () => {
      state.sprint = !state.sprint;
      document.getElementById("btn-sprint").style.background = state.sprint ? "#27ae60" : "#34495e";
    };

    document.getElementById("btn-swap").onclick = () => {
      state.wepIdx = (state.wepIdx + 1) % weapons.length;
      const w = weapons[state.wepIdx];
      document.getElementById("btn-icon").innerText = w.icon;
      document.getElementById("btn-label").innerText = w.label;
      laser.visible = w.type === "ranged";
    };

    document.getElementById("btn-atk").onclick = () => {
      const w = weapons[state.wepIdx];
      if (w.type === "ranged") {
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), new THREE.MeshBasicMaterial({ color: 0xf1c40f }));
        b.position.set(player.position.x, 1.2, player.position.z);
        const dir = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), player.rotation.y);
        bullets.push({ mesh: b, dir, dist: 0 });
        scene.add(b);
      } else {
        zombies.forEach((z) => {
          if (player.position.distanceTo(z.mesh.position) < 3.2) z.hp -= w.damage;
        });
      }
    };

    function animLimbs(avatar, moving, spd) {
      const { armL, armR, legL, legR } = avatar.userData;
      if (!armL) return;
      if (moving) {
        avatar.userData.cycle += 0.22 * spd;
        const c = avatar.userData.cycle;
        legL.rotation.x = Math.sin(c) * 0.7; legR.rotation.x = -Math.sin(c) * 0.7;
        armL.rotation.x = -Math.sin(c) * 0.7; armR.rotation.x = Math.sin(c) * 0.7;
      } else {
        legL.rotation.x = 0; legR.rotation.x = 0; armL.rotation.x = 0; armR.rotation.x = 0;
      }
    }

    window.onresize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    function animate() {
      requestAnimationFrame(animate);
      const isMoving = vec.x !== 0 || vec.y !== 0;
      const spd = state.sprint ? 0.22 : 0.12;

      if (isMoving) {
        const isoX = (vec.x - vec.y) * spd;
        const isoZ = (vec.x + vec.y) * spd;
        player.position.x += isoX;
        player.position.z += isoZ;
        player.rotation.y = Math.atan2(isoX, isoZ);

        camera.position.x = player.position.x + 16;
        camera.position.z = player.position.z + 16;
        camera.lookAt(player.position.x, player.position.y, player.position.z);

        if (socket) {
          socket.emit("playerMove", { x: player.position.x, z: player.position.z, rotation: player.rotation.y });
        }
      }

      animLimbs(player, isMoving, state.sprint ? 1.8 : 1.0);

      if (laser.visible) {
        const dir = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), player.rotation.y);
        const start = new THREE.Vector3(player.position.x, 1.2, player.position.z);
        const end = start.clone().add(dir.multiplyScalar(15));
        laser.geometry.setFromPoints([start, end]);
        laser.computeLineDistances();
      }

      bullets.forEach((b, idx) => {
        b.mesh.position.addScaledVector(b.dir, 0.8);
        b.dist += 0.8;
        zombies.forEach((z) => {
          if (b.mesh.position.distanceTo(z.mesh.position) < 1.2) {
            z.hp -= 35; scene.remove(b.mesh); bullets.splice(idx, 1);
          }
        });
        if (b.dist > 25) { scene.remove(b.mesh); bullets.splice(idx, 1); }
      });

      zombies.forEach((z) => {
        if (z.hp <= 0) {
          state.cash += 500;
          const cashEl = document.getElementById("hud-cash");
          if (cashEl) cashEl.innerText = state.cash.toLocaleString();
          z.mesh.position.set((Math.random() - 0.5) * 40, 0.3, -20 - Math.random() * 10);
          z.hp = 100;
        } else {
          z.mesh.position.z += 0.02;
          animLimbs(z.mesh, true, 0.6);
          if (z.mesh.position.z > -2) z.mesh.position.z = -25;
        }
      });

      renderer.render(scene, camera);
    }

    animate();
  }
});
  
