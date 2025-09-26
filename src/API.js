// Replace VideoSDK_Token with actual VideoSDK Token
export const authToken = "VideoSDK_Token";

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

