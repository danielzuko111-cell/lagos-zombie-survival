// Lagos Zombie Survival 3D Engine
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
        if (typeof THREE === "undefined") {
            alert("3D Library failed to load. Please check your internet connection and refresh.");
            return;
        }

        const viewport = document.getElementById("game-viewport");

        // 1. UI Overlay
        const hudHTML = `
            <div style="position: fixed; top: 12px; left: 50%; transform: translateX(-50%); width: 92%; max-width: 440px; display: flex; flex-direction: column; gap: 8px; z-index: 10; pointer-events: none;">
                <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.95); padding: 8px 16px; border-radius: 30px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); pointer-events: auto;">
                    <div style="display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 13px; color: #333;">
                        <span>☀️ 10:08 AM</span>
                        <span style="color: #aaa;">|</span>
                        <span>🔊</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 6px; background: #27ae60; color: white; padding: 6px 14px; border-radius: 20px; font-weight: 800; font-size: 14px;">
                        <span>₦</span><span>2,189,100</span>
                    </div>
                </div>
            </div>

            <div id="joystick-zone" style="position: fixed; bottom: 40px; left: 30px; width: 90px; height: 90px; background: rgba(255,255,255,0.3); border: 2px solid rgba(255,255,255,0.7); border-radius: 50%; z-index: 10; touch-action: none;">
                <div id="stick" style="width: 36px; height: 36px; background: #27ae60; border-radius: 50%; position: absolute; top: 25px; left: 25px; pointer-events: none;"></div>
            </div>
        `;
        document.body.insertAdjacentHTML("beforeend", hudHTML);

        // 2. Scene & Mobile Camera Setup
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x7b9e61);

        const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(12, 16, 12);
        camera.lookAt(0, 0, 0);

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(window.innerWidth, window.innerHeight);
        viewport.appendChild(renderer.domElement);

        // 3. Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
        dirLight.position.set(10, 20, 10);
        scene.add(dirLight);

        // 4. Ground & Safehouse Platform
        const grassGeo = new THREE.PlaneGeometry(60, 60);
        const grassMat = new THREE.MeshBasicMaterial({ color: 0x7b9e61 });
        const grass = new THREE.Mesh(grassGeo, grassMat);
        grass.rotation.x = -Math.PI / 2;
        scene.add(grass);

        const floorGeo = new THREE.BoxGeometry(14, 0.2, 12);
        const floorMat = new THREE.MeshLambertMaterial({ color: 0xe0d6c3 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.position.set(0, 0.1, 0);
        scene.add(floor);

        // 5. Create 3D Avatar
        function createAvatar(gender, color) {
            const group = new THREE.Group();

            // Head
            const headGeo = new THREE.SphereGeometry(0.35, 12, 12);
            const headMat = new THREE.MeshLambertMaterial({ color: 0x8d5524 });
            const head = new THREE.Mesh(headGeo, headMat);
            head.position.y = 1.5;
            group.add(head);

            // Body
            const bodyGeo = new THREE.BoxGeometry(0.6, 0.8, 0.4);
            const bodyMat = new THREE.MeshLambertMaterial({ color: color });
            const body = new THREE.Mesh(bodyGeo, bodyMat);
            body.position.y = 0.9;
            group.add(body);

            // Legs
            const legGeo = new THREE.BoxGeometry(0.2, 0.5, 0.2);
            const legMat = new THREE.MeshLambertMaterial({ color: 0x2c3e50 });
            const leg1 = new THREE.Mesh(legGeo, legMat);
            leg1.position.set(-0.15, 0.25, 0);
            const leg2 = new THREE.Mesh(legGeo, legMat);
            leg2.position.set(0.15, 0.25, 0);
            group.add(leg1);
            group.add(leg2);

            return group;
        }

        const playerColor = selectedGender === "male" ? 0xe67e22 : 0x9b59b6;
        const player3D = createAvatar(selectedGender, playerColor);
        player3D.position.set(0, 0.2, 0);
        scene.add(player3D);

        // 6. Mobile Joystick Controls
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
            const maxDist = 30;

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

        // Window Resize
        window.addEventListener("resize", () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });

        // 7. Render Loop
        function animate() {
            requestAnimationFrame(animate);

            if (joyVector.x !== 0 || joyVector.y !== 0) {
                const speed = 0.1;
                const isoX = (joyVector.x - joyVector.y) * speed;
                const isoZ = (joyVector.x + joyVector.y) * speed;

                player3D.position.x += isoX;
                player3D.position.z += isoZ;

                player3D.rotation.y = Math.atan2(isoX, isoZ);

                camera.position.x = player3D.position.x + 12;
                camera.position.z = player3D.position.z + 12;
                camera.lookAt(player3D.position.x, player3D.position.y, player3D.position.z);
            }

            renderer.render(scene, camera);
        }

        animate();
    }
});
          
