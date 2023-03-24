const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const Excel = require('exceljs');

const { Pool } = require('pg');
const Cursor = require('pg-cursor');
const QueryStream = require('pg-query-stream');

const PORT = 3001;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const pool = new Pool({
    user: 'codebaseuser',
    host: '127.0.0.1',
    database: 'mydb',
    password: '12345678',
    port: 5432,
});

// TODO
async function* getAccountsGenerator (client, done) {
    // A cursor can be used to efficiently read through large result sets without loading the entire result-set into memory ahead of time.
    // https://node-postgres.com/apis/cursor
    const stream = client.query(new QueryStream('SELECT * FROM ACCOUNTS LIMIT 500000'));

    stream.on('data', (chunk) => {
        // yield chunk;
    });

    stream.on('end', async () => {
        console.log('stream.on end');

        await done();
    });
}


app.get('/', (req, res) => {
    
    return res.status(200).send({'message': 'server up and running'});
});

app.get('/query-time', async (req, res) => {
    const client = await pool.connect();
    try {
        const queryRes = await client.query('SELECT NOW()');
        return res.status(200).send({'message': queryRes});
    } catch (e) {
        return res.status(500).send({'message': e});
    } finally {
        client.release();
    }
});

app.get('/download', async (req, res) => {
    const client = await pool.connect();

    // set batch size to 1
    const batchSize = 1;
    try {
        // additional headers
        res.status(200);
        res.setHeader('Content-Disposition', 'attachment; filename=db_dump.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

        const workbook = new Excel.stream.xlsx.WorkbookWriter({
            stream: res
        });

        let sheet = workbook.addWorksheet('db_dump.xlsx');
        sheet.columns = [
            {header: 'Id', key: 'id', width: 10},
            {header: 'Name', key: 'name', width: 15},
            {header: 'Email', key: 'email', width: 15},
            {header: 'Created At', key: 'created_at', width: 15},
        ]
        
        // download 500000 datas
        // estimated size is more than 10MB

        // A cursor can be used to efficiently read through large result sets without loading the entire result-set into memory ahead of time.
        // https://node-postgres.com/apis/cursor
        const cursor = client.query(new Cursor('SELECT * FROM ACCOUNTS LIMIT 50000'));

        req.on('close', async () => {
            console.log('here close');
            cursor.close().then(() => {
                console.log('cursor closed');

                console.log('finally on close');
                client.release();
            });
            
        });

        req.on('end', async () => {
            console.log('here end');
            // await cursor.close();
            // console.log('cursor closed');

            // console.log('finally on close');
            // client.release();
        });

        req.on('error', async () => {
            console.log('here error');
            // await cursor.close();
            // console.log('cursor closed');

            // console.log('finally on close');
            // client.release();
        });
        
        let rows = await cursor.read(batchSize);
        
        // add initial rows
        if (rows.length > 0) {
            console.log(rows[0]);
            sheet.addRow(rows[0]).commit();
        }

        while(rows.length) {
            rows = await cursor.read(batchSize);
            
            // add remaining rows
            if (rows.length > 0) {
                sheet.addRow(rows[0]).commit();
            }
        }

        // commit sheet
        sheet.commit();

        // commit workbook
        await workbook.commit();
        await cursor.close();
        console.log('cursor closed');

        // Calling the writable.end() method signals that no more data will be written to the Writable
        res.end();
    } catch (e) {
        console.log(e);
        res.status(500);
        res.end();
    }
    // } finally {
    //     console.log('finally');
    //     client.release();
    // }
});

app.get('/download-stream', async (req, res) => {
    const client = await pool.connect();

    try {
        // additional headers
        res.status(200);
        res.setHeader('Content-Disposition', 'attachment; filename=db_dump.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

        const workbook = new Excel.stream.xlsx.WorkbookWriter({
            stream: res
        });

        let sheet = workbook.addWorksheet('db_dump.xlsx');
        sheet.columns = [
            {header: 'Id', key: 'id', width: 10},
            {header: 'Name', key: 'name', width: 15},
            {header: 'Email', key: 'email', width: 15},
            {header: 'Created At', key: 'created_at', width: 15},
        ]
        
        // download 500000 datas
        // estimated size is more than 10MB

        // https://github.com/brianc/node-postgres/tree/master/packages/pg-query-stream
        const stream = client.query(new QueryStream('SELECT * FROM ACCOUNTS LIMIT 500000'));

        req.on('close', async () => {
            console.log('here close');
            console.log('finally on close');

            stream.destroy();
            console.log('stream.destroy()');

            client.release();
            console.log('client.release()');

            console.log();
        });

        req.on('end', async () => {
            console.log('here end');
        });

        req.on('error', async () => {
            console.log('here error');
        });

        stream.on('data', (chunk) => {
            sheet.addRow(chunk).commit();
        });

        stream.on('end', async () => {
            console.log('stream.on end');

            // commit sheet
            sheet.commit();

            // commit workbook
            await workbook.commit();
            console.log('workbook.commit()');

            // Calling the writable.end() method signals that no more data will be written to the Writable
            res.end();
        });

        stream.on('error', (e) => {
            console.log('stream.on error ', e);
        });

    } catch (e) {
        console.log(e);
        res.status(500);
        res.end();
    }
});

app.get('/download-generator', async (req, res) => {
    const client = await pool.connect();

    try {
        // additional headers
        res.status(200);
        res.setHeader('Content-Disposition', 'attachment; filename=db_dump.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

        const workbook = new Excel.stream.xlsx.WorkbookWriter({
            stream: res
        });

        let sheet = workbook.addWorksheet('db_dump.xlsx');
        sheet.columns = [
            {header: 'Id', key: 'id', width: 10},
            {header: 'Name', key: 'name', width: 15},
            {header: 'Email', key: 'email', width: 15},
            {header: 'Created At', key: 'created_at', width: 15},
        ]

        req.on('close', async () => {
            console.log('here close');
            console.log('finally on close');
            client.release();
            
        });

        req.on('end', async () => {
            console.log('here end');
        });

        req.on('error', async () => {
            console.log('here error');
        });
        
        const accountGen = getAccountsGenerator(client, async () => {
            // commit sheet
            sheet.commit();

            // commit workbook
            await workbook.commit();
            console.log('workbook.commit()');

            // Calling the writable.end() method signals that no more data will be written to the Writable
            res.end();
        });

        for await (const account of accountGen) {
            sheet.addRow(account).commit();
        }

    } catch (e) {
        console.log(e);
        client.release();
        res.status(500);
        res.end();
    }
});

const srv = app.listen(PORT, () => console.log(`Server listening on port: ${PORT}`));

process.on('SIGINT', async () => {
    console.log('on close');
    await pool.end();
    srv.close(() => {
        console.log('closing http server');
    });
});