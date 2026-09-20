import * as THREE from 'three';

// --- Configuration ---
const COLORS = {
    rocket: 0xffb7d5,
    asteroid1: 0xb2f2bb,
    asteroid2: 0xd1d1ff,
    asteroid3: 0xffdac1,
    bullet: 0xff99c8,
    bg: 0xfdf0f6,
    uiText: '#5d4037'
};

const BUBBLE_COLORS = [
    0xffb7d5, 0xb2f2bb, 0xd1d1ff, 0xffdac1,
    0xc4b5fd, 0xfcd5ce, 0xfef08a, 0xa5f3fc,
    0xfda4af, 0x86efac, 0xbbf7d0, 0xc7d2fe,
    0x93c5fd, 0xfca5a5, 0xfdba74, 0xd9a0e0
];

// --- Game State ---
let scene, camera, renderer, clock;
let player = null;
let asteroids = [];
let bullets = [];
let score = 0;
let gameState = 'playing'; // 'playing', 'gameover'
let targetPosition = null;
let isFiring = false;
let lastFireTime = 0;

const gameParams = {
    asteroidSpawnRate: 2000,
    asteroidInitialSpeed: 0.05,
    bulletSpeed: 0.3,
    maxPlayerSpeed: 0.15,
    playerAcceleration: 0.003,
    playerDrag: 0.98
};

let lastSpawnTime = 0;
let bubbles = [];
let bubbleSpawnTimer = 0;

// --- Initialization ---
function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(COLORS.bg);

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 15, 15);
    camera.lookAt(0, 0, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    document.body.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 1);
    pointLight.position.set(5, 10, 5);
    scene.add(pointLight);

    // Player
    createPlayer();

    // Bubble pool
    createBubbles(40);

    // Event Listeners
    window.addEventListener('mousedown', onInput);
    window.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (e.touches.length === 1) {
            onInput(e.touches[0]);
        }
    }, { passive: false });

    document.getElementById('fire-button').addEventListener('mousedown', onFireButton);
    document.getElementById('fire-button').addEventListener('touchstart', (e) => {
        e.preventDefault();
        onFireButton(e.touches[0]);
    });
    document.getElementById('fire-button').addEventListener('touchend', (e) => {
        e.preventDefault();
        isFiring = false;
    });

    // Remove loading screen
    document.getElementById('loading-screen').style.display = 'none';

    // Add game over text
    const gameOverText = document.createElement('div');
    gameOverText.id = 'game-over';
    gameOverText.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 24px;
        color: red;
        display: none;
        text-align: center;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        white-space: pre-line;
        z-index: 10;
        pointer-events: none;
    `;
    document.getElementById('ui').appendChild(gameOverText);

    clock = new THREE.Clock();
    animate();
}

function createPlayer() {
    const geometry = new THREE.CapsuleGeometry(0.4, 0.8, 4, 8);
    const material = new THREE.MeshStandardMaterial({ 
        color: COLORS.rocket,
        roughness: 0.3,
        metalness: 0.1
    });
    
    player = new THREE.Mesh(geometry, material);
    player.velocity = new THREE.Vector3(0, 0, 0);
    player.facing = new THREE.Vector3(0, 0, 1); // ship faces +Z by default
    scene.add(player);
}

function createAsteroid() {
    const size = Math.random() * 1.5 + 0.5;
    const geometries = [
        new THREE.SphereGeometry(size, 16, 16),
        new THREE.SphereGeometry(size, 12, 12)
    ];
    const colors = [COLORS.asteroid1, COLORS.asteroid2, COLORS.asteroid3];
    
    const geometry = geometries[Math.floor(Math.random() * geometries.length)];
    const material = new THREE.MeshStandardMaterial({ 
        color: colors[Math.floor(Math.random() * colors.length)],
        roughness: 0.5
    });

    const asteroid = new THREE.Mesh(geometry, material);
    
    const angle = Math.random() * Math.PI * 2;
    const dist = 20 + Math.random() * 10;
    asteroid.position.set(Math.cos(angle) * dist, (Math.random() - 0.5) * 5, Math.sin(angle) * dist);
    
    asteroid.userData = {
        velocity: new THREE.Vector3(
            Math.cos(angle) * gameParams.asteroidInitialSpeed,
            (Math.random() - 0.5) * 0.02,
            Math.sin(angle) * gameParams.asteroidInitialSpeed
        ),
        rotation: new THREE.Vector3(Math.random() * 0.02, Math.random() * 0.02, Math.random() * 0.02)
    };

    scene.add(asteroid);
    asteroids.push(asteroid);
}

function onInput(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const vec = new THREE.Vector3(x, y, 0).unproject(camera);
    const dir = vec.sub(camera.position).normalize();
    const distance = -camera.position.dot(dir);
    targetPosition = vec.clone().multiplyScalar(distance);
    
    // Reset targetPosition after 3 seconds (optional - for auto-stop)
    clearTimeout(window.targetTimeout);
    window.targetTimeout = setTimeout(() => { targetPosition = null; }, 3000);
}

function onFireButton(event) {
    if (gameState === 'gameover') {
        resetGame();
    } else {
        isFiring = true;
    }
}

function resetGame() {
    score = 0;
    document.getElementById('score').innerText = `Score: ${score}`;
    document.getElementById('game-over').innerText = '';
    document.getElementById('game-over').style.display = 'none';
    
    asteroids.forEach(a => scene.remove(a));
    asteroids = [];
    
    bullets.forEach(b => scene.remove(b));
    bullets = [];
    
    player.position.set(0, 0, 0);
    player.velocity.set(0, 0, 0);
    player.rotation.set(0, 0, 0);
    player.material.color.setHex(COLORS.rocket);
    targetPosition = null;
    isFiring = false;
    gameState = 'playing';
}

function animate() {
    requestAnimationFrame(animate);
    const now = Date.now();
    const delta = clock.getDelta();

    if (gameState === 'playing') {
        // Update Player
        if (player && targetPosition) {
            const direction = targetPosition.clone().sub(player.position);
            const distance = direction.length();
            
            if (distance > 0.1) {
                direction.normalize();
                const speed = Math.min(player.velocity.length() + gameParams.playerAcceleration, gameParams.maxPlayerSpeed);
                player.velocity.x = direction.x * speed;
                player.velocity.z = direction.z * speed;
                
                // Face the direction of movement
                const targetRotation = Math.atan2(direction.x, direction.z);
                player.rotation.z = THREE.MathUtils.lerp(player.rotation.z, targetRotation, 0.12);
                player.facing.set(Math.sin(player.rotation.z), 0, Math.cos(player.rotation.z)).normalize();
            }
        }

        // Apply drag
        player.velocity.multiplyScalar(gameParams.playerDrag);
        player.position.add(player.velocity);

        // Gentle "hover" effect
        player.position.y = Math.sin(now * 0.003) * 0.15;
        player.rotation.x = Math.sin(now * 0.002) * 0.05;

        // Spawn Asteroids
        if (now - lastSpawnTime > gameParams.asteroidSpawnRate) {
            createAsteroid();
            lastSpawnTime = now;
        }

        // Fire Bullets
        if (isFiring && now - lastFireTime > 150) {
            const bGeom = new THREE.SphereGeometry(0.1, 8, 8);
            const bMat = new THREE.MeshStandardMaterial({ color: COLORS.bullet });
            const bullet = new THREE.Mesh(bGeom, bMat);
            bullet.position.copy(player.position);
            
            bullet.userData.velocity = player.facing.clone().multiplyScalar(gameParams.bulletSpeed);
            
            scene.add(bullet);
            bullets.push(bullet);
            lastFireTime = now;
        }

        // Update Asteroids
        for (let i = asteroids.length - 1; i >= 0; i--) {
            const a = asteroids[i];
            a.position.add(a.userData.velocity);
            a.rotation.x += a.userData.rotation.x;
            a.rotation.y += a.userData.rotation.y;

            // Collision with player
            if (a.position.distanceTo(player.position) < a.geometry.parameters.radius + 0.5) {
                gameState = 'gameover';
                document.getElementById('game-over').style.display = 'block';
                document.getElementById('game-over').innerText = `GAME OVER\nScore: ${score}\nKlicke FEUEN zum Neustart`;
                player.material.color.setHex(0xff0000);
            }

            // Remove off-screen
            if (a.position.length() > 50) {
                scene.remove(a);
                asteroids.splice(i, 1);
            }
        }

        // Update Bullets
        for (let i = bullets.length - 1; i >= 0; i--) {
            const b = bullets[i];
            b.position.add(b.userData.velocity);

            // Collision with Asteroids
            for (let j = asteroids.length - 1; j >= 0; j--) {
                const a = asteroids[j];
                if (b.position.distanceTo(a.position) < a.geometry.parameters.radius + 0.2) {
                    scene.remove(b);
                    bullets.splice(i, 1);
                    scene.remove(a);
                    asteroids.splice(j, 1);
                    score += 10;
                    document.getElementById('score').innerText = `Score: ${score}`;
                    break;
                }
            }

            // Remove old bullets
            if (b.position.length() > 50) {
                scene.remove(b);
                bullets.splice(i, 1);
            }
        }
    }

    // Update bubbles
    bubbleSpawnTimer += delta * 1000;
    if (bubbleSpawnTimer > 800 && bubbles.length < 40) {
        spawnBubble();
        bubbleSpawnTimer = 0;
    }
    for (let i = bubbles.length - 1; i >= 0; i--) {
        const b = bubbles[i];
        b.position.y += 0.015 * (1 + b.userData.wobbleSpeed);
        b.position.x += Math.sin(now * 0.001 + b.userData.phase) * 0.01;
        b.userData.scale = Math.min(1, b.userData.scale + 0.02);
        b.scale.setScalar(b.userData.scale);
        b.rotation.x += 0.01;
        b.rotation.y += 0.015;
        b.material.opacity = Math.max(0, b.userData.opacity - 0.003);
        
        if (b.position.y > 20 || b.userData.opacity <= 0) {
            scene.remove(b);
            bubbles.splice(i, 1);
        }
    }

    renderer.render(scene, camera);
}

function createBubbles(count) {
    for (let i = 0; i < count; i++) {
        spawnBubble(true);
    }
}

function spawnBubble(initial = false) {
    const size = Math.random() * 0.4 + 0.15;
    const geom = new THREE.SphereGeometry(size, 8, 8);
    const color = BUBBLE_COLORS[Math.floor(Math.random() * BUBBLE_COLORS.length)];
    const mat = new THREE.MeshStandardMaterial({
        color: color,
        transparent: true,
        opacity: 0.5,
        roughness: 0.1,
        metalness: 0.05
    });
    const bubble = new THREE.Mesh(geom, mat);
    bubble.position.set(
        (Math.random() - 0.5) * 30,
        initial ? Math.random() * 20 : -2,
        (Math.random() - 0.5) * 30
    );
    bubble.userData = {
        wobbleSpeed: Math.random() * 2 + 0.5,
        phase: Math.random() * Math.PI * 2,
        scale: 0,
        opacity: 0.3 + Math.random() * 0.4
    };
    bubble.scale.setScalar(0);
    scene.add(bubble);
    bubbles.push(bubble);
}

init();

// Handle resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
