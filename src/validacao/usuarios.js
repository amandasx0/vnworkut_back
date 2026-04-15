const Joi = require("joi")

const usuarioSchema = Joi.object({
    nome: Joi.string().min(3).required().messages({
            "string.empty": "Nome é obrigatório",
            "string.min": "Nome deve ter pelo menos 3 caracteres",
            "any.require": "Nome é obrigatório"
        }),
    email: Joi.string().email().required(),
    senha: Joi.string().min(6).required()
})
// abortEarly: false exibe todos os erros de uma vez só
function validarUsuario(req, res, next) {
    const { error } = usuarioSchema.validate(req.body, {abortEarly: false})

    if (error) {
        console.log(error)
        return res.status(400).json({
            error: error.details.map(e => e.message)
        })
    }

    next()
}

module.exports = validarUsuario;