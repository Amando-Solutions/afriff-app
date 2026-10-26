// POST /api/push/subscribe {"token": "<FCM token>"}: an attendee phone turned alerts on.
// (No .post in the file name: the browser's OPTIONS preflight must reach it too.)
export default topicHandler('subscribe')
