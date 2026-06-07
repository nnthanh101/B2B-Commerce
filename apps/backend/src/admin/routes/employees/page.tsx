import { defineRouteConfig } from "@medusajs/admin-sdk";
import { Users } from "@medusajs/icons";
import {
  Avatar,
  Badge,
  Container,
  Heading,
  Table,
  Text,
} from "@medusajs/ui";
import { QueryCompany, QueryEmployee } from "../../../types";
import { useCompanies } from "../../hooks/api";
import { formatAmount } from "../../utils";

const Employees = () => {
  const { data, isPending } = useCompanies({
    fields:
      "*employees,*employees.customer,*employees.company,*approval_settings",
  });

  const companies: QueryCompany[] = data?.companies || [];

  const allEmployees: Array<QueryEmployee & { companyName: string; companyCurrencyCode: string }> =
    companies.flatMap((company) =>
      (company.employees || []).map((employee) => ({
        ...employee,
        companyName: company.name,
        companyCurrencyCode: company.currency_code || "USD",
      }))
    );

  return (
    <>
      <Container className="flex flex-col p-0 overflow-hidden">
        <div className="p-6 flex justify-between">
          <Heading className="font-sans font-medium h1-core">Employees</Heading>
        </div>
        {isPending && <Text className="p-6">Loading...</Text>}
        {!isPending && allEmployees.length === 0 && (
          <div className="flex h-[400px] w-full flex-col items-center justify-center gap-y-4">
            <div className="flex flex-col items-center gap-y-3">
              <div className="flex flex-col items-center gap-y-1">
                <Text className="font-medium font-sans txt-compact-small">
                  No employees found
                </Text>
                <Text className="txt-small text-ui-fg-muted">
                  Add employees via the{" "}
                  <a href="/app/companies" className="text-ui-fg-interactive hover:underline">
                    Companies
                  </a>{" "}
                  page.
                </Text>
              </div>
            </div>
          </div>
        )}
        {!isPending && allEmployees.length > 0 && (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell></Table.HeaderCell>
                <Table.HeaderCell>Name</Table.HeaderCell>
                <Table.HeaderCell>Email</Table.HeaderCell>
                <Table.HeaderCell>Company</Table.HeaderCell>
                <Table.HeaderCell>Spending Limit</Table.HeaderCell>
                <Table.HeaderCell>Role</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {allEmployees.map((employee) => (
                <Table.Row
                  key={employee.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => {
                    if (employee.customer?.id) {
                      window.location.href = `/app/customers/${employee.customer.id}`;
                    }
                  }}
                >
                  <Table.Cell className="w-6 h-6 items-center justify-center">
                    <Avatar
                      fallback={employee.customer?.first_name?.charAt(0) || ""}
                    />
                  </Table.Cell>
                  <Table.Cell>
                    {employee.customer?.first_name} {employee.customer?.last_name}
                  </Table.Cell>
                  <Table.Cell>{employee.customer?.email}</Table.Cell>
                  <Table.Cell>
                    <a
                      href={`/app/companies/${employee.company?.id}`}
                      className="text-ui-fg-interactive hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {employee.companyName}
                    </a>
                  </Table.Cell>
                  <Table.Cell>
                    {formatAmount(
                      employee.spending_limit,
                      employee.companyCurrencyCode
                    )}
                  </Table.Cell>
                  <Table.Cell>
                    <Badge
                      size="2xsmall"
                      color={employee.is_admin ? "green" : "grey"}
                    >
                      {employee.is_admin ? "Admin" : "Employee"}
                    </Badge>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        )}
      </Container>
    </>
  );
};

export const config = defineRouteConfig({
  label: "Employees",
  icon: Users,
});

export default Employees;
