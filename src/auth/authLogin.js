const jwt = require("jsonwebtoken");

// middler - porteiro
const auth = (req, res, next) => {
    const token = req.headers.authorization;

    if (!token) {
        // 401 - não autorizado
        return res.status(401).json({ message: "Não foi encontrado o token"});
    }

    try {
        // ferramenta de verificar (verify) se o token existe // split, a primeira casa estara com bearer por isso pegaremos a partir do [1]
        const decoded = jwt.verify(token.split(" ")[1], process.env.JWT_SECRET);

        req.usuario = decoded;
        next()
    } catch (error) {
        return res.status(401).json({ message: "Token inválido" })
    }
}

module.exports = auth;