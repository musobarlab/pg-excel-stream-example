## ExcelJs and PostgreSQL generete and download file on the fly

Start Database
```shell
$ docker-compose up
```

Create `ACCOUNTS` table
```sql
CREATE TABLE ACCOUNTS (
	ID serial PRIMARY KEY,
	NAME VARCHAR ( 50 )  NOT NULL,
	EMAIL VARCHAR ( 255 ) NOT NULL,
	CREATED_AT TIMESTAMP NOT NULL DEFAULT NOW()
);
```

Insert 1 Million example data into `ACCOUNTS` table
```sql
INSERT INTO ACCOUNTS (NAME, EMAIL) 
WITH RAW_DATA AS (SELECT substr('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZmnopqrstuvwxyzAB', ceil (random() * 52)::integer, 7) AS NAME_RAW,
    substr('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZmnopqrstuvwxyzAB', ceil (random() * 52)::integer, 7) AS EMAIL_RAW
    FROM generate_series(1, 1000000)
)  SELECT NAME_RAW, EMAIL_RAW FROM RAW_DATA;
```

Start service
```shell
$ npm start
```

Download data `http://localhost:3001/download`