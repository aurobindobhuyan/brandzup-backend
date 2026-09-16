import { Response } from "express";
import { errorResponse, generateWorkspaceNanoId } from "packages";

import Workspace from "@src/model/Workspace/Workspace";
import Brand from "@src/model/Brands/Brand";
import { IBrand } from "@src/model/Brands/interface";

const getPublicBrand = (brand: IBrand) => {
  const { brandNanoId, workspaceNanoId, name, logo, createdBy, createdAt } =
    brand;

  return {
    brandNanoId,
    workspaceId: workspaceNanoId,
    name,
    logo,
    createdBy,
    createdAt,
  };
};

export const listAllBrands = async ({
  res,
  workspaceId,
}: {
  res: Response;
  workspaceId: string;
}) => {
  const brands = await Brand.find({ workspaceNanoId: workspaceId })
    .lean()
    .exec();

  if (!brands) {
    return errorResponse(res, "Couldn't complete response");
  }

  return brands.map(getPublicBrand);
};

export const createBrand = async ({
  res,
  createdBy,
  workspaceNanoId,
  name,
  logo = "",
}: {
  res: Response;
  createdBy: string;
  workspaceNanoId: string;
  name: string;
  logo?: string;
}) => {
  const getWorkspaceId = await Workspace.findOne({ nanoId: workspaceNanoId })
    .select("name")
    .lean()
    .exec();

  if (!getWorkspaceId) {
    return errorResponse(res, "No Workspace found");
  }

  const brand = await Brand.create({
    createdBy,
    workspaceId: getWorkspaceId._id,

    brandNanoId: generateWorkspaceNanoId(),
    workspaceNanoId,
    name,
    logo,
  });

  if (!brand) {
    return errorResponse(res, "Couldn't create brand");
  }

  return getPublicBrand(brand);
};

export const getOneBrand = async ({
  brandNanoId,
  res,
}: {
  brandNanoId: string;
  res: Response;
}) => {
  const brand = await Brand.findOne({ brandNanoId }).lean().exec();

  if (!brand) {
    return errorResponse(res, "Brand not found");
  }

  return getPublicBrand(brand);
};
