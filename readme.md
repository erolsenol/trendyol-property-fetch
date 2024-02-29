# Express Prisma API
This web API is built with Express, Prisma ORM and TypeScript.

-- Currently not maintaining project --

## Usage
Clone the repo `git clone https://github.com/nicholashamilton/express-prisma-api.git`

Configure and rename `.env.development.example` to `.env.development`

Install node modules `npm install`

Generate Prisma Client `npm run prisma:generate`

Migrate Prisma `npm run prisma:migrate`

Start dev environment `npm run dev`

## Postman
A [Postman](https://www.postman.com/) collection can be found [here](https://github.com/nicholashamilton/express-prisma-api/blob/main/postman_collection.json)

### Notes
This project is a work in progress. Here is a brief overview of the roadmap.

 * [x] Auth Endpoints (signUp, logIn, logOut, secret, currentUser, refresh)
 * [ ] Auth Endpoints (passwordReset, confirmEmail)
 * [x] Admin Endpoints (getUsers, getUserById, createUser, updateUser, deleteUser)
 * [x] Access Tokens use Bearer Authentication header (valid for 10min)
 * [x] Refresh Tokens use httpOnly SameSite lax secure cookie (valid for 1day, only 1 RT may be valid per user, using a stale RT will destroy users valid RT for security, generate new AT and RT with valid RT)

Open to suggestions and ideas. Open an issue [here](https://github.com/nicholashamilton/express-prisma-api/issues).
