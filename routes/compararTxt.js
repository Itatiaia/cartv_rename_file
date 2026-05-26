const express = require('express');
const router = express.Router();

const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');

function normalizarTexto(texto) {

    return texto
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\.[^/.]+$/, '')
        .replace(/[^a-z0-9]/g, '')
        .trim();

}

function extrairNomeArquivo(linha) {

    const regex = /"([^"]+)"/;

    const resultado = linha.match(regex);

    if (!resultado) {

        return '';

    }

    return resultado[1];

}

function obterCodigosProcessados() {

    const caminhoLog = path.join(
        __dirname,
        '..',
        'logs',
        'codigos_processados.json'
    );

    try {

        if (!fs.existsSync(caminhoLog)) {

            return [];

        }

        return JSON.parse(

            fs.readFileSync(
                caminhoLog,
                'utf-8'
            )

        );

    } catch {

        return [];

    }

}

const storageCSV = multer.diskStorage({

    destination: (req, file, cb) => {

        const pastaUpload = path.join(
            __dirname,
            '..',
            'uploads'
        );

        if (!fs.existsSync(pastaUpload)) {

            fs.mkdirSync(pastaUpload);

        }

        cb(null, pastaUpload);

    },

    filename: (req, file, cb) => {

        cb(

            null,

            Date.now() +
            path.extname(
                file.originalname
            )

        );

    }

});

const uploadCSV = multer({
    storage: storageCSV
});

router.post(

    '/comparar-txt',

    uploadCSV.fields([

        {
            name: 'arquivoComparacao',
            maxCount: 1
        },

        {
            name: 'arquivoTxt',
            maxCount: 1
        }

    ]),

    (req, res) => {

        const arquivoComparacao =
            req.files[
            'arquivoComparacao'
            ][0];

        const arquivoTxt =
            req.files[
            'arquivoTxt'
            ][0];

        const resultados = [];

        const registrosLog =
            obterCodigosProcessados();

        const linhasTxt = fs

            .readFileSync(
                arquivoTxt.path,
                'utf-8'
            )

            .split(/\r?\n/);

        let colunas = [];

        fs.createReadStream(
            arquivoComparacao.path
        )

            .pipe(csv({

                separator: ';',

                mapHeaders: ({ header }) => {
                    return header.trim();
                }

            }))

            .on('headers', headers => {

                colunas = headers;

            })

            .on('data', data => {

                const linha = {};

                colunas.forEach(coluna => {

                    linha[coluna] = data[coluna]
                        ? data[coluna]
                            .toString()
                            .trim()
                        : '';

                });

                resultados.push({

                    codigo:
                        linha['Enumeration'],

                    duracao:
                        linha['Duration'],

                    caminho:
                        linha['Filename']

                });

            })

            .on('end', () => {

                const linhasFinais = [];

                linhasTxt.forEach(linhaTxt => {

                    const nomeArquivoTxt =
                        extrairNomeArquivo(
                            linhaTxt
                        );

                    if (!nomeArquivoTxt) {

                        linhasFinais.push(
                            linhaTxt
                        );

                        return;

                    }

                    const nomeNormalizadoTxt =
                        normalizarTexto(
                            nomeArquivoTxt
                        );

                    const encontrado =
                        resultados.find(item => {

                            const nomePlanilha =
                                path.basename(
                                    item.caminho
                                );

                            const nomeNormalizadoPlanilha =
                                normalizarTexto(
                                    nomePlanilha
                                );

                            return (

                                nomeNormalizadoPlanilha ===
                                nomeNormalizadoTxt

                            );

                        });

                    if (encontrado) {

                        const registroLog =
                            registrosLog.find(
                                item => {

                                    return (
                                        item.codigo ===
                                        encontrado.codigo
                                    );

                                });

                        const dataLog =
                            registroLog
                                ? registroLog.data
                                : '';

                        linhasFinais.push(

                            linhaTxt +

                            ',' +

                            encontrado.codigo +

                            ',' +

                            encontrado.duracao +

                            ',' +

                            dataLog

                        );

                    } else {

                        linhasFinais.push(
                            linhaTxt
                        );

                    }

                });

                const conteudoFinal =
                    linhasFinais.join('\n');

                fs.writeFileSync(
                    arquivoTxt.path,
                    conteudoFinal
                );

                const nomeCsvOriginal =
                    arquivoComparacao.originalname;

                const regexData =
                    /(\d{2})(\d{2})(\d{4})/;

                const resultadoData =
                    nomeCsvOriginal.match(
                        regexData
                    );

                let nomeArquivoFinal =
                    'txt_comparado.txt';

                if (resultadoData) {

                    const dia =
                        resultadoData[1];

                    const mes =
                        resultadoData[2];

                    const ano =
                        resultadoData[3];

                    nomeArquivoFinal =

                        `${ano}-${mes}-${dia}.txt`;

                }

                fs.unlinkSync(
                    arquivoComparacao.path
                );

                return res.download(

                    arquivoTxt.path,

                    nomeArquivoFinal,

                    () => {

                        if (
                            fs.existsSync(
                                arquivoTxt.path
                            )
                        ) {

                            fs.unlinkSync(
                                arquivoTxt.path
                            );

                        }

                    }

                );

            });

    }

);

module.exports = router;