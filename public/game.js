// Lagos Zombie Survival 3D - Animated Engine & UI
document.addEventListener("DOMContentLoaded", () => {
    let selectedGender = "male";

    const btnMale = document.getElementById("btn-male");
    const btnFemale = document.getElementById("btn-female");
    const btnStart = document.getElementById("btn-start-game");
    const selectScreen = document.getElementById("char-select-screen");

    btnMale.addEventListener("click", (e) => {
        e.preventDefault();
        selectedGender = "male";
        btnMale.classList.add("active");
        btnFemale.classList.remove("active");
    });

    btnFemale.addEventListener("click", (e) => {
        e.preventDefault();
        selectedGender = "female";
        btnFemale.classList.add("active");
        btnMale.classList.remove("active");
    });

    btnStart.addEventListener("click", (e) => {
        e.preventDefault();
        selectScreen.style.display = "none";
        init3DWorld();
    });

    function init3DWorld() {
        const viewport = document.getElementById("game-viewport");

        // Game State
        const gameState = {
            cash: 2189100,
            hp: 100,
            ammo: 60,
            weaponIndex: 0,
            isSprinting: false,
            weapons: [
                { name: "Pistol", icon: "🔫", actionText: "FIRE", type: "ranged", damage: 35 },
                { name: "Cutlass", icon: "🗡️", actionText: "SWING", type: "melee", damage: 60 }
            ]
        };

        // 1. UI Overlay Injection (Top Bar, Bottom Social Card, Action Buttons)
        const hudHTML = `
            <!-- Top Status Bar -->
            <div style="position: fixed; top: 12px; left: 50%; transform: translateX(-50%); width: 92%; max-width: 440px; display: flex; flex-direction: column; gap: 6px; z-index: 10; pointer-events: none;">
                <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.95); backdrop-filter: blur(8px); padding: 8px 16px; border-radius: 30px; box-shadow: 0 4px 15px rgba(0,0,0,0.18); pointer-events: auto;">
                    <div style="display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 13px; color: #333;">
                        <span>☀️ 10:08 AM</span>
                        <span style="color: #ccc;">|</span>
                        <span>🔊</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 6px; background: #27ae60; color: white; padding: 6px 14px; border-radius: 20px; font-weight: 800; font-size: 14px;">
                        <span>₦</span><span id="hud-cash">${gameState.cash.toLocaleString()}</span>
                        <span style="background: rgba(255,255,255,0.3); width: 18px; height: 18px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-left: 2px; font-size: 12px;">+</span>
                    </div>
                </div>

                <div style="display: flex; gap: 8px; justify-content: center;">
                    <span style="background: rgba(255,255,255,0.88); padding: 4px 12px; border-radius: 14px; font-size: 11px; font-weight: 600; color: #555;">👀 18.9m visits</span>
                    <span style="background: rgba(255,255,255,0.88); padding: 4px 12px; border-radius: 14px; font-size: 11px; font-weight: 700; color: #27ae60;">● 85k online</span>
                </div>
            </div>

            <!-- Bottom Location & Social Card -->
            <div style="position: fixed; bottom: 16px; left: 50%; transform: translateX(-50%); width: 92%; max-width: 440px; z-index: 10; display: flex; flex-direction: column; gap: 10px; pointer-events: auto;">
                <div style="background: #ffffff; padding: 12px 16px; border-radius: 20px; box-shadow: 0 8px 24px rgba(0,0,0,0.2);">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="width: 36px; height: 36px; background: #eafaf1; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px;">
                                ${selectedGender === "male" ? "👨" : "👩"}
                            </div>
                            <div>
                                <h4 style="font-size: 13px; font-weight: 800; color: #111;">Eko Hotels & Suites</h4>
                                <p style="font-size: 11px; color: #777;">The Lounge • Pool Sanctuary</p>
                            </div>
                        </div>
                        <span style="font-size: 11px; background: #f0f0f0; padding: 4px 10px; border-radius: 10px; font-weight: 600;">HP: <strong id="hud-hp" style="color:#27ae60;">100</strong></span>
                    </div>

                    <div style="display: flex; gap: 8px; align-items: center;">
                        <input id="chat-input" type="text" placeholder="Say something to players here..." style="flex: 1; padding: 10px 14px; border-radius: 14px; border: 1px solid #eaeaea; background: #f8f9fa; font-size: 12px; outline: none;">
                        <button id="btn-send-chat" style="width: 38px; height: 38px; background: #27ae60; color: white; border: none; border-radius: 50%; font-size: 14px; cursor: pointer;">✈️</button>
                    </div>
                </div>
            </div>

            <!-- Mobile Joystick Controls (Bottom-Left) -->
            <div id="joystick-zone" style="position: fixed; bottom: 125px; left: 20px; width: 95px; height: 95px; background: rgba(255,255,255,0.25); backdrop-filter: blur(4px); border: 2px solid rgba(255,255,255,0.6); border-radius: 50%; z-index: 10; touch-action: none;">
                <div id="stick" style="width: 38px; height: 38px; background: #27ae60; border-radius: 50%; position: absolute; top: 27px; left: 27px; box-shadow: 0 4px 10px rgba(0,0,0,0.3); pointer-events: none;"></div>
            </div>

            <!-- Action Buttons (Bottom-Right) -->
            <div style="position: fixed; bottom: 125px; right: 20px; display: flex; gap: 10px; align-items: center; z-index: 10; pointer-events: auto;">
                <button id="btn-sprint" style="width: 48px; height: 48px; background: #34495e; color: white; border: 2px solid #7f8c8d; border-radius: 50%; font-size: 18px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center;">🏃</button>
                <button id="btn-switch" style="padding: 10px 12px; background: #2c3e50; color: white; border: 1px solid #7f8c8d; border-radius: 12px; font-weight: bold; font-size: 11px; cursor: pointer;">SWAP</button>
                <button id="btn-attack" style="width: 68px; height: 68px; background: #e74c3c; color: white; border: 3px solid #c0392b; border-radius: 50%; font-weight: bold; font-size: 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 0 14px rgba(231,76,60,0.6); cursor: pointer;">
                    <span id="btn-icon">🔫</span>
                    <span id="btn-label" style="font-size: 8px; margin-top: 1px;">FIRE</span>
                </button>
            </div>
        `;
        document.body.insertAdjacentHTML("beforeend", hudHTML);

        // 2. Three.js Scene Setup
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x6b8e4e);

        const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(16, 18, 16);
        camera.lookAt(0, 0, 0);

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(window.innerWidth, window.innerHeight);
        viewport.appendChild(renderer.domElement);

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
        scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.65);
        dirLight.position.set(15, 30, 15);
        scene.add(dirLight);

        // 3. Build Eko Safehouse Environment (Platform, Swimming Pool, Bar, Grass, Road)
        // Outer Grass
        const grassGeo = new THREE.PlaneGeometry(100, 100);
        const grassMat = new THREE.MeshLambertMaterial({ color: 0x6b8e4e });
        const grass = new THREE.Mesh(grassGeo, grassMat);
        grass.rotation.x = -Math.PI / 2;
        scene.add(grass);

        // Lagos Road Outside
        const roadGeo = new THREE.PlaneGeometry(100, 10);
        const roadMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
        const road = new THREE.Mesh(roadGeo, roadMat);
        road.rotation.x = -Math.PI / 2;
        road.position.set(0, 0.01, -22);
        scene.add(road);

        // Eko Hotel Lounge Platform
        const floorGeo = new THREE.BoxGeometry(22, 0.3, 18);
        const floorMat = new THREE.MeshLambertMaterial({ color: 0xded5c5 }); // Tiled floor
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.position.set(0, 0.15, 0);
        scene.add(floor);

        // Swimming Pool
        const poolGeo = new THREE.BoxGeometry(7, 0.2, 4.5);
        const poolMat = new THREE.MeshLambertMaterial({ color: 0x2980b9 });
        const pool = new THREE.Mesh(poolGeo, poolMat);
        pool.position.set(5, 0.26, -3);
        scene.add(pool);

        const waterGeo = new THREE.PlaneGeometry(6.6, 4.1);
        const waterMat = new THREE.MeshBasicMaterial({ color: 0x3498db, transparent: true, opacity: 0.8 });
        const water = new THREE.Mesh(waterGeo, waterMat);
        water.rotation.x = -Math.PI / 2;
        water.position.set(5, 0.38, -3);
        scene.add(water);

        // Lounge Chairs
        function createDeckChair(x, z) {
            const chairGroup = new THREE.Group();
            const mat = new THREE.MeshLambertMaterial({ color: 0xffffff });
            const seat = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 2.2), mat);
            seat.position.y = 0.3;
            chairGroup.add(seat);

            const back = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 0.1), mat);
            back.position.set(0, 0.6, -0.9);
            chairGroup.add(back);

            chairGroup.position.set(x, 0, z);
            scene.add(chairGroup);
        }
        createDeckChair(8.5, 1);
        createDeckChair(8.5, -7);

        // 4. Human-like Animated 3D Avatar Creation
        function createAnimatedHuman(gender, outfitColor) {
            const avatarGroup = new THREE.Group();
            const skinMat = new THREE.MeshLambertMaterial({ color: 0x8d5524 });

            // Head
            const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 12), skinMat);
            head.position.y = 1.6;
            avatarGroup.add(head);

            // Hair
            const hairGeo = gender === "female" ? new THREE.BoxGeometry(0.7, 0.4, 0.7) : new THREE.BoxGeometry(0.6, 0.2, 0.6);
            const hairMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
            const hair = new THREE.Mesh(hairGeo, hairMat);
            hair.position.y = gender === "female" ? 1.75 : 1.85;
            avatarGroup.add(hair);

            // Torso
            const torsoMat = new THREE.MeshLambertMaterial({ color: outfitColor });
            const torso = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.35), torsoMat);
            torso.position.y = 1.0;
            avatarGroup.add(torso);

            // Left Arm
            const armGeo = new THREE.BoxGeometry(0.18, 0.65, 0.18);
            armGeo.translate(0, -0.25, 0); // Shoulder pivot
            const armL = new THREE.Mesh(armGeo, skinMat);
            armL.position.set(-0.38, 1.3, 0);
            avatarGroup.add(armL);

            // Right Arm
            const armR = new THREE.Mesh(armGeo, skinMat);
            armR.position.set(0.38, 1.3, 0);
            avatarGroup.add(armR);

            // Left Leg
            const legGeo = new THREE.BoxGeometry(0.2, 0.7, 0.2);
            legGeo.translate(0, -0.3, 0); // Hip pivot
            const legMat = new THREE.MeshLambertMaterial({ color: 0x2c3e50 });
            const legL = new THREE.Mesh(legGeo, legMat);
            legL.position.set(-0.16, 0.65, 0);
            avatarGroup.add(legL);

            // Right Leg
            const legR = new THREE.Mesh(legGeo, legMat);
            legR.position.set(0.16, 0.65, 0);
            avatarGroup.add(legR);

            avatarGroup.userData = { armL, armR, legL, legR, animCycle: 0 };
            return avatarGroup;
        }

        // Main Player Avatar
        const mainPlayerColor = selectedGender === "male" ? 0xe67e22 : 0x9b59b6;
        const player3D = createAnimatedHuman(selectedGender, mainPlayerColor);
        player3D.position.set(0, 0.3, 0);
        scene.add(player3D);

        // NPC Players relaxing in Lounge
        const npc1 = createAnimatedHuman("female", 0xe74c3c);
        npc1.position.set(-3, 0.3, 2);
        scene.add(npc1);

        const npc2 = createAnimatedHuman("male", 0x2980b9);
        npc2.position.set(2, 0.3, 3);
        scene.add(npc2);

        // 3D Zombies roaming outside
        const zombies3D = [];
        for (let i = 0; i < 6; i++) {
            const z = createAnimatedHuman("male", 0x27ae60);
            z.position.set((Math.random() - 0.5) * 40, 0.3, -16 - Math.random() * 15);
            scene.add(z);
            zombies3D.push({ mesh: z, hp: 100 });
        }

        // Laser Sight Aim Indicator Line
        const laserMat = new THREE.LineDashedMaterial({ color: 0xe74c3c, dashSize: 0.4, gapSize: 0.2 });
        const laserGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]);
        const laserLine = new THREE.Line(laserGeo, laserMat);
        laserLine.computeLineDistances();
        laserLine.visible = true;
        scene.add(laserLine);

        // Bullets container
        const bullets3D = [];

        // 5. Controls Logic
        const joyZone = document.getElementById("joystick-zone");
        const stick = document.getElementById("stick");
        let joyActive = false;
        let joyVector = { x: 0, y: 0 };

        function handleTouch(e) {
            if (!joyActive) return;
            const rect = joyZone.getBoundingClientRect();
            const touch = e.touches[0];
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            let dx = touch.clientX - centerX;
            let dy = touch.clientY - centerY;
            const dist = Math.hypot(dx, dy);
            const maxDist = 32;

            if (dist > maxDist) {
                dx = (dx / dist) * maxDist;
                dy = (dy / dist) * maxDist;
            }

            stick.style.transform = `translate(${dx}px, ${dy}px)`;
            joyVector = { x: dx / maxDist, y: dy / maxDist };
        }

        joyZone.addEventListener("touchstart", (e) => { joyActive = true; handleTouch(e); });
        joyZone.addEventListener("touchmove", handleTouch);
        joyZone.addEventListener("touchend", () => {
            joyActive = false;
            stick.style.transform = "translate(0px, 0px)";
            joyVector = { x: 0, y: 0 };
        });

        // Sprint Toggle
        const btnSprint = document.getElementById("btn-sprint");
        btnSprint.addEventListener("click", () => {
            gameState.isSprinting = !gameState.isSprinting;
            btnSprint.style.background = gameState.isSprinting ? "#27ae60" : "#34495e";
        });

        // Swap Weapon
        document.getElementById("btn-switch").addEventListener("click", () => {
            gameState.weaponIndex = (gameState.weaponIndex + 1) % gameState.weapons.length;
            const curWep = gameState.weapons[gameState.weaponIndex];
            document.getElementById("btn-icon").innerText = curWep.icon;
            document.getElementById("btn-label").innerText = curWep.actionText;
            laserLine.visible = curWep.type === "ranged";
        });

        // Attack Button
        document.getElementById("btn-attack").addEventListener("click", performAttack);

        function performAttack() {
            const curWep = gameState.weapons[gameState.weaponIndex];
            if (curWep.type === "ranged") {
                if (gameState.ammo <= 0) return;
                gameState.ammo--;

                // Spawn 3D Bullet
                const bulletGeo = new THREE.SphereGeometry(0.15, 8, 8);
                const bulletMat = new THREE.MeshBasicMaterial({ color: 0xf1c40f });
                const bullet = new THREE.Mesh(bulletGeo, bulletMat);
                bullet.position.set(player3D.position.x, 1.2, player3D.position.z);

                const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), player3D.rotation.y);
                bullets3D.push({ mesh: bullet, dir: forward, dist: 0 });
                scene.add(bullet);
            } else {
                // Melee Cutlass Swing
                zombies3D.forEach((zObj) => {
                    const d = player3D.position.distanceTo(zObj.mesh.position);
                    if (d < 3.2) {
                        zObj.hp -= curWep.damage;
                    }
                });
            }
        }

        // Animate Human Limbs Walking
        function animateHumanLimbs(avatar, isMoving, speedMult) {
            const { armL, armR, legL, legR } = avatar.userData;
            if (!armL) return;

            if (isMoving) {
                avatar.userData.animCycle += 0.22 * speedMult;
                const cycle = avatar.userData.animCycle;

                legL.rotation.x = Math.sin(cycle) * 0.7;
                legR.rotation.x = -Math.sin(cycle) * 0.7;
                armL.rotation.x = -Math.sin(cycle) * 0.7;
                armR.rotation.x = Math.sin(cycle) * 0.7;
            } else {
                legL.rotation.x = 0;
                legR.rotation.x = 0;
                armL.rotation.x = 0;
                armR.rotation.x = 0;
            }
        }

        // Window Resize
        window.addEventListener("resize", () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });

        // 6. Main Render & Physics Loop
        function animate() {
            requestAnimationFrame(animate);

            const isMoving = joyVector.x !== 0 || joyVector.y !== 0;
            const moveSpeed = gameState.isSprinting ? 0.22 : 0.12;

            if (isMoving) {
                const isoX = (joyVector.x - joyVector.y) * moveSpeed;
                const isoZ = (joyVector.x + joyVector.y) * moveSpeed;

                player3D.position.x += isoX;
                player3D.position.z += isoZ;

                const angle = Math.atan2(isoX, isoZ);
                player3D.rotation.y = angle;

                camera.position.x = player3D.position.x + 16;
                camera.position.z = player3D.position.z + 16;
                camera.lookAt(player3D.position.x, player3D.position.y, player3D.position.z);
            }

            // Animate Player Limbs
            animateHumanLimbs(player3D, isMoving, gameState.isSprinting ? 1.8 : 1.0);

            // Update Laser Sight Aim Indicator
            if (laserLine.visible) {
                const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), player3D.rotation.y);
                const startPt = new THREE.Vector3(player3D.position.x, 1.2, player3D.position.z);
                const endPt = startPt.clone().add(forward.multiplyScalar(15));

                const points = [startPt, endPt];
                laserLine.geometry.setFromPoints(points);
                laserLine.geometry.
