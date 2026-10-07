// Lagos Zombie Survival - Step 2 Engine with Aim Indicator & Dynamic Controls
document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("game-container");
  container.innerHTML = `
    <div style="position: relative; width: 100%; height: 100%; overflow: hidden; background: #111;">
      <canvas id="gameCanvas" style="width: 100%; height: 100%; display: block;"></canvas>
      
      <!-- HUD Overlay -->
      <div id="hud" style="position: absolute; top: 10px; left: 10px; color: #fff; font-family: monospace; font-size: 11px; background: rgba(0,0,0,0.75); padding: 8px 12px; border-radius: 5px; border: 1px solid #444; pointer-events: none; z-index: 10;">
        <div>HP: <span id="hud-hp" style="color:#2ecc71; font-weight:bold;">100</span> | Cash: <span style="color:#f1c40f;">₦<span id="hud-cash">10000</span></span></div>
        <div>Weapon: <span id="hud-weapon" style="color:#e67e22; font-weight:bold;">Pistol</span> | Ammo: <span id="hud-ammo">50</span> | Grenades: <span id="hud-grenades">0</span></div>
        <div>Zone: <span id="hud-zone" style="color:#2ecc71; font-weight:bold;">Ikeja Safehouse (SAFE)</span></div>
      </div>

      <!-- Mobile Controls -->
      <div id="controls" style="position: absolute; bottom: 15px; left: 0; width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 0 20px; box-sizing: border-box; z-index: 10;">
        <!-- Joystick -->
        <div id="joystick-zone" style="width: 110px; height: 110px; background: rgba(255,255,255,0.15); border: 2px solid rgba(255,255,255,0.4); border-radius: 50%; position: relative; touch-action: none;">
          <div id="stick" style="width: 44px; height: 44px; background: rgba(231,76,60,0.85); border-radius: 50%; position: absolute; top: 33px; left: 33px; pointer-events: none;"></div>
        </div>

        <!-- Buttons -->
        <div style="display: flex; gap: 12px; align-items: center;">
          <button id="btn-switch" style="padding: 12px 14px; background: #34495e; color: white; border: 1px solid #7f8c8d; border-radius: 8px; font-weight: bold; font-size: 11px; cursor: pointer;">SWAP<br/>WEAPON</button>
          
          <!-- Dynamic Action Button (Hand/Gun Icon) -->
          <button id="btn-attack" style="width: 75px; height: 75px; background: #e74c3c; color: white; border: 3px solid #c0392b; border-radius: 50%; font-weight: bold; font-size: 22px; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 0 12px rgba(231,76,60,0.6); cursor: pointer; user-select: none;">
            <span id="btn-icon">🔫</span>
            <span id="btn-label" style="font-size: 9px; margin-top: 2px;">FIRE</span>
          </button>
        </div>
      </div>
    </div>
  `;

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  function resizeCanvas() {
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
  }
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  const player = {
    x: canvas.width / 2,
    y: canvas.height - 80,
    radius: 12,
    speed: 3,
    hp: 100,
    cash: 10000,
    weaponIndex: 0, // 0 = Pistol, 1 = Cutlass
    weapons: [
      { name: "Pistol", ammo: 50, type: "ranged", damage: 25, icon: "🔫", actionText: "FIRE" },
      { name: "Cutlass", ammo: "∞", type: "melee", damage: 50, icon: "🗡️", actionText: "SWING" }
    ],
    grenades: 0
  };

  const safehouse = {
    x: canvas.width / 2 - 80,
    y: canvas.height - 130,
    w: 160,
    h: 110
  };

  let zombies = [];
  let bullets = [];
  let drops = [];
  let keys = {};
  let joystickVector = { x: 0, y: 0 };

  window.addEventListener("keydown", (e) => (keys[e.key.toLowerCase()] = true));
  window.addEventListener("keyup", (e) => (keys[e.key.toLowerCase()] = false));

  // Touch Joystick
  const joyZone = document.getElementById("joystick-zone");
  const stick = document.getElementById("stick");
  let joyActive = false;

  function handleTouch(e) {
    if (!joyActive) return;
    const rect = joyZone.getBoundingClientRect();
    const touch = e.touches[0];
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    let dx = touch.clientX - centerX;
    let dy = touch.clientY - centerY;
    const dist = Math.hypot(dx, dy);
    const maxDist = 35;

    if (dist > maxDist) {
      dx = (dx / dist) * maxDist;
      dy = (dy / dist) * maxDist;
    }

    stick.style.transform = `translate(${dx}px, ${dy}px)`;
    joystickVector = { x: dx / maxDist, y: dy / maxDist };
  }

  joyZone.addEventListener("touchstart", (e) => {
    joyActive = true;
    handleTouch(e);
  });
  joyZone.addEventListener("touchmove", handleTouch);
  joyZone.addEventListener("touchend", () => {
    joyActive = false;
    stick.style.transform = "translate(0px, 0px)";
    joystickVector = { x: 0, y: 0 };
  });

  // Weapon Switcher
  document.getElementById("btn-switch").addEventListener("click", () => {
    player.weaponIndex = (player.weaponIndex + 1) % player.weapons.length;
    updateHUD();
  });

  document.getElementById("btn-attack").addEventListener("click", performAttack);

  function performAttack() {
    const curWeapon = player.weapons[player.weaponIndex];
    if (curWeapon.type === "ranged") {
      if (curWeapon.ammo <= 0) return;
      curWeapon.ammo--;
      let targetAngle = -Math.PI / 2;
      let closest = getClosestZombie();
      if (closest) {
        targetAngle = Math.atan2(closest.y - player.y, closest.x - player.x);
      }
      bullets.push({
        x: player.x,
        y: player.y,
        dx: Math.cos(targetAngle) * 9,
        dy: Math.sin(targetAngle) * 9,
        damage: curWeapon.damage
      });
    } else if (curWeapon.type === "melee") {
      zombies.forEach((z) => {
        const dist = Math.hypot(z.x - player.x, z.y - player.y);
        if (dist < 48) {
          z.hp -= curWeapon.damage;
        }
      });
    }
    updateHUD();
  }

  function getClosestZombie() {
    let closest = null;
    let minDist = 300;
    zombies.forEach((z) => {
      const d = Math.hypot(z.x - player.x, z.y - player.y);
      if (d < minDist) {
        minDist = d;
        closest = z;
      }
    });
    return closest;
  }

  function isPlayerInSafehouse() {
    return (
      player.x > safehouse.x &&
      player.x < safehouse.x + safehouse.w &&
      player.y > safehouse.y &&
      player.y < safehouse.y + safehouse.h
    );
  }

  function getCurrentZone() {
    if (isPlayerInSafehouse()) return "Safehouse";
    if (player.y > canvas.height * 0.6) return "Low";
    if (player.y > canvas.height * 0.3) return "Mid";
    return "Danger";
  }

  function spawnZombies() {
    const zone = getCurrentZone();
    let maxZombies = 3;
    let speed = 0.8;

    if (zone === "Mid") {
      maxZombies = 7;
      speed = 1.3;
    } else if (zone === "Danger") {
      maxZombies = 14;
      speed = 1.8;
    }

    if (zombies.length < maxZombies && Math.random() < 0.03) {
      zombies.push({
        x: Math.random() * canvas.width,
        y: Math.random() * (canvas.height * 0.5),
        hp: 100,
        speed: speed,
        radius: 11
      });
    }
  }

  function updateHUD() {
    document.getElementById("hud-hp").innerText = Math.max(0, Math.floor(player.hp));
    document.getElementById("hud-cash").innerText = player.cash;
    const curWep = player.weapons[player.weaponIndex];
    document.getElementById("hud-weapon").innerText = curWep.name;
    document.getElementById("hud-ammo").innerText = curWep.ammo;
    document.getElementById("hud-grenades").innerText = player.grenades;

    // Dynamic Attack Button Icon & Text
    document.getElementById("btn-icon").innerText = curWep.icon;
    document.getElementById("btn-label").innerText = curWep.actionText;

    const zone = getCurrentZone();
    const zoneElem = document.getElementById("hud-zone");
    if (zone === "Safehouse") {
      zoneElem.innerText = "Ikeja Safehouse (SAFE)";
      zoneElem.style.color = "#2ecc71";
    } else if (zone === "Low") {
      zoneElem.innerText = "Residential Outskirts (LOW)";
      zoneElem.style.color = "#2ecc71";
    } else if (zone === "Mid") {
      zoneElem.innerText = "Commercial Market (MID)";
      zoneElem.style.color = "#f1c40f";
    } else {
      zoneElem.innerText = "Highway Junction (DANGER)";
      zoneElem.style.color = "#e74c3c";
    }
  }

  function update() {
    let moveX = joystickVector.x;
    let moveY = joystickVector.y;

    if (keys["w"] || keys["arrowup"]) moveY = -1;
    if (keys["s"] || keys["arrowdown"]) moveY = 1;
    if (keys["a"] || keys["arrowleft"]) moveX = -1;
    if (keys["d"] || keys["arrowright"]) moveX = 1;

    player.x += moveX * player.speed;
    player.y += moveY * player.speed;

    player.x = Math.max(player.radius, Math.min(canvas.width - player.radius, player.x));
    player.y = Math.max(player.radius, Math.min(canvas.height - player.radius, player.y));

    // Bullets
    bullets.forEach((b, bi) => {
      b.x += b.dx;
      b.y += b.dy;
      if (b.x < 0 || b.x > canvas.width || b.y < 0 || b.y > canvas.height) {
        bullets.splice(bi, 1);
        return;
      }
      zombies.forEach((z) => {
        if (Math.hypot(z.x - b.x, z.y - b.y) < z.radius + 4) {
          z.hp -= b.damage;
          bullets.splice(bi, 1);
        }
      });
    });

    // Zombies
    const inSafe = isPlayerInSafehouse();
    zombies.forEach((z, zi) => {
      if (!inSafe) {
        const angle = Math.atan2(player.y - z.y, player.x - z.x);
        z.x += Math.cos(angle) * z.speed;
        z.y += Math.sin(angle) * z.speed;

        if (Math.hypot(player.x - z.x, player.y - z.y) < player.radius + z.radius) {
          player.hp -= 0.5;
          if (player.hp <= 0) {
            player.hp = 100;
            player.x = safehouse.x + safehouse.w / 2;
            player.y = safehouse.y + safehouse.h / 2;
          }
          updateHUD();
        }
      }

      if (z.hp <= 0) {
        player.cash += 50;
        if (Math.random() < 0.25) drops.push({ x: z.x, y: z.y, type: "ammo" });
        zombies.splice(zi, 1);
        updateHUD();
      }
    });

    // Pickups
    drops.forEach((d, di) => {
      if (Math.hypot(player.x - d.x, player.y - d.y) < player.radius + 10) {
        if (d.type === "ammo") player.weapons[0].ammo += 10;
        drops.splice(di, 1);
        updateHUD();
      }
    });

    spawnZombies();
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background Zones
    ctx.fillStyle = "#2c0e0e"; ctx.fillRect(0, 0, canvas.width, canvas.height * 0.3);
    ctx.fillStyle = "#26220e"; ctx.fillRect(0, canvas.height * 0.3, canvas.width, canvas.height * 0.3);
    ctx.fillStyle = "#112211"; ctx.fillRect(0, canvas.height * 0.6, canvas.width, canvas.height * 0.4);

    // Safehouse
    ctx.fillStyle = "#1e3799"; ctx.fillRect(safehouse.x, safehouse.y, safehouse.w, safehouse.h);
    ctx.strokeStyle = "#4a69bd"; ctx.lineWidth = 3; ctx.strokeRect(safehouse.x, safehouse.y, safehouse.w, safehouse.h);
    ctx.fillStyle = "#f5cd79"; ctx.font = "10px sans-serif";
    ctx.fillText("SUPERMARKET SAFEHOUSE", safehouse.x + 10, safehouse.y + 20);

    // Laser Sight Aim Indicator (When holding Pistol)
    const currentWeapon = player.weapons[player.weaponIndex];
    if (currentWeapon.type === "ranged") {
      let closest = getClosestZombie();
      let targetAngle = -Math.PI / 2;
      if (closest) {
        targetAngle = Math.atan2(closest.y - player.y, closest.x - player.x);
      }
      ctx.strokeStyle = "rgba(231, 76, 60, 0.7)";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]); // Dashed laser line
      ctx.beginPath();
      ctx.moveTo(player.x, player.y);
      ctx.lineTo(player.x + Math.cos(targetAngle) * 180, player.y + Math.sin(targetAngle) * 180);
      ctx.stroke();
      ctx.setLineDash([]); // Reset line
    }

    // Drops
    drops.forEach((d) => {
      ctx.fillStyle = "#f1c40f";
      ctx.beginPath(); ctx.arc(d.x, d.y, 5, 0, Math.PI * 2); ctx.fill();
    });

    // Bullets
    ctx.fillStyle = "#fff";
    bullets.forEach((b) => {
      ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, Math.PI * 2); ctx.fill();
    });

    // Zombies (Green circle + glowing red eyes)
    zombies.forEach((z) => {
      ctx.fillStyle = "#27ae60";
      ctx.beginPath(); ctx.arc(z.x, z.y, z.radius, 0, Math.PI * 2); ctx.fill();
      
      // Zombie eyes
      ctx.fillStyle = "#e74c3c";
      ctx.beginPath();
      ctx.arc(z.x - 3, z.y - 3, 2, 0, Math.PI * 2);
      ctx.arc(z.x + 3, z.y - 3, 2, 0, Math.PI * 2);
      ctx.fill();
    });

    // Player
    ctx.fillStyle = "#3498db";
    ctx.beginPath(); ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke();
  }

  function loop() {
    update();
    render();
    requestAnimationFrame(loop);
  }

  updateHUD();
  loop();
});
        
