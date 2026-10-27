// POST /api/account/signup { firstName, lastName, email, pin, marketing }
// → { token, profile }. The phone signs in to Firebase with the token.
// (No .post in these file names: the browser's OPTIONS preflight must reach them too.)
import type { SignUpInput } from '../../accounts/logic'

export default accountRoute((event, body) => attendeeAccounts().signUp(body as unknown as SignUpInput, networkOf(event)))
