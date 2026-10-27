// POST /api/invites/continue { id } (admins only): "Continue sending", and the
// console's next call while a send has `more`.
export default adminRoute('send invitations', async (event) => invitations().continue((await bodyOf(event)).id))
