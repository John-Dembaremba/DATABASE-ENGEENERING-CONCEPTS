require('dotenv').config();
const pg = require('pg');

/*
This script creates 100 partitions 
and attaches them to the main table customers
*/

const partitionHandler = async () => {
    const dbClient = new pg.Client({
        "user": process.env.POSTGRES_USER,
        "password": process.env.POSTGRES_PASSWORD,
        "host": process.env.POSTGRES_HOST,
        "port": process.env.POSTGRES_PORT,
        "database": process.env.POSTGRES_DB
    })
    const db_name = process.env.POSTGRES_DB

    console.log(`# connecting to ${db_name} db ...`)
    await dbClient.connect()

    console.log("creating customers table ....")
    const customerCreationSql = `create table customers (id serial, name text)
                                partition by range (id);`
    await dbClient.query(customerCreationSql)
    console.log("============Table created ===========")
    // sleep for 3 secs
    setTimeout(() => {
        console.log("Preparing partition process")
    }, 3000)

    console.log("creating partitions ...")
    /*
    assume we are going to support 1B customers
    and each partition will have 10M customers 
    that gives 1000/10 -> 100 partition tables 
    */

    for (i = 0; i < 100; i++) {
        const idFrom = i * 10000000
        const idTo = (i + 1) * 10000000
        const partitionName = `customers_${idFrom}_${idTo}`

        const createPartitionTable = `create table ${partitionName}
                                        (like customers including indexes);`
        // Update customers table with attachment of partition table.
        const attachPartitionTable = `alter table customers
        attach partition ${partitionName}
        for values from (${idFrom}) to (${idTo})
     `;
        console.log(`creating partition ${partitionName} ...`)
        await dbClient.query(createPartitionTable)
        await dbClient.query(attachPartitionTable)
    }

    console.log("=========== SHOW ALL PARTITION TABLES ==============")
    const showPartitionTable = `select * from pg_partitions;`
    await dbClient.query(showPartitionTable)
    console.log("=========== Done ==============")

    setTimeout(() => {
        console.log("closing connection...")
    }, 2000)
    await dbClient.end()
    console.log("########## CONNECTION CLOSED #############")
}


async function insertHandler() {


    const dbClient = new pg.Client({
        "user": process.env.POSTGRES_USER,
        "password": process.env.POSTGRES_PASSWORD,
        "host": process.env.POSTGRES_HOST,
        "port": process.env.POSTGRES_PORT,
        "database": process.env.POSTGRES_DB
    })

    console.log(`connecting to ${process.env.POSTGRES_DB}  db...`)
    await dbClient.connect();
    console.log("inserting customers... ")
    /*
    creating a billion customers
    */
    for (let i = 0; i < 100; i++) {
        /* creates a million row */
        const psql = `insert into customers(name) (
                        select random() from generate_series(1,10000000)
                        )
                          `;

        console.log(`inserting 10m customers...   `)
        await dbClient.query(psql);
    }

    // Check if customers created
    const getQuery = `SELECT * FROM customers WHERE id BETWEEN 55000000 AND 1000000000;`

    console.log("closing connection")
    await dbClient.end();
    console.log("done.")
}

// Call the partitionHandler function first
partitionHandler()
    .then(() => {
        // After partitionHandler completes, call the insertHandler function
        return insertHandler();
    })
    .catch((error) => {
        console.error("An error occurred:", error);
    });
