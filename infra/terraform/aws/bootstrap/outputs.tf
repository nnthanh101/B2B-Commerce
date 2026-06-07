output "state_bucket_id" {
  description = "ID (name) of the Terraform state S3 bucket created by bootstrap."
  value       = aws_s3_bucket.tfstate.id
}

output "state_bucket_arn" {
  description = "ARN of the Terraform state S3 bucket created by bootstrap."
  value       = aws_s3_bucket.tfstate.arn
}
