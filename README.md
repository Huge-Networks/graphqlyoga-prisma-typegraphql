# GraphQL Yoga, Prisma and typegraphql-prisma

This example uses an existing database "mysql" to generate all the types and resolver, enabling a GraphQL server to be used as an API, with minimum effort.

A github project (see link below), was found after trying many different techiniques to use generated Prisma schemas to auto generate types and resolvers for the database.

Github project: https://github.com/bastianhilton/Graphql-Yoga-Prisma (GYP)

Used some snippets from the project GYP to learn how generate the file .graphql. I don't think it is necessary to generate the file, but is great to look for the "type Query", because is the list of the generated available queries generated.


# Install the packages

```
npm install
```

# Configure prisma

Create a file .env

Using the example here:

```
DATABASE_URL="postgresql://johndoe:randompassword@localhost:5432/mydb?schema=public"
```

Rename the file prisma/schema.prisma.example to prisma/schema.prisma.

It's a minimum version, containing a configuration to generate the Prisma schema.

The DATABASE_URL should match the database been used by prisma.

```
npx prisma db pull
npx prisma generate
```

This two last commands will generate the types and generators for the database.

# Running the server

npm run dev

# Accessing the server

http://localhost:4000/graphql

# A valid example to query the database

Using this query on the dashboard console should retrieve the data from the legacy database:

```
query {
  orders: findManyTblorders {
    id
    userid
  }
  clients: findManyTblclients {
    id
    firstname
  }
}
```

# Fixing a mysql database with invalid datetime:

Warning, one should use this command carefully.

Make a database backup to prevent errors within the application after the changes.

This command should should replace all invalid datetime e timestamp fields with NULL datetime or '1970-01-01 00:00:00' avoiding the use of '0000-00-00 00:00:00' that is known issue with prisma, see: https://github.com/prisma/prisma/issues/5006

Open a mysql console or mariadb console and insert this SQL Procedure:


```SQL
DELIMITER $$
CREATE PROCEDURE FixInvalidDates()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE tableName CHAR(64);
    DECLARE columnName CHAR(64);
    DECLARE isNullable CHAR(3);  -- Adicionado
    DECLARE cur CURSOR FOR 
        SELECT TABLE_NAME, COLUMN_NAME, IS_NULLABLE  -- Modificado
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND DATA_TYPE IN ('datetime', 'timestamp');
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    OPEN cur;

    read_loop: LOOP
        FETCH cur INTO tableName, columnName, isNullable;  -- Modificado
        IF done THEN
            LEAVE read_loop;
        END IF;
        
        -- Tentativa de atualizar para NULL apenas se a coluna permitir valores nulos
        IF isNullable = 'YES' THEN  -- Adicionado
            SET @query = CONCAT('UPDATE ', tableName, 
                                ' SET ', columnName, 
                                ' = NULL WHERE ', columnName, 
                                ' = \'0000-00-00 00:00:00\';');
            PREPARE stmt FROM @query;
            BEGIN
                DECLARE CONTINUE HANDLER FOR SQLWARNING BEGIN END;  -- Ignorar avisos
                EXECUTE stmt;
            END;
            DEALLOCATE PREPARE stmt;
        END IF;  -- Adicionado

        -- Se a atualiza??o para NULL falhar ou a coluna n?o permitir valores nulos, 
        -- tente atualizar para '1970-01-01 00:00:00'
        SET @query = CONCAT('UPDATE ', tableName, 
                            ' SET ', columnName, 
                            ' = \'1970-01-01 00:00:00\' WHERE ', columnName, 
                            ' = \'0000-00-00 00:00:00\';');
        PREPARE stmt FROM @query;
        BEGIN
            DECLARE CONTINUE HANDLER FOR SQLWARNING BEGIN END;  -- Ignorar avisos
            EXECUTE stmt;
        END;
        DEALLOCATE PREPARE stmt;

    END LOOP;

    CLOSE cur;
END$$
DELIMITER ;

```

To execute the code

```SQL
CALL FixInvalidDates();
```
