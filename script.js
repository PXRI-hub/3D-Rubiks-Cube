// This file creates the cube and handles webcam, gestures, and buttons.

import {
    FilesetResolver,
    HandLandmarker
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/+esm";

    import * as THREE from "three";

    import { OrbitControls }
        from "three/addons/controls/OrbitControls.js";

    // Create the 3D scene.
    const scene = new THREE.Scene();

    // Set up the camera that looks at the cube.
    const camera = new THREE.PerspectiveCamera(
        45,
        window.innerWidth / window.innerHeight,
        0.1,
        100
    );

    camera.position.set(6, 6, 8);

    // Draw the 3D scene on the webpage.
    const renderer = new THREE.WebGLRenderer({
        antialias: true
    });

    renderer.setSize(
        window.innerWidth,
        window.innerHeight
    );

    renderer.setPixelRatio(
        Math.min(window.devicePixelRatio, 2)
    );

    document.body.appendChild(renderer.domElement);

    // Add lights so the cube colours are visible.

    const ambientLight =
        new THREE.AmbientLight(0xffffff, 2);

    scene.add(ambientLight);

    const mainLight =
        new THREE.DirectionalLight(0xffffff, 4);

    mainLight.position.set(5, 8, 10);

    scene.add(mainLight);

    const sideLight =
        new THREE.DirectionalLight(0x6699ff, 2);

    sideLight.position.set(-5, 2, -5);

    scene.add(sideLight);

    // Keep all the small cubes together.

    const rubiksCube = new THREE.Group();

    scene.add(rubiksCube);

    // Set the size and spacing of the small cubes.

    const cubeSize = 0.95;

    const spacing = 1.02;

    // Rubik's cube colors

    const colors = {
        right:  0xff3333,   // red
        left:   0xff8800,   // orange

        top:    0xffffff,   // white
        bottom: 0xffdd00,   // yellow

        front:  0x00bb55,   // green
        back:   0x2266ff    // blue
    };

    // Make one small cube with the right face colours.

    function createCubie(x, y, z) {

        const geometry =
            new THREE.BoxGeometry(
                cubeSize,
                cubeSize,
                cubeSize
            );

        // Material order for BoxGeometry:
        //
        // right
        // left
        // top
        // bottom
        // front
        // back

        const materials = [

            new THREE.MeshStandardMaterial({
                color: x === 1
                    ? colors.right
                    : 0x111111
            }),

            new THREE.MeshStandardMaterial({
                color: x === -1
                    ? colors.left
                    : 0x111111
            }),

            new THREE.MeshStandardMaterial({
                color: y === 1
                    ? colors.top
                    : 0x111111
            }),

            new THREE.MeshStandardMaterial({
                color: y === -1
                    ? colors.bottom
                    : 0x111111
            }),

            new THREE.MeshStandardMaterial({
                color: z === 1
                    ? colors.front
                    : 0x111111
            }),

            new THREE.MeshStandardMaterial({
                color: z === -1
                    ? colors.back
                    : 0x111111
            })

        ];

        const cubie =
            new THREE.Mesh(
                geometry,
                materials
            );

        cubie.position.set(
            x * spacing,
            y * spacing,
            z * spacing
        );
        cubie.userData.gridPosition = {
    x: x,
    y: y,
    z: z
};

cubie.userData.originalPosition = {
    x: x,
    y: y,
    z: z
};

cubie.userData.originalRotation = {
    x: 0,
    y: 0,
    z: 0
};

        // Slight rounded-looking separation

        const edges =
            new THREE.EdgesGeometry(geometry);

        const line =
            new THREE.LineSegments(
                edges,
                new THREE.LineBasicMaterial({
                    color: 0x000000
                })
            );

        cubie.add(line);

        rubiksCube.add(cubie);
    }

    // Build the full cube using 27 small cubes.
    for (let x = -1; x <= 1; x++) {

        for (let y = -1; y <= 1; y++) {

            for (let z = -1; z <= 1; z++) {

                createCubie(x, y, z);

            }

        }

    }

    // Tilt the cube slightly when the page opens.

    rubiksCube.rotation.x = 0.35;
    rubiksCube.rotation.y = -0.55;

    // Allow mouse movement to change the view.

    const controls =
        new OrbitControls(
            camera,
            renderer.domElement
        );

    controls.enableDamping = true;

    controls.dampingFactor = 0.06;

    controls.enablePan = false;

    controls.minDistance = 5;

    controls.maxDistance = 15;

    // Keep the scene fitted to the browser window.
    window.addEventListener(
        "resize",
        () => {

            camera.aspect =
                window.innerWidth /
                window.innerHeight;

            camera.updateProjectionMatrix();

            renderer.setSize(
                window.innerWidth,
                window.innerHeight
            );

        }
    );

// ANIMATION LOOP
// Set up webcam hand tracking.
const video = document.getElementById("webcam");
const handCanvas = document.getElementById("hand-canvas");
const handCtx = handCanvas.getContext("2d");

const handStatus = document.getElementById("hand-status");

let handLandmarker;
let lastVideoTime = -1;

// Keep track of hand movements and cube rotation.
let isPinching = false;

let previousHandX = null;
let previousHandY = null;

let targetRotationX = 0.35;
let targetRotationY = -0.55;

const pinchThreshold = 0.07;
const rotationSensitivity = 5;

// Remember where a finger swipe started.

let swipeStartX = null;
let swipeStartY = null;
let swipeStartTime = null;

let swipeReady = true;

const swipeDistance = 0.12;
const swipeTimeLimit = 700;
const swipeCooldown = 500;
// Find which small cube the finger is pointing at.

const raycaster = new THREE.Raycaster();
const fingerPointer = new THREE.Vector2();

let selectedCubie = null;
let selectedGridPosition = null;

// Connections between MediaPipe hand landmarks

const handConnections = [

    [0,1], [1,2], [2,3], [3,4],

    [0,5], [5,6], [6,7], [7,8],

    [5,9], [9,10], [10,11], [11,12],

    [9,13], [13,14], [14,15], [15,16],

    [13,17], [17,18], [18,19], [19,20],

    [0,17]

];

// Check which cube piece is under the fingertip.

function findCubieUnderFinger(landmarks) {

    const indexTip = landmarks[8];

    // Convert MediaPipe coordinates
    // into Three.js screen coordinates.
    //
    // Webcam is mirrored, so X is reversed.

    fingerPointer.x =
        (1 - indexTip.x) * 2 - 1;

    fingerPointer.y =
        -(indexTip.y * 2 - 1);

    // Shoot invisible ray from camera
    // through fingertip position

    raycaster.setFromCamera(
        fingerPointer,
        camera
    );

    // Check every cubie

    const cubies =
        rubiksCube.children.filter(
            child =>
                child.userData.gridPosition
        );

    const intersections =
        raycaster.intersectObjects(
            cubies,
            false
        );

  if (intersections.length > 0) {

    // Remove old highlight
    if (
        selectedCubie &&
        selectedCubie !== intersections[0].object
    ) {
        selectedCubie.scale.set(1, 1, 1);
    }

    selectedCubie =
        intersections[0].object;

    selectedGridPosition = {
        ...selectedCubie.userData.gridPosition
    };

    // Highlight cubie under fingertip
    selectedCubie.scale.set(
        1.12,
        1.12,
        1.12
    );

    handStatus.textContent =
        `🎯 Selected: (${selectedGridPosition.x}, ${selectedGridPosition.y}, ${selectedGridPosition.z})`;

    return selectedCubie;
}

if (selectedCubie) {
    selectedCubie.scale.set(1, 1, 1);
}

selectedCubie = null;
selectedGridPosition = null;

return null;
}

// Rotate the whole cube when the user pinches.

function controlCube(landmarks) {

    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];

    // Distance between thumb + index finger

    const dx =
        thumbTip.x - indexTip.x;

    const dy =
        thumbTip.y - indexTip.y;

    const distance =
        Math.sqrt(dx * dx + dy * dy);

    // PINCH DETECTION

    if (distance < pinchThreshold) {

        isPinching = true;

        handStatus.textContent =
            "🤏 GRABBING CUBE";

        // Use index knuckle as stable hand position

        const handX = landmarks[5].x;
        const handY = landmarks[5].y;

        if (
            previousHandX !== null &&
            previousHandY !== null
        ) {

            const moveX =
                handX - previousHandX;

            const moveY =
                handY - previousHandY;

            // Camera is mirrored,
            // so horizontal direction is reversed.

            targetRotationY +=
                moveX * rotationSensitivity;

            targetRotationX +=
                moveY * rotationSensitivity;

        }

        previousHandX = handX;
        previousHandY = handY;

    }

    else {

        // Hand released

        isPinching = false;

        previousHandX = null;
        previousHandY = null;

    }

}
// Check if only the index finger is pointing.

function isIndexFingerPointing(landmarks) {

    const indexTip = landmarks[8];
    const indexPip = landmarks[6];

    const middleTip = landmarks[12];
    const middlePip = landmarks[10];

    const ringTip = landmarks[16];
    const ringPip = landmarks[14];

    const pinkyTip = landmarks[20];
    const pinkyPip = landmarks[18];

    const indexExtended =
        indexTip.y < indexPip.y;

    const middleFolded =
        middleTip.y > middlePip.y;

    const ringFolded =
        ringTip.y > ringPip.y;

    const pinkyFolded =
        pinkyTip.y > pinkyPip.y;

    return (
        indexExtended &&
        middleFolded &&
        ringFolded &&
        pinkyFolded
    );
}

// Turn one row or column when the finger swipes.

function detectSwipe(landmarks) {

    // Don't swipe while we're grabbing
    // the whole cube.

    if (isPinching || layerIsTurning) {

        resetSwipe();
        return;

    }

    // Only allow swipes while pointing ☝️

    if (!isIndexFingerPointing(landmarks)) {

        resetSwipe();
        return;

    }

    const finger = landmarks[8];

    const x = finger.x;
    const y = finger.y;

    // Start recording the swipe

    if (
        swipeStartX === null ||
        swipeStartY === null
    ) {

        swipeStartX = x;
        swipeStartY = y;
        swipeStartTime = performance.now();

        handStatus.textContent =
            "☝️ Swipe to turn";

        return;

    }

    const deltaX =
        x - swipeStartX;

    const deltaY =
        y - swipeStartY;

    const elapsed =
        performance.now() -
        swipeStartTime;

    // Took too long = restart gesture

    if (elapsed > swipeTimeLimit) {

        resetSwipe();
        return;

    }

    if (!swipeReady) {
        return;
    }

// HORIZONTAL SWIPE

if (
    Math.abs(deltaX) > swipeDistance &&
    Math.abs(deltaX) > Math.abs(deltaY)
) {

    if (!selectedGridPosition) {
        resetSwipe();
        return;
    }

    swipeReady = false;

    const selectedLayer =
        selectedGridPosition.y;

    const direction =
        deltaX < 0 ? -1 : 1;

    handStatus.textContent =
        `↔️ Turning row ${selectedLayer}`;

    rotateLayer(
        "y",
        selectedLayer,
        direction
    );

    finishSwipe();
    return;
}

// VERTICAL SWIPE

if (
    Math.abs(deltaY) > swipeDistance &&
    Math.abs(deltaY) > Math.abs(deltaX)
) {

    if (!selectedGridPosition) {
        resetSwipe();
        return;
    }

    swipeReady = false;

    const selectedLayer =
        selectedGridPosition.x;

    const direction =
        deltaY < 0 ? 1 : -1;

    handStatus.textContent =
        `↕️ Turning column ${selectedLayer}`;

    rotateLayer(
        "x",
        selectedLayer,
        direction
    );

    finishSwipe();
    return;
}
}
function resetSwipe() {

    swipeStartX = null;
    swipeStartY = null;
    swipeStartTime = null;
}

function finishSwipe() {

    resetSwipe();

    setTimeout(
        () => {

            swipeReady = true;

        },
        swipeCooldown
    );
}
// Animate a single row or column turning.

let layerIsTurning = false;

function rotateLayer(axis, layer, direction = 1) {

    if (layerIsTurning) {
        return;
    }

    layerIsTurning = true;

    const rotationGroup = new THREE.Group();

    rubiksCube.add(rotationGroup);

    // Find the 9 cubies belonging to this layer

    const cubies = rubiksCube.children.filter(child => {

        if (!child.userData.gridPosition) {
            return false;
        }

        return child.userData.gridPosition[axis] === layer;

    });

    // Move those cubies into temporary rotation group

    cubies.forEach(cubie => {

        rotationGroup.attach(cubie);

    });

    const startRotation = 0;

    const targetRotation =
        direction * Math.PI / 2;

    const duration = 250;

    const startTime = performance.now();

    function animateLayer(time) {

        const elapsed =
            time - startTime;

        const progress =
            Math.min(elapsed / duration, 1);

        // Smooth animation

        const eased =
            1 - Math.pow(1 - progress, 3);

        rotationGroup.rotation[axis] =
            startRotation +
            targetRotation * eased;

        if (progress < 1) {

            requestAnimationFrame(
                animateLayer
            );

        }

        else {

            // Snap exactly to 90 degrees

            rotationGroup.rotation[axis] =
                targetRotation;

            // Return cubies to main cube

            cubies.forEach(cubie => {

                rubiksCube.attach(cubie);

                // Calculate new logical position

                const p =
                    cubie.userData.gridPosition;

                let x = p.x;
                let y = p.y;
                let z = p.z;

                if (axis === "x") {

                    if (direction === 1) {

                        p.y = -z;
                        p.z = y;

                    }

                    else {

                        p.y = z;
                        p.z = -y;

                    }

                }

                if (axis === "y") {

                    if (direction === 1) {

                        p.x = z;
                        p.z = -x;

                    }

                    else {

                        p.x = -z;
                        p.z = x;

                    }

                }

                if (axis === "z") {

                    if (direction === 1) {

                        p.x = -y;
                        p.y = x;

                    }

                    else {

                        p.x = y;
                        p.y = -x;

                    }

                }

                // Snap position exactly onto cube grid

                cubie.position.set(
                    p.x * spacing,
                    p.y * spacing,
                    p.z * spacing
                );

                // Prevent tiny rotation errors

                cubie.rotation.x =
                    Math.round(
                        cubie.rotation.x /
                        (Math.PI / 2)
                    ) * (Math.PI / 2);

                cubie.rotation.y =
                    Math.round(
                        cubie.rotation.y /
                        (Math.PI / 2)
                    ) * (Math.PI / 2);

                cubie.rotation.z =
                    Math.round(
                        cubie.rotation.z /
                        (Math.PI / 2)
                    ) * (Math.PI / 2);

            });

            rubiksCube.remove(
                rotationGroup
            );

            layerIsTurning = false;

        }

    }

    requestAnimationFrame(
        animateLayer
    );

}

// Put every cube piece back in its original place.
function resetCube() {

    if (layerIsTurning) {
        return;
    }

    rubiksCube.children.forEach(cubie => {

        if (!cubie.userData.originalPosition) {
            return;
        }

        const original =
            cubie.userData.originalPosition;

        cubie.userData.gridPosition = {
            x: original.x,
            y: original.y,
            z: original.z
        };

        cubie.position.set(
            original.x * spacing,
            original.y * spacing,
            original.z * spacing
        );

        cubie.rotation.set(0, 0, 0);
        cubie.scale.set(1, 1, 1);
    });

    selectedCubie = null;
    selectedGridPosition = null;

    handStatus.textContent =
        "🧊 Cube reset!";
}
document
    .getElementById("reset-button")
    .addEventListener(
        "click",
        resetCube
    );

// Mix the cube using random turns.
let isShuffling = false;

function shuffleCube() {

    if (layerIsTurning || isShuffling) {
        return;
    }

    isShuffling = true;

    const moves = [
        { axis: "x", layer: 1 },
        { axis: "x", layer: -1 },
        { axis: "y", layer: 1 },
        { axis: "y", layer: -1 },
        { axis: "z", layer: 1 },
        { axis: "z", layer: -1 }
    ];

    const totalMoves = 20;

    for (let i = 0; i < totalMoves; i++) {

        setTimeout(() => {

            const move =
                moves[
                    Math.floor(
                        Math.random() * moves.length
                    )
                ];

            const direction =
                Math.random() < 0.5 ? -1 : 1;

            rotateLayer(
                move.axis,
                move.layer,
                direction
            );

            if (i === totalMoves - 1) {

                setTimeout(() => {

                    isShuffling = false;

                    handStatus.textContent =
                        "🔀 Cube shuffled!";

                }, 300);
            }

        }, i * 320);
    }
}
document
    .getElementById("shuffle-button")
    .addEventListener(
        "click",
        shuffleCube
    );

// Let keyboard keys turn faces of the cube.
window.addEventListener(
    "keydown",
    (event) => {

        if (event.repeat) {
            return;
        }

        switch (
            event.key.toLowerCase()
        ) {

            // Right face
            case "r":
                rotateLayer("x", 1, -1);
                break;

            // Left face
            case "l":
                rotateLayer("x", -1, 1);
                break;

            // Up face
            case "u":
                rotateLayer("y", 1, -1);
                break;

            // Down face
            case "d":
                rotateLayer("y", -1, 1);
                break;

            // Front face
            case "f":
                rotateLayer("z", 1, -1);
                break;

            // Back face
            case "b":
                rotateLayer("z", -1, 1);
                break;

        }

    }
);

// Load the hand tracking library.

async function setupHandTracking() {

    handStatus.textContent = "Loading hand tracker...";

    const vision =
        await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm"
        );

    handLandmarker =
        await HandLandmarker.createFromOptions(
            vision,
            {

                baseOptions: {

                    modelAssetPath:
                        "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",

                    delegate: "GPU"

                },

                runningMode: "VIDEO",

                numHands: 1

            }
        );

    startCamera();

}

// Ask for webcam permission and start the video.

async function startCamera() {

    try {

        const stream =
            await navigator.mediaDevices.getUserMedia({
                video: {
                    width: 640,
                    height: 480
                }
            });

        video.srcObject = stream;

        video.addEventListener(
            "loadeddata",
            () => {

                handCanvas.width =
                    video.videoWidth;

                handCanvas.height =
                    video.videoHeight;

                handStatus.textContent =
                    "Show your hand 🖐️";

            }
        );

    } catch (error) {

        console.error(error);

        handStatus.textContent =
            "Camera permission denied";

    }

}

// Draw the detected hand points over the webcam.

function drawHand(landmarks) {

    handCtx.clearRect(
        0,
        0,
        handCanvas.width,
        handCanvas.height
    );

    if (!landmarks) {

        handStatus.textContent =
            "No hand detected";

        return;

    }

    handStatus.textContent =
        "Hand detected 🟢";

    // Draw connections

    handCtx.strokeStyle = "#00ffff";
    handCtx.lineWidth = 4;

    for (const connection of handConnections) {

        const start =
            landmarks[connection[0]];

        const end =
            landmarks[connection[1]];

        handCtx.beginPath();

        handCtx.moveTo(
            start.x * handCanvas.width,
            start.y * handCanvas.height
        );

        handCtx.lineTo(
            end.x * handCanvas.width,
            end.y * handCanvas.height
        );

        handCtx.stroke();

    }

    // Draw landmark dots

    handCtx.fillStyle = "#ff3366";

    for (const point of landmarks) {

        handCtx.beginPath();

        handCtx.arc(
            point.x * handCanvas.width,
            point.y * handCanvas.height,
            6,
            0,
            Math.PI * 2
        );

        handCtx.fill();

    }

}

// Check the webcam for a hand on each new frame.

function detectHand() {

    if (
        handLandmarker &&
        video.readyState >= 2
    ) {

        if (
            video.currentTime !==
            lastVideoTime
        ) {

            lastVideoTime =
                video.currentTime;

            const results =
                handLandmarker.detectForVideo(
                    video,
                    performance.now()
                );

            if (
                results.landmarks &&
                results.landmarks.length > 0
            ) {

                const landmarks =
    results.landmarks[0];

drawHand(landmarks);

findCubieUnderFinger(landmarks);

controlCube(landmarks);

detectSwipe(landmarks);
            } else {

    drawHand(null);

    isPinching = false;

    previousHandX = null;
    previousHandY = null;

}

        }

    }

}
setupHandTracking();
function animate() {

    requestAnimationFrame(animate);

    detectHand();

    // -----------------------------------
    // SMOOTH HAND ROTATION
    // -----------------------------------

    rubiksCube.rotation.x +=
        (targetRotationX -
         rubiksCube.rotation.x)
        * 0.12;

    rubiksCube.rotation.y +=
        (targetRotationY -
         rubiksCube.rotation.y)
        * 0.12;

    controls.update();

    renderer.render(
        scene,
        camera
    );

}

    animate();
