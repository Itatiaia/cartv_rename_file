const express = require('express');
const router = express.Router();

const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');

const caminhoLog = path.join(
    __dirname,
    '..',
    'logs',
    'codigos_processados.json'
);

function obterCodigosProcessados() {

    try {

        if (!fs.existsSync(caminhoLog)) {

            fs.writeFileSync(
                caminhoLog,
                JSON.stringify([])
            );

        }

        return JSON.parse(
            fs.readFileSync(caminhoLog, 'utf-8')
        );

    } catch {

        return [];

    }

}

function salvarCodigoProcessado(
    codigo,
    titulo,
    duracao
) {

    const registros = obterCodigosProcessados();

    const existe = registros.find(
        item => item.codigo === codigo
    );

    if (!existe) {

        registros.push({

            codigo: codigo,
            titulo: titulo,
            duracao: duracao,
            data: new Date().toLocaleString('pt-BR', {
                timeZone: 'America/Sao_Paulo'
            })

        });

        fs.writeFileSync(
            caminhoLog,
            JSON.stringify(registros, null, 4)
        );

    }

}

const storageCSV = multer.diskStorage({

    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },

    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }

});

const uploadCSV = multer({
    storage: storageCSV
});

const storageVideo = multer.diskStorage({

    destination: (req, file, cb) => {

        const pastaTemp = path.join(
            __dirname,
            '..',
            'uploads'
        );

        if (!fs.existsSync(pastaTemp)) {

            fs.mkdirSync(pastaTemp);

        }

        cb(null, pastaTemp);

    },

    filename: (req, file, cb) => {

        cb(
            null,
            Date.now() + path.extname(file.originalname)
        );

    }

});

const uploadVideo = multer({
    storage: storageVideo
});

router.get('/', (req, res) => {

    res.render('home');

});

router.post(
    '/upload',
    uploadCSV.single('arquivo'),
    (req, res) => {

        const resultados = [];

        const codigosJaAdicionados = new Set();

        const registrosProcessados =
            obterCodigosProcessados();

        const codigosProcessados =
            registrosProcessados.map(
                item => item.codigo
            );

        let colunas = [];

        fs.createReadStream(req.file.path)

            .pipe(csv({

                separator: ';',

                mapHeaders: ({ header }) => {
                    return header.trim();
                }

            }))

            .on('headers', (headers) => {

                colunas = headers;

            })

            .on('data', (data) => {

                const linha = {};

                colunas.forEach(coluna => {

                    linha[coluna] = data[coluna]
                        ? data[coluna].toString().trim()
                        : '';

                });

                const codigo = linha['Enumeration'];

                if (
                    codigo &&
                    codigo !== '' &&
                    !codigosJaAdicionados.has(codigo) &&
                    !codigosProcessados.includes(codigo)
                ) {

                    codigosJaAdicionados.add(codigo);

                    resultados.push({

                        codigo: codigo,
                        titulo: linha['Caption'],
                        duracao: linha['Duration'],
                        caminho: linha['Filename']

                    });

                }

            })

            .on('end', () => {

                fs.unlinkSync(req.file.path);

                res.render('tabela', {

                    dados: resultados

                });

            })

            .on('error', (erro) => {

                console.log(erro);

                res.send('Erro ao processar CSV');

            });

    }
);

router.post(
    '/atualizar-video',
    uploadVideo.single('video'),
    async (req, res) => {

        try {

            if (!req.file) {

                return res.json({

                    sucesso: false,
                    mensagem: 'Nenhum vídeo selecionado'

                });

            }

            const titulo = req.body.titulo;

            const codigo = req.body.codigo;

            const duracao = req.body.duracao;

            if (!titulo || titulo.trim() === '') {

                fs.unlinkSync(req.file.path);

                return res.json({

                    sucesso: false,
                    mensagem: 'Título inválido'

                });

            }

            const extensao = path.extname(
                req.file.originalname
            );

            const nomeLimpo = titulo
                .replace(/[<>:"/\\|?*]+/g, '')
                .trim();

            const pastaDestino = 'D:\\VIDEOS-PLAYDESK';

            const novoCaminho = path.join(
                pastaDestino,
                nomeLimpo + extensao
            );

            fs.copyFileSync(
                req.file.path,
                novoCaminho
            );

            fs.unlinkSync(req.file.path);

            salvarCodigoProcessado(
                codigo,
                titulo,
                duracao
            );

            return res.json({

                sucesso: true,
                mensagem: 'Vídeo salvo com sucesso'

            });

        } catch (erro) {

            console.log(erro);

            return res.json({

                sucesso: false,
                mensagem: 'Erro ao salvar vídeo'

            });

        }

    }
);

module.exports = router;