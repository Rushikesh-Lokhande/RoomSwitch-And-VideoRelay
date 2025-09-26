// src/API.js

// Replace YOUR_API_KEY_HERE with your actual VideoSDK API key
export const authToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcGlrZXkiOiIwNjdhMzJiYi1iZTQ0LTRhNDctOTQ2MC0wNmJjMWE4ZGNiOWMiLCJwZXJtaXNzaW9ucyI6WyJhbGxvd19qb2luIl0sImlhdCI6MTc1ODg2NjAxNCwiZXhwIjoxNzU5NDcwODE0fQ.WjQi2D-5wcnPUnkAveLoW60ck1lsWX9EtnVMm5_PCQ8";

// API call to create a meeting room
export const createMeeting = async ({ token }) => {
  const res = await fetch(`https://api.videosdk.live/v2/rooms`, {
    method: "POST",
    headers: {
      authorization: `${authToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  // Get the roomId from the response
  const { roomId } = await res.json();
  return roomId;
};

// Function to generate random room ID for display
export const generateRandomRoomId = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const segments = [];
  
  for (let i = 0; i < 3; i++) {
    let segment = '';
    for (let j = 0; j < 3; j++) {
      segment += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    segments.push(segment);
  }
  
  return segments.join('-');
};
