const express = require('express');
const router = express.Router();

const fs = require('fs');
const path = require('path');

const caminhoLog = path.join(
    __dirname,
    '..',
    'logs',
    'codigos_processados.json'
);

router.get(
    '/logs',
    (req, res) => {

    res.render('logs');

});

router.post(
    '/remover-codigo',
    (req, res) => {

    try {

        const codigo =
            req.body.codigo;

        if (!codigo) {

            return res.json({

                sucesso: false,

                mensagem:
                    'Código inválido'

            });

        }

        if (!fs.existsSync(caminhoLog)) {

            return res.json({

                sucesso: false,

                mensagem:
                    'Arquivo de log não encontrado'

            });

        }

        const registros = JSON.parse(

            fs.readFileSync(
                caminhoLog,
                'utf-8'
            )

        );

        const novosRegistros =
            registros.filter(item => {

            return (
                item.codigo !==
                codigo
            );

        });

        fs.writeFileSync(

            caminhoLog,

            JSON.stringify(
                novosRegistros,
                null,
                4
            )

        );

        return res.json({

            sucesso: true,

            mensagem:
                'Código removido com sucesso'

        });

    } catch (erro) {

        console.log(erro);

        return res.json({

            sucesso: false,

            mensagem:
                'Erro ao remover código'

        });

    }

});

module.exports = router;