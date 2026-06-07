import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { ICompanyModuleService, ModuleCompany, ModuleUpdateCompany } from "../../../types";
import { COMPANY_MODULE } from "../../../modules/company";

export const updateCompaniesStep = createStep(
  "update-companies",
  async (input: ModuleUpdateCompany, { container }): Promise<StepResponse<ModuleCompany, ModuleUpdateCompany>> => {
    const companyModule =
      container.resolve<ICompanyModuleService>(COMPANY_MODULE);

    const [previousData] = await companyModule.listCompanies({
      id: input.id,
    });

    const updatedCompanies = await companyModule.updateCompanies(input);

    return new StepResponse(updatedCompanies, previousData);
  },
  async (previousData: ModuleUpdateCompany | undefined, { container }) => {
    if (!previousData) {
      return;
    }

    const companyModule =
      container.resolve<ICompanyModuleService>(COMPANY_MODULE);

    await companyModule.updateCompanies(previousData);
  }
);
