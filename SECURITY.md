# Registration and Password Authentication

## Password Hashing
Library Used: bcryptjs (imported at the top of routes.ts)

Passwords are never stored in plain text. Instead, they are hashed using bcrypt with a salt round of 10.

## Registration Flow
When a user registers:

1. Password is provided in plaintext via the registration form
2. Server hashes the password: await bcrypt.hash(password, 10)
3. The hashed password (not the original) is stored in the database
4. A session is created and the user is logged in
5. The password itself is never sent back to the client

``` javascript
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await storage.createUser({
                                            username,
                                            password: hashedPassword,  // Stored as hash, not plaintext
                                            fullName,
                                            email,
                                            mobileNumber,
                                            ...
    });
```

## Login Flow
When a user logs in:

1. Username is looked up in the database
2. The provided plaintext password is compared against the stored hash using: await bcrypt.compare(password, user.password)
3. If they match, the user is authenticated and a session is created
4. If they don't match, a generic "Invalid username or password" error is returned (no indication which field is wrong)

``` javascript
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
    return res.status(401).json({ message: "Invalid username or password" });
    }
```

## Special Case: Password Setup
The app supports a "needs password setup" flow for admin users who may be created without an initial password:

1. When a user with needsPasswordSetup: true logs in, their provided password is hashed
2. That hash is stored as their permanent password
3. The flag is updated to false

## Database Storage
In the users table, passwords are stored in a password TEXT column as the hashed string (typically ~60 characters for bcrypt).

## Transport

In this app, login credentials are posted from the browser to /api/auth/login. Whether username/password travel in plain text on the network depends on transport:

1. If the site is accessed over HTTPS: credentials are encrypted in transit (not plain text on the wire).
2. If the site is accessed over HTTP: credentials are sent in plain text over the network.

Important detail in your current code:

1. The server uses an HTTP server (not HTTPS) in index.ts.
2. Session cookie is configured with secure: false in index.ts, so cookies can also be sent over HTTP.

So, unless TLS is enforced upstream (for example by a reverse proxy/load balancer), credentials can be exposed in transit.

Security Features
✅ Passwords hashed with bcrypt (strong algorithm with built-in salt)
✅ 10 salt rounds (computationally expensive, resistant to brute force)
✅ Generic error messages (don't reveal if username exists)
✅ Session-based authentication (passwords not stored on client)
✅ Password never logged or transmitted in response bodies