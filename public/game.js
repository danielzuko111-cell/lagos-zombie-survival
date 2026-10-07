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
      alert("Three.js loading... Please refresh.");
      return;
    }

    const socket = typeof io !== "undefined" ? io() : null;
    const state = { cash: 10000, hp: 100, ammo: 60, wepIdx: 0, sprint: false, lastHitTime: 0 };
    const weapons = [
      { name: "Pistol", icon: "🔫", label: "FIRE", type: "ranged", damage: 35 },
      { name: "Cutlass", icon: "🗡️", label: "SWING", type: "melee", damage: 60 }
    ];

    // 1. HUD & Controls
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
          <button id="btn-open-chat" style="width:100%;padding:10px;border-radius:12px;border:1px solid #27ae60;background:#eafaf1;color:#27ae60;font-weight:700;font-size:13px;cursor:pointer;">💬 Tap to Chat with Players</button>
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

    // 2. Three.js Scene Setup
    const viewport = document.getElementById("game-viewport");
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x587943);

    const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(16, 18, 16);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    viewport.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.85));
    const sun = new THREE.DirectionalLight(0xffffff, 0.7);
    sun.position.set(15, 30, 15);
    scene.add(sun);

    // Ground Grass
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.MeshLambertMaterial({ color: 0x587943 }));
    grass.rotation.x = -Math.PI / 2;
    scene.add(grass);

    // 3. 3D Eko Hotel Building & Entrance
    const bldgGroup = new THREE.Group();
    const bldgMat = new THREE.MeshLambertMaterial({ color: 0xe8e8e8 });
    const bldgMain = new THREE.Mesh(new THREE.BoxGeometry(18, 12, 10), bldgMat);
    bldgMain.position.set(-10, 6, -14);
    bldgGroup.add(bldgMain);

    // Tinted Glass Windows
    const glassMat = new THREE.MeshLambertMaterial({ color: 0x2c3e50 });
    for (let floorY = 3; floorY <= 9; floorY += 3) {
      for (let winX = -16; winX <= -4; winX += 4) {
        const win = new THREE.Mesh(new THREE.BoxGeometry(2, 1.8, 0.2), glassMat);
        win.position.set(winX, floorY, -8.9);
        bldgGroup.add(win);
      }
    }

    // Entrance Canopy
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(8, 0.3, 5), new THREE.MeshLambertMaterial({ color: 0x27ae60 }));
    canopy.position.set(-10, 3.2, -6.5);
    bldgGroup.add(canopy);

    scene.add(bldgGroup);

    // 4. 2-Lane Asphalt Road & Sidewalks
    const roadGroup = new THREE.Group();
    const road = new THREE.Mesh(new THREE.PlaneGeometry(120, 12), new THREE.MeshLambertMaterial({ color: 0x333333 }));
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0.01, 18);
    roadGroup.add(road);

    // Sidewalks
    const sidewalkMat = new THREE.MeshLambertMaterial({ color: 0xbdc3c7 });
    const sw1 = new THREE.Mesh(new THREE.BoxGeometry(120, 0.2, 2.5), sidewalkMat);
    sw1.position.set(0, 0.1, 11);
    roadGroup.add(sw1);

    // Broken Yellow Center Line Markings
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xf1c40f });
    for (let lx = -55; lx <= 55; lx += 8) {
      const line = new THREE.Mesh(new THREE.PlaneGeometry(4, 0.4), lineMat);
      line.rotation.x = -Math.PI / 2;
      line.position.set(lx, 0.02, 18);
      roadGroup.add(line);
    }
    scene.add(roadGroup);

    // Palm Trees
    function createPalmTree(x, z) {
      const grp = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.35, 4, 8), new THREE.MeshLambertMaterial({ color: 0x7f5539 }));
      trunk.position.y = 2;
      grp.add(trunk);

      const leaves = new THREE.Mesh(new THREE.SphereGeometry(1.5, 8, 8), new THREE.MeshLambertMaterial({ color: 0x2d6a4f }));
      leaves.scale.set(1.5, 0.5, 1.5);
      leaves.position.y = 4.2;
      grp.add(leaves);

      grp.position.set(x, 0, z);
      scene.add(grp);
    }
    createPalmTree(-12, 8);
    createPalmTree(12, 8);

    // Eko Safehouse Lounge Platform & Pool
    const floor = new THREE.Mesh(new THREE.BoxGeometry(22, 0.3, 16), new THREE.MeshLambertMaterial({ color: 0xded5c5 }));
    floor.position.set(0, 0.15, 0);
    scene.add(floor);

    const pool = new THREE.Mesh(new THREE.BoxGeometry(7, 0.2, 4.5), new THREE.MeshLambertMaterial({ color: 0x2980b9 }));
    pool.position.set(5, 0.26, -2);
    scene.add(pool);

    // 5. Avatar Builder
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

    // 6. Active Aggressive Zombies
    const zombies = [];
    for (let i = 0; i < 6; i++) {
      const zMesh = makeHuman("male", 0x27ae60);
      zMesh.position.set((Math.random() - 0.5) * 50, 0.3, 14 + Math.random() * 12);
      scene.add(zMesh);
      zombies.push({ mesh: zMesh, hp: 100, speed: 0.06 + Math.random() * 0.02 });
    }

    const laserMat = new THREE.LineDashedMaterial({ color: 0xe74c3c, dashSize: 0.4, gapSize: 0.2 });
    const laser = new THREE.Line(new THREE.BufferGeometry(), laserMat);
    scene.add(laser);

    const bullets = [];

    // 7. Controls & Screen-Aligned Joystick Math
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

    // Chat Pop-up Modal Handlers
    const chatModal = document.getElementById("chat-modal");
    document.getElementById("btn-open-chat").onclick = () => {
      if (chatModal) chatModal.style.display = "flex";
    };
    document.getElementById("btn-close-chat").onclick = () => {
      if (chatModal) chatModal.style.display = "none";
    };
    document.getElementById("btn-send-chat-modal").onclick = () => {
      const input = document.getElementById("chat-input-field");
      if (input && input.value.trim() && socket) {
        socket.emit("sendChat", input.value.trim());
        input.value = "";
      }
      if (chatModal) chatModal.style.display = "none";
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

    function triggerDamageFlash() {
      const flash = document.getElementById("damage-flash");
      if (flash) {
        flash.style.opacity = "1";
        setTimeout(() => { flash.style.opacity = "0"; }, 150);
      }
    }

    function isPlayerInSafehouse() {
      return (player.position.x > -11 && player.position.x < 11 && player.position.z > -8 && player.position.z < 8);
    }

    window.onresize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    // 8. Main Render & Physics Loop
    function animate() {
      requestAnimationFrame(animate);
      const isMoving = vec.x !== 0 || vec.y !== 0;
      const spd = state.sprint ? 0.24 : 0.13;

      if (isMoving) {
        // Screen-Aligned 45-degree Isometric Movement Conversion
        const cos45 = 0.7071;
        const sin45 = 0.7071;
        const moveX = (vec.x * cos45 - vec.y * sin45) * spd;
        const moveZ = (vec.x * sin45 + vec.y * cos45) * spd;

        player.position.x += moveX;
        player.position.z += moveZ;
        player.rotation.y = Math.atan2(moveX, moveZ);

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

      // Zombie AI (Chasing, Lunging, Damage, Safehouse Logic)
      const inSafe = isPlayerInSafehouse();
      const now = Date.now();

      zombies.forEach((z) => {
        if (z.hp <= 0) {
          state.cash += 500;
          const cashEl = document.getElementById("hud-cash");
          if (cashEl) cashEl.innerText = state.cash.toLocaleString();
          z.mesh.position.set((Math.random() - 0.5) * 50, 0.3, 14 + Math.random() * 12);
          z.hp = 100;
        } else {
          const distToPlayer = z.mesh.position.distanceTo(player.position);

          if (!inSafe && distToPlayer < 22) {
            // Agro & Chase Player
            const angle = Math.atan2(player.position.x - z.mesh.position.x, player.position.z - z.mesh.position.z);
            z.mesh.rotation.y = angle;
            z.mesh.position.x += Math.sin(angle) * z.speed;
            z.mesh.position.z += Math.cos(angle) * z.speed;
            animLimbs(z.mesh, true, 1.2);

            // Melee Attack Lunge
            if (distToPlayer < 1.5 && now - state.lastHitTime > 1000) {
              state.lastHitTime = now;
              state.hp -= 15;
              triggerDamageFlash();

              const hpEl = document.getElementById("hud-hp");
              if (hpEl) hpEl.innerText = Math.max(0, state.hp);

              // Player Death & Respawn
              if (state.hp <= 0) {
                alert("🧟 You were taken down by zombies! Respawning in Safehouse...");
                state.hp = 100;
      
