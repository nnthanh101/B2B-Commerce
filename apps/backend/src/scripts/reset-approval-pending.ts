/**
 * Reset the demo approval back to "pending" status for CEO reel re-capture.
 *
 * Resets BOTH:
 *   - approval.status = "pending"
 *   - approval_status.status = "pending"
 *
 * Required because updateApprovalStatusStep only sets approval_status to
 * "approved" on approve — it does NOT revert on reset. This script directly
 * resets both records so the admin /app/approvals shows "Pending" on re-capture.
 *
 * Run:
 *   npx medusa exec ./src/scripts/reset-approval-pending.ts
 */

import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { APPROVAL_MODULE } from "../modules/approval";
import { IApprovalModuleService } from "../types";

const CART_ID = "cart_01KTJPADGC546FRCA517WJ2469";
const APPROVAL_ID = "appr_01KTJPADHRQ6457KFCTF1JZ1VX";
const APPROVAL_STATUS_ID = "apprstat_01KTJPADHZF03FYVDZDTMEY53D";

export default async function resetApprovalPending({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const approvalModule =
    container.resolve<IApprovalModuleService>(APPROVAL_MODULE);

  logger.info(`=== Reset Approval to Pending ===`);
  logger.info(`Approval ID: ${APPROVAL_ID}`);
  logger.info(`ApprovalStatus ID: ${APPROVAL_STATUS_ID}`);

  // Reset approval.status to pending
  const [updatedApproval] = await approvalModule.updateApprovals([
    {
      id: APPROVAL_ID,
      status: "pending" as any,
      handled_by: null as any,
    },
  ]);
  logger.info(`  approval.status → ${updatedApproval.status}`);

  // Reset approval_status.status to pending
  const [updatedStatus] = await approvalModule.updateApprovalStatuses([
    {
      id: APPROVAL_STATUS_ID,
      status: "pending" as any,
    },
  ]);
  logger.info(`  approval_status.status → ${updatedStatus.status}`);

  logger.info(`Done — approval and approval_status both PENDING.`);
}
