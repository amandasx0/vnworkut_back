/* Pega as config do postgres */
const { Pool } = require("pg")

module.exports = new Pool({
    connectionString: process.env.DATABASE_URL,
})
