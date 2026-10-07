// Lagos Zombie Survival - Game Core
console.log("Lagos Zombie Survival Game Loaded Successfully.");

document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("game-container");
    container.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <h2 style="color: #e74c3c; margin-bottom: 10px;">Ikeja Safehouse</h2>
            <p style="color: #aaa;">Base setup complete! Ready to load 2D map & controls.</p>
        </div>
    `;
});
