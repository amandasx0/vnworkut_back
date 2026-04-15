const Joi = require("joi")

const postSchema = Joi.object({
    titulo: Joi.string().min(3).required(),
    conteudo: Joi.string().min(5).required()
})

function validarPost(req, res, next) {
    const { error } = postSchema.validate(req.body, {abortEarly: false})

     if (error) {
        console.log(error)
        return res.status(400).json({
            error: error.details.map(e => e.message)
        })
    }

    next()
}

module.exports = validarPost;