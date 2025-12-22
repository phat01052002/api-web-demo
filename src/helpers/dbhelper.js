import { Prisma  } from "@prisma/client";

export function getDbFields(modelName) {
  return Prisma.dmmf.datamodel.models.find(model => model.name === modelName).fields;
}