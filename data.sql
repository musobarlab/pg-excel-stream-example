CREATE TABLE ACCOUNTS (
	ID serial PRIMARY KEY,
	NAME VARCHAR ( 50 )  NOT NULL,
	EMAIL VARCHAR ( 255 ) NOT NULL,
	CREATED_AT TIMESTAMP NOT NULL DEFAULT NOW()
);

drop table ACCOUNTS;

-- insert 1M data
INSERT INTO ACCOUNTS (NAME, EMAIL) 
WITH RAW_DATA AS (SELECT substr('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZmnopqrstuvwxyzAB', ceil (random() * 52)::integer, 7) AS NAME_RAW,
    substr('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZmnopqrstuvwxyzAB', ceil (random() * 52)::integer, 7) AS EMAIL_RAW
    FROM generate_series(1, 1000000)
)  SELECT NAME_RAW, EMAIL_RAW FROM RAW_DATA;


select COUNT(*) from ACCOUNTS;