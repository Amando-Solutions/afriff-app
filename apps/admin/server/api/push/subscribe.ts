// POST /api/push/subscribe {"token": "<FCM token>", "idToken"?: "<Firebase ID token>"}: an attendee
// phone turned alerts on (with idToken: someone is signed in there, link it to them).
// (No .post in the file name: the browser's OPTIONS preflight must reach it too.)
export default topicHandler('subscribe')
