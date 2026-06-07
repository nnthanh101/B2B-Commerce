# AppRegistry module — count-guarded for LocalStack compatibility.
# ADR-015 D5: servicecatalog-appregistry is NOT in LocalStack Community.
# Guard: var.enable_appregistry = false (local) → count = 0 → no API call → LocalStack apply succeeds.
#        var.enable_appregistry = true  (dev/prod) → count = 1 → real AppRegistry resource.
# Ref: https://aws.amazon.com/blogs/mt/tag-your-aws-resources-for-cost-allocation-with-aws-myapplications/

resource "aws_servicecatalogappregistry_application" "this" {
  count = var.enable_appregistry ? 1 : 0

  name        = var.application_name
  description = "Digital Commerce platform application (Medusa v2 + Next.js 15 B2B). Managed by Terraform."
}
