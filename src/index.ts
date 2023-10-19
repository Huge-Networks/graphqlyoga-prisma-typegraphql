require("reflect-metadata");

import { createServer } from "http";
import { createYoga } from "graphql-yoga";
import { PrismaClient, tblclients } from "@prisma/client"; // Importe o PrismaClient
import { buildSchema } from "type-graphql";
import { resolvers } from "@generated/type-graphql";
import * as path from "path";

const prisma = new PrismaClient(); // Crie uma instância do PrismaClient

const schema = buildSchema({
  resolvers,
  emitSchemaFile: path.resolve(__dirname, "./generated-schema.graphql"),
  validate: false,
});

const yoga = createYoga({
  schema,
  context: { prisma }, // Passe o PrismaClient como parte do contexto para seus resolvers
});

const server = createServer(yoga);

server.listen(4000, () => {
  console.info("Server is running on http://localhost:4000/graphql");
});
