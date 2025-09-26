# Multi-Room Video Communication App

A React app that lets you create two video rooms and share video between them in real-time.

## What it does

- Join Room A or Room B with your camera
- Switch between rooms easily  
- Share your video from Room A to Room B
- See both videos side by side


1. Get VideoSDK token from [videosdk.live](https://videosdk.live)


2. Start the app:


## How to use

1. Open two browser tabs
2. Tab 1: Join Room A, copy your Room A ID  
3. Tab 2: Join Room B, copy your Room B ID
4. Tab 1: Click "Media Relay to Room B" and enter Room B ID
5. Tab 2: Now shows both your Room B camera and Room A video

## Tech used

- React
- VideoSDK for rooms
- getUserMedia for camera
- Broadcast Channel for tab communication

## Files

- `App.js` - Main app logic
- `App.css` - Styling  
- `API.js` - VideoSDK setup

That's it! The app works best with two tabs on the same browser.

