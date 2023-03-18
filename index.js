const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const Excel = require('exceljs');

const { Pool } = require('pg');
const Cursor = require('pg-cursor');

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
        res.flushHeaders();

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
        
        const cursor = client.query(new Cursor('SELECT * FROM ACCOUNTS LIMIT 500000'));
        
        let rows = await cursor.read(batchSize);
        
        // add initial rows
        if (rows.length > 0) {
            console.log(rows[0])
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

        await workbook.commit();
        res.end();
    } catch (e) {
        console.log(e);
        res.status(500);
        res.end();
    } finally {
        client.release();
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