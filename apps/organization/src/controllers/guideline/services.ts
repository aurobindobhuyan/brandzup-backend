import { generateWorkspaceNanoId, OperationalError } from "packages";

import Guideline from "@src/model/Guideline/Guideline";
import { IGuideline } from "@src/model/Guideline/interface";
import Brand from "@src/model/Brands/Brand";

function getPublicGuideline(guideline: IGuideline) {
  const {
    createdBy,
    nanoId,
    brandNanoId,
    workspaceNanoId,
    name,
    description,
    logo,
    status,
    createdAt,
  } = guideline;

  return {
    createdBy,
    nanoId,
    brandNanoId,
    workspaceNanoId,
    name,
    description,
    logo,
    status,
    createdAt,
  };
}

export const getAllGuidelines = async ({
  brandNanoId,
}: {
  brandNanoId: string;
}) => {
  const guidelines = await Guideline.find({ brandNanoId }).lean().exec();

  if (!guidelines) {
    throw new OperationalError(404, "Bad request");
  }

  return guidelines.map(getPublicGuideline);
};

export const getOneGuideline = async ({ nanoId }: { nanoId: string }) => {
  const guideline = await Guideline.findOne({ nanoId }).lean().exec();

  if (!guideline) {
    throw new OperationalError(404, "Bad request");
  }

  return getPublicGuideline(guideline);
};

export const createGuideline = async ({
  createdBy,
  brandNanoId,
  workspaceNanoId,
  name,
  description,
  logo,
}: {
  createdBy: string;
  brandNanoId: string;
  workspaceNanoId: string;
  name: string;
  description: string;
  logo: string;
}) => {
  // get the brandId
  const brand = await Brand.findOne({ brandNanoId })
    .select("workspaceNanoId workspaceId brandNanoId")
    .lean()
    .exec();

  if (!brand) {
    throw new OperationalError(404, "Bad request");
  }

  if (brand.workspaceNanoId !== workspaceNanoId) {
    throw new OperationalError(404, "Wrong brand Id");
  }

  const createdGuideline = await Guideline.create({
    createdBy,

    nanoId: generateWorkspaceNanoId(),
    brandId: brand._id,
    workspaceId: brand.workspaceId,

    brandNanoId,
    workspaceNanoId,

    name,
    description,
    logo,

    status: "draft",
  });

  return getPublicGuideline(createdGuideline);
};
