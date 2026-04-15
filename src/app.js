require("dotenv").config({ path: "./.env" })
const express = require("express");
const pool = require("./config/db");
const jwt = require("jsonwebtoken")
const bcrypt = require("bcrypt")
const validarUsuario = require("./validacao/usuarios")
const validarPost = require("./validacao/post")
const auth = require("./auth/authLogin")
const cors = require("cors")

const app = express();
app.use(express.json());
app.use(cors())

function formatarData(data) {
  return new Date(data).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
  })
}

// criar usuario
app.post("/usuarios", validarUsuario,  async (req, res) => {
  try {
    const { nome, email, senha } = req.body;

    const senhaHash = await bcrypt.hash(senha, 10)

    const resultado = await pool.query(
      `
        INSERT INTO usuarios (nome, email, senha) 
        VALUES ($1, $2, $3) 
        RETURNING *
      `, 
      [nome, email, senhaHash],
    );

     const dados = resultado.rows.map((post) => ({
      ...post,
      criado_em: formatarData(post.criado_em),
    }));

    res.status(200).json({ message: "Usuário cadastrado com sucesso", usuario: dados[0]})
  } catch (error) {
    res.status(500).json({ message: "Error ao cadastrar o usuário"})
  }
})

//Login
app.post("/login", async (req, res) => {
  try {
    const { email, senha } = req.body;

    const usuario = await pool.query(
      `SELECT  * FROM usuarios WHERE email=$1 `, [email]
    )

    if (usuario.rows.length === 0) {
      return res.status(400).json({ message: "Usuário não encontrado" })
    }

    const senhaValida = await bcrypt.compare(senha, usuario.rows[0].senha)

    if (!senhaValida) {
      return res.status(400).json({ message: "Senha incorreta!" })
    }

    // sign, ferramenta de gerar o token, na chaves colocaremos o payload de criação e expiração
    // identidade
    const token = jwt.sign(
      { id: usuario.rows[0].id }, 
      process.env.JWT_SECRET, 
      { expiresIn: "1h" }
    )

    res.status(200).json({ message: "Login feito com sucesso", token })

  } catch (error) {
    res.send(500).json({ message: "Error ao tentar fazer o login"})
  }
})

// Pegar usuarios
app.get("/usuarios", async (req, res) => {
  try {
    const resultado = await pool.query(`
            SELECT * FROM usuarios    
        `);
    res.json(resultado.rows);
  } catch (error) {
    res.status(500).json({ message: "Error ao buscar usuários" });
  }
});


// Pegar as postagens
app.get("/posts", async (req, res) => {
  try {
    const resultado = await pool.query(`
                SELECT 
                    usuarios.id AS usuario_id,
                    usuarios.nome,
                    postagens.titulo,
                    postagens.conteudo,
                    postagens.criado_em,
                    postagens.id AS postagens_id          
                FROM postagens JOIN usuarios 
                ON postagens.usuario_id = usuarios.id 
                ORDER BY postagens.criado_em DESC
            `);

    const dados = resultado.rows.map((post) => ({
      ...post,
      criado_em: formatarData(post.criado_em),
    }));
  
    res.json(dados);
  } catch {
    res.status(500).json({ message: "Não encontrou postagens" });
  }
});

// Adicionar novo post
// Returning, serve pra quando a gente inserir ja retornar instantaneamente na rota get
// $1, $2 - serao os dados do insert
app.post("/posts", validarPost, auth, async (req, res) => {
  try {
    const { titulo, conteudo } = req.body;
    const resultado = await pool.query(
      `
                INSERT INTO postagens (titulo, conteudo, usuario_id)
                VALUES ($1, $2, $3)
                RETURNING *
            `,
      [titulo, conteudo, req.usuario.id],
    );

    const dados = resultado.rows.map((post) => ({
      ...post,
      criado_em: formatarData(post.criado_em),
    }));
    
    res
      .status(201)
      .json({
        message: "Postagem criada com sucesso",
        postagens: dados[0],
      });
  } catch (erro) {
    res.status(500).json({ erro: "Erro ao criar postagens" });
  }
});

// Atualizar postagens
app.put("/posts/:id", auth, validarPost,  async (req, res) => {
  try {
    // pegar id pra passar como parametro de rota
    const { id } = req.params;
    const { titulo, conteudo } = req.body;

    const post = await pool.query(`SELECT * FROM postagens WHERE id=$1`, [id])

    if (post.rows.length === 0) {
      return res.status(404).json({ message: "Post não encontrado" })
    };

    if (post.rows[0]?.usuario_id !== req.usuario.id) {
      return res.status(403).json({ message: "Sem permissão para alterar" })
    }

    const resultado = await pool.query(
      `
            UPDATE postagens SET titulo=$1, conteudo=$2 WHERE id=$3 RETURNING *
        `,
      [titulo, conteudo, id],
    );

     const dados = resultado.rows.map((post) => ({
      ...post,
      criado_em: formatarData(post.criado_em),
    }));

    res.status(200).json({ message: "Post atualizado com sucesso", post: dados[0] });
  } catch (error) {
    res.status(500).json({ message: "Não foi possivel atualizar a postagem" });
  }
});

// Deletar postagens
app.delete("/posts/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;

    const post = await pool.query(`SELECT * FROM postagens WHERE id=$1`, [id])

    if (post.rows.length === 0) {
      return res.status(404).json({ message: "Post não encontrado" })
    };

    if (post.rows[0].usuario_id !== req.usuario.id) {
      return res.status(403).json({ message: "Sem permissão para apagar essa postagem" })
    }


    const resultado = await pool.query(
      `
        DELETE FROM postagens WHERE id=$1 RETURNING *
      `,
      [id],
    );
    res.status(200).json({ message: "Post deletado com sucesso", post: resultado.rows[0] })
  } catch (error) {
    res.status(500).json({ message: "Não foi possível apagar a postagem" })
  }
})

module.exports = app;
