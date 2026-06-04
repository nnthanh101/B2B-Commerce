import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk";
import { ModuleCreateQuote, ModuleQuote } from "../../../types";
import { createQuotesStep } from "../steps/create-quotes";

/*
  A workflow that creates a quote entity that manages the quote lifecycle.
*/
export const createQuotesWorkflow = createWorkflow(
  "create-quotes-workflow",
  function (input: ModuleCreateQuote[]): WorkflowResponse<ModuleQuote[]> {
    return new WorkflowResponse(createQuotesStep(input));
  }
);
