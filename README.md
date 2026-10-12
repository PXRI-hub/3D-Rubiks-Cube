# 3D-Rubiks-Cube

An interactive 3D cube that can be controlled using hand gestures through your webcam.

<img width="1510" height="851" alt="cube" src="https://github.com/user-attachments/assets/d461faa7-a8d4-438c-8782-1a29503dfb51" />

## About the Project

I wanted to experiment with combining 3D graphics and hand tracking to create something that could be controlled without a mouse or keyboard.

The project uses the webcam to track hand movement and translates those movements into controls for a 3D cube. You can interact with and rotate the cube using gestures in real time.

I also added regular controls so the cube can be shuffled and reset easily.

## Features

- Real-time hand tracking through your webcam
- Gesture-based cube controls
- Interactive 3D cube
- Smooth 3D movement and animations
- Shuffle button
- Reset button
- Live browser-based experience

## Built With

- JavaScript
- HTML
- CSS
- Three.js
- MediaPipe

## How It Works

The webcam captures your hand movements, which are detected using MediaPipe. The hand-tracking data is then used by JavaScript to determine how you are moving your hand.

Three.js handles the 3D scene, cube, camera, lighting, and animations. Together, they allow physical hand movements in front of the camera to control the cube on screen.

## What I Learned

This project gave me experience working with technologies I had never combined before, especially computer vision and 3D graphics.

One of the biggest challenges was turning hand movement into controls that felt natural instead of making the cube react to every small movement. Working through that helped me better understand gesture detection, interaction logic, animation, and how different JavaScript libraries can work together to create an interactive experience.

## Try It

A live version of the project is available through GitHub Pages.

**Note:** Camera access must be allowed in the browser for hand controls to work.
